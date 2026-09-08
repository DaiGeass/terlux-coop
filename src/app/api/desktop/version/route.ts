// ============================================
// TERLUX COOP - VERSIÓN DE LA APP DE ESCRITORIO
// Consultado por el cliente Rust/Tauri para
// comprobar si hay actualizaciones disponibles.
// ============================================

import { NextResponse } from "next/server";

const DESKTOP_RELEASE = {
  version: "1.0.0",
  releasedAt: "2026-01-15",
  minimumSupported: "1.0.0",
  mandatory: false,
  notes: [
    "Primera versión estable del cliente de escritorio",
    "Conexión por VPN privada (10.8.0.0/24) con sockets en tiempo real",
    "Subida y sincronización de carpetas locales con el almacenamiento",
    "Panel técnico con acceso directo a PostgreSQL",
    "Notificaciones nativas en Windows y macOS",
  ],
  downloads: {
    windows: {
      installer: "/descargas/TerLuxCoop_1.0.0_x64-setup.exe",
      msi: "/descargas/TerLuxCoop_1.0.0_x64_es-ES.msi",
      minimumOs: "Windows 10 1809",
    },
    macos: {
      appleSilicon: "/descargas/TerLuxCoop_1.0.0_aarch64.dmg",
      intel: "/descargas/TerLuxCoop_1.0.0_x64.dmg",
      minimumOs: "macOS 10.15 Catalina",
    },
  },
  vpn: {
    network: "10.8.0.0/24",
    gateway: "10.8.0.1",
    apiPort: 8443,
    socketPath: "/api/realtime/stream",
  },
};

export async function GET() {
  return NextResponse.json({ success: true, data: DESKTOP_RELEASE });
}
