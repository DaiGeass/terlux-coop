"use client";

import { useState } from "react";
import { KeyRound, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { DirectoryView } from "../page";

function ChangePassword() {
  const t = useT();
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async () => {
    setMsg(null);
    if (!pw.current || !pw.next || !pw.confirm) {
      setMsg({ ok: false, text: t("Completa todos los campos") });
      return;
    }
    if (pw.next.length < 8) {
      setMsg({ ok: false, text: t("La contraseña debe tener al menos 8 caracteres") });
      return;
    }
    if (pw.next !== pw.confirm) {
      setMsg({ ok: false, text: t("Las contraseñas no coinciden") });
      return;
    }
    setSaving(true);
    try {
      const d = await (await fetch("/api/auth/change-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next }),
      })).json();
      if (!d.success) {
        setMsg({ ok: false, text: d.error?.message || t("Error al procesar la solicitud") });
      } else {
        setMsg({ ok: true, text: t("Contraseña actualizada correctamente") });
        setPw({ current: "", next: "", confirm: "" });
      }
    } catch {
      setMsg({ ok: false, text: t("No se pudo conectar con el servidor") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-card p-6 max-w-2xl space-y-4">
      <h3 className="font-semibold flex items-center gap-2"><KeyRound size={16} /> {t("Cambiar mi contraseña")}</h3>
      <div className="grid grid-cols-1 gap-3">
        <div><label className="text-xs text-muted-foreground">{t("Contraseña actual")}</label>
          <input type="password" className="form-input" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></div>
        <div><label className="text-xs text-muted-foreground">{t("Nueva contraseña")}</label>
          <input type="password" className="form-input" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></div>
        <div><label className="text-xs text-muted-foreground">{t("Confirmar nueva contraseña")}</label>
          <input type="password" className="form-input" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></div>
      </div>
      {msg && (
        <div className={cn("flex items-center gap-2 p-3 rounded-lg text-sm",
          msg.ok ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600")}>
          {msg.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />} {msg.text}
        </div>
      )}
      <button onClick={submit} disabled={saving} className="btn btn-primary gap-2">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />} {t("Cambiar contraseña")}
      </button>
    </div>
  );
}

export default function MyProfilePage() {
  return (
    <div className="space-y-5">
      <ChangePassword />
      <DirectoryView openMe />
    </div>
  );
}