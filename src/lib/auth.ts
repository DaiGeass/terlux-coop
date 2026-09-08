// ============================================
// TERLUX COOP - AUTENTICACION Y SESIONES (JWT)
// ============================================

import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import {
  users,
  departments,
  roles,
  permissions,
  rolePermissions,
  companySettings,
  products,
  productCategories,
  integrations,
  storageBuckets,
  userWallets,
  walletTransactions,
  menuToggles,
  type User,
} from "@/db/schema";
import { eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "terlux-coop-secret-key-cambiar-en-produccion-2024"
);

export const SESSION_COOKIE = "terlux_session";
export const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 dias

// ============================================
// JWT
// ============================================

export async function signToken(payload: Record<string, unknown>) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(SECRET);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload;
  } catch {
    return null;
  }
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hashed: string) {
  return bcrypt.compare(plain, hashed);
}

// ============================================
// SESION
// ============================================

export interface SessionInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  position: string | null;
  avatar: string | null;
  departmentId: string | null;
  preferences: { theme: string; notifications: boolean };
}

export async function createSession(user: User) {
  const token = await signToken({
    sub: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // PoC sobre HTTP/Tailscale: se fuerza Secure solo cuando COOKIE_SECURE=true
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION,
  });
  await db
    .update(users)
    .set({ lastLogin: new Date(), updatedAt: new Date() })
    .where(eq(users.id, user.id));
  return token;
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionInfo | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload?.sub) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, String(payload.sub)))
    .limit(1);

  if (!user || !user.isActive) return null;

  const prefs =
    (user.preferences as { theme?: string; notifications?: boolean } | null) || {};

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    position: user.position,
    avatar: user.avatar,
    departmentId: user.departmentId,
    preferences: {
      theme: prefs.theme || "system",
      notifications: prefs.notifications !== false,
    },
  };
}

// Roles con privilegios (jerarquia)
export const ROLE_LEVELS: Record<string, number> = {
  super_admin: 100,
  admin: 90,
  manager: 60,
  hr: 55,
  finance: 50,
  support: 40,
  employee: 30,
  client: 10,
  guest: 0,
};

export function hasRole(userRole: string, required: string | string[]) {
  const requiredRoles = Array.isArray(required) ? required : [required];
  const userLevel = ROLE_LEVELS[userRole] ?? 0;
  return requiredRoles.some((r) => userLevel >= (ROLE_LEVELS[r] ?? 999));
}

// ============================================
// MENÚS POR ROL (el admin/TIC activa/desactiva ítems)
// ============================================

export const MENU_ITEMS = [
  "dashboard", "projects", "gantt", "tasks", "calendar",
  "messages", "directory", "documents", "files",
  "store", "billing", "payroll", "hr",
  "devices", "jobs",
  "admin", "admin-db", "admin-vpn", "settings", "reports",
  "notifications", "help",
];

export const ROLES = Object.keys(ROLE_LEVELS).filter((r) => r !== "guest");

/** Devuelve la lista de ítems de menú habilitados para un rol.
 *  Si no hay filas de configuración, todos habilitados por defecto. */
export async function getEnabledMenus(role: string): Promise<string[]> {
  const rows = await db
    .select({ item: menuToggles.item, enabled: menuToggles.enabled })
    .from(menuToggles)
    .where(eq(menuToggles.role, role));
  if (rows.length === 0) return MENU_ITEMS;
  return rows.filter((r) => r.enabled).map((r) => r.item);
}

// ============================================
// WALLET / CRÉDITOS
// ============================================

export interface WalletInfo {
  id: string;
  balance: number;
  currency: string;
}

/** Devuelve (o crea) la wallet de un usuario. */
export async function getWallet(userId: string): Promise<WalletInfo | null> {
  let [wallet] = await db.select().from(userWallets).where(eq(userWallets.userId, userId)).limit(1);
  if (!wallet) {
    [wallet] = await db
      .insert(userWallets)
      .values({ userId, balance: "0", currency: "MXN" })
      .returning();
  }
  return { id: wallet.id, balance: Number(wallet.balance), currency: wallet.currency };
}

