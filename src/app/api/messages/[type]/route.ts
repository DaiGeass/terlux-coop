// ============================================
// TERLUX COOP - API DE MENSAJERIA
// /api/messages/mail | chat | tickets
// ============================================

import { NextResponse, type NextRequest } from "next/server";
import { eq, and, or, desc, asc } from "drizzle-orm";
import { db } from "@/db";
import {
  users, mailMessages, conversations, conversationParticipants,
  chatMessages, supportTickets, ticketMessages,
} from "@/db/schema";
import { getSession, ROLE_LEVELS } from "@/lib/auth";
import { publish } from "@/lib/realtime";

// ---------------- CORREO ----------------

async function seedMail(userId: string) {
  const existing = await db.select({ id: mailMessages.id }).from(mailMessages).where(eq(mailMessages.ownerId, userId)).limit(1);
  if (existing.length) return;
  await db.insert(mailMessages).values([
    {
      ownerId: userId, folder: "inbox", fromEmail: "sistema@terluxcoop.com", fromName: "Sistema TerLux",
      toRecipients: [], subject: "Bienvenido/a a TerLux Coop",
      body: "Tu cuenta está activa. Desde aquí recibirás avisos de proyectos, nóminas y soporte.\n\nLa mensajería se sincroniza con el servidor de correo de la VPN (10.8.0.30).",
      isImportant: true, sentAt: new Date(Date.now() - 3600_000 * 5),
    },
    {
      ownerId: userId, folder: "inbox", fromEmail: "facturacion@terluxcoop.com", fromName: "Facturación",
      toRecipients: [], subject: "Tu factura del plan Cloud está disponible",
      body: "Puedes descargarla desde Facturación y Tarjetas. Se cargará automáticamente el método de pago predeterminado.",
      sentAt: new Date(Date.now() - 3600_000 * 26),
    },
    {
      ownerId: userId, folder: "inbox", fromEmail: "soporte@terluxcoop.com", fromName: "Soporte TerLux",
      toRecipients: [], subject: "Recordatorio: app de escritorio por VPN",
      body: "La app de escritorio se conecta en 10.8.0.0/24 mediante sockets seguros. Revisa PLANTILLA_APP_ESCRITORIO.txt para la configuración.",
      hasAttachments: false, sentAt: new Date(Date.now() - 3600_000 * 50),
    },
  ]);
}

async function handleMail(request: NextRequest, session: NonNullable<Awaited<ReturnType<typeof getSession>>>) {
  const { searchParams } = new URL(request.url);
  const folder = searchParams.get("folder") || "inbox";
  await seedMail(session.id);
  const rows = await db
    .select()
    .from(mailMessages)
    .where(and(eq(mailMessages.ownerId, session.id), eq(mailMessages.folder, folder)))
    .orderBy(desc(mailMessages.createdAt));
  return NextResponse.json({ success: true, data: rows });
}

async function handleMailSend(request: NextRequest, session: NonNullable<Awaited<ReturnType<typeof getSession>>>) {
  const body = await request.json();
  const to: string[] = Array.isArray(body.to) ? body.to : String(body.to || "").split(",").map((s: string) => s.trim()).filter(Boolean);
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const invalid = to.filter((e) => !emailRe.test(e));
  if (!to.length || invalid.length) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION", message: invalid.length ? `Correo(s) no válido(s): ${invalid.join(", ")}` : "Indica al menos un destinatario" } },
      { status: 400 }
    );
  }

  // Destinatarios externos: no tienen cuenta interna; quedan registrados como salida
  const recipients = await db.select({ email: users.email }).from(users);
  const known = new Set(recipients.map((r) => r.email.toLowerCase()));
  const external = to.filter((e) => !known.has(e.toLowerCase()));

  // Copia en enviados del remitente
  await db.insert(mailMessages).values({
    ownerId: session.id, folder: "sent",
    fromEmail: session.email, fromName: `${session.firstName} ${session.lastName}`,
    toRecipients: to, subject: body.subject, body: body.body,
    isRead: true, hasAttachments: !!body.hasAttachments,
    sentAt: new Date(),
  });

  // Si el destinatario es interno, copia en su bandeja
  for (const email of to) {
    const [recipient] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (recipient) {
      await db.insert(mailMessages).values({
        ownerId: recipient.id, folder: "inbox",
        fromEmail: session.email, fromName: `${session.firstName} ${session.lastName}`,
        toRecipients: to, subject: body.subject, body: body.body,
        hasAttachments: !!body.hasAttachments,
        sentAt: new Date(),
      });
    }
  }

  return NextResponse.json({ success: true, data: { external } });
}

// ---------------- CHAT ----------------

