"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, KeyRound, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useT } from "@/i18n";

function ForgotContent() {
  const router = useRouter();
  const t = useT();
  const params = useSearchParams();
  const token = params.get("token");

  const [step, setStep] = useState<"request" | "reset" | "done">(token ? "reset" : "request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then(async (r) => {
      if (r.ok) router.replace("/dashboard");
    });
  }, [router]);

  const requestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error?.message || t("Error al procesar la solicitud"));
        return;
      }
      const msg = data.data?.message || t("Si el correo existe, recibirás un enlace para restablecer tu contraseña.");
      setInfo(msg);
      if (data.data?.devResetUrl) {
        setInfo(`${msg}\n${t("Enlace de prueba (entorno local):")} ${data.data.devResetUrl}`);
      }
    } catch {
      setError(t("No se pudo conectar con el servidor"));
    } finally {
      setLoading(false);
    }
  };

  const doReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError(t("La contraseña debe tener al menos 8 caracteres"));
      return;
    }
    if (password !== confirm) {
      setError(t("Las contraseñas no coinciden"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error?.message || t("Error al procesar la solicitud"));
        return;
      }
      setStep("done");
    } catch {
      setError(t("No se pudo conectar con el servidor"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-gradient-to-br from-slate-100 via-indigo-50 to-purple-100 dark:from-[#070b1a] dark:via-[#0b1030] dark:to-[#150a2e]">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-500/20 blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        <div className="glass-modal rounded-2xl p-8 animate-scale-in">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl mb-3 shadow-lg shadow-indigo-500/30">
              TL
            </div>
            <h1 className="text-xl font-bold text-foreground">
              {step === "request" ? t("Recuperar contraseña") : step === "reset" ? t("Nueva contraseña") : t("¡Listo!")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 text-center">
              {step === "request" && t("Introduce tu correo y te enviaremos un enlace de recuperación.")}
              {step === "reset" && t("Elige una contraseña nueva para tu cuenta.")}
              {step === "done" && t("Tu contraseña se actualizó correctamente.")}
            </p>
          </div>

          {step === "request" && (
            <form onSubmit={requestReset} className="space-y-4">
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  required
                  type="email"
                  placeholder={t("correo@terluxcoop.com")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-background/60 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">{error}</div>
              )}
              {info && (
                <div className="text-sm text-emerald-600 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2 whitespace-pre-line">{info}</div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                {t("Enviar enlace")}
              </button>
            </form>
          )}

          {step === "reset" && (
            <form onSubmit={doReset} className="space-y-4">
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  required
                  type="password"
                  minLength={8}
                  placeholder={t("Contraseña nueva")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-background/60 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  required
                  type="password"
                  minLength={8}
                  placeholder={t("Repetir contraseña")}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-background/60 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">{error}</div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {t("Guardar nueva contraseña")}
              </button>
            </form>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <CheckCircle2 size={24} className="text-emerald-500" />
              </div>
              <button
                onClick={() => router.replace("/login")}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                {t("Ir a iniciar sesión")}
              </button>
            </div>
          )}

          <Link
            href="/login"
            className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={13} /> {t("Volver al inicio de sesión")}
          </Link>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">© 2026 TerLux Coop</p>
      </div>
    </div>
  );
}

export default function RecuperarPage() {
  return (
    <Suspense fallback={null}>
      <ForgotContent />
    </Suspense>
  );
}