/** Suma/resta saldo y registra la transacción de forma atómica. */
export async function applyWalletMovement(
  userId: string,
  type: "credit" | "debit",
  amount: number,
  description: string,
  reference?: string,
  createdBy?: string
): Promise<WalletInfo | null> {
  const wallet = await getWallet(userId);
  if (!wallet) return null;
  const delta = type === "debit" ? -amount : amount;
  const newBalance = Math.max(0, wallet.balance + delta);
  if (type === "debit" && wallet.balance < amount) return null;

  const [updated] = await db
    .update(userWallets)
    .set({ balance: String(newBalance.toFixed(2)), updatedAt: new Date() })
    .where(eq(userWallets.id, wallet.id))
    .returning();

  await db.insert(walletTransactions).values({
    walletId: wallet.id,
    userId,
    type,
    amount: String(Math.abs(amount).toFixed(2)),
    description,
    reference: reference || `TXN-${Date.now()}`,
    createdBy: createdBy || null,
    balanceAfter: String(newBalance.toFixed(2)),
  });

  return { id: updated.id, balance: Number(updated.balance), currency: "MXN" };
}

// ============================================
// PRIMERA INSTALACION / SEMILLA
// Se ejecuta automaticamente la primera vez
// Credenciales documentadas en /CREDENCIALES.txt
// ============================================

let seedingPromise: Promise<void> | null = null;

export async function ensureSeed() {
  if (seedingPromise) return seedingPromise;
  seedingPromise = runSeed().catch((err) => {
    // Permitir reintentar en la siguiente petición si la inicialización falló
    seedingPromise = null;
    throw err;
  });
  return seedingPromise;
}

