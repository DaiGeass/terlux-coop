// ============================================
// TERLUX COOP - API DE AUTENTICACION
// /api/auth/login | register | logout | me
// ============================================

import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { randomBytes, createHash } from "node:crypto";
import { db } from "@/db";
import { users, activities, walletTransactions } from "@/db/schema";
import {
  ensureSeed,
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  getSession,
  getEnabledMenus,
  getWallet,
  ROLE_LEVELS,
} from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  const { action } = await params;

  try {
    if (action === "register") {
      await ensureSeed();
      const body = await request.json();
      const { email, password, firstName, lastName, acceptedTerms } = body;

      if (!acceptedTerms) {
        return NextResponse.json(
          { success: false, error: { code: "TERMS_REQUIRED", message: "Debes aceptar los términos y condiciones y la política de privacidad" } },
          { status: 400 }
        );
      }
      if (!email || !password || !firstName || !lastName) {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION", message: "Faltan campos obligatorios" } },
          { status: 400 }
        );
      }
      if (password.length < 8) {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION", message: "La contraseña debe tener al menos 8 caracteres" } },
          { status: 400 }
        );
      }

      const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
      if (existing.length > 0) {
        return NextResponse.json(
          { success: false, error: { code: "EMAIL_EXISTS", message: "Ya existe una cuenta con ese correo" } },
          { status: 409 }
        );
      }

      const passwordHash = await hashPassword(password);
      const [newUser] = await db
        .insert(users)
        .values({
          email: email.toLowerCase().trim(),
          password: passwordHash,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role: "client",
          position: "Cliente registrado por autoservicio",
          preferences: { theme: "dark", notifications: true },
          termsAcceptedAt: new Date(),
        })
        .returning();

      await db.insert(activities).values({
        userId: newUser.id,
        action: "register",
        entityType: "user",
        entityId: newUser.id,
        ipAddress: request.headers.get("x-forwarded-for") || null,
      });

      await createSession(newUser);
      return NextResponse.json({ success: true, data: { id: newUser.id, email: newUser.email, role: newUser.role } });
    }

    if (action === "login") {
      await ensureSeed();
      const body = await request.json();
      const { email, password } = body;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, String(email || "").toLowerCase().trim()))
        .limit(1);

      if (!user || !user.password || !(await verifyPassword(String(password), user.password))) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_CREDENTIALS", message: "Correo o contraseña incorrectos" } },
          { status: 401 }
        );
      }
      if (!user.isActive) {
        return NextResponse.json(
          { success: false, error: { code: "DISABLED", message: "La cuenta está desactivada. Contacta con soporte." } },
          { status: 403 }
        );
      }

      await createSession(user);
      await db.insert(activities).values({
        userId: user.id,
        action: "login",
        entityType: "session",
        ipAddress: request.headers.get("x-forwarded-for") || null,
        userAgent: request.headers.get("user-agent"),
      });

      return NextResponse.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      });
    }

    if (action === "terms") {
      const session = await getSession();
      if (!session) {
        return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "No hay sesión" } }, { status: 401 });
      }
      await db.update(users).set({ termsAcceptedAt: new Date() }).where(eq(users.id, session.id));
      return NextResponse.json({ success: true, data: { termsAcceptedAt: new Date() } });
    }

    if (action === "change-password") {
      const session = await getSession();
      if (!session) {
        return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "No hay sesión" } }, { status: 401 });
      }
      const body = await request.json();
      const { currentPassword, newPassword } = body;
      if (!currentPassword || !newPassword) {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION", message: "Faltan campos obligatorios" } },
          { status: 400 }
        );
      }
      if (String(newPassword).length < 8) {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION", message: "La contraseña debe tener al menos 8 caracteres" } },
          { status: 400 }
        );
      }

      const [user] = await db.select().from(users).where(eq(users.id, session.id)).limit(1);
      if (!user || !user.password || !(await verifyPassword(String(currentPassword), user.password))) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_CREDENTIALS", message: "La contraseña actual es incorrecta" } },
          { status: 401 }
        );
      }

      const passwordHash = await hashPassword(String(newPassword));
      await db.update(users).set({ password: passwordHash, updatedAt: new Date() }).where(eq(users.id, session.id));
      await db.insert(activities).values({
        userId: session.id,
        action: "change_password",
        entityType: "user",
        entityId: session.id,
        ipAddress: request.headers.get("x-forwarded-for") || null,
        userAgent: request.headers.get("user-agent"),
      });
      await createSession({ ...user, password: passwordHash });
      return NextResponse.json({ success: true });
    }

    if (action === "forgot-password") {
      const body = await request.json();
      const email = String(body?.email || "").toLowerCase().trim();
      // Respuesta uniforme para no revelar si el correo existe
      const ok = { success: true, data: { message: "Si el correo existe, recibirás un enlace para restablecer tu contraseña." } };
      if (!email) return NextResponse.json(ok);

      const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      if (!user) return NextResponse.json(ok);

      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");
      await db.update(users).set({
        resetToken: tokenHash,
        resetTokenExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
        updatedAt: new Date(),
      }).where(eq(users.id, user.id));

      const resetUrl = `${request.nextUrl.origin}/recuperar?token=${rawToken}`;
      console.log(`[TerLux] Reset de contraseña para ${email}: ${resetUrl}`);

      // Entornos de prueba (PoC): se devuelve el enlace en la respuesta.
      // En producción habría que enviarlo por correo (SMTP) y nunca devolverlo.
      return NextResponse.json({
        ...ok,
        data: { ...ok.data, requestId: user.id, devResetUrl: process.env.NODE_ENV === "production" ? undefined : resetUrl },
      });
    }

    if (action === "reset-password") {
      const body = await request.json();
      const { token, newPassword } = body;
      if (!token || !newPassword) {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION", message: "Faltan campos obligatorios" } },
          { status: 400 }
        );
      }
      if (String(newPassword).length < 8) {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION", message: "La contraseña debe tener al menos 8 caracteres" } },
          { status: 400 }
        );
      }

      const tokenHash = createHash("sha256").update(String(token)).digest("hex");
      const [user] = await db.select().from(users).where(eq(users.resetToken, tokenHash)).limit(1);
      if (!user || !user.resetTokenExpires || user.resetTokenExpires.getTime() < Date.now()) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_TOKEN", message: "El enlace es inválido o ha caducado. Solicita uno nuevo." } },
          { status: 400 }
        );
      }

      const passwordHash = await hashPassword(String(newPassword));
      await db.update(users).set({
        password: passwordHash,
        resetToken: null,
        resetTokenExpires: null,
        updatedAt: new Date(),
      }).where(eq(users.id, user.id));

      await db.insert(activities).values({
        userId: user.id,
        action: "password_reset",
        entityType: "user",
        entityId: user.id,
        ipAddress: request.headers.get("x-forwarded-for") || null,
        userAgent: request.headers.get("user-agent"),
      });

      return NextResponse.json({ success: true, data: { message: "Contraseña actualizada. Ya puedes iniciar sesión." } });
    }

    if (action === "logout") {
      const session = await getSession();
      if (session) {
        await db.insert(activities).values({
          userId: session.id,
          action: "logout",
          entityType: "session",
        });
      }
      await destroySession();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Acción no válida" } }, { status: 404 });
  } catch (err) {
    console.error("[auth]", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER", message: "Error del servidor" } },
      { status: 500 }
    );
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  const { action } = await params;
  if (action === "me") {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "No hay sesión" } }, { status: 401 });
    }
    const [enabledMenus, wallet, walletTxnCount] = await Promise.all([
      getEnabledMenus(session.role),
      getWallet(session.id),
      db.select({ id: walletTransactions.id }).from(walletTransactions).where(eq(walletTransactions.userId, session.id)).limit(1),
    ]);
    return NextResponse.json({
      success: true,
      data: {
        ...session,
        roleLevel: ROLE_LEVELS[session.role] ?? 30,
        enabledMenus,
        wallet,
        hasWalletHistory: walletTxnCount.length > 0,
      },
    });
  }
  return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Acción no válida" } }, { status: 404 });
}
