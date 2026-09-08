// ============================================
// TERLUX COOP - LANDING PAGE PÚBLICA
// ============================================

import Link from "next/link";
import {
  LayoutDashboard, Briefcase, Kanban, Calendar, Mail, Users, FileText,
  Folder, ShoppingCart, CreditCard, Settings, BarChart3, Database, Shield,
  ArrowRight, CheckCircle2, Zap, Globe, Lock, Server, Cloud, Download,
} from "lucide-react";

export default function LandingPage() {
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
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Qué ofrece
            </a>
            <Link href="/descargas" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Download size={14} /> Descargar app
            </Link>
            <Link href="/login" className="btn btn-outline btn-sm">
              Iniciar sesión
            </Link>
            <Link href="/registro" className="btn btn-primary btn-sm gap-1.5">
              Crear cuenta <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
          <Zap size={14} /> Plataforma empresarial todo-en-uno
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
          Gestiona tu empresa<br />
          <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
            sin complicaciones
          </span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Proyectos, tareas, documentos, mensajería, nóminas, facturación y más.
          Todo conectado en una sola plataforma con diseño liquid glass.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/registro" className="btn btn-primary btn-lg gap-2">
            Comenzar ahora <ArrowRight size={18} />
          </Link>
          <Link href="#features" className="btn btn-outline btn-lg">
            Ver características
          </Link>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Sin tarjeta de crédito · 14 días gratis · Cancela cuando quieras
        </p>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Todo lo que necesitas para tu empresa
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Una suite completa con todas las herramientas que tu equipo necesita para trabajar de forma eficiente.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: LayoutDashboard,
              title: "Dashboard en tiempo real",
              description: "KPIs, métricas y actividad de tu empresa en un vistazo",
              color: "#3b82f6",
            },
            {
              icon: Briefcase,
              title: "Gestión de proyectos",
              description: "Kanban, Gantt, seguimiento de tareas y progreso",
              color: "#8b5cf6",
            },
            {
              icon: Mail,
              title: "Mensajería unificada",
              description: "Correo corporativo, chat en tiempo real y soporte",
              color: "#10b981",
            },
            {
              icon: Folder,
              title: "Drive empresarial",
              description: "Almacena y comparte archivos con cuotas por departamento",
              color: "#f59e0b",
            },
            {
              icon: CreditCard,
              title: "Facturación y pagos",
              description: "Tarjetas, transferencias, pedidos y pasarelas de pago",
              color: "#ef4444",
            },
            {
              icon: Users,
              title: "Directorio y RRHH",
              description: "Empleados, CV, departamentos y gestión de nóminas",
              color: "#06b6d4",
            },
            {
              icon: Calendar,
              title: "Calendario integrado",
              description: "Reuniones, eventos y recordatorios sincronizados",
              color: "#ec4899",
            },
            {
              icon: ShoppingCart,
              title: "Tienda de servicios",
              description: "Vende planes, packs y servicios con checkout integrado",
              color: "#14b8a6",
            },
            {
              icon: Shield,
              title: "Seguridad empresarial",
              description: "2FA, permisos por rol, VPN privada y auditoría",
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
                Diseñada para equipos modernos
              </h2>
              <div className="space-y-4">
                {[
                  "Interfaz liquid glass con modo claro y oscuro",
                  "Tiempo real con WebSockets y Server-Sent Events",
                  "Almacenamiento en VPN privada (10.8.0.0/24)",
                  "API REST completa para integraciones",
                  "Base de datos PostgreSQL con Drizzle ORM",
                  "Autenticación JWT con bcrypt y 2FA",
                  "Explorador de base de datos integrado",
                  "Sistema de colas de trabajo (job queue)",
                  "Gestión de dispositivos (MDM simplificado)",
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
                <p className="text-sm text-muted-foreground">Web responsive</p>
              </div>
              <div className="glass-card p-6 text-center">
                <Lock size={32} className="mx-auto mb-3 text-emerald-500" />
                <p className="text-2xl font-bold text-foreground">VPN</p>
                <p className="text-sm text-muted-foreground">Red privada</p>
              </div>
              <div className="glass-card p-6 text-center">
                <Server size={32} className="mx-auto mb-3 text-purple-500" />
                <p className="text-2xl font-bold text-foreground">API</p>
                <p className="text-sm text-muted-foreground">REST completa</p>
              </div>
              <div className="glass-card p-6 text-center">
                <Cloud size={32} className="mx-auto mb-3 text-cyan-500" />
                <p className="text-2xl font-bold text-foreground">S3</p>
                <p className="text-sm text-muted-foreground">Almacenamiento</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-foreground mb-4">
          ¿Listo para transformar tu empresa?
        </h2>
        <p className="text-lg text-muted-foreground mb-8">
          Únete a cientos de empresas que ya usan TerLux Coop
        </p>
        <Link href="/registro" className="btn btn-primary btn-lg gap-2">
          Comenzar prueba gratuita <ArrowRight size={18} />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© 2026 TerLux Coop · Plataforma empresarial</p>
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-foreground">Iniciar sesión</Link>
            <Link href="/store" className="hover:text-foreground">Tienda</Link>
            <Link href="https://terluxcoop.com" className="hover:text-foreground">Sitio web</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
