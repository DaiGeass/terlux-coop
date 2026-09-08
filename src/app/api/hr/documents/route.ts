// ============================================
// TERLUX COOP - DOCUMENTOS DE EMPLEADOS (RRHH)
// ============================================

import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { employeeDocuments, users, departments } from "@/db/schema";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "No autenticado" } }, { status: 401 });
    }

    const rows = await db
      .select({
        id: employeeDocuments.id,
        type: employeeDocuments.type,
        name: employeeDocuments.name,
        fileUrl: employeeDocuments.fileUrl,
        fileSize: employeeDocuments.fileSize,
        mimeType: employeeDocuments.mimeType,
        expiresAt: employeeDocuments.expiresAt,
        createdAt: employeeDocuments.createdAt,
        userId: users.id,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        position: users.position,
        departmentName: departments.name,
      })
      .from(employeeDocuments)
      .leftJoin(users, eq(employeeDocuments.userId, users.id))
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .orderBy(desc(employeeDocuments.createdAt));

    const data = rows.map((r) => ({
      id: r.id,
      type: r.type,
      name: r.name,
      fileUrl: r.fileUrl,
      fileSize: r.fileSize,
      mimeType: r.mimeType,
      expiresAt: r.expiresAt ? new Date(r.expiresAt).toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      user: {
        id: r.userId,
        name: [r.userFirstName, r.userLastName].filter(Boolean).join(" ").trim() || "Sin nombre",
        position: r.position ?? "",
        department: r.departmentName ?? "",
      },
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error obteniendo documentos:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL", message: "Error al obtener documentos" } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "No autenticado" } }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const name = String(body?.name ?? "").trim();
    const userId = String(body?.userId ?? "").trim();
    const type = String(body?.type ?? "other");
    const fileUrl = String(body?.fileUrl ?? "/documentos/" + name).trim();
    if (!name || !userId) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION", message: "Faltan campos obligatorios" } }, { status: 400 });
    }

    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Empleado no encontrado" } }, { status: 404 });
    }

    const [created] = await db
      .insert(employeeDocuments)
      .values({
        userId,
        type,
        name,
        fileUrl,
        fileSize: body?.fileSize ? Number(body.fileSize) : null,
        mimeType: body?.mimeType ? String(body.mimeType) : null,
        expiresAt: body?.expiresAt ? String(body.expiresAt) : null,
        uploadedBy: session.id,
      })
      .returning({ id: employeeDocuments.id, name: employeeDocuments.name, type: employeeDocuments.type });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error("Error creando documento:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL", message: "Error al crear documento" } }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "No autenticado" } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: { code: "VALIDATION" } }, { status: 400 });

    await db.delete(employeeDocuments).where(eq(employeeDocuments.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error eliminando documento:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL" } }, { status: 500 });
  }
}