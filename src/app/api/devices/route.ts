// ============================================
// TERLUX COOP - API DE DISPOSITIVOS (MDM)
// ============================================

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { devices, deviceAssignments, users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// GET - Listar todos los dispositivos
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const rows = await db
      .select({
        device: devices,
        assignee: users,
      })
      .from(devices)
      .leftJoin(users, eq(devices.assignedTo, users.id))
      .orderBy(desc(devices.createdAt));

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("[devices:get]", error);
    return NextResponse.json({ success: false, error: "Error al obtener dispositivos" }, { status: 500 });
  }
}

// POST - Crear nuevo dispositivo
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const [device] = await db
      .insert(devices)
      .values({
        name: body.name,
        type: body.type || "laptop",
        brand: body.brand,
        model: body.model,
        serialNumber: body.serialNumber,
        os: body.os,
        osVersion: body.osVersion,
        ipAddress: body.ipAddress,
        macAddress: body.macAddress,
        status: body.status || "available",
        purchaseDate: body.purchaseDate,
        warrantyExpiry: body.warrantyExpiry,
        cost: body.cost,
        departmentId: body.departmentId,
        location: body.location,
        notes: body.notes,
        specifications: body.specifications || {},
      })
      .returning();

    return NextResponse.json({ success: true, data: device });
  } catch (error) {
    console.error("[devices:post]", error);
    return NextResponse.json({ success: false, error: "Error al crear dispositivo" }, { status: 500 });
  }
}

// PATCH - Actualizar dispositivo
export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ success: false, error: "ID requerido" }, { status: 400 });

    const [device] = await db
      .update(devices)
      .set({
        name: body.name,
        type: body.type,
        brand: body.brand,
        model: body.model,
        serialNumber: body.serialNumber,
        os: body.os,
        osVersion: body.osVersion,
        ipAddress: body.ipAddress,
        macAddress: body.macAddress,
        status: body.status,
        purchaseDate: body.purchaseDate,
        warrantyExpiry: body.warrantyExpiry,
        cost: body.cost,
        assignedTo: body.assignedTo,
        departmentId: body.departmentId,
        location: body.location,
        notes: body.notes,
        specifications: body.specifications,
        updatedAt: new Date(),
      })
      .where(eq(devices.id, body.id))
      .returning();

    // Si se asignó a un usuario, crear registro de asignación
    if (body.assignedTo && body.assignedTo !== body.previousAssignedTo) {
      await db.insert(deviceAssignments).values({
        deviceId: body.id,
        userId: body.assignedTo,
        assignedBy: session.id,
        condition: "good",
      });
    }

    return NextResponse.json({ success: true, data: device });
  } catch (error) {
    console.error("[devices:patch]", error);
    return NextResponse.json({ success: false, error: "Error al actualizar dispositivo" }, { status: 500 });
  }
}

// DELETE - Eliminar dispositivo
export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "ID requerido" }, { status: 400 });

    await db.delete(devices).where(eq(devices.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[devices:delete]", error);
    return NextResponse.json({ success: false, error: "Error al eliminar dispositivo" }, { status: 500 });
  }
}
