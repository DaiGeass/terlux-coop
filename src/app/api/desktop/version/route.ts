// ============================================
// TERLUX COOP - VERSIÓN DE LA APP DE ESCRITORIO
// Consultado por el cliente Rust/Tauri para
// comprobar si hay actualizaciones disponibles.
// ============================================

import { NextResponse } from "next/server";

const DESKTOP_RELEASE = {
  version: "1.0.2",
  releasedAt: "2026-09-08",
  minimumSupported: "1.0.0",
  mandatory: false,
  notes: [
    "v1.0.2.3: Web bilingüe (Español e Inglés) con selector de idioma; inglés por defecto",
    "v1.0.2.2: Nóminas con desglose por empleado y generación de periodos (finance)",
    "v1.0.2.2: Tarjetas de crédito y métodos de pago, saldo y movimientos de wallet",
    "v1.0.2.2: Documentos estructurados y calendario de reuniones (CRUD)",
    "Gestión de usuarios e información sensible de clientes y personal para administradores",
    "Tienda y pagos, RRHH, proyectos y Drive compartido integrados",
    "Configuración de red por defecto apuntando a la VPN Tailscale (100.106.108.98)",
  ],
  downloads: {
    windows: {
      installer: "/descargas/TerLux.Coop_1.0.2_x64-setup.exe",
      msi: "/descargas/TerLux.Coop_1.0.2_x64_en-US.msi",
      minimumOs: "Windows 10 1809",
    },
    linux: {
      deb: "/descargas/TerLux.Coop_1.0.2_amd64.deb",
      appImage: "/descargas/TerLux.Coop_1.0.2_amd64.AppImage",
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
