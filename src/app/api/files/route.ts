// ============================================
// TERLUX COOP - API DE ARCHIVOS (DRIVE)
// Binarios en MinIO S3 (tools/minio, datos en storage/),
// metadatos en PostgreSQL. Soporta subida de carpetas
// enteras desde el navegador (webkitdirectory).
// ============================================

import { NextResponse, type NextRequest } from "next/server";
import { eq, desc, like, and, or, isNull } from "drizzle-orm";
import { db } from "@/db";
import { files, folders, users } from "@/db/schema";
import { getSession, getStorageQuota } from "@/lib/auth";
import { uploadObject, ensureBucket, getStorageBucket, removeObject } from "@/lib/storage";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get("folderId") || null;
  const type = searchParams.get("type");
  const q = searchParams.get("q");
  const scope = searchParams.get("scope") || "mine";

  const conditions = [];
  if (scope === "all") {
    // Nada: todos los archivos visibles
  } else if (scope === "shared") {
    conditions.push(eq(files.isShared, true));
  } else {
    conditions.push(or(eq(files.userId, session.id), eq(files.isShared, true)));
  }
  if (folderId) conditions.push(eq(files.folderId, folderId));
  if (type) conditions.push(eq(files.type, type));
  if (q) conditions.push(like(files.name, `%${q}%`));

  const fileRows = await db
    .select()
    .from(files)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(files.createdAt));

  const owners = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName }).from(users);
  const nameOf = (uid: string) => {
    const u = owners.find((o) => o.id === uid);
    return u ? `${u.firstName} ${u.lastName}` : "Sistema";
  };

  const folderRows = folderId
    ? await db.select().from(folders).where(or(eq(folders.id, folderId), eq(folders.parentId, folderId), eq(folders.userId, session.id))).orderBy(folders.orderIndex)
    : await db.select().from(folders).where(or(eq(folders.userId, session.id), isNull(folders.userId))).orderBy(folders.orderIndex);

  return NextResponse.json({
    success: true,
    data: {
      files: fileRows.map((f) => ({ ...f, ownerName: nameOf(f.userId), isMine: f.userId === session.id, downloadUrl: `/api/files/download?id=${f.id}` })),
      folders: folderRows,
      quota: await getStorageQuota(session.id),
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });

  const form = await request.formData();
  const uploaded = form.getAll("files") as File[];

  // Crear carpeta (API por compatibilidad)
  if (!uploaded.length) {
    const name = (form.get("name") as string)?.trim();
    const parentId = (form.get("parentId") as string) || null;
    if (name) {
      const [folder] = await db
        .insert(folders)
        .values({ name, userId: session.id, color: "#6366f1", parentId })
        .returning();
      return NextResponse.json({ success: true, data: folder });
    }
    return NextResponse.json({ success: false, error: { code: "NO_FILES", message: "Sin archivos" } }, { status: 400 });
  }

  await ensureBucket();
  const bucket = getStorageBucket();
  const category = (form.get("category") as string) || "general";
  const folderId = (form.get("folderId") as string) || null;
  const basePath = ((form.get("basePath") as string) || "").replace(/^\/+|\/+$/g, "");

  // Cuota de almacenamiento: suma del lote de subida contra el tope del usuario.
  const totalNew = uploaded.reduce((acc, f) => acc + f.size, 0);
  const quota = await getStorageQuota(session.id);
  if (quota.usedBytes + totalNew > quota.maxBytes) {
    return NextResponse.json(
      { success: false, error: { code: "QUOTA_EXCEEDED", message: "Almacenamiento lleno: supera tu cuota disponible", quota } },
      { status: 400 }
    );
  }

  const saved = [];
  for (const file of uploaded) {
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length === 0) continue;

    // Nombre de objeto en el bucket: users/{userId}/{carpetas}/archivo
    let relPath = basePath;
    const rel = (file as unknown as { webkitRelativePath?: string }).webkitRelativePath || "";
    if (rel) relPath = rel.split("/").slice(0, -1).join("/"); // carpetas del webkitdirectory
    const objectName = ["users", session.id, relPath ? relPath.replace(/^\/+/, "") : "", file.name]
      .filter(Boolean)
      .join("/");

    await uploadObject(objectName, bytes, file.type || "application/octet-stream");

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    let type = "file";
    if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) type = "image";
    else if (["mp4", "mov", "avi", "webm"].includes(ext)) type = "video";
    else if (["mp3", "wav", "ogg"].includes(ext)) type = "audio";
    else if (["doc", "docx", "pdf", "txt", "xls", "xlsx", "ppt", "pptx", "odt", "md", "csv"].includes(ext)) type = "document";

    const [row] = await db
      .insert(files)
      .values({
        name: file.name,
        originalName: file.name,
        path: `/${objectName}`,
        url: `/api/files/download`,
        size: bytes.length,
        mimeType: file.type || "application/octet-stream",
        extension: ext,
        type,
        category,
        folderId,
        isShared: relPath === "compartido",
        userId: session.id,
      })
      .returning();
    saved.push({ ...row, downloadUrl: `/api/files/download?id=${row.id}` });
  }

  return NextResponse.json({ success: true, data: saved });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ success: false, error: { code: "VALIDATION" } }, { status: 400 });

  const [row] = await db.select().from(files).where(eq(files.id, body.id)).limit(1);
  if (!row) return NextResponse.json({ success: false, error: { code: "NOT_FOUND" } }, { status: 404 });
  if (row.userId !== session.id && !["admin", "super_admin"].includes(session.role)) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const patch: Partial<typeof files.$inferSelect> = {};
  if (typeof body.isShared === "boolean") patch.isShared = body.isShared;
  if (body.category) patch.category = body.category;

  const [updated] = await db.update(files).set(patch).where(eq(files.id, body.id)).returning();
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ success: false }, { status: 400 });

  const [row] = await db.select().from(files).where(eq(files.id, id)).limit(1);
  if (!row) return NextResponse.json({ success: false, error: { code: "NOT_FOUND" } }, { status: 404 });
  // Solo el propietario o un admin puede borrar
  if (row.userId !== session.id && !["admin", "super_admin"].includes(session.role)) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN" } }, { status: 403 });
  }
  if (row.path) {
    await removeObject(row.path.replace(/^\//, "")).catch(() => {});
  }
  await db.delete(files).where(eq(files.id, id));
  return NextResponse.json({ success: true });
}