async function runSeed() {
  const existing = await db.select({ id: users.id }).from(users).limit(1);
  if (existing.length > 0) {
    await ensureWalletUserSeed();
    return;
  }

  console.log("[TerLux] Primera ejecución: inicializando datos base...");

  // Roles
  const roleDefs = [
    { name: "super_admin", description: "Acceso total al sistema", isAdmin: true },
    { name: "admin", description: "Administrador de la plataforma", isAdmin: true },
    { name: "manager", description: "Gestor de equipos y proyectos", isAdmin: false },
    { name: "hr", description: "Recursos Humanos", isAdmin: false },
    { name: "finance", description: "Finanzas y facturación", isAdmin: false },
    { name: "support", description: "Agente de soporte", isAdmin: false },
    { name: "employee", description: "Empleado estándar", isAdmin: false },
    { name: "client", description: "Cliente / usuario registrado", isAdmin: false },
  ];
  for (const r of roleDefs) {
    await db.insert(roles).values({ ...r, isDefault: r.name === "employee" }).onConflictDoNothing();
  }

  // Permisos base
  const perms = [
    ["dashboard.view", "Ver dashboard", "general"],
    ["projects.view", "Ver proyectos", "projects"],
    ["projects.manage", "Gestionar proyectos", "projects"],
    ["tasks.view", "Ver tareas", "tasks"],
    ["tasks.manage", "Gestionar tareas", "tasks"],
    ["files.view", "Ver archivos", "files"],
    ["files.manage", "Gestionar archivos", "files"],
    ["documents.view", "Ver documentos", "documents"],
    ["documents.manage", "Gestionar documentos", "documents"],
    ["messages.view", "Ver mensajería", "messages"],
    ["calendar.view", "Ver calendario", "calendar"],
    ["payroll.view", "Ver nóminas", "payroll"],
    ["payroll.manage", "Gestionar nóminas", "payroll"],
    ["store.view", "Ver tienda", "store"],
    ["store.purchase", "Comprar servicios", "store"],
    ["billing.manage", "Gestionar facturación", "billing"],
    ["directory.view", "Ver directorio", "directory"],
    ["support.manage", "Gestionar soporte", "support"],
    ["admin.view", "Ver panel de administración", "admin"],
    ["admin.users", "Gestionar usuarios", "admin"],
    ["admin.roles", "Gestionar roles", "admin"],
    ["admin.database", "Explorar base de datos", "admin"],
    ["admin.integrations", "Configurar integraciones/VPN", "admin"],
    ["admin.security", "Gestionar seguridad", "admin"],
  ] as const;

  const permRows: Record<string, string> = {};
  for (const [code, name, category] of perms) {
    const [row] = await db
      .insert(permissions)
      .values({ name, code, category, description: name })
      .onConflictDoNothing()
      .returning({ id: permissions.id });
    if (row) permRows[code] = row.id;
  }

  // Departamentos
  const deptDefs = [
    { name: "Dirección", color: "#6366f1" },
    { name: "Tecnología", color: "#3b82f6" },
    { name: "Recursos Humanos", color: "#10b981" },
    { name: "Finanzas", color: "#f59e0b" },
    { name: "Marketing", color: "#ec4899" },
    { name: "Soporte", color: "#06b6d4" },
  ];
  const deptIds: Record<string, string> = {};
  const existingDepts = await db.select().from(departments);
  for (const d of deptDefs) {
    const found = existingDepts.find((x) => x.name === d.name);
    if (found) { deptIds[d.name] = found.id; continue; }
    const [row] = await db.insert(departments).values(d).returning({ id: departments.id });
    deptIds[d.name] = row.id;
  }

  // Configuración de empresa (solo si no existe)
  const existingSettings = await db.select({ id: companySettings.id }).from(companySettings).limit(1);
  if (existingSettings.length === 0) {
  await db.insert(companySettings).values({
    companyName: "TerLux Coop",
    companyEmail: "info@terluxcoop.com",
    companyPhone: "+34 900 000 000",
    companyAddress: "Av. de la Innovación 42, Madrid, España",
    currency: "MXN",
    language: "es",
    timezone: "Europe/Madrid",
  });
  }

  // Integraciones preconfiguradas (plantillas de conexión VPN)
  const integrationDefs = [
    {
      name: "Base de Datos Central (VPN)",
      type: "database",
      protocol: "postgres",
      host: "10.8.0.11",
      port: 5432,
      username: "terlux_app",
      databaseName: "terlux_core",
      vpnNetwork: "10.8.0.0/24",
      config: { ssl: true, description: "PostgreSQL principal accesible por VPN WireGuard" },
    },
    {
      name: "Almacenamiento de Archivos (VPN)",
      type: "storage",
      protocol: "s3",
      host: "10.8.0.20",
      port: 9000,
      username: "terlux_storage",
      bucket: "terlux-files",
      vpnNetwork: "10.8.0.0/24",
      config: { engine: "MinIO S3", pathStyle: true, alternatives: ["SMB 10.8.0.21:445", "FTP 10.8.0.22:21"] },
    },
    {
      name: "Servidor de Correo (VPN)",
      type: "mail",
      protocol: "smtp",
      host: "10.8.0.30",
      port: 587,
      username: "no-reply@terluxcoop.com",
      vpnNetwork: "10.8.0.0/24",
      config: { imapHost: "10.8.0.30", imapPort: 993, encryption: "STARTTLS" },
    },
    {
      name: "Puerta de Enlace VPN / App de Escritorio",
      type: "vpn",
      protocol: "wireguard",
      host: "0.0.0.0",
      port: 51820,
      vpnNetwork: "10.8.0.0/24",
      config: {
        apiPort: 8443,
        socketPath: "/api/realtime/stream",
        allowedIps: "10.8.0.0/24",
        dns: "10.8.0.1",
        keepalive: 25,
        nota: "Rango solicitado 67.7.0.0/16 descartado por ser IP pública (DoD USA). Se recomienda 10.8.0.0/24 (RFC1918).",
      },
    },
  ];
  const existingIntegrations = await db.select({ id: integrations.id }).from(integrations).limit(1);
  if (existingIntegrations.length === 0) {
    for (const i of integrationDefs) {
      await db.insert(integrations).values({
        ...i,
        config: i.config as object,
        status: "disconnected",
      });
    }
  }

  const existingBuckets = await db.select({ id: storageBuckets.id }).from(storageBuckets).limit(1);
  if (existingBuckets.length === 0) {
    await db.insert(storageBuckets).values([
      { name: "Documentos corporativos", path: "/corporativo", quotaBytes: 107374182400, usedBytes: 0, isDefault: true },
      { name: "Proyectos", path: "/proyectos", quotaBytes: 536870912000, usedBytes: 0 },
      { name: "Personal", path: "/personal", quotaBytes: 10737418240, usedBytes: 0 },
    ]);
  }

  // Categorías y productos (planes de diseño web y servicios)
  const cats = [
    { name: "Diseño Web", slug: "diseno-web", icon: "globe" },
    { name: "Planes Cloud", slug: "cloud", icon: "cloud" },
    { name: "Soporte y Mantenimiento", slug: "soporte", icon: "life-buoy" },
    { name: "Paquetes Enterprise", slug: "enterprise", icon: "building" },
  ];
  const catIds: Record<string, string> = {};
  for (const c of cats) {
    const [row] = await db.insert(productCategories).values(c).returning({ id: productCategories.id });
    catIds[c.slug] = row.id;
  }

  const productDefs = [
    ["PLAN-LANDING", "Plan Landing Page", "diseno-web", 490, "one_time", [
      "Diseño de página de aterrizaje profesional", "1 sección de contacto integrada", "Optimización móvil (responsive)", "Entrega en 7 días hábiles", "1 revisión incluida",
    ]],
    ["PLAN-CORP", "Plan Web Corporativa", "diseno-web", 1490, "one_time", [
      "Hasta 8 secciones/páginas", "Integración con la suite TerLux", "Blog y noticias", "SEO básico incluido", "Formularios y CRM", "2 rondas de revisión",
    ]],
    ["PLAN-ECOM", "Plan E-Commerce", "diseno-web", 2990, "one_time", [
      "Tienda online completa", "Pasarela de pago (tarjeta, Bizum, PayPal)", "Gestión de inventario", "Panel de administración", "Integración de facturación", "Formación incluida",
    ]],
    ["PLAN-ENTERPRISE", "Plan Enterprise a Medida", "enterprise", 9990, "one_time", [
      "Desarrollo 100% a medida", "Integración con VPN y sockets", "App de escritorio sincronizada", "SLA 99,9% garantizado", "Gestor de cuenta dedicado", "Auditoría de seguridad",
    ]],
    ["CLOUD-BASIC", "Cloud Básico (100 GB)", "cloud", 19, "monthly", [
      "100 GB almacenamiento replicado", "Cifrado AES-256", "Copias diarias 7 días", "Acceso VPN",
    ]],
    ["CLOUD-PRO", "Cloud Profesional (1 TB)", "cloud", 79, "monthly", [
      "1 TB almacenamiento", "Copias diarias 30 días", "Sincronización app escritorio", "Soporte prioritario",
    ]],
    ["SUP-START", "Bono Soporte 5 horas", "soporte", 180, "one_time", [
      "5 horas de soporte técnico", "Respuesta en 24h laborables", "Válido 6 meses",
    ]],
    ["SUP-MONTH", "Mantenimiento Mensual Pro", "soporte", 120, "monthly", [
      "10 horas/mes incluidas", "Actualizaciones de seguridad", "Monitorización 24/7", "Canal de soporte dedicado",
    ]],
  ] as const;

  let sort = 0;
  for (const [sku, name, cat, price, period, features] of productDefs) {
    await db.insert(products).values({
      sku,
      name,
      slug: sku.toLowerCase(),
      categoryId: catIds[cat],
      type: cat === "diseno-web" || cat === "enterprise" ? "plan" : "pack",
      price: String(price),
      recurringPeriod: period === "monthly" ? "monthly" : null,
      features: features as unknown as object,
      isActive: true,
      isFeatured: true,
      sortOrder: sort++,
      description: name,
      longDescription: Array.isArray(features) ? features.join(". ") + "." : "",
    });
  }

  // Los 3 usuarios documentados en CREDENCIALES.txt
  const passwordHash = await hashPassword("TerLux2024!");
  const adminHash = await hashPassword("AdminTerLux#24");
  const empHash = await hashPassword("Empleado2024$");
  const testerHash = await hashPassword("Cliente2024$");

  await db.insert(users).values([
    {
      email: "admin@terluxcoop.com",
      password: adminHash,
      firstName: "Alejandra",
      lastName: "Directora",
      role: "super_admin",
      position: "Directora General",
      departmentId: deptIds["Dirección"],
      salary: "72000.00",
      hireDate: "2022-01-10",
      phone: "+34 600 000 001",
    },
    {
      email: "gerente@terluxcoop.com",
      password: passwordHash,
      firstName: "Manuel",
      lastName: "Gestor",
      role: "manager",
      position: "Jefe de Proyectos",
      departmentId: deptIds["Tecnología"],
      salary: "48000.00",
      hireDate: "2022-06-15",
      phone: "+34 600 000 002",
    },
    {
      email: "empleado@terluxcoop.com",
      password: empHash,
      firstName: "Lucía",
      lastName: "Empleada",
      role: "employee",
      position: "Desarrolladora",
      departmentId: deptIds["Tecnología"],
      salary: "28500.00",
      hireDate: "2023-09-01",
      phone: "+34 600 000 003",
    },
    {
      email: "tester@terluxcoop.com",
      password: testerHash,
      firstName: "Carlos",
      lastName: "Tester",
      role: "client",
      position: "Cuenta de pruebas (PoC)",
      departmentId: null,
      hireDate: "2024-01-01",
      phone: "+34 600 000 004",
    },
  ]);

  await ensureWalletUserSeed();

  console.log("[TerLux] Inicialización completada. Usuarios base creados (ver CREDENCIALES.txt)");
}

