import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getSession } from "@/lib/auth";

export const maxDuration = 30;

const MAX_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "No autenticado" } }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file") as File | null;
  if (!file || file.size === 0) {
    return NextResponse.json({ success: false, error: { code: "NO_FILE", message: "Selecciona un archivo" } }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ success: false, error: { code: "TOO_LARGE", message: "El archivo supera los 15 MB" } }, { status: 400 });
  }

  const clean = (s: string) => s.replace(/[^a-zA-Z0-9._\-\u00C0-\u024F ]/g, "").replace(/\s+/g, "-").slice(0, 120);
  const name = clean(file.name) || `archivo-${Date.now()}`;
  const dir = path.join(process.cwd(), "public", "uploads", session.id);
  await mkdir(dir, { recursive: true });
  const finalName = `${Date.now()}-${name}`;
  await writeFile(path.join(dir, finalName), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({
    success: true,
    data: { name: file.name, url: `/uploads/${session.id}/${finalName}`, size: file.size, mimeType: file.type },
  }, { status: 201 });
}