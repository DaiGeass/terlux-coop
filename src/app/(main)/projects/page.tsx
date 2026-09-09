// ============================================
// TERLUX COOP - GESTION DE PROYECTOS
// ============================================

"use client";

import Link from "next/link";
import React from "react";
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Users,
  Calendar,
  FileText,
  Tag,
  X,
} from "lucide-react";
import { cn, formatDate, formatCurrency, getStatusColor, formatPercentage } from "@/lib/utils";
import { useT } from "@/i18n";

// Tipos
interface Project {
  id: string;
  name: string;
  code: string;
  description: string;
  status: string;
  priority: string;
  startDate: string;
  endDate: string;
  budget: number;
  color: string;
  manager: { name: string; avatar: string };
  department: { name: string; color: string };
  progress: number;
  tasks: number;
  completedTasks: number;
  teamSize: number;
  tags: string[];
}



const statusOptions = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "pending", label: "Pendientes" },
  { value: "completed", label: "Completados" },
  { value: "cancelled", label: "Cancelados" },
  { value: "archived", label: "Archivados" },
];

const priorityOptions = [
  { value: "all", label: "Todas" },
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
  { value: "critical", label: "Crítica" },
];

const departmentOptions = [
  { value: "all", label: "Todos" },
  { value: "tecnologia", label: "Tecnología" },
  { value: "rrhh", label: "RRHH" },
  { value: "infraestructura", label: "Infraestructura" },
  { value: "marketing", label: "Marketing" },
];

// Componente ProjectStatusBadge
function ProjectStatusBadge({ status }: { status: string }) {
  const t = useT();
  const color = getStatusColor(status);
  const labels: Record<string, string> = {
    pending: t("Pendiente"),
    active: t("Activo"),
    completed: t("Completado"),
    cancelled: t("Cancelado"),
    archived: t("Archivado"),
  };
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: color + "20", color }}
    >
      {labels[status] || status}
    </span>
  );
}

// Componente PriorityBadge
function PriorityBadge({ priority }: { priority: string }) {
  const t = useT();
  const color = getStatusColor(priority);
  const labels: Record<string, string> = {
    low: t("Baja"),
    medium: t("Media"),
    high: t("Alta"),
    critical: t("Crítica"),
  };
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: color + "20", color }}
    >
      {labels[priority] || priority}
    </span>
  );
}

// Componente ProgressBar
function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full bg-primary rounded-full"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

// Componente ProjectCard
function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="glass-card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: project.color }}
            />
            <h3 className="font-medium text-foreground truncate">{project.name}</h3>
            <span className="text-xs text-muted-foreground">{project.code}</span>
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {project.description}
          </p>
          
          <div className="flex items-center gap-3 mb-3">
            <ProjectStatusBadge status={project.status} />
            <PriorityBadge priority={project.priority} />
          </div>
          
          <ProgressBar value={project.progress} />
          
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users size={14} />
                <span>{project.teamSize}</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar size={14} />
                <span>{formatDate(project.endDate)}</span>
              </div>
            </div>
            <div className="text-sm font-medium text-foreground">
              {formatPercentage(project.progress, 0)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente ProjectRow (para vista de tabla)
function ProjectRow({ project }: { project: Project }) {
  return (
    <tr className="hover:bg-muted/50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <div>
            <div className="font-medium text-foreground">{project.name}</div>
            <div className="text-xs text-muted-foreground">{project.code}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-foreground">{project.description}</td>
      <td className="px-4 py-3">
        <ProjectStatusBadge status={project.status} />
      </td>
      <td className="px-4 py-3">
        <PriorityBadge priority={project.priority} />
      </td>
      <td className="px-4 py-3 text-sm text-foreground">
        {formatDate(project.startDate)}
      </td>
      <td className="px-4 py-3 text-sm text-foreground">
        {formatDate(project.endDate)}
      </td>
      <td className="px-4 py-3 text-sm text-foreground">
        {formatCurrency(project.budget)}
      </td>
      <td className="px-4 py-3">
        <ProgressBar value={project.progress} />
      </td>
      <td className="px-4 py-3">
        <button className="p-1 rounded hover:bg-muted transition-colors">
          <MoreVertical size={16} className="text-muted-foreground" />
        </button>
      </td>
    </tr>
  );
}

// Componente Filtros
function Filters({ search, status, priority, onSearch, onStatus, onPriority }: {
  search: string; status: string; priority: string;
  onSearch: (v: string) => void; onStatus: (v: string) => void; onPriority: (v: string) => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={t("Buscar proyectos...")}
          className="w-64 pl-10 pr-4 py-2 text-sm bg-background/50 border border-border/20 rounded-md focus:outline-none focus:ring-2 focus:ring-ring/20 placeholder:text-muted-foreground/50"
        />
      </div>
      
      <select value={status} onChange={(e) => onStatus(e.target.value)}
        className="text-sm bg-background/50 border border-border/20 rounded-md px-3 py-2">
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>{t(option.label)}</option>
        ))}
      </select>
      
      <select value={priority} onChange={(e) => onPriority(e.target.value)}
        className="text-sm bg-background/50 border border-border/20 rounded-md px-3 py-2">
        {priorityOptions.map((option) => (
          <option key={option.value} value={option.value}>{t(option.label)}</option>
        ))}
      </select>
      
      {(search || status !== "all" || priority !== "all") && (
        <button onClick={() => { onSearch(""); onStatus("all"); onPriority("all"); }}
          className="text-xs text-primary hover:underline">
          {t("Limpiar filtros")}
        </button>
      )}
    </div>
  );
}

