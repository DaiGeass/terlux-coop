// ============================================
// TERLUX COOP - TOTP / HOTP (RFC 6238 / 4226)
// Implementación propia sobre WebCrypto (HMAC-SHA1),
// sin dependencias externas.
// ============================================

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

// ---------- base32 ----------
export function base32Encode(buf: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string): Uint8Array {
  const clean = s.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

// ---------- cripto ----------
async function hmacSha1(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await globalThis.crypto.subtle.importKey(
    "raw", key as unknown as ArrayBuffer, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]
  );
  const sig = await globalThis.crypto.subtle.sign("HMAC", k, data as unknown as ArrayBuffer);
  return new Uint8Array(sig);
}

function counterToBytes(counter: number): Uint8Array {
  const buf = new Uint8Array(8);
  let c = Math.floor(counter);
  for (let i = 7; i >= 0; i--) {
    buf[i] = c & 0xff;
    c = Math.floor(c / 256);
  }
  return buf;
}

/** HOTP: HMAC-SHA1 → truncación dinámica → n dígitos. */
async function hotp(secretB32: string, counter: number, digits = 6): Promise<string> {
  const key = base32Decode(secretB32);
  const hmac = await hmacSha1(key, counterToBytes(counter));
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(bin % 10 ** digits).padStart(digits, "0");
}

/** TOTP para un instante dado (paso por defecto 30s). */
export async function totp(secretB32: string, time = Date.now(), step = 30, digits = 6): Promise<string> {
  const counter = Math.floor(time / 1000 / step);
  return hotp(secretB32, counter, digits);
}

/** Valida el código con ±1 ventana (30s) de tolerancia. */
export async function verifyTotp(secretB32: string, code: string, window = 1, step = 30): Promise<boolean> {
  const clean = String(code).trim();
  if (!/^\d{6}$/.test(clean)) return false;
  const now = Date.now();
  for (let w = -window; w <= window; w++) {
    if (clean === (await totp(secretB32, now + w * step * 1000, step))) return true;
  }
  return false;
}

/** Url otpauth:// para generar el QR del autenticador. */
export function totpUrl(secretB32: string, account: string, issuer = "TerLux Coop"): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secretB32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

/** Genera un secreto base32 de 128 bits. */
export async function generateTotpSecret(): Promise<string> {
  const buf = new Uint8Array(20);
  globalThis.crypto.getRandomValues(buf);
  return base32Encode(buf);
}
