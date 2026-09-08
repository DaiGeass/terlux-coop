// ============================================
// TERLUX COOP - VERSIÓN DE LA APP DE ESCRITORIO
// Consultado por el cliente Rust/Tauri para
// comprobar si hay actualizaciones disponibles.
// ============================================

import { NextResponse } from "next/server";

const DESKTOP_RELEASE = {
  version: "1.0.1",
  releasedAt: "2026-09-08",
  minimumSupported: "1.0.0",
  mandatory: false,
  notes: [
    "Corregido el acceso cuando la configuración guardada usa HTTPS y el servidor responde por HTTP (reconexión automática)",
    "Conexión por Tailscale (100.106.108.98) con sockets en tiempo real",
    "Subida y sincronización de carpetas locales con el almacenamiento",
    "Panel técnico con acceso directo a PostgreSQL",
    "Notificaciones nativas en Windows y Linux",
  ],
  downloads: {
    windows: {
      installer: "/descargas/TerLux.Coop_1.0.1_x64-setup.exe",
      msi: "/descargas/TerLux.Coop_1.0.1_x64_en-US.msi",
      minimumOs: "Windows 10 1809",
    },
    linux: {
      deb: "/descargas/TerLux.Coop_1.0.1_amd64.deb",
      appImage: "/descargas/TerLux.Coop_1.0.1_amd64.AppImage",
      minimumOs: "Debian 12 / Ubuntu 22.04",
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
