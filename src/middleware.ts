// ============================================
// TERLUX COOP - MIDDLEWARE DE SEGURIDAD
// ============================================

import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "terlux-coop-secret-key-cambiar-en-produccion-2024"
);

// Rutas públicas que no requieren autenticación
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/registro",
  "/descargas",
  "/api/health",
  "/api/auth/login",
  "/api/auth/register",
  "/api/public", // endpoints públicos
];

// Rutas API que permiten acceso anónimo limitado
const ANONYMOUS_API_PATHS = [
  "/api/public/store", // catálogo público
  "/api/public/info", // info pública de la empresa
  "/api/desktop", // versión de la app de escritorio (público para la página de descargas)
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("terlux_session")?.value;

  const isPublic =
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    ANONYMOUS_API_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/uploads/");

  if (isPublic) return NextResponse.next();

  if (!token) {
    // Rutas API: 401 JSON; páginas: redirección a login
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Sesión requerida" } }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, SECRET);
    const role = String(payload.role || "employee");
    const roleLevel: Record<string, number> = {
      super_admin: 100, admin: 90, manager: 60, hr: 55, finance: 50,
      support: 40, employee: 30, client: 10, guest: 0,
    };
    const level = roleLevel[role] ?? 30;

    // Zonas exclusivas de administración (nivel 60+)
    const restricted: Record<string, number> = {
      "/admin": 60,
      "/payroll": 50,
      "/settings": 30,
    };
    for (const [prefix, minLevel] of Object.entries(restricted)) {
      if (pathname.startsWith(prefix) && level < minLevel) {
        if (pathname.startsWith("/api")) {
          return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Permisos insuficientes" } }, { status: 403 });
        }
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ success: false, error: { code: "INVALID_SESSION", message: "Sesión inválida" } }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads).*)"],
};
