// ============================================
// TERLUX COOP - API DE INTEGRACIONES Y VPN
// Configuración por IP de: BD, almacenamiento,
// correo y clientes de app de escritorio (VPN)
// ============================================

import { NextResponse, type NextRequest } from "next/server";
import { eq, desc } from "drizzle-orm";
import net from "net";
import { db } from "@/db";
import { integrations, connectedClients, storageBuckets, socketEvents } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { totalConnections } from "@/lib/realtime";

// Prueba TCP real al host:puerto (la VPN debe enrutar la IP)
function tcpProbe(host: string, port: number, timeout = 2000): Promise<{ ok: boolean; ms: number; error?: string }> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    let done = false;
    const finish = (ok: boolean, error?: string) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve({ ok, ms: Date.now() - start, error });
    };
    socket.setTimeout(timeout);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false, "Tiempo de conexión agotado (¿VPN activa?)"));
    socket.once("error", (err) => finish(false, err.message));
    try {
      socket.connect(port, host);
    } catch (e) {
      finish(false, (e as Error).message);
    }
  });
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  if (!["super_admin", "admin", "manager"].includes(session.role)) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN" } }, { status: 403 });
  }
  const [rows, buckets, clients] = await Promise.all([
    db.select().from(integrations).orderBy(integrations.type),
    db.select().from(storageBuckets),
    db.select().from(connectedClients).orderBy(desc(connectedClients.lastSeenAt)),
  ]);
  // No exponer secretos al cliente
  const safe = rows.map((r) => ({ ...r, secret: r.secret ? "••••••••" : null }));
  return NextResponse.json({
    success: true,
    data: { integrations: safe, buckets, clients, socketConnections: totalConnections() },
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  if (!["super_admin", "admin"].includes(session.role)) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const body = await request.json();
  const action = body.action || "save";

  // --- Guardar / actualizar integración ---
  if (action === "save") {
    const values = {
      name: body.name,
      type: body.type,
      protocol: body.protocol,
      host: body.host,
      port: body.port ? Number(body.port) : null,
      username: body.username || null,
      secret: body.secret || null,
      databaseName: body.databaseName || null,
      bucket: body.bucket || null,
      vpnNetwork: body.vpnNetwork || null,
      config: body.config || {},
      updatedAt: new Date(),
    };
    let row;
    if (body.id) {
      [row] = await db.update(integrations).set(values).where(eq(integrations.id, body.id)).returning();
    } else {
      [row] = await db.insert(integrations).values({ ...values, createdBy: session.id }).returning();
    }
    return NextResponse.json({ success: true, data: { ...row, secret: row?.secret ? "••••••••" : null } });
  }

  // --- Probar conectividad ---
  if (action === "test") {
    const probe = await tcpProbe(body.host, Number(body.port));
    const status = probe.ok ? "connected" : "error";
    if (body.id) {
      await db.update(integrations).set({
        status,
        lastTestedAt: new Date(),
        lastTestResult: probe.ok ? `Conectado en ${probe.ms}ms` : probe.error,
      }).where(eq(integrations.id, body.id));
    }
    return NextResponse.json({ success: true, data: probe });
  }

  // --- Registro de cliente de escritorio (llamado por la app al conectarse) ---
  if (action === "register_client") {
    const clientId = String(body.clientId || "");
    if (!clientId) return NextResponse.json({ success: false, error: { code: "VALIDATION", message: "clientId requerido" } }, { status: 400 });
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "";
    const [existing] = await db.select().from(connectedClients).where(eq(connectedClients.clientId, clientId)).limit(1);
    let row;
    const payload = {
      deviceName: body.deviceName || null,
      platform: body.platform || null,
      appVersion: body.appVersion || null,
      userId: session.id,
      ipAddress: ip.split(",")[0].trim() || null,
      vpnIp: body.vpnIp || null,
      status: "online",
      userAgent: request.headers.get("user-agent"),
      socketId: body.socketId || null,
      metadata: body.metadata || {},
      lastSeenAt: new Date(),
    };
    if (existing) {
      [row] = await db.update(connectedClients).set(payload).where(eq(connectedClients.id, existing.id)).returning();
    } else {
      [row] = await db.insert(connectedClients).values({ ...payload, clientId, connectedAt: new Date() }).returning();
    }
    await db.insert(socketEvents).values({ clientId, channel: "system", event: "client_register", payload: { device: body.deviceName, platform: body.platform } });
    return NextResponse.json({ success: true, data: row });
  }

  // --- Heartbeat ---
  if (action === "heartbeat") {
    if (body.clientId) {
      await db.update(connectedClients).set({ lastSeenAt: new Date(), status: "online" }).where(eq(connectedClients.clientId, String(body.clientId)));
    }
    return NextResponse.json({ success: true, serverTime: new Date().toISOString(), socketConnections: totalConnections() });
  }

  return NextResponse.json({ success: false, error: { code: "BAD_ACTION" } }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session || !["super_admin", "admin"].includes(session.role)) {
    return NextResponse.json({ success: false }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const id = searchParams.get("id");
  if (clientId) {
    await db.update(connectedClients).set({ status: "blocked" }).where(eq(connectedClients.clientId, clientId));
    return NextResponse.json({ success: true });
  }
  if (id) {
    await db.delete(integrations).where(eq(integrations.id, id));
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ success: false }, { status: 400 });
}
