// ============================================
// TERLUX COOP - VERSIÓN DE LA APP DE ESCRITORIO
// Consultado por el cliente Rust/Tauri para
// comprobar si hay actualizaciones disponibles.
// ============================================

import { NextResponse } from "next/server";

const DESKTOP_RELEASE = {
  version: "1.0.7",
  releasedAt: "2026-09-09",
  minimumSupported: "1.0.0",
  mandatory: false,
  notes: [
    "v1.0.7: Cambiar contraseña desde la app (Ajustes → Cuenta y seguridad)",
    "v1.0.7: Resumen económico en facturación (monedero, tarjetas, deuda y crédito)",
    "v1.0.7: Seguridad reforzada en el explorador de base de datos (solo administración y datos sensibles enmascarados)",
    "v1.0.7: Intranet con dominio interno y HTTPS por CA interna (Tailscale)",
    "v1.0.6: Saldo y límite por tarjeta visibles en la facturación",
    "v1.0.6: Traducción al inglés completada en comercio y facturación",
    "v1.0.6: Cuentas y datos de demostración normalizados",
    "v1.0.5: Drive mejorado (carpetas navegables, búsqueda y filtros, cuota de almacenamiento)",
    "v1.0.5: Adjuntar archivos del drive a mensajes e incidencias",
    "v1.0.5: CVV en el pago con tarjeta (nunca se guarda el CVV en el servidor)",
    "v1.0.5: Términos y Condiciones reforzados (pagos, deuda, sanciones, cobranza)",
    "v1.0.5: Tarjetas sin límite de alta y saldo por tarjeta inyectable por SQL",
    "v1.0.4: Roles (cliente, super administrador, etc.) e idioma de la app al 100% bilingüe",
    "v1.0.4: Datos de demostración en inglés (tareas, puestos, proyectos, documentos, reuniones)",
    "v1.0.4: Correcciones de traducción en Tarjetas y facturación y Técnico / BD",
    "v1.0.3: Web bilingüe (Español e Inglés) con selector de idioma; inglés por defecto",
    "v1.0.3: Compilación nativa para macOS (Universal: Apple Silicon + Intel)",
    "v1.0.2.2: Nóminas con desglose por empleado y generación de periodos (finance)",
    "v1.0.2.2: Tarjetas de crédito y métodos de pago, saldo y movimientos de wallet",
    "v1.0.2.2: Documentos estructurados y calendario de reuniones (CRUD)",
    "Gestión de usuarios e información sensible de clientes y personal para administradores",
    "Tienda y pagos, RRHH, proyectos y Drive compartido integrados",
    "Configuración de red por defecto apuntando a la VPN Tailscale (100.106.108.98)",
  ],
  downloads: {
    windows: {
      installer: "/descargas/TerLux.Coop_1.0.7_x64-setup.exe",
      msi: "/descargas/TerLux.Coop_1.0.7_x64_en-US.msi",
      minimumOs: "Windows 10 1809",
    },
    linux: {
      deb: "/descargas/TerLux.Coop_1.0.7_amd64.deb",
      appImage: "/descargas/TerLux.Coop_1.0.7_amd64.AppImage",
      minimumOs: "Debian 12 / Ubuntu 22.04",
    },
    macos: {
      dmg: "/descargas/TerLux.Coop_1.0.7_universal.dmg",
      minimumOs: "macOS 10.15 Catalina (Intel) / 11.0 (Apple Silicon)",
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
