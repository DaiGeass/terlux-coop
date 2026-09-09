// ============================================
// TERLUX COOP - LANDING PAGE PÚBLICA
// ============================================

"use client";

import Link from "next/link";
import {
  LayoutDashboard, Briefcase, Kanban, Calendar, Mail, Users, FileText,
  Folder, ShoppingCart, CreditCard, Settings, BarChart3, Database, Shield,
  ArrowRight, CheckCircle2, Zap, Globe, Lock, Server, Cloud, Download,
} from "lucide-react";
import { useT } from "@/i18n";
import { LanguageSwitch } from "@/components/i18n/language-switch";

export default function LandingPage() {
  const t = useT();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="glass-navbar sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
              TL
            </div>
            <span className="font-bold text-lg text-foreground">TerLux Coop</span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitch />
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t("Qué ofrece")}
            </a>
            <Link href="/descargas" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Download size={14} /> {t("Descargar app")}
            </Link>
            <Link href="/login" className="btn btn-outline btn-sm">
              {t("Iniciar sesión")}
            </Link>
            <Link href="/registro" className="btn btn-primary btn-sm gap-1.5">
              {t("Crear cuenta")} <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
          <Zap size={14} /> {t("Plataforma empresarial todo-en-uno")}
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
          {t("Gestiona tu empresa")}<br />
          <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
            {t("sin complicaciones")}
          </span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          {t("Proyectos, tareas, documentos, mensajería, nóminas, facturación y más.")}
          {t("Todo conectado en una sola plataforma con diseño liquid glass.")}
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/registro" className="btn btn-primary btn-lg gap-2">
            {t("Comenzar ahora")} <ArrowRight size={18} />
          </Link>
          <Link href="#features" className="btn btn-outline btn-lg">
            {t("Ver características")}
          </Link>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          {t("Sin tarjeta de crédito · 14 días gratis · Cancela cuando quieras")}
        </p>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            {t("Todo lo que necesitas para tu empresa")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("Una suite completa con todas las herramientas que tu equipo necesita para trabajar de forma eficiente.")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: LayoutDashboard,
              title: t("Dashboard en tiempo real"),
              description: t("KPIs, métricas y actividad de tu empresa en un vistazo"),
              color: "#3b82f6",
            },
            {
              icon: Briefcase,
              title: t("Gestión de proyectos"),
              description: t("Kanban, Gantt, seguimiento de tareas y progreso"),
              color: "#8b5cf6",
            },
            {
              icon: Mail,
              title: t("Mensajería unificada"),
              description: t("Correo corporativo, chat en tiempo real y soporte"),
              color: "#10b981",
            },
            {
              icon: Folder,
              title: t("Drive empresarial"),
              description: t("Almacena y comparte archivos con cuotas por departamento"),
              color: "#f59e0b",
            },
            {
              icon: CreditCard,
              title: t("Facturación y pagos"),
              description: t("Tarjetas, transferencias, pedidos y pasarelas de pago"),
              color: "#ef4444",
            },
            {
              icon: Users,
              title: t("Directorio y RRHH"),
              description: t("Empleados, CV, departamentos y gestión de nóminas"),
              color: "#06b6d4",
            },
            {
              icon: Calendar,
              title: t("Calendario integrado"),
              description: t("Reuniones, eventos y recordatorios sincronizados"),
              color: "#ec4899",
            },
            {
              icon: ShoppingCart,
              title: t("Tienda de servicios"),
              description: t("Vende planes, packs y servicios con checkout integrado"),
              color: "#14b8a6",
            },
            {
              icon: Shield,
              title: t("Seguridad empresarial"),
              description: t("2FA, permisos por rol, VPN privada y auditoría"),
              color: "#8b5cf6",
            },
          ].map((feature, i) => (
            <div key={i} className="glass-card p-6 hover:shadow-lg hover:-translate-y-1 transition-all">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: feature.color + "20", color: feature.color }}
              >
                <feature.icon size={24} />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="glass-card p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">
                {t("Diseñada para equipos modernos")}
              </h2>
              <div className="space-y-4">
                {[
                  t("Interfaz liquid glass con modo claro y oscuro"),
                  t("Tiempo real con WebSockets y Server-Sent Events"),
                  t("Almacenamiento en VPN privada (Tailscale 100.64.0.0/10)"),
                  t("API REST completa para integraciones"),
                  t("Base de datos PostgreSQL con Drizzle ORM"),
                  t("Autenticación JWT con bcrypt y 2FA"),
                  t("Explorador de base de datos integrado"),
                  t("Sistema de colas de trabajo (job queue)"),
                  t("Gestión de dispositivos (MDM simplificado)"),
                ].map((benefit, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 size={20} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card p-6 text-center">
                <Globe size={32} className="mx-auto mb-3 text-primary" />
                <p className="text-2xl font-bold text-foreground">100%</p>
                <p className="text-sm text-muted-foreground">{t("Web responsive")}</p>
              </div>
              <div className="glass-card p-6 text-center">
                <Lock size={32} className="mx-auto mb-3 text-emerald-500" />
                <p className="text-2xl font-bold text-foreground">VPN</p>
                <p className="text-sm text-muted-foreground">{t("Red privada")}</p>
              </div>
              <div className="glass-card p-6 text-center">
                <Server size={32} className="mx-auto mb-3 text-purple-500" />
                <p className="text-2xl font-bold text-foreground">API</p>
                <p className="text-sm text-muted-foreground">{t("REST completa")}</p>
              </div>
              <div className="glass-card p-6 text-center">
                <Cloud size={32} className="mx-auto mb-3 text-cyan-500" />
                <p className="text-2xl font-bold text-foreground">S3</p>
                <p className="text-sm text-muted-foreground">{t("Almacenamiento")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-foreground mb-4">
          {t("¿Listo para transformar tu empresa?")}
        </h2>
        <p className="text-lg text-muted-foreground mb-8">
          {t("Únete a cientos de empresas que ya usan TerLux Coop")}
        </p>
        <Link href="/registro" className="btn btn-primary btn-lg gap-2">
          {t("Comenzar prueba gratuita")} <ArrowRight size={18} />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© 2026 TerLux Coop · {t("Plataforma empresarial")}</p>
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-foreground">{t("Iniciar sesión")}</Link>
            <Link href="/store" className="hover:text-foreground">{t("Tienda")}</Link>
            <Link href="/terminos" className="hover:text-foreground">{t("Términos")}</Link>
            <Link href="/privacidad" className="hover:text-foreground">{t("Privacidad")}</Link>
            <Link href="https://terluxcoop.com" className="hover:text-foreground">{t("Sitio web")}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}