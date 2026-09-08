// ============================================
// TERLUX COOP - API DE TAREAS (Kanban)
// ============================================

import { NextResponse, type NextRequest } from "next/server";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });

  const rows = await db.select().from(tasks).orderBy(asc(tasks.orderIndex));
  return NextResponse.json({ success: true, data: rows });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });

  const body = await request.json();
  const [row] = await db
    .insert(tasks)
    .values({
      title: body.title,
      description: body.description || null,
      status: body.status || "todo",
      priority: body.priority || "medium",
      assignedTo: body.assignedTo || session.id,
      createdBy: session.id,
      dueDate: body.dueDate || null,
      tags: body.tags || [],
      color: body.color || null,
    })
    .returning();

  return NextResponse.json({ success: true, data: row });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });

  const body = await request.json();
  if (!body.id) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION", message: "id requerido" } }, { status: 400 });
  }

  const [row] = await db
    .update(tasks)
    .set({
      status: body.status,
      title: body.title,
      description: body.description,
      priority: body.priority,
      completionPercentage: body.completionPercentage,
      orderIndex: body.orderIndex,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, body.id))
    .returning();

  return NextResponse.json({ success: true, data: row });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ success: false }, { status: 400 });

  await db.delete(tasks).where(eq(tasks.id, id));
  return NextResponse.json({ success: true });
}
