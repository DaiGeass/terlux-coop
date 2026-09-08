// ============================================
// TERLUX COOP - API DE AUTENTICACION
// /api/auth/login | register | logout | me
// ============================================

import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
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
      const { email, password, firstName, lastName } = body;

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
