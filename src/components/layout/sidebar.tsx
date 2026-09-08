"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, Briefcase, Kanban, GanttChart, Calendar,
  Mail, Users, FileText, Folder, ShoppingCart, CreditCard,
  Settings, BarChart3, Database, Shield, Bell, HelpCircle,
  ChevronLeft, ChevronRight, LogOut, Sun, Moon, Server, LifeBuoy, Headphones,
} from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { useTheme } from "next-themes";
import type { SessionInfo } from "@/lib/auth";

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
  minLevel?: number;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

const ROLE_LEVELS: Record<string, number> = {
  super_admin: 100, admin: 90, manager: 60, hr: 55, finance: 50,
  support: 40, employee: 30, client: 10, guest: 0,
};

import { Laptop, Zap, Users2 } from "lucide-react";

const navGroups: NavGroup[] = [
  {
    id: "main",
    label: "Principal",
    items: [
      { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={18} /> },
      { id: "projects", label: "Proyectos", href: "/projects", icon: <Briefcase size={18} /> },
      { id: "gantt", label: "Diagrama Gantt", href: "/gantt", icon: <GanttChart size={18} /> },
      { id: "tasks", label: "Tareas (Kanban)", href: "/tasks", icon: <Kanban size={18} /> },
      { id: "calendar", label: "Calendario", href: "/calendar", icon: <Calendar size={18} /> },
    ],
  },
  {
    id: "collab",
    label: "Colaboración",
    items: [
      { id: "messages", label: "Mensajería", href: "/messages", icon: <Mail size={18} />, badge: 3 },
      { id: "directory", label: "Directorio", href: "/directory", icon: <Users size={18} /> },
      { id: "documents", label: "Documentos", href: "/documents", icon: <FileText size={18} /> },
      { id: "files", label: "Archivos (Drive)", href: "/files", icon: <Folder size={18} /> },
    ],
  },
  {
    id: "business",
    label: "Comercial y RRHH",
    items: [
      { id: "store", label: "Tienda y Planes", href: "/store", icon: <ShoppingCart size={18} /> },
      { id: "billing", label: "Facturación y Tarjetas", href: "/billing", icon: <CreditCard size={18} />, minLevel: 30 },
      { id: "payroll", label: "Nóminas", href: "/payroll", icon: <CreditCard size={18} />, minLevel: 50 },
      { id: "hr", label: "Recursos Humanos", href: "/hr", icon: <Users2 size={18} />, minLevel: 30 },
    ],
  },
  {
    id: "operations",
    label: "Operaciones",
    items: [
      { id: "devices", label: "Dispositivos (MDM)", href: "/devices", icon: <Laptop size={18} />, minLevel: 30 },
      { id: "jobs", label: "Cola de Trabajos", href: "/jobs", icon: <Zap size={18} />, minLevel: 50 },
    ],
  },
  {
    id: "admin",
    label: "Administración",
    items: [
      { id: "admin", label: "Panel Admin", href: "/admin", icon: <Shield size={18} />, minLevel: 60 },
      { id: "admin-db", label: "Base de Datos", href: "/admin#base-de-datos", icon: <Database size={18} />, minLevel: 60 },
      { id: "admin-vpn", label: "VPN / Integraciones", href: "/settings#integraciones", icon: <Server size={18} />, minLevel: 60 },
      { id: "settings", label: "Configuración", href: "/settings", icon: <Settings size={18} />, minLevel: 30 },
      { id: "reports", label: "Reportes", href: "/admin#reportes", icon: <BarChart3 size={18} />, minLevel: 50 },
    ],
  },
  {
    id: "support",
    label: "Soporte",
    items: [
      { id: "notifications", label: "Notificaciones", href: "/messages", icon: <Bell size={18} />, badge: 5 },
      { id: "help", label: "Centro de Ayuda", href: "/messages?soporte=1", icon: <Headphones size={18} /> },
    ],
  },
];

interface SidebarProps {
  role?: string;
  user?: SessionInfo | null;
  enabledMenus?: string[];
  className?: string;
}

export function Sidebar({ role = "employee", user, enabledMenus, className }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const level = ROLE_LEVELS[role] ?? 30;

  useEffect(() => setIsMounted(true), []);

  const isActive = (href: string) => {
    const cleanHref = href.split("#")[0].split("?")[0];
    if (pathname === cleanHref) return true;
    if (cleanHref !== "/" && pathname?.startsWith(cleanHref + "/")) return true;
    return false;
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  if (!isMounted) return null;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 bottom-0 z-50 flex flex-col glass-sidebar transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
        className
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-border/30 px-4">
        {!isCollapsed ? (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-sm">
              TL
            </div>
            <div>
              <span className="font-bold text-base text-foreground block leading-tight">TerLux Coop</span>
              <span className="text-[10px] text-muted-foreground leading-none">Suite Empresarial</span>
            </div>
          </Link>
        ) : (
          <Link href="/dashboard" className="mx-auto">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-sm">
              TL
            </div>
          </Link>
        )}
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1.5 rounded hover:bg-accent transition-colors">
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {navGroups.map((group) => {
          const visible = group.items.filter(
            (i) =>
              (i.minLevel ?? 0) <= level &&
              (!enabledMenus || enabledMenus.includes(i.id))
          );
          if (visible.length === 0) return null;
          return (
            <div key={group.id} className="px-2 mb-2">
              {!isCollapsed && (
                <h3 className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </h3>
              )}
              <ul className="space-y-0.5">
                {visible.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        title={isCollapsed ? item.label : undefined}
                        className={cn(
                          "flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium transition-colors",
                          active
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground",
                          isCollapsed && "justify-center px-0"
                        )}
                      >
                        {item.icon}
                        {!isCollapsed && (
                          <>
                            <span className="flex-1">{item.label}</span>
                            {item.badge && (
                              <span className={cn(
                                "px-1.5 py-0.5 text-[10px] rounded-full font-semibold",
                                active ? "bg-primary-foreground/25 text-primary-foreground" : "bg-primary/15 text-primary"
                              )}>
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-border/30 p-2">
        <div className={cn("flex items-center gap-2 px-2 py-2 rounded-lg", isCollapsed && "justify-center px-0")}>
          {!isCollapsed && user && (
            <>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-xs font-semibold text-white">
                {initials(user.firstName, user.lastName)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-[11px] text-muted-foreground truncate capitalize">{role.replace("_", " ")}</div>
              </div>
            </>
          )}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
            title="Cambiar tema"
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          {!isCollapsed && (
            <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-destructive/15 text-destructive transition-colors" title="Cerrar sesión">
              <LogOut size={17} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
