// ============================================
// TERLUX COOP - API DE RRHH: DÍAS LIBRES
// ============================================

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { timeOffRequests, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const rows = await db
      .select({
        id: timeOffRequests.id,
        userId: timeOffRequests.userId,
        type: timeOffRequests.type,
        startDate: timeOffRequests.startDate,
        endDate: timeOffRequests.endDate,
        days: timeOffRequests.days,
        reason: timeOffRequests.reason,
        status: timeOffRequests.status,
        approvedBy: timeOffRequests.approvedBy,
        approvedAt: timeOffRequests.approvedAt,
        createdAt: timeOffRequests.createdAt,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(timeOffRequests)
      .leftJoin(users, eq(timeOffRequests.userId, users.id))
      .orderBy(desc(timeOffRequests.createdAt));

    const data = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      type: r.type,
      startDate: r.startDate,
      endDate: r.endDate,
      days: r.days,
      reason: r.reason,
      status: r.status,
      approvedBy: r.approvedBy,
      approvedAt: r.approvedAt,
      createdAt: r.createdAt,
      user: r.firstName ? { firstName: r.firstName, lastName: r.lastName } : null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[hr/timeoff:get]", error);
    return NextResponse.json({ success: false, error: "Error al obtener solicitudes" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();

    // Calcular días automáticamente
    const start = new Date(body.startDate);
    const end = new Date(body.endDate);
    const days = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const [row] = await db
      .insert(timeOffRequests)
      .values({
        userId: session.id,
        type: body.type,
        startDate: body.startDate,
        endDate: body.endDate,
        days: String(days),
        reason: body.reason || null,
        status: "pending",
      })
      .returning();

    return NextResponse.json({ success: true, data: row });
  } catch (error) {
    console.error("[hr/timeoff:post]", error);
    return NextResponse.json({ success: false, error: "Error al crear solicitud" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!["admin", "super_admin", "hr", "manager"].includes(session.role)) {
    return NextResponse.json({ success: false, error: "Sin permisos" }, { status: 403 });
  }

  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ success: false, error: "ID requerido" }, { status: 400 });

    const [row] = await db
      .update(timeOffRequests)
      .set({
        status: body.status,
        approvedBy: body.status === "approved" || body.status === "rejected" ? session.id : undefined,
        approvedAt: body.status === "approved" || body.status === "rejected" ? new Date() : undefined,
      })
      .where(eq(timeOffRequests.id, body.id))
      .returning();

    return NextResponse.json({ success: true, data: row });
  } catch (error) {
    console.error("[hr/timeoff:patch]", error);
    return NextResponse.json({ success: false, error: "Error al actualizar" }, { status: 500 });
  }
}
