"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Building2, Palette, Server, Database, HardDrive, Mail, ShieldCheck,
  PlugZap, Loader2, CheckCircle2, XCircle, Plus, RefreshCw, Ban, KeyRound,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useT } from "@/i18n";

interface Integration {
  id: string; name: string; type: string; protocol: string | null; host: string | null;
  port: number | null; username: string | null; secret: string | null; databaseName: string | null;
  bucket: string | null; vpnNetwork: string | null; status: string; config: Record<string, unknown> | null;
  lastTestedAt: string | null; lastTestResult: string | null;
}
interface Client {
  id: string; clientId: string; deviceName: string | null; platform: string | null;
  appVersion: string | null; ipAddress: string | null; vpnIp: string | null; status: string;
  connectedAt: string | null; lastSeenAt: string | null;
}

const TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  database: { label: "Base de datos", icon: Database, color: "#3b82f6" },
  storage: { label: "Almacenamiento", icon: HardDrive, color: "#8b5cf6" },
  mail: { label: "Correo", icon: Mail, color: "#10b981" },
  vpn: { label: "VPN / Escritorio", icon: Server, color: "#f59e0b" },
};

const TEMPLATES: Record<string, Partial<Integration>> = {
  database: { name: "Central Database (VPN)", type: "database", protocol: "postgres", host: "100.106.108.98", port: 5432, username: "postgres", databaseName: "app_db", vpnNetwork: "100.64.0.0/10" },
  storage: { name: "File Storage (VPN)", type: "storage", protocol: "s3", host: "100.106.108.98", port: 9000, username: "terlux_storage", bucket: "terlux-files", vpnNetwork: "100.64.0.0/10" },
  mail: { name: "Mail Server (VPN)", type: "mail", protocol: "smtp", host: "100.106.108.98", port: 587, username: "no-reply@terluxcoop.com", vpnNetwork: "100.64.0.0/10" },
  vpn: { name: "VPN Gateway / Desktop App", type: "vpn", protocol: "tailscale", host: "100.106.108.98", port: 8443, vpnNetwork: "100.64.0.0/10" },
};

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const t = useT();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "general";
  const [tab, setTab] = useState(initialTab);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState<Partial<Integration> | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; ms?: number; error?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState<any>(null);
  const [security, setSecurity] = useState({ twoFactor: true, passwordMinLength: 8, ipWhitelist: "100.64.0.0/10", sessionTimeout: 60 });
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = async () => {
    const d = await (await fetch("/api/integrations")).json();
    if (d.success) { setIntegrations(d.data.integrations); setClients(d.data.clients); }
    const s = await (await fetch("/api/admin?section=settings")).json();
    if (s.success) { setCompany(s.data); setSecurity({ ...security, ...((s.data.settings as object) || {}) }); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const startNew = (type: string) => { setForm({ ...TEMPLATES[type] } as Partial<Integration>); setTestResult(null); };
  const edit = (i: Integration) => { setForm(i); setTestResult(null); };

  const save = async () => {
    setSaving(true);
    await fetch("/api/integrations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save", ...form }) });
    setSaving(false); setForm(null); load();
  };
  const test = async () => {
    if (!form?.host || !form?.port) return;
    setTesting(true); setTestResult(null);
    const d = await (await fetch("/api/integrations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "test", id: form.id, host: form.host, port: form.port }),
    })).json();
    setTestResult(d.data); setTesting(false); load();
  };
  const blockClient = async (clientId: string) => {
    await fetch(`/api/integrations?clientId=${clientId}`, { method: "DELETE" });
    load();
  };
  const saveCompany = async () => {
    await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update_settings", ...company }) });
  };
  const saveSecurity = async () => {
    await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update_settings", security }) });
  };
  const changePassword = async () => {
    setPwMsg(null);
    if (!pw.current || !pw.next || !pw.confirm) {
      setPwMsg({ ok: false, text: t("Completa todos los campos") });
      return;
    }
    if (pw.next.length < 8) {
      setPwMsg({ ok: false, text: t("La contraseña debe tener al menos 8 caracteres") });
      return;
    }
    if (pw.next !== pw.confirm) {
      setPwMsg({ ok: false, text: t("Las contraseñas no coinciden") });
      return;
    }
    setPwSaving(true);
    try {
      const d = await (await fetch("/api/auth/change-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next }),
      })).json();
      if (!d.success) {
        setPwMsg({ ok: false, text: d.error?.message || t("Error al procesar la solicitud") });
      } else {
        setPwMsg({ ok: true, text: t("Contraseña actualizada correctamente") });
        setPw({ current: "", next: "", confirm: "" });
      }
    } catch {
      setPwMsg({ ok: false, text: t("No se pudo conectar con el servidor") });
    } finally {
      setPwSaving(false);
    }
  };

  const tabs = [
    { id: "general", label: t("Empresa"), icon: Building2 },
    { id: "appearance", label: t("Apariencia"), icon: Palette },
    { id: "integrations", label: t("Integraciones"), icon: PlugZap },
    { id: "vpn", label: t("Clientes VPN"), icon: Server },
    { id: "security", label: t("Seguridad"), icon: ShieldCheck },
  ];

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("Configuración")}</h1>
          <p className="page-subtitle">{t("Conexiones por IP: bases de datos, almacenamiento, correo y app de escritorio")}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 p-1 glass-card w-fit">
        {tabs.map((tb) => (
          <button key={tb.id} onClick={() => setTab(tb.id)}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              tab === tb.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}>
            <tb.icon size={15} /> {tb.label}
          </button>
        ))}
      </div>

      {/* GENERAL */}
      {tab === "general" && company && (
        <div className="glass-card p-6 max-w-2xl space-y-4">
          <h3 className="font-semibold">{t("Datos de la empresa")}</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground">{t("Razón social")}</label>
              <input className="form-input" value={company.companyName} onChange={(e) => setCompany({ ...company, companyName: e.target.value })} /></div>
            <div><label className="text-xs text-muted-foreground">{t("Email")}</label>
              <input className="form-input" value={company.companyEmail || ""} onChange={(e) => setCompany({ ...company, companyEmail: e.target.value })} /></div>
            <div><label className="text-xs text-muted-foreground">{t("Teléfono")}</label>
              <input className="form-input" value={company.companyPhone || ""} onChange={(e) => setCompany({ ...company, companyPhone: e.target.value })} /></div>
            <div><label className="text-xs text-muted-foreground">{t("Moneda")}</label>
              <select className="form-select" value={company.currency} onChange={(e) => setCompany({ ...company, currency: e.target.value })}>
                <option>EUR</option><option>USD</option><option>MXN</option><option>COP</option>
              </select></div>
            <div className="sm:col-span-2"><label className="text-xs text-muted-foreground">{t("Dirección")}</label>
              <input className="form-input" value={company.companyAddress || ""} onChange={(e) => setCompany({ ...company, companyAddress: e.target.value })} /></div>
            <div><label className="text-xs text-muted-foreground">{t("Zona horaria")}</label>
              <input className="form-input" value={company.timezone} onChange={(e) => setCompany({ ...company, timezone: e.target.value })} /></div>
          </div>
          <button onClick={saveCompany} className="btn btn-primary">{t("Guardar cambios")}</button>
        </div>
      )}

      {/* APARIENCIA */}
      {tab === "appearance" && (
        <div className="glass-card p-6 max-w-2xl space-y-5">
          <h3 className="font-semibold">{t("Tema de la plataforma")}</h3>
          <div className="grid grid-cols-3 gap-3">
            {[{ id: "light", label: t("Claro") }, { id: "dark", label: t("Oscuro") }, { id: "system", label: t("Sistema") }].map((opt) => (
              <button key={opt.id} onClick={() => setTheme(opt.id)}
                className={cn("p-4 rounded-xl border-2 text-sm font-medium transition-all",
                  theme === opt.id ? "border-primary bg-primary/10" : "border-border hover:bg-accent/50")}>
                <div className={cn("h-16 rounded-lg mb-2 border", opt.id === "dark" ? "bg-slate-900 border-slate-700" : opt.id === "light" ? "bg-white border-slate-200" : "bg-gradient-to-br from-white to-slate-900")} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* INTEGRACIONES */}
      {tab === "integrations" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(TYPE_META).map(([type, meta]) => {
              const items = integrations.filter((i) => i.type === type);
              return (
                <div key={type} className="glass-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: meta.color + "20", color: meta.color }}>
                        <meta.icon size={17} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold">{t(meta.label)}</h3>
                        <p className="text-[10px] text-muted-foreground">{items.length} {t("conexión(es)")}</p>
                      </div>
                    </div>
                    <button onClick={() => startNew(type)} className="btn btn-outline btn-sm gap-1"><Plus size={13} /> {t("Añadir")}</button>
                  </div>
                  <div className="space-y-2">
                    {items.map((i) => (
                      <button key={i.id} onClick={() => edit(i)} className="w-full text-left p-3 rounded-lg border border-border/30 hover:bg-accent/40 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className={cn("w-2 h-2 rounded-full", i.status === "connected" ? "bg-emerald-500" : i.status === "error" ? "bg-red-500" : "bg-muted-foreground")} />
                          <span className="text-sm font-medium truncate flex-1">{i.name}</span>
                        </div>
                        <p className="text-[11px] font-mono text-muted-foreground mt-1">{i.protocol}://{i.host}:{i.port}{i.databaseName ? `/${i.databaseName}` : i.bucket ? `/${i.bucket}` : ""}</p>
                        {i.lastTestResult && <p className="text-[10px] text-muted-foreground mt-0.5">{i.lastTestResult}</p>}
                      </button>
                    ))}
                    {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">{t("Sin configurar")}</p>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* VPN info */}
          <div className="glass-card p-4 border-l-4 border-l-amber-500">
            <h4 className="text-sm font-semibold flex items-center gap-2"><ShieldCheck size={15} className="text-amber-500" /> {t("Red privada recomendada")}</h4>
            <p className="text-xs text-muted-foreground mt-1">
              {t("Se utiliza")} <span className="font-mono">100.64.0.0/10</span> {t("(rango CGNAT Tailscale). El rango sugerido")}
              <span className="font-mono"> 67.7.0.0/16</span> {t("es una IP pública asignada al Departamento de Defensa de EE.UU. y no debe usarse en una VPN.")}
              {t("Servidor API para la app de escritorio:")} <span className="font-mono">https://100.106.108.98:8443</span> {t("· socket")} <span className="font-mono">/api/realtime/stream</span>.
            </p>
          </div>
        </div>
      )}

      {/* CLIENTES VPN */}
      {tab === "vpn" && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">{t("Dispositivos conectados por VPN")}</h3>
            <button onClick={load} className="p-2 rounded hover:bg-accent"><RefreshCw size={15} /></button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase text-muted-foreground border-b border-border/30">
                  <th className="p-2">{t("Dispositivo")}</th><th className="p-2">{t("Plataforma")}</th><th className="p-2">{t("Versión")}</th>
                  <th className="p-2">{t("IP pública")}</th><th className="p-2">{t("IP VPN")}</th><th className="p-2">{t("Última conexión")}</th><th className="p-2">{t("Estado")}</th><th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {clients.length === 0 && (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground text-xs">
                    {t("Aún no hay dispositivos registrados. La app de escritorio se registra automáticamente al iniciar sesión por VPN (ver PLANTILLA_APP_ESCRITORIO.txt).")}
                  </td></tr>
                )}
                {clients.map((c) => (
                  <tr key={c.id} className="border-b border-border/15">
                    <td className="p-2 font-medium">{c.deviceName || c.clientId.slice(0, 12)}</td>
                    <td className="p-2 text-muted-foreground">{c.platform || "—"}</td>
                    <td className="p-2 text-muted-foreground">{c.appVersion || "—"}</td>
                    <td className="p-2 font-mono text-xs">{c.ipAddress || "—"}</td>
                    <td className="p-2 font-mono text-xs">{c.vpnIp || "—"}</td>
                    <td className="p-2 text-xs text-muted-foreground">{c.lastSeenAt ? formatDate(c.lastSeenAt, "p") : "—"}</td>
                    <td className="p-2">
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium",
                        c.status === "online" ? "bg-emerald-500/15 text-emerald-500" : c.status === "blocked" ? "bg-red-500/15 text-red-500" : "bg-muted text-muted-foreground")}>
                        {c.status === "online" ? t("En línea") : c.status === "blocked" ? t("Bloqueado") : t("Desconectado")}
                      </span>
                    </td>
                    <td className="p-2">
                      {c.status !== "blocked" && <button onClick={() => blockClient(c.clientId)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive" title={t("Bloquear")}><Ban size={14} /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SEGURIDAD */}
      {tab === "security" && (
        <div className="glass-card p-6 max-w-2xl space-y-4">
          <h3 className="font-semibold">{t("Política de seguridad")}</h3>
          <label className="flex items-center justify-between p-3 rounded-lg border border-border/30">
            <div><p className="text-sm font-medium">{t("Doble factor de autenticación (2FA)")}</p><p className="text-xs text-muted-foreground">{t("Exigir código temporal en los inicios de sesión")}</p></div>
            <input type="checkbox" checked={security.twoFactor} onChange={(e) => setSecurity({ ...security, twoFactor: e.target.checked })} className="w-5 h-5" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground">{t("Longitud mínima de contraseña")}</label>
              <input type="number" className="form-input" value={security.passwordMinLength} onChange={(e) => setSecurity({ ...security, passwordMinLength: +e.target.value })} /></div>
            <div><label className="text-xs text-muted-foreground">{t("Expiración de sesión (min)")}</label>
              <input type="number" className="form-input" value={security.sessionTimeout} onChange={(e) => setSecurity({ ...security, sessionTimeout: +e.target.value })} /></div>
          </div>
          <div><label className="text-xs text-muted-foreground">{t("Red IP permitida (VPN)")}</label>
            <input className="form-input font-mono" value={security.ipWhitelist} onChange={(e) => setSecurity({ ...security, ipWhitelist: e.target.value })} /></div>
          <button onClick={saveSecurity} className="btn btn-primary">{t("Guardar política")}</button>
        </div>
      )}

      {/* CAMBIAR CONTRASEÑA */}
      {tab === "security" && (
        <div className="glass-card p-6 max-w-2xl space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><KeyRound size={16} /> {t("Cambiar mi contraseña")}</h3>
          <div className="grid grid-cols-1 gap-3">
            <div><label className="text-xs text-muted-foreground">{t("Contraseña actual")}</label>
              <input type="password" className="form-input" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></div>
            <div><label className="text-xs text-muted-foreground">{t("Nueva contraseña")}</label>
              <input type="password" className="form-input" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></div>
            <div><label className="text-xs text-muted-foreground">{t("Confirmar nueva contraseña")}</label>
              <input type="password" className="form-input" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></div>
          </div>
          {pwMsg && (
            <div className={cn("flex items-center gap-2 p-3 rounded-lg text-sm",
              pwMsg.ok ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600")}>
              {pwMsg.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />} {pwMsg.text}
            </div>
          )}
          <button onClick={changePassword} disabled={pwSaving} className="btn btn-primary gap-2">
            {pwSaving ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />} {t("Cambiar contraseña")}
          </button>
        </div>
      )}

      {/* MODAL FORM INTEGRACION */}
      {form && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setForm(null)}>
          <div className="glass-modal rounded-2xl w-full max-w-lg animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
              <h3 className="font-semibold">{form.id ? t("Editar conexión") : t("Nueva conexión")}</h3>
              <button onClick={() => setForm(null)}><XCircle size={18} /></button>
            </div>
            <div className="p-6 space-y-3">
              <div><label className="text-xs text-muted-foreground">{t("Nombre")}</label>
                <input className="form-input" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground">{t("Protocolo")}</label>
                  <input className="form-input font-mono" value={form.protocol || ""} onChange={(e) => setForm({ ...form, protocol: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">{t("Red VPN")}</label>
                  <input className="form-input font-mono" value={form.vpnNetwork || ""} onChange={(e) => setForm({ ...form, vpnNetwork: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">{t("Host / IP")}</label>
                  <input className="form-input font-mono" value={form.host || ""} onChange={(e) => setForm({ ...form, host: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">{t("Puerto")}</label>
                  <input type="number" className="form-input font-mono" value={form.port ?? ""} onChange={(e) => setForm({ ...form, port: +e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">{t("Usuario")}</label>
                  <input className="form-input font-mono" value={form.username || ""} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">{t("Secreto / contraseña")}</label>
                  <input type="password" className="form-input font-mono" placeholder="••••••••" onChange={(e) => setForm({ ...form, secret: e.target.value })} /></div>
                {form.type === "database" && <div className="col-span-2"><label className="text-xs text-muted-foreground">{t("Base de datos")}</label>
                  <input className="form-input font-mono" value={form.databaseName || ""} onChange={(e) => setForm({ ...form, databaseName: e.target.value })} /></div>}
                {form.type === "storage" && <div className="col-span-2"><label className="text-xs text-muted-foreground">{t("Bucket / recurso compartido")}</label>
                  <input className="form-input font-mono" value={form.bucket || ""} onChange={(e) => setForm({ ...form, bucket: e.target.value })} /></div>}
              </div>
              {testResult && (
                <div className={cn("flex items-center gap-2 p-3 rounded-lg text-sm",
                  testResult.ok ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600")}>
                  {testResult.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  {testResult.ok ? `${t("Conexión TCP establecida en")} ${testResult.ms} ms` : `${t("Sin conexión")}: ${testResult.error}`}
                </div>
              )}
            </div>
            <div className="flex justify-between gap-2 px-6 py-4 border-t border-border/30">
              <button onClick={test} disabled={testing} className="btn btn-outline gap-2">
                {testing ? <Loader2 size={14} className="animate-spin" /> : <PlugZap size={14} />} {t("Probar conexión")}
              </button>
              <button onClick={save} disabled={saving} className="btn btn-primary gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : null} {t("Guardar")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
