"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Monitor, Apple, Download, ShieldCheck, Zap, FolderSync, Bell,
  Database, Wifi, ArrowLeft, CheckCircle2, Terminal, HardDrive,
} from "lucide-react";

interface ReleaseInfo {
  version: string;
  releasedAt: string;
  notes: string[];
  downloads: {
    windows: { installer: string; msi: string; minimumOs: string };
    linux: { deb: string; appImage: string; minimumOs: string };
    macos: { appleSilicon: string; intel: string; minimumOs: string };
  };
  vpn: { network: string; gateway: string; apiPort: number; socketPath: string };
}

const FEATURES = [
  { icon: FolderSync, title: "Sincronización de carpetas", text: "Elige una carpeta del equipo y todo lo que cambie se sube solo al almacenamiento corporativo." },
  { icon: Bell, title: "Notificaciones nativas", text: "Avisos del sistema para mensajes, trabajos terminados y caídas de conexión." },
  { icon: Database, title: "Panel técnico", text: "Consola SQL con conexión directa a PostgreSQL por la VPN, con auditoría y confirmaciones." },
  { icon: Wifi, title: "Diagnóstico de VPN", text: "Comprueba el túnel, la latencia y el estado de la base de datos y del almacén." },
  { icon: Zap, title: "Funciona sin conexión", text: "Guarda en caché los últimos datos y respeta tus permisos aunque se caiga el enlace." },
  { icon: ShieldCheck, title: "Credenciales protegidas", text: "La sesión se guarda cifrada en el Credential Manager o en el Llavero de macOS." },
];

