// ============================================
// TERLUX COOP - CLIENTE DE ALMACENAMIENTO MinIO (S3)
// El binario vive en tools/minio y los datos en storage/
// ============================================

import { Client } from "minio";

const g = globalThis as typeof globalThis & { __terluxMinio?: Client };

function env(key: string, fallback: string) {
  return process.env[key] || fallback;
}

export function getStorage() {
  if (g.__terluxMinio) return g.__terluxMinio;
  g.__terluxMinio = new Client({
    endPoint: env("MINIO_ENDPOINT", "127.0.0.1"),
    port: Number(env("MINIO_PORT", "9000")),
    useSSL: env("MINIO_USE_SSL", "false") === "true",
    accessKey: env("MINIO_ROOT_USER", "terlux_storage"),
    secretKey: env("MINIO_ROOT_PASSWORD", "terlux_storage"),
  });
  return g.__terluxMinio;
}

export function getStorageBucket() {
  return env("MINIO_BUCKET", "terlux-files");
}

export async function ensureBucket() {
  const client = getStorage();
  const bucket = getStorageBucket();
  const exists = await client.bucketExists(bucket).catch(() => false);
  if (!exists) {
    await client.makeBucket(bucket);
  }
  return bucket;
}

export async function uploadObject(objectName: string, buffer: Buffer, contentType: string) {
  const bucket = await ensureBucket();
  const client = getStorage();
  await client.putObject(bucket, objectName, buffer, buffer.length, {
    "Content-Type": contentType,
  });
  return objectName;
}

export async function uploadStream(objectName: string, stream: NodeJS.ReadableStream | ReadableStream, size: number, contentType: string) {
  const bucket = await ensureBucket();
  const client = getStorage();
  await client.putObject(bucket, objectName, stream as never, size, { "Content-Type": contentType });
  return objectName;
}

export async function statObject(objectName: string) {
  const client = getStorage();
  return client.statObject(getStorageBucket(), objectName);
}

export async function removeObject(objectName: string) {
  const client = getStorage();
  return client.removeObject(getStorageBucket(), objectName);
}