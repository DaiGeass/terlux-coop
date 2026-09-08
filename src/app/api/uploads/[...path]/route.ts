import { NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";
import { getSession } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "No autenticado" } }, { status: 401 });
  }

  const segments = (await params).path;
  if (!segments?.length || segments.some((s) => s.includes(".."))) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Archivo no encontrado" } }, { status: 404 });
  }

  const rel = segments.join("/");
  const filePath = path.join(process.cwd(), "public", "uploads", rel);
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("no file");
  } catch {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Archivo no encontrado" } }, { status: 404 });
  }

  const buf = await readFile(filePath);
  const ext = path.extname(segments[segments.length - 1]).toLowerCase();
  const mime = {
    ".pdf": "application/pdf", ".txt": "text/plain", ".csv": "text/csv",
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
    ".webp": "image/webp", ".doc": "application/msword", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".zip": "application/zip", ".json": "application/json",
  }[ext] || "application/octet-stream";

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Length": String(buf.length),
      "Content-Disposition": `inline; filename="${segments[segments.length - 1].replace(/^\d+-/, "")}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}