/** Tareas idempotentes para cada arranque:
 *  - Crear wallet a todos los usuarios que no la tengan.
 *  - Garantizar la cuenta tester (PoC) con 5.000 € de crédito.
 *  - Crear filas de activación de menús por rol. */
async function ensureWalletUserSeed() {
  const allUsers = await db.select({ id: users.id, email: users.email }).from(users);

  for (const u of allUsers) {
    const wallet = await getWallet(u.id);
    if (!wallet) continue;

    // Cuenta tester recibe 5.000 € de crédito la primera vez (PoC)
    if (u.email === "tester@terluxcoop.com" && wallet.balance === 0) {
      const hasTxn = await db
        .select({ id: walletTransactions.id })
        .from(walletTransactions)
        .where(eq(walletTransactions.userId, u.id))
        .limit(1);
      if (hasTxn.length === 0) {
        await applyWalletMovement(
          u.id, "credit", 5000,
          "Saldo inicial de demostración (PoC - Tester)",
          "SEED-TESTER-5000"
        );
      }
    }
  }

  // Cuenta tester por defecto (idempotente para instalaciones previas)
  const [tester] = await db.select().from(users).where(eq(users.email, "tester@terluxcoop.com")).limit(1);
  if (!tester) {
    const testerHash = await hashPassword("Cliente2024$");
    const [created] = await db.insert(users).values({
      email: "tester@terluxcoop.com",
      password: testerHash,
      firstName: "Carlos",
      lastName: "Tester",
      role: "client",
      position: "Cuenta de pruebas (PoC)",
      hireDate: "2024-01-01",
      phone: "+34 600 000 004",
    }).returning();
    await applyWalletMovement(
      created.id, "credit", 5000,
      "Saldo inicial de demostración (PoC - Tester)",
      "SEED-TESTER-5000"
    );
  }

  // Menús por rol (todos habilitados por defecto)
  for (const role of ROLES) {
    const existing = await db
      .select({ item: menuToggles.item })
      .from(menuToggles)
      .where(eq(menuToggles.role, role))
      .limit(1);
    if (existing.length === 0) {
      for (const item of MENU_ITEMS) {
        await db.insert(menuToggles).values({ role, item, enabled: true }).onConflictDoNothing();
      }
    }
  }
}