// Componente Vista Grid
function GridView({ projects }: { projects: Project[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}

// Componente Vista Tabla
function TableView({ projects }: { projects: Project[] }) {
  const t = useT();
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/20">
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("Proyecto")}
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("Descripción")}
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("Estado")}
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("Prioridad")}
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("Inicio")}
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("Fin")}
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("Presupuesto")}
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("Progreso")}
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("Acciones")}
            </th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <ProjectRow key={project.id} project={project} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Página principal de proyectos
export default function ProjectsPage() {
  const t = useT();
  const [view, setView] = React.useState<"grid" | "table">("grid");
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [showNew, setShowNew] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", code: "", description: "", priority: "medium", startDate: "", endDate: "", budget: "", color: "#6366f1" });
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [priorityFilter, setPriorityFilter] = React.useState("all");

  const filtered = React.useMemo(() => {
    return projects.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.code.toLowerCase().includes(search.toLowerCase()) && !p.description.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (priorityFilter !== "all" && p.priority !== priorityFilter) return false;
      return true;
    });
  }, [projects, search, statusFilter, priorityFilter]);

  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      const d = await res.json();
      if (d.success) setProjects(d.data);
    } catch { /* sin cambios */ }
  }, []);

  React.useEffect(() => { refresh(); }, [refresh]);

  const createProject = async () => {
    if (!form.name.trim()) return;
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, budget: form.budget ? Number(form.budget) : null }),
    });
    const d = await res.json();
    if (d.success) {
      setShowNew(false);
      setForm({ name: "", code: "", description: "", priority: "medium", startDate: "", endDate: "", budget: "", color: "#6366f1" });
      await refresh();
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("Proyectos")}</h1>
          <p className="page-subtitle">
            {t("Gestión completa de todos los proyectos de la empresa")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNew(true)}
            className="btn btn-primary gap-2"
          >
            <Plus size={18} />
            <span>{t("Nuevo Proyecto")}</span>
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setView("grid")}
              className={cn(
                "p-2 rounded transition-colors",
                view === "grid" ? "bg-primary/10 text-primary" : "hover:bg-muted"
              )}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
              </svg>
            </button>
            <button
              onClick={() => setView("table")}
              className={cn(
                "p-2 rounded transition-colors",
                view === "table" ? "bg-primary/10 text-primary" : "hover:bg-muted"
              )}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="glass-card">
        <Filters search={search} status={statusFilter} priority={priorityFilter}
          onSearch={setSearch} onStatus={setStatusFilter} onPriority={setPriorityFilter} />
      </div>

      {/* Contenido */}
      <div className="glass-card">
        {view === "grid" ? (
          <GridView projects={filtered} />
        ) : (
          <TableView projects={filtered} />
        )}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-10">{t("No se encontraron proyectos con los filtros seleccionados.")}</p>
        )}
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            {t("Resumen de Proyectos")}
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">{t("Totales")}</span>
              <span className="text-lg font-bold text-foreground">{projects.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">{t("Activos")}</span>
              <span className="text-lg font-bold text-green-600">
                {projects.filter((p) => p.status === "active").length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">{t("Completados")}</span>
              <span className="text-lg font-bold text-blue-600">
                {projects.filter((p) => p.status === "completed").length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">{t("Presupuesto Total")}</span>
              <span className="text-lg font-bold text-foreground">
                {formatCurrency(projects.reduce((sum: number, p: Project) => sum + p.budget, 0))}
              </span>
            </div>
          </div>
        </div>

        <div className="glass-card">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            {t("Progreso General")}
          </h3>
          <div className="space-y-4">
            {projects.map((project: Project) => (
              <div key={project.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground truncate max-w-[150px]">
                    {project.name}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {formatPercentage(project.progress, 0)}
                  </span>
                </div>
                <ProgressBar value={project.progress} />
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            {t("Equipos por Proyecto")}
          </h3>
          <div className="space-y-2">
            {[...projects]
              .sort((a: Project, b: Project) => b.teamSize - a.teamSize)
              .map((project: Project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-foreground truncate max-w-[120px]">
                    {project.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1">
                      {Array.from({ length: Math.min(project.teamSize, 3) }).map((_, i: number) => (
                        <div
                          key={i}
                          className="w-6 h-6 rounded-full bg-muted border-2 border-background"
                        />
                      ))}
                      {project.teamSize > 3 && (
                        <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                          +{project.teamSize - 3}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Modal nuevo proyecto */}
      {showNew && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowNew(false)}>
          <div className="glass-modal rounded-2xl p-6 w-full max-w-md animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t("Nuevo proyecto")}</h3>
              <button onClick={() => setShowNew(false)} className="p-1.5 rounded hover:bg-muted transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("Nombre del proyecto")} className="form-input" />
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder={t("Código (ej. TLC-2024-005)")} className="form-input" />
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t("Descripción")} rows={2} className="form-input" />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="form-select">
                  <option value="low">{t("Prioridad baja")}</option>
                  <option value="medium">{t("Prioridad media")}</option>
                  <option value="high">{t("Prioridad alta")}</option>
                  <option value="critical">{t("Crítica")}</option>
                </select>
                <input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder={t("Presupuesto")} className="form-input" />
                <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="form-input" />
                <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="form-input" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">{t("Color:")}</label>
                <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-10 h-8 cursor-pointer rounded" />
              </div>
              <button onClick={createProject} disabled={!form.name.trim()} className="btn btn-primary w-full gap-2"><Plus size={16} /> {t("Crear proyecto")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
