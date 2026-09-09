// ============================================
// TERLUX COOP - API DE ADMINISTRACION
// Secciones: users | database | stats | settings
//            | roles | activities
// ============================================

import { NextResponse, type NextRequest } from "next/server";
import { eq, and, like, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  users, departments, roles, permissions, rolePermissions,
  companySettings, activities, projects, tasks, orders,
  userWallets, walletTransactions, menuToggles,
} from "@/db/schema";
import { getSession, hashPassword, getEnabledMenus, applyWalletMovement, MENU_ITEMS, ROLES } from "@/lib/auth";

async function requireAdmin(session: NonNullable<Awaited<ReturnType<typeof getSession>>>) {
  return ["super_admin", "admin", "manager"].includes(session.role);
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  if (!(await requireAdmin(session))) return NextResponse.json({ success: false, error: { code: "FORBIDDEN" } }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const section = searchParams.get("section") || "stats";

  if (section === "users") {
    const q = searchParams.get("q");
    const role = searchParams.get("role");
    const base = db.select().from(users);
    const rows = q
      ? await base.where(like(users.email, `%${q}%`)).orderBy(desc(users.createdAt))
      : role
        ? await base.where(eq(users.role, role)).orderBy(desc(users.createdAt))
        : await base.orderBy(desc(users.createdAt));
    const depts = await db.select().from(departments);
    const safe = rows.map(({ password: _pw, ...u }) => ({ ...u, department: depts.find((d) => d.id === u.departmentId) || null }));
    return NextResponse.json({ success: true, data: safe });
  }

  if (section === "database") {
    const tableName = searchParams.get("table");
    const tableRows = await db.execute<{ table_name: string }>(sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name`);
    const tables = tableRows.rows.map((r) => r.table_name);

    let rows: unknown[] = [];
    let columns: string[] = [];
    if (tableName && /^[a-z_]+$/.test(tableName) && tables.includes(tableName)) {
      const result = await db.execute(sql.raw(`SELECT * FROM "${tableName}" LIMIT 100`));
      rows = result.rows;
      columns = rows.length ? Object.keys(rows[0] as Record<string, unknown>) : [];
    }
    return NextResponse.json({ success: true, data: { tables, rows, columns, selected: tableName || null } });
  }

  if (section === "roles") {
    const [roleRows, permRows, rp] = await Promise.all([
      db.select().from(roles),
      db.select().from(permissions),
      db.select().from(rolePermissions),
    ]);
    return NextResponse.json({ success: true, data: { roles: roleRows, permissions: permRows, rolePermissions: rp } });
  }

  if (section === "activities") {
    const rows = await db
      .select({ a: activities, u: users })
      .from(activities)
      .leftJoin(users, eq(activities.userId, users.id))
      .orderBy(desc(activities.createdAt))
      .limit(100);
    return NextResponse.json({
      success: true,
      data: rows.map(({ a, u }) => ({ ...a, userName: u ? `${u.firstName} ${u.lastName}` : "Sistema" })),
    });
  }

  if (section === "settings") {
    const [row] = await db.select().from(companySettings).limit(1);
    return NextResponse.json({ success: true, data: row });
  }

  // Menús por rol (admin/TIC activa o desactiva ítems)
  if (section === "menus") {
    const rows = await db.select().from(menuToggles);
    const byRole: Record<string, Record<string, boolean>> = {};
    for (const role of ROLES) {
      byRole[role] = {};
      for (const item of MENU_ITEMS) byRole[role][item] = true;
    }
    for (const r of rows) {
      if (byRole[r.role]) byRole[r.role][r.item] = r.enabled;
    }
    return NextResponse.json({ success: true, data: { items: MENU_ITEMS, roles: ROLES, toggles: byRole } });
  }

  // Wallets: saldo de todos los usuarios + movimientos
  if (section === "wallets") {
    const wallets = await db.select().from(userWallets);
    const userRows = await db.select({
      id: users.id, email: users.email, firstName: users.firstName,
      lastName: users.lastName, role: users.role, isActive: users.isActive,
    }).from(users);
    const txns = await db.select().from(walletTransactions).orderBy(desc(walletTransactions.createdAt)).limit(200);
    return NextResponse.json({
      success: true,
      data: {
        wallets: userRows.map((u) => {
          const w = wallets.find((x) => x.userId === u.id);
          return { ...u, balance: w ? Number(w.balance) : 0, walletId: w?.id || null };
        }),
        transactions: txns,
      },
    });
  }

  // stats
  const [u, p, t, o, activeUsers] = await Promise.all([
    db.select({ id: users.id }).from(users),
    db.select({ id: projects.id }).from(projects),
    db.select({ id: tasks.id, status: tasks.status }).from(tasks),
    db.select({ id: orders.id, total: orders.total, status: orders.status }).from(orders),
    db.select({ id: users.id }).from(users).where(eq(users.isActive, true)),
  ]);
  return NextResponse.json({
    success: true,
    data: {
      totalUsers: u.length, activeUsers: activeUsers.length,
      totalProjects: p.length,
      totalTasks: t.length, completedTasks: t.filter((x) => x.status === "done").length,
      totalOrders: o.length, paidOrders: o.filter((x) => x.status === "paid").length,
      revenue: o.filter((x) => x.status === "paid").reduce((s, x) => s + Number(x.total), 0).toFixed(2),
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  if (!["super_admin", "admin"].includes(session.role)) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN" } }, { status: 403 });
  }
  const body = await request.json();

  // Crear usuario
  if (body.action === "create_user") {
    if (!body.email || !body.password || !body.firstName || !body.lastName) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION", message: "Faltan campos" } }, { status: 400 });
    }
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email.toLowerCase())).limit(1);
    if (existing) return NextResponse.json({ success: false, error: { code: "EXISTS", message: "El correo ya existe" } }, { status: 409 });
    const [row] = await db.insert(users).values({
      email: body.email.toLowerCase().trim(),
      password: await hashPassword(body.password),
      firstName: body.firstName, lastName: body.lastName,
      role: body.role || "employee", position: body.position || null,
      departmentId: body.departmentId || null, phone: body.phone || null,
      salary: body.salary ? String(body.salary) : null,
      hireDate: body.hireDate || null,
    }).returning();
    await db.insert(activities).values({ userId: session.id, action: "create", entityType: "user", entityId: row.id });
    return NextResponse.json({ success: true, data: row });
  }

  // Actualizar ajustes de empresa / seguridad
  if (body.action === "update_settings") {
    const [current] = await db.select().from(companySettings).limit(1);
    if (current) {
      const [row] = await db.update(companySettings).set({
        companyName: body.companyName ?? current.companyName,
        companyEmail: body.companyEmail ?? current.companyEmail,
        companyPhone: body.companyPhone ?? current.companyPhone,
        companyAddress: body.companyAddress ?? current.companyAddress,
        currency: body.currency ?? current.currency,
        timezone: body.timezone ?? current.timezone,
        settings: { ...(current.settings as object), ...(body.security || {}) },
        updatedAt: new Date(),
      }).returning();
      return NextResponse.json({ success: true, data: row });
    }
    return NextResponse.json({ success: false }, { status: 404 });
  }

  // Activar / desactivar un ítem de menú para un rol
  if (body.action === "toggle_menu") {
    const role = String(body.role || "");
    const item = String(body.item || "");
    const enabled = body.enabled === true;
    if (!ROLES.includes(role) || !MENU_ITEMS.includes(item)) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION", message: "Rol o ítem inválido" } }, { status: 400 });
    }
    const [existing] = await db
      .select()
      .from(menuToggles)
      .where(and(eq(menuToggles.role, role), eq(menuToggles.item, item)))
      .limit(1);
    if (existing) {
      await db.update(menuToggles).set({ enabled, updatedBy: session.id, updatedAt: new Date() })
        .where(eq(menuToggles.id, existing.id));
    } else {
      await db.insert(menuToggles).values({ role, item, enabled, updatedBy: session.id });
    }
    await db.insert(activities).values({
      userId: session.id, action: "toggle_menu", entityType: "menu",
      entityId: `${role}:${item}:${enabled ? "on" : "off"}`,
    });
    return NextResponse.json({ success: true });
  }

  // Añadir crédito a la wallet de un usuario (PoC: cuenta tester)
  if (body.action === "add_credit") {
    const targetId = String(body.userId || "");
    const amount = Math.round(Number(body.amount || 0) * 100) / 100;
    if (!targetId || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION", message: "Usuario o importe inválido" } }, { status: 400 });
    }
    const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, targetId)).limit(1);
    if (!target) return NextResponse.json({ success: false, error: { code: "NOT_FOUND" } }, { status: 404 });

    const wallet = await applyWalletMovement(
      targetId, "credit", amount,
      `Crédito añadido por ${session.firstName} ${session.lastName}`,
      `ADMIN-${Date.now()}`,
      session.id
    );
    await db.insert(activities).values({
      userId: session.id, action: "add_credit", entityType: "wallet", entityId: targetId,
    });
    return NextResponse.json({ success: true, data: wallet });
  }

  return NextResponse.json({ success: false, error: { code: "BAD_ACTION" } }, { status: 400 });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session || !["super_admin", "admin"].includes(session.role)) {
    return NextResponse.json({ success: false }, { status: 403 });
  }
  const body = await request.json();
  if (!body.id) return NextResponse.json({ success: false }, { status: 400 });

  const [row] = await db.update(users).set({
    role: body.role,
    position: body.position,
    departmentId: body.departmentId,
    isActive: body.isActive,
    updatedAt: new Date(),
  }).where(eq(users.id, body.id)).returning();
  await db.insert(activities).values({ userId: session.id, action: "update", entityType: "user", entityId: body.id });
  return NextResponse.json({ success: true, data: row });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Solo el super administrador puede eliminar usuarios" } }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id || id === session.id) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION", message: "No puedes eliminar tu propia cuenta" } }, { status: 400 });
  }
  await db.delete(users).where(eq(users.id, id));
  return NextResponse.json({ success: true });
}