async function ensureGeneralConversation() {
  let [conv] = await db.select().from(conversations).where(eq(conversations.type, "group")).limit(1);
  if (!conv) {
    [conv] = await db.insert(conversations).values({ type: "group", name: "General", createdBy: null }).returning();
    const allUsers = await db.select({ id: users.id }).from(users);
    for (const u of allUsers) {
      await db.insert(conversationParticipants).values({ conversationId: conv.id, userId: u.id, role: "member" }).onConflictDoNothing();
    }
  }
  return conv;
}

async function handleChat(request: NextRequest, session: NonNullable<Awaited<ReturnType<typeof getSession>>>) {
  const conv = await ensureGeneralConversation();
  const msgs = await db
    .select({ id: chatMessages.id, body: chatMessages.body, senderId: chatMessages.senderId, createdAt: chatMessages.createdAt, conversationId: chatMessages.conversationId })
    .from(chatMessages)
    .where(eq(chatMessages.conversationId, conv.id))
    .orderBy(asc(chatMessages.createdAt))
    .limit(200);

  const userRows = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, role: users.role, position: users.position, lastLogin: users.lastLogin, isActive: users.isActive })
    .from(users);

  const enriched = msgs.map((m) => {
    const u = userRows.find((x) => x.id === m.senderId);
    return { ...m, sender: u ? { id: u.id, name: `${u.firstName} ${u.lastName}`, role: u.role, position: u.position } : null };
  });

  const now = Date.now();
  const online = userRows.filter((u) => u.isActive && u.lastLogin && now - new Date(u.lastLogin).getTime() < 5 * 60_000).length;

  return NextResponse.json({ success: true, data: { conversation: conv, messages: enriched, users: userRows, online } });
}

async function handleChatSend(request: NextRequest, session: NonNullable<Awaited<ReturnType<typeof getSession>>>) {
  const body = await request.json();
  const conv = await ensureGeneralConversation();
  const [row] = await db
    .insert(chatMessages)
    .values({ conversationId: body.conversationId || conv.id, senderId: session.id, body: String(body.body || "").slice(0, 4000) })
    .returning();

  await db.update(conversations).set({ lastMessageAt: new Date() }).where(eq(conversations.id, conv.id));

  const payload = {
    id: row.id, body: row.body, conversationId: row.conversationId, createdAt: row.createdAt,
    senderId: session.id, sender: { id: session.id, name: `${session.firstName} ${session.lastName}`, role: session.role },
  };
  publish(`chat:${conv.id}`, "message", payload);
  publish("global", "chat", { preview: body.body?.slice(0, 80), from: `${session.firstName} ${session.lastName}` });
  return NextResponse.json({ success: true, data: payload });
}

// ---------------- SOPORTE ----------------

async function handleTickets(request: NextRequest, session: NonNullable<Awaited<ReturnType<typeof getSession>>>) {
  const level = ROLE_LEVELS[session.role] ?? 30;
  const isStaff = level >= 40;
  const rows = isStaff
    ? await db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt))
    : await db.select().from(supportTickets).where(eq(supportTickets.requesterId, session.id)).orderBy(desc(supportTickets.createdAt));

  const msgs = await db.select().from(ticketMessages).orderBy(asc(ticketMessages.createdAt));
  return NextResponse.json({ success: true, data: rows.map((t) => ({ ...t, messages: msgs.filter((m) => m.ticketId === t.id) })) });
}

async function handleTicketPost(request: NextRequest, session: NonNullable<Awaited<ReturnType<typeof getSession>>>) {
  const body = await request.json();
  if (body.ticketId) {
    const [msg] = await db
      .insert(ticketMessages)
      .values({ ticketId: body.ticketId, senderId: session.id, body: body.body, isInternalNote: !!body.internal })
      .returning();
    await db.update(supportTickets).set({ status: body.status || "waiting", updatedAt: new Date() }).where(eq(supportTickets.id, body.ticketId));
    publish(`ticket:${body.ticketId}`, "reply", { from: `${session.firstName} ${session.lastName}`, body: body.body });
    return NextResponse.json({ success: true, data: msg });
  }

  const [ticket] = await db
    .insert(supportTickets)
    .values({
      subject: body.subject, category: body.category || "general",
      priority: body.priority || "medium", requesterId: session.id,
    })
    .returning();
  await db.insert(ticketMessages).values({ ticketId: ticket.id, senderId: session.id, body: body.body });
  return NextResponse.json({ success: true, data: ticket });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  const { type } = await params;
  if (type === "mail") return handleMail(request, session);
  if (type === "chat") return handleChat(request, session);
  if (type === "tickets") return handleTickets(request, session);
  return NextResponse.json({ success: false }, { status: 404 });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  const { type } = await params;
  if (type === "mail") return handleMailSend(request, session);
  if (type === "chat") return handleChatSend(request, session);
  if (type === "tickets") return handleTicketPost(request, session);
  return NextResponse.json({ success: false }, { status: 404 });
}
