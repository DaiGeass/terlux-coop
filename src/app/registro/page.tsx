"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Loader2, CheckCircle2, Lock, User, Mail } from "lucide-react";
import { useT } from "@/i18n";
import { LanguageSwitch } from "@/components/i18n/language-switch";

export default function RegistroPage() {
  const router = useRouter();
  const t = useT();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!accepted) {
      setError(t("Debes aceptar los Términos y Condiciones y la Política de Privacidad para continuar"));
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, acceptedTerms: true }),
    });
    const d = await res.json();
    setLoading(false);
    if (d.success) {
      router.push("/dashboard");
    } else {
      setError(d.error?.message || t("No se pudo crear la cuenta"));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
          TL
        </div>
        <span className="font-bold text-lg text-foreground">TerLux Coop</span>
      </Link>

      <div className="relative glass-card rounded-2xl p-8 w-full max-w-md animate-scale-in">
        <div className="absolute top-6 right-6">
          <LanguageSwitch />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-1">{t("Crear cuenta")}</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {t("Empieza gratis en la plataforma. Podrás contratar planes desde la tienda y usar el crédito de demostración.")}
        </p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field icon={<User size={15} />} label={t("Nombre")}>
              <input
                value={form.firstName} required
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                placeholder={t("Nombre")} className="form-input" />
            </Field>
            <Field icon={<User size={15} />} label={t("Apellidos")}>
              <input
                value={form.lastName} required
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                placeholder={t("Apellidos")} className="form-input" />
            </Field>
          </div>
          <Field icon={<Mail size={15} />} label={t("Correo electrónico")}>
            <input
              type="email" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder={t("tu@empresa.com")} className="form-input" />
          </Field>
          <Field icon={<Lock size={15} />} label={t("Contraseña")}>
            <input
              type="password" required minLength={8} value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={t("Mínimo 8 caracteres")} className="form-input" />
          </Field>
          <label className="flex items-start gap-2.5 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-border/40 accent-primary"
            />
            <span>
              {t("He leído y acepto los")}{" "}
              <Link href="/terminos" target="_blank" className="text-primary hover:underline">{t("Términos y Condiciones")}</Link>{" "}
              {t("y la")}{" "}
              <Link href="/privacidad" target="_blank" className="text-primary hover:underline">{t("Política de Privacidad")}</Link>{" "}
              {t("de TerLux Coop.")}
            </span>
          </label>
          <button disabled={loading || !accepted} className="btn btn-primary w-full gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            {t("Crear cuenta gratis")}
          </button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-5">
          {t("¿Ya tienes cuenta?")}{" "}
          <Link href="/login" className="text-primary hover:underline">{t("Inicia sesión")}</Link>
        </p>
      </div>

      <Link href="/" className="mt-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={14} /> {t("Volver a la página principal")}
      </Link>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
        {icon} {label}
      </span>
      {children}
    </label>
  );
}