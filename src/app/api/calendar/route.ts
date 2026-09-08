// ============================================
// TERLUX COOP - API CALENDARIO / REUNIONES
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { meetings } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

const MANAGER_ROLES = ["super_admin", "admin", "manager"];

export async function GET() {
  const rows = await db.select().from(meetings).orderBy(desc(meetings.startTime));
  return NextResponse.json({ success: true, data: rows.map(toClient) });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Sesión requerida" } }, { status: 401 });

  const b = await request.json();
  if (!b.title || !b.startTime || !b.endTime) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION", message: "Título, inicio y fin son obligatorios" } }, { status: 400 });
  }
  if (new Date(b.endTime) <= new Date(b.startTime)) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION", message: "El fin debe ser posterior al inicio" } }, { status: 400 });
  }

  const [row] = await db.insert(meetings).values({
    title: String(b.title).trim(),
    description: b.description || null,
    type: b.type || "meeting",
    status: b.status || "scheduled",
    startTime: new Date(b.startTime),
    endTime: new Date(b.endTime),
    location: b.location || null,
    isOnline: Boolean(b.isOnline),
    meetingLink: b.meetingLink || null,
    color: b.color || "#6366f1",
    createdBy: session.id,
    attendees: Array.isArray(b.attendees) ? b.attendees : [],
    agenda: Array.isArray(b.agenda) ? b.agenda : [],
  }).returning();

  return NextResponse.json({ success: true, data: toClient(row) });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Sesión requerida" } }, { status: 401 });

  const url = new URL(request.url);
  const id = url.searchParams.get("id") || url.pathname.split("/").pop();
  if (!id) return NextResponse.json({ success: false, error: { code: "VALIDATION", message: "Id de reunión requerido" } }, { status: 400 });

  const [existing] = await db.select().from(meetings).where(eq(meetings.id, id)).limit(1);
  if (!existing) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Reunión no encontrada" } }, { status: 404 });

  const isManager = MANAGER_ROLES.includes(session.role);
  if (existing.createdBy !== session.id && !isManager) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Solo la persona que creó la reunión o la administración" } }, { status: 403 });
  }

  const b = await request.json();
  const patch: Record<string, unknown> = {};
  for (const k of ["title","description","type","status","location","meetingLink","color","notes"] as const) {
    if (b[k] !== undefined) patch[k] = b[k];
  }
  if (b.startTime) patch.startTime = new Date(b.startTime);
  if (b.endTime) patch.endTime = new Date(b.endTime);
  if (b.isOnline !== undefined) patch.isOnline = Boolean(b.isOnline);
  if (Array.isArray(b.attendees)) patch.attendees = b.attendees;
  if (Array.isArray(b.agenda)) patch.agenda = b.agenda;

  const [row] = await db.update(meetings).set({ ...patch, updatedAt: new Date() }).where(eq(meetings.id, id)).returning();
  return NextResponse.json({ success: true, data: toClient(row) });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Sesión requerida" } }, { status: 401 });

  const url = new URL(request.url);
  const id = url.searchParams.get("id") || url.pathname.split("/").pop();
  if (!id) return NextResponse.json({ success: false, error: { code: "VALIDATION", message: "Id de reunión requerido" } }, { status: 400 });

  const [existing] = await db.select().from(meetings).where(eq(meetings.id, id)).limit(1);
  if (!existing) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Reunión no encontrada" } }, { status: 404 });

  const isManager = MANAGER_ROLES.includes(session.role);
  if (existing.createdBy !== session.id && !isManager) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Solo la persona que creó la reunión o la administración" } }, { status: 403 });
  }

  await db.delete(meetings).where(eq(meetings.id, id));
  return NextResponse.json({ success: true });
}

function toClient(m: typeof meetings.$inferSelect) {
  return {
    id: m.id,
    title: m.title,
    description: m.description || "",
    type: m.type,
    status: m.status,
    startTime: m.startTime.toISOString(),
    endTime: m.endTime.toISOString(),
    location: m.location || (m.isOnline ? "Online" : "Sala"),
    isOnline: m.isOnline,
    meetingLink: m.meetingLink || "",
    color: m.color || "#6366f1",
    attendees: Array.isArray(m.attendees) ? m.attendees : [],
    agenda: Array.isArray(m.agenda) ? m.agenda : [],
  };
}