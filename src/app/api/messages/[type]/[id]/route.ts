import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { mailMessages } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  const { type, id } = await params;
  if (type !== "mail") return NextResponse.json({ success: false }, { status: 404 });

  const body = await request.json().catch(() => ({}));

  const updates: Record<string, unknown> = {};
  if (typeof body.isRead === "boolean") updates.isRead = body.isRead;
  if (typeof body.isStarred === "boolean") updates.isStarred = body.isStarred;
  if (typeof body.isImportant === "boolean") updates.isImportant = body.isImportant;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ success: false, error: { message: "Nothing to update" } }, { status: 400 });
  }

  const [updated] = await db
    .update(mailMessages)
    .set(updates)
    .where(and(eq(mailMessages.id, id), eq(mailMessages.ownerId, session.id)))
    .returning({ id: mailMessages.id });

  if (!updated) {
    return NextResponse.json({ success: false, error: { message: "Not found" } }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: { id: updated.id } });
}
