"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, Bell, Settings, User, ChevronDown, LogOut, Sun, Moon, HelpCircle, Wallet } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useI18n } from "@/i18n";
import { LanguageSwitch } from "@/components/i18n/language-switch";
import type { SessionInfo } from "@/lib/auth";

const titleMap: Record<string, string> = {
  dashboard: "Dashboard",
  projects: "Proyectos",
  gantt: "Diagrama Gantt",
  tasks: "Tareas",
  calendar: "Calendario",
  messages: "Mensajería",
  directory: "Directorio",
  documents: "Documentos",
  files: "Archivos",
  store: "Tienda y Planes",
  billing: "Facturación",
  payroll: "Nóminas",
  admin: "Administración",
  settings: "Configuración",
};

interface ToolbarProps {
  user?: SessionInfo | null;
  wallet?: { id: string; balance: number; currency: string } | null;
  className?: string;
}

export function Toolbar({ user, wallet, className }: ToolbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { t, locale } = useI18n();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const section = pathname?.split("/")[1] || "dashboard";
  const title = titleMap[section] ? t(titleMap[section]) : "TerLux Coop";

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  return (
    <header className={cn("fixed top-0 right-0 left-64 z-40 flex h-16 items-center glass-navbar", className)}>
      <div className="flex items-center gap-4 px-6 flex-1">
        <div>
          <h1 className="text-base font-semibold text-foreground leading-tight">{title}</h1>
          <p className="text-[11px] text-muted-foreground">
            {now.toLocaleDateString(locale === "en" ? "en-US" : "es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            {" · "}
            {now.toLocaleTimeString(locale === "en" ? "en-US" : "es-ES", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 px-6">
        {wallet && (
          <button
            onClick={() => router.push("/billing")}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-colors"
            title={t("Saldo de crédito disponible")}
          >
            <Wallet size={14} />
            {wallet.balance.toLocaleString(locale === "en" ? "en-US" : "es-ES", { style: "currency", currency: wallet.currency || "MXN" })}
          </button>
        )}

        <div className="relative hidden lg:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={t("Buscar personas, archivos, proyectos…")}
            className="w-72 pl-9 pr-4 py-2 text-sm bg-background/60 border border-border/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 placeholder:text-muted-foreground/60"
          />
        </div>

        <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="p-2 rounded-full hover:bg-accent/60 transition-colors" title={t("Modo claro/oscuro")}>
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button onClick={() => router.push("/messages")} className="p-2 rounded-full hover:bg-accent/60 transition-colors relative" title={t("Notificaciones")}>
          <Bell size={18} />
        </button>

        <LanguageSwitch />

        <button onClick={() => router.push("/messages?soporte=1")} className="p-2 rounded-full hover:bg-accent/60 transition-colors hidden md:block">
          <HelpCircle size={18} />
        </button>

        <div className="relative">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-accent/60 transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-[11px] font-semibold text-white">
              {user ? initials(user.firstName, user.lastName) : "??"}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-medium text-foreground leading-tight">
                {user ? `${user.firstName} ${user.lastName}` : t("User")}
              </div>
              <div className="text-[10px] text-muted-foreground capitalize leading-tight">
                {user?.role.replace("_", " ")}
              </div>
            </div>
            <ChevronDown size={14} className={cn("transition-transform hidden md:block", isMenuOpen && "rotate-180")} />
          </button>

          {isMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-60 glass-modal rounded-xl p-2 z-50 animate-scale-in">
                <div className="px-3 py-2 border-b border-border/30 mb-1">
                  <div className="font-medium text-sm text-foreground">
                    {user ? `${user.firstName} ${user.lastName}` : ""}
                  </div>
                  <div className="text-xs text-muted-foreground">{user?.email}</div>
                </div>
                <button onClick={() => { setIsMenuOpen(false); router.push("/directory/mi-perfil"); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-accent/60">
                  <User size={16} /> {t("Mi perfil / CV")}
                </button>
                <button onClick={() => { setIsMenuOpen(false); router.push("/settings"); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-accent/60">
                  <Settings size={16} /> {t("Configuración")}
                </button>
                <div className="border-t border-border/30 mt-1 pt-1">
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-destructive/10 text-destructive">
                    <LogOut size={16} /> {t("Cerrar sesión")}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Toolbar;
