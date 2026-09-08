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
} from "lucide-react";
import { cn, formatDate, formatCurrency, getStatusColor, formatPercentage } from "@/lib/utils";

// Tipos
interface Project {
  id: string;
  name: string;
  code: string;
  description: string;
  status: string;
  priority: string;
  startDate: Date;
  endDate: Date;
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

// Datos mock (se reemplazarán con datos de la base de datos)
const projectsData: Project[] = [
  {
    id: "1",
    name: "Plataforma TerLux Coop",
    code: "TLC-2024-001",
    description: "Desarrollo de la plataforma empresarial completa",
    status: "active",
    priority: "high",
    startDate: new Date("2024-01-15"),
    endDate: new Date("2024-12-31"),
    budget: 150000,
    color: "#3b82f6",
    manager: { name: "Juan Pérez", avatar: "JP" },
    department: { name: "Tecnología", color: "#8b5cf6" },
    progress: 75,
    tasks: 45,
    completedTasks: 34,
    teamSize: 8,
    tags: ["Desarrollo", "Plataforma", "Enterprise"],
  },
  {
    id: "2",
    name: "Sistema de Nóminas",
    code: "TLC-2024-002",
    description: "Implementación del sistema de gestión de nóminas",
    status: "pending",
    priority: "medium",
    startDate: new Date("2024-09-01"),
    endDate: new Date("2024-11-15"),
    budget: 45000,
    color: "#f59e0b",
    manager: { name: "Ana García", avatar: "AG" },
    department: { name: "RRHH", color: "#10b981" },
    progress: 25,
    tasks: 22,
    completedTasks: 6,
    teamSize: 4,
    tags: ["RRHH", "Nóminas", "Finanzas"],
  },
  {
    id: "3",
    name: "Integración con SAP",
    code: "TLC-2024-003",
    description: "Integración del sistema con SAP Business One",
    status: "completed",
    priority: "high",
    startDate: new Date("2024-07-01"),
    endDate: new Date("2024-10-01"),
    budget: 75000,
    color: "#10b981",
    manager: { name: "Carlos López", avatar: "CL" },
    department: { name: "Tecnología", color: "#8b5cf6" },
    progress: 100,
    tasks: 38,
    completedTasks: 38,
    teamSize: 5,
    tags: ["Integración", "SAP", "ERP"],
  },
  {
    id: "4",
    name: "Migración a la Nube",
    code: "TLC-2024-004",
    description: "Migración de todos los sistemas a AWS",
    status: "active",
    priority: "critical",
    startDate: new Date("2024-08-01"),
    endDate: new Date("2024-11-30"),
    budget: 95000,
    color: "#8b5cf6",
    manager: { name: "María Martínez", avatar: "MM" },
    department: { name: "Infraestructura", color: "#06b6d4" },
    progress: 45,
    tasks: 56,
    completedTasks: 25,
    teamSize: 6,
    tags: ["Cloud", "AWS", "Infraestructura"],
  },
];

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
  const color = getStatusColor(status);
  const labels: Record<string, string> = {
    pending: "Pendiente",
    active: "Activo",
    completed: "Completado",
    cancelled: "Cancelado",
    archived: "Archivado",
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
  const color = getStatusColor(priority);
  const labels: Record<string, string> = {
    low: "Baja",
    medium: "Media",
    high: "Alta",
    critical: "Crítica",
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
    <Link
      href={`/projects/${project.id}`}
      className="glass-card group p-4 hover:shadow-md transition-shadow"
    >
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
    </Link>
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
function Filters() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar proyectos..."
          className="w-64 pl-10 pr-4 py-2 text-sm bg-background/50 border border-border/20 rounded-md focus:outline-none focus:ring-2 focus:ring-ring/20 placeholder:text-muted-foreground/50"
        />
      </div>
      
      <select className="text-sm bg-background/50 border border-border/20 rounded-md px-3 py-2">
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      <select className="text-sm bg-background/50 border border-border/20 rounded-md px-3 py-2">
        {priorityOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      <select className="text-sm bg-background/50 border border-border/20 rounded-md px-3 py-2">
        {departmentOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      <button className="p-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
        <Filter size={18} />
      </button>
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
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/20">
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Proyecto
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Descripción
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Estado
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Prioridad
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Inicio
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Fin
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Presupuesto
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Progreso
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Acciones
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
  const [view, setView] = React.useState<"grid" | "table">("grid");
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Proyectos</h1>
          <p className="page-subtitle">
            Gestión completa de todos los proyectos de la empresa
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/projects/new"
            className="btn btn-primary gap-2"
          >
            <Plus size={18} />
            <span>Nuevo Proyecto</span>
          </Link>
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
        <Filters />
      </div>

      {/* Contenido */}
      <div className="glass-card">
        {view === "grid" ? (
          <GridView projects={projectsData} />
        ) : (
          <TableView projects={projectsData} />
        )}
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            Resumen de Proyectos
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Totales</span>
              <span className="text-lg font-bold text-foreground">{projectsData.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Activos</span>
              <span className="text-lg font-bold text-green-600">
                {projectsData.filter((p) => p.status === "active").length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Completados</span>
              <span className="text-lg font-bold text-blue-600">
                {projectsData.filter((p) => p.status === "completed").length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Presupuesto Total</span>
              <span className="text-lg font-bold text-foreground">
                {formatCurrency(projectsData.reduce((sum: number, p: Project) => sum + p.budget, 0))}
              </span>
            </div>
          </div>
        </div>

        <div className="glass-card">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            Progreso General
          </h3>
          <div className="space-y-4">
            {projectsData.map((project: Project) => (
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
            Equipos por Proyecto
          </h3>
          <div className="space-y-2">
            {[...projectsData]
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
    </div>
  );
}
