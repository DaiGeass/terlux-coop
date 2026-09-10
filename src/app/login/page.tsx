"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Sun, Moon, Mail, Lock, User, Loader2, ShieldCheck, ArrowRight } from "lucide-react";
import { useTheme } from "next-themes";
import { useT } from "@/i18n";
import { LanguageSwitch } from "@/components/i18n/language-switch";

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { theme, setTheme } = useTheme();
  const t = useT();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "" });

  useEffect(() => {
    fetch("/api/auth/me").then(async (r) => {
      if (r.ok) router.replace("/dashboard");
    });
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "register" && !accepted) {
        setError(t("Debes aceptar los Términos y Condiciones y la Política de Privacidad para registrarte"));
        setLoading(false);
        return;
      }
      const res = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, acceptedTerms: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error?.message || t("Error al procesar la solicitud"));
        return;
      }
      const redirect = params.get("redirect") || "/dashboard";
      router.replace(redirect);
    } catch {
      setError(t("No se pudo conectar con el servidor"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-gradient-to-br from-slate-100 via-indigo-50 to-purple-100 dark:from-[#070b1a] dark:via-[#0b1030] dark:to-[#150a2e]">
      {/* Fondos decorativos */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-500/20 blur-3xl" />
      <div className="absolute top-[30%] right-[20%] w-[300px] h-[300px] rounded-full bg-cyan-400/10 blur-3xl" />

      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="absolute top-6 right-6 p-2.5 glass-card rounded-full hover:scale-105 transition-transform z-10"
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <div className="absolute top-7 left-6 z-10">
        <LanguageSwitch />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="glass-modal rounded-2xl p-8 animate-scale-in">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl mb-3 shadow-lg shadow-indigo-500/30">
              TL
            </div>
            <h1 className="text-2xl font-bold text-foreground">TerLux Coop</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("Suite Empresarial Integrada")}</p>
          </div>

          <div className="flex p-1 bg-muted/60 rounded-lg mb-6">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === "login" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
            >
              {t("Iniciar sesión")}
            </button>
            <button
              onClick={() => setMode("register")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === "register" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
            >
              {t("Registrarse")}
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    required
                    placeholder={t("Nombre")}
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-background/60 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </div>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    required
                    placeholder={t("Apellidos")}
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-background/60 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </div>
              </div>
            )}

            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                required
                type="email"
                placeholder={t("correo@terluxcoop.com")}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-background/60 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>

            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                required
                type="password"
                placeholder={t("Contraseña")}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-background/60 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>

            {mode === "login" && (
              <Link
                href="/recuperar"
                className="block text-right text-xs text-primary hover:underline"
                onClick={() => setError("")}
              >
                {t("¿Olvidaste tu contraseña?")}
              </Link>
            )}

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {mode === "register" && (
              <label className="flex items-start gap-2 text-[11px] text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-primary"
                />
                <span>
                  {t("He leído y acepto los")}{" "}
                  <Link href="/terminos" target="_blank" className="text-primary hover:underline">{t("Términos y Condiciones")}</Link>{" "}
                  y la{" "}
                  <Link href="/privacidad" target="_blank" className="text-primary hover:underline">{t("Política de Privacidad")}</Link>.
                </span>
              </label>
            )}

            <button
              type="submit"
              disabled={loading || (mode === "register" && !accepted)}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              {mode === "login" ? t("Entrar a la plataforma") : t("Crear cuenta")}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border/30">
            <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <ShieldCheck size={14} className="mt-0.5 flex-shrink-0 text-emerald-500" />
              <p>
                {t("Conexión cifrada. Las aplicaciones de escritorio se conectan por VPN")}
                {t("(Tailscale 100.64.0.0/10) con sockets seguros. Credenciales iniciales en")}
                <span className="font-mono mx-1">CREDENCIALES.txt</span>.
              </p>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2026 TerLux Coop · Plataforma empresarial · v1.0.2.3
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
