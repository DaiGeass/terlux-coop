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
    "Conexión por Tailscale (100.106.108.98) con sockets en tiempo real",
    "Subida y sincronización de carpetas locales con el almacenamiento",
    "Panel técnico con acceso directo a PostgreSQL",
    "Notificaciones nativas en Windows, Linux y macOS",
  ],
  downloads: {
    windows: {
      installer: "/descargas/terlux-coop_1.0.0_x64-setup.exe",
      msi: "/descargas/terlux-coop_1.0.0_x64.msi",
      minimumOs: "Windows 10 1809",
    },
    linux: {
      deb: "/descargas/terlux-coop_1.0.0_amd64.deb",
      appImage: "/descargas/terlux-coop_1.0.0_x86_64.AppImage",
      minimumOs: "Debian 12 / Ubuntu 22.04",
    },
    macos: {
      appleSilicon: "/descargas/terlux-coop_1.0.0_aarch64.dmg",
      intel: "/descargas/terlux-coop_1.0.0_x64.dmg",
      minimumOs: "macOS 10.15 Catalina",
    },
  },
  vpn: {
    network: "100.106.108.98",
    gateway: "100.106.108.98",
    apiPort: 8443,
    socketPath: "/api/realtime/stream",
  },
};

export async function GET() {
  return NextResponse.json({ success: true, data: DESKTOP_RELEASE });
}
