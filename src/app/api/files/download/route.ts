// ============================================
// TERLUX COOP - DESCARGA DE ARCHIVOS (proxy desde MinIO)
// GET /api/files/download?id=<fileId>
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { files } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { getStorage, getStorageBucket, statObject } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const name = searchParams.get("name");
  if (!id) return NextResponse.json({ success: false, error: { code: "VALIDATION" } }, { status: 400 });

  const [row] = await db.select().from(files).where(eq(files.id, id)).limit(1);
  if (!row) return NextResponse.json({ success: false, error: { code: "NOT_FOUND" } }, { status: 404 });

  const canDownload =
    row.isShared || row.userId === session.id || ["admin", "super_admin"].includes(session.role);
  if (!canDownload) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const objectName = (row.path || "").replace(/^\//, "");
  const client = getStorage();
  const stream = await client.getObject(getStorageBucket(), objectName);
  const filename = name || row.originalName || row.name || "archivo";

  // Tamaño real del objeto en MinIO (el row.size de BD puede quedar desactualizado).
  let size = Number(row.size ?? 0);
  if (size > 0) {
    const stat = await statObject(objectName).catch(() => null);
    if (stat && Number(stat.size) > 0) size = Number(stat.size);
  }

  return new Response(stream as unknown as BodyInit, {
    headers: {
      "Content-Type": row.mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Content-Length": String(size),
      "Cache-Control": "private, max-age=3600",
    },
  });
}