export default function DescargasPage() {
  const [release, setRelease] = useState<ReleaseInfo | null>(null);

  useEffect(() => {
    fetch("/api/desktop/version")
      .then((r) => r.json())
      .then((d) => setRelease(d.data))
      .catch(() => setRelease(null));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 dark:from-[#070b18] dark:via-[#0b1030] dark:to-[#150a2e]">
      {/* Cabecera */}
      <header className="glass-navbar sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">TL</div>
            <span className="font-bold text-lg text-foreground">TerLux Coop</span>
          </Link>
          <Link href="/" className="btn btn-ghost btn-sm gap-2"><ArrowLeft size={14} /> Volver</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16">
        {/* Portada */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-5">
            <Monitor size={14} /> Aplicación de escritorio · Rust + Tauri
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            TerLux Coop en tu escritorio
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Cliente nativo para empleados y administradores. Se conecta al
            servidor por Tailscale y añade subida de archivos, notificaciones y
            herramientas técnicas que el navegador no puede ofrecer.
          </p>
          {release && (
            <p className="text-sm text-muted-foreground mt-4">
              Versión <span className="font-mono font-semibold text-foreground">{release.version}</span> · publicada el {release.releasedAt}
            </p>
          )}
        </div>

        {/* Descargas */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <div className="glass-card p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center">
                <Monitor size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Windows</h2>
                <p className="text-xs text-muted-foreground">{release?.downloads.windows.minimumOs || "Windows 10 o superior"}</p>
              </div>
            </div>
            <div className="space-y-2">
              <a href={release?.downloads.windows.installer || "#"} className="btn btn-primary w-full gap-2">
                <Download size={16} /> Descargar instalador (.exe)
              </a>
              <a href={release?.downloads.windows.msi || "#"} className="btn btn-outline w-full gap-2">
                <Download size={16} /> Paquete MSI (despliegue por GPO)
              </a>
            </div>
            <p className="text-[11px] text-muted-foreground mt-4">
              Incluye WebView2. Si SmartScreen muestra un aviso, elige
              «Más información → Ejecutar de todas formas».
            </p>
          </div>

          <div className="glass-card p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-xl bg-orange-500/15 text-orange-500 flex items-center justify-center">
                <Terminal size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Linux</h2>
                <p className="text-xs text-muted-foreground">{release?.downloads.linux.minimumOs || "Debian 12 / Ubuntu 22.04"}</p>
              </div>
            </div>
            <div className="space-y-2">
              <a href={release?.downloads.linux.deb || "/descargas/terlux-coop_1.0.0_amd64.deb"} className="btn btn-primary w-full gap-2" download>
                <Download size={16} /> Paquete .deb (Debian/Ubuntu)
              </a>
              <a href={release?.downloads.linux.appImage || "#"} className="btn btn-outline w-full gap-2" download>
                <Download size={16} /> AppImage (portátil)
              </a>
            </div>
            <p className="text-[11px] text-muted-foreground mt-4">
              .deb: <code className="font-mono">sudo apt install ./terlux-coop_1.0.0_amd64.deb</code>. AppImage: dale permiso de ejecución y ábrela.
            </p>
          </div>

          <div className="glass-card p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-xl bg-slate-500/15 text-slate-400 flex items-center justify-center">
                <Apple size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">macOS</h2>
                <p className="text-xs text-muted-foreground">{release?.downloads.macos.minimumOs || "macOS 10.15 o superior"}</p>
              </div>
            </div>
            <div className="space-y-2">
              <a href={release?.downloads.macos.appleSilicon || "#"} className="btn btn-primary w-full gap-2">
                <Download size={16} /> Apple Silicon (M1/M2/M3)
              </a>
              <a href={release?.downloads.macos.intel || "#"} className="btn btn-outline w-full gap-2">
                <Download size={16} /> Procesador Intel
              </a>
            </div>
            <p className="text-[11px] text-muted-foreground mt-4">
              En la primera apertura usa clic derecho → Abrir, o ejecuta{" "}
              <code className="font-mono">xattr -cr &quot;/Applications/TerLux Coop.app&quot;</code>.
            </p>
          </div>
        </div>

        {/* Funcionalidades */}
        <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Qué añade sobre la versión web</h2>
        <div className="grid md:grid-cols-3 gap-5 mb-16">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass-card p-6">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                <f.icon size={20} />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>

        {/* Configuración de red */}
        <div className="glass-card p-8 mb-12">
          <h2 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
            <Wifi size={20} className="text-primary" /> Configuración de la conexión
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            La aplicación viene preconfigurada para conectarse al servidor de la
            plataforma por Tailscale. Puedes cambiar estos valores desde la
            pantalla de acceso si en el futuro se publica en otra dirección.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Servidor (Tailscale)", value: release?.vpn.network || "100.106.108.98", icon: Wifi },
              { label: "Puerto de la API", value: String(release?.vpn.apiPort || 8443), icon: Terminal },
              { label: "Canal en vivo", value: release?.vpn.socketPath || "/api/realtime/stream", icon: Zap },
              { label: "Base de datos", value: "100.106.108.98:5432", icon: Database },
            ].map((row) => (
              <div key={row.label} className="p-4 rounded-xl bg-muted/40">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <row.icon size={12} /> {row.label}
                </div>
                <p className="font-mono text-sm font-semibold text-foreground break-all">{row.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Novedades y compilación */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass-card p-8">
            <h2 className="text-lg font-bold text-foreground mb-4">Novedades de esta versión</h2>
            <ul className="space-y-2">
              {(release?.notes || ["Cargando…"]).map((n, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground/85">
                  <CheckCircle2 size={15} className="text-emerald-500 mt-0.5 flex-shrink-0" /> {n}
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-card p-8">
            <h2 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
              <HardDrive size={18} /> Compilar desde el código
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              El código fuente está en la carpeta <code className="font-mono">desktop/</code> del proyecto.
            </p>
            <pre className="text-[11px] font-mono bg-muted/50 rounded-lg p-4 overflow-x-auto leading-relaxed">
{`# Windows
cd desktop
powershell -File build-windows.ps1

# Linux (Debian/Ubuntu)
cd desktop
npx tauri build --bundles deb,appimage

# macOS
cd desktop
./build-macos.sh universal`}
            </pre>
            <p className="text-[11px] text-muted-foreground mt-3">
              Requiere Rust (rustup) y Node.js 22+. En GitHub Actions el workflow
              <code className="font-mono"> .github/workflows/build-desktop.yml</code> compila
              los tres sistemas automáticamente.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-border/30 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© 2026 TerLux Coop · Cliente de escritorio v{release?.version || "1.0.0"}</p>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-foreground">Inicio</Link>
            <Link href="/login" className="hover:text-foreground">Iniciar sesión</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
