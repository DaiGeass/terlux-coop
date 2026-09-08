// ============================================
// TERLUX COOP - API DE DOCUMENTOS
// ============================================

import { NextResponse, type NextRequest } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { documents, users } from "@/db/schema";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  const rows = await db
    .select({ d: documents, u: users })
    .from(documents)
    .leftJoin(users, eq(documents.authorId, users.id))
    .orderBy(desc(documents.updatedAt));

  const data = rows
    .map(({ d, u }) => ({
      ...d,
      author: u ? { id: u.id, name: `${u.firstName} ${u.lastName}` } : null,
    }))
    .filter((d) => !type || d.type === type);
  return NextResponse.json({ success: true, data });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  const body = await request.json();

  const [row] = await db
    .insert(documents)
    .values({
      title: body.title,
      content: body.content || "",
      type: body.type || "document",
      status: body.status || "draft",
      authorId: session.id,
      departmentId: body.departmentId || null,
      tags: body.tags || [],
    })
    .returning();
  return NextResponse.json({ success: true, data: row });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  const body = await request.json();
  if (!body.id) return NextResponse.json({ success: false }, { status: 400 });
  const [row] = await db
    .update(documents)
    .set({
      title: body.title,
      content: body.content,
      type: body.type,
      status: body.status,
      updatedAt: new Date(),
    })
    .where(eq(documents.id, body.id))
    .returning();
  return NextResponse.json({ success: true, data: row });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ success: false }, { status: 400 });
  await db.delete(documents).where(eq(documents.id, id));
  return NextResponse.json({ success: true });
}
