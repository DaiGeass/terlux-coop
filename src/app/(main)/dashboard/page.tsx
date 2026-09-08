// ============================================
// TERLUX COOP - DASHBOARD PRINCIPAL
// ============================================

"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Briefcase,
  Kanban,
  Calendar,
  Users,
  FileText,
  Folder,
  CreditCard,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  MoreVertical,
} from "lucide-react";
import { cn, formatCurrency, formatDate, formatPercentage, getStatusColor } from "@/lib/utils";

// Datos mock para el dashboard (se reemplazarán con datos reales de la base de datos)
const stats = [
  {
    id: "projects",
    label: "Proyectos Activos",
    value: 12,
    change: 2,
    changeType: "positive",
    icon: <Briefcase className="w-5 h-5" />,
    color: "#3b82f6",
    href: "/projects",
  },
  {
    id: "tasks",
    label: "Tareas Completadas",
    value: 85,
    change: 15,
    changeType: "positive",
    icon: <CheckCircle className="w-5 h-5" />,
    color: "#10b981",
    href: "/tasks",
  },
  {
    id: "meetings",
    label: "Reuniones Hoy",
    value: 3,
    change: -1,
    changeType: "negative",
    icon: <Calendar className="w-5 h-5" />,
    color: "#8b5cf6",
    href: "/calendar",
  },
  {
    id: "revenue",
    label: "Ingresos Mensuales",
    value: "€45,230",
    change: 12.5,
    changeType: "positive",
    icon: <TrendingUp className="w-5 h-5" />,
    color: "#f59e0b",
    href: "/invoices",
  },
];

const quickActions = [
  {
    id: "new-project",
    label: "Nuevo Proyecto",
    icon: <Briefcase className="w-4 h-4" />,
    href: "/projects/new",
    color: "#3b82f6",
  },
  {
    id: "new-task",
    label: "Nueva Tarea",
    icon: <Kanban className="w-4 h-4" />,
    href: "/tasks/new",
    color: "#10b981",
  },
  {
    id: "new-meeting",
    label: "Nueva Reunión",
    icon: <Calendar className="w-4 h-4" />,
    href: "/calendar/new",
    color: "#8b5cf6",
  },
  {
    id: "new-document",
    label: "Nuevo Documento",
    icon: <FileText className="w-4 h-4" />,
    href: "/documents/new",
    color: "#06b6d4",
  },
];

const recentProjects = [
  {
    id: "1",
    name: "Plataforma TerLux Coop",
    code: "TLC-2024-001",
    status: "active",
    progress: 75,
    dueDate: new Date("2024-12-31"),
    color: "#3b82f6",
    manager: "Juan Pérez",
  },
  {
    id: "2",
    name: "Sistema de Nóminas",
    code: "TLC-2024-002",
    status: "pending",
    progress: 25,
    dueDate: new Date("2024-11-15"),
    color: "#f59e0b",
    manager: "Ana García",
  },
  {
    id: "3",
    name: "Integración con SAP",
    code: "TLC-2024-003",
    status: "completed",
    progress: 100,
    dueDate: new Date("2024-10-01"),
    color: "#10b981",
    manager: "Carlos López",
  },
  {
    id: "4",
    name: "Migración a la Nube",
    code: "TLC-2024-004",
    status: "active",
    progress: 45,
    dueDate: new Date("2024-11-30"),
    color: "#8b5cf6",
    manager: "María Martínez",
  },
];

const recentTasks = [
  {
    id: "1",
    title: "Diseñar interfaz de usuario",
    project: "Plataforma TerLux Coop",
    status: "in_progress",
    priority: "high",
    dueDate: new Date("2024-10-15"),
    assignedTo: "Juan Pérez",
  },
  {
    id: "2",
    title: "Configurar base de datos",
    project: "Sistema de Nóminas",
    status: "todo",
    priority: "high",
    dueDate: new Date("2024-10-10"),
    assignedTo: "Ana García",
  },
  {
    id: "3",
    title: "Revisar documentación",
    project: "Integración con SAP",
    status: "review",
    priority: "medium",
    dueDate: new Date("2024-10-08"),
    assignedTo: "Carlos López",
  },
  {
    id: "4",
    title: "Realizar pruebas de rendimiento",
    project: "Migración a la Nube",
    status: "done",
    priority: "low",
    dueDate: new Date("2024-10-05"),
    assignedTo: "María Martínez",
  },
  {
    id: "5",
    title: "Implementar autenticación",
    project: "Plataforma TerLux Coop",
    status: "in_progress",
    priority: "critical",
    dueDate: new Date("2024-10-20"),
    assignedTo: "Juan Pérez",
  },
];

const upcomingMeetings = [
  {
    id: "1",
    title: "Reunión de Equipo",
    startTime: new Date("2024-10-10T10:00:00"),
    endTime: new Date("2024-10-10T11:00:00"),
    location: "Sala de Reuniones A",
    attendees: ["Juan Pérez", "Ana García", "Carlos López"],
    color: "#3b82f6",
  },
  {
    id: "2",
    title: "Presentación a Clientes",
    startTime: new Date("2024-10-12T14:00:00"),
    endTime: new Date("2024-10-12T15:30:00"),
    location: "Online - Zoom",
    attendees: ["Juan Pérez", "María Martínez"],
    color: "#8b5cf6",
  },
  {
    id: "3",
    title: "Revisión de Proyectos",
    startTime: new Date("2024-10-15T09:00:00"),
    endTime: new Date("2024-10-15T10:30:00"),
    location: "Sala de Reuniones B",
    attendees: ["Todos"],
    color: "#10b981",
  },
];

const activityFeed = [
  {
    id: "1",
    user: "Juan Pérez",
    action: "creó",
    entity: "Proyecto Plataforma TerLux Coop",
    time: new Date("2024-10-07T09:30:00"),
    avatar: "JP",
  },
  {
    id: "2",
    user: "Ana García",
    action: "completó",
    entity: "Tarea Configurar base de datos",
    time: new Date("2024-10-07T10:15:00"),
    avatar: "AG",
  },
  {
    id: "3",
    user: "Carlos López",
    action: "subió",
    entity: "Documento Contrato Cliente X",
    time: new Date("2024-10-07T11:45:00"),
    avatar: "CL",
  },
  {
    id: "4",
    user: "María Martínez",
    action: "programó",
    entity: "Reunión Revisión de Proyectos",
    time: new Date("2024-10-07T14:20:00"),
    avatar: "MM",
  },
];

const chartData = [
  { name: "Ene", proyectos: 2, tareas: 15 },
  { name: "Feb", proyectos: 3, tareas: 22 },
  { name: "Mar", proyectos: 1, tareas: 18 },
  { name: "Abr", proyectos: 4, tareas: 28 },
  { name: "May", proyectos: 3, tareas: 25 },
  { name: "Jun", proyectos: 5, tareas: 35 },
  { name: "Jul", proyectos: 2, tareas: 20 },
  { name: "Ago", proyectos: 3, tareas: 28 },
  { name: "Sep", proyectos: 4, tareas: 32 },
  { name: "Oct", proyectos: 2, tareas: 25 },
];

const projectStatusData = [
  { name: "Pendientes", value: 3, color: "#6b7280" },
  { name: "Activos", value: 12, color: "#3b82f6" },
  { name: "Completados", value: 5, color: "#10b981" },
  { name: "Cancelados", value: 1, color: "#ef4444" },
];

const taskStatusData = [
  { name: "Por Hacer", value: 15, color: "#6b7280" },
  { name: "En Progreso", value: 8, color: "#3b82f6" },
  { name: "En Revisión", value: 3, color: "#f59e0b" },
  { name: "Completadas", value: 85, color: "#10b981" },
  { name: "Bloqueadas", value: 2, color: "#ef4444" },
];

// Componente StatCard
export function StatCard({ stat }: { stat: (typeof stats)[0] }) {
  return (
    <Link
      href={stat.href}
      className="stat-card group"
    >
      <div className="flex items-center justify-between">
        <div
          className="stat-icon"
          style={{ backgroundColor: stat.color + "20" }}
        >
          <span style={{ color: stat.color }}>{stat.icon}</span>
        </div>
        <div className="flex gap-1">
          <span
            className={`stat-change ${stat.changeType}`}
          >
            {stat.changeType === "positive" ? "▲" : "▼"}
            {typeof stat.change === "number"
              ? formatPercentage(stat.change, 0)
              : stat.change}
          </span>
        </div>
      </div>
      <div>
        <div className="stat-value">
          {typeof stat.value === "string"
            ? stat.value
            : formatNumber(stat.value)}
        </div>
        <div className="stat-label">{stat.label}</div>
      </div>
    </Link>
  );
}

// Componente QuickActionButton
export function QuickActionButton({ action }: { action: (typeof quickActions)[0] }) {
  return (
    <Link
      href={action.href}
      className="glass-card group flex flex-col items-center justify-center gap-3 p-4 hover:scale-105 transition-transform"
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: action.color + "20" }}
      >
        <span style={{ color: action.color }}>{action.icon}</span>
      </div>
      <span className="text-sm font-medium text-foreground">{action.label}</span>
    </Link>
  );
}

// Componente RecentProjectCard
export function RecentProjectCard({ project }: { project: (typeof recentProjects)[0] }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="glass-card group p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: project.color }}
            />
            <h3 className="font-medium text-foreground truncate">{project.name}</h3>
          </div>
          <p className="text-sm text-muted-foreground">{project.code}</p>
          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1">
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatPercentage(project.progress, 0)}
              </p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {formatDate(project.dueDate)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Componente RecentTaskItem
export function RecentTaskItem({ task }: { task: (typeof recentTasks)[0] }) {
  const statusColor = getStatusColor(task.status);
  const priorityColor = getStatusColor(task.priority);
  
  return (
    <Link
      href={`/tasks/${task.id}`}
      className="glass-card group p-3 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: statusColor }}
            />
            <h3 className="font-medium text-foreground truncate">{task.title}</h3>
          </div>
          <p className="text-sm text-muted-foreground">{task.project}</p>
          <div className="flex items-center gap-3 mt-2">
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: priorityColor + "20", color: priorityColor }}
            >
              {task.priority}
            </span>
            <span className="text-xs text-muted-foreground">
              Asignado a: {task.assignedTo}
            </span>
          </div>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDate(task.dueDate)}
        </span>
      </div>
    </Link>
  );
}

// Componente UpcomingMeetingItem
export function UpcomingMeetingItem({ meeting }: { meeting: (typeof upcomingMeetings)[0] }) {
  return (
    <Link
      href={`/calendar/${meeting.id}`}
      className="glass-card group p-3 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0 mt-1.5"
          style={{ backgroundColor: meeting.color }}
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate">{meeting.title}</h3>
          <p className="text-sm text-muted-foreground">{meeting.location}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDate(meeting.startTime, "Pp")} - {formatDate(meeting.endTime, "p")}
          </p>
        </div>
      </div>
    </Link>
  );
}

// Componente ActivityFeedItem
export function ActivityFeedItem({ activity }: { activity: (typeof activityFeed)[0] }) {
  return (
    <div className="flex items-start gap-3 p-3 hover:bg-muted/50 rounded transition-colors">
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium flex-shrink-0">
        {activity.avatar}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">
          <span className="font-medium">{activity.user}</span>
          <span> {activity.action} </span>
          <span className="text-muted-foreground">{activity.entity}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatRelative(activity.time)}
        </p>
      </div>
    </div>
  );
}

// Componente ChartBar
export function ChartBar({ data }: { data: (typeof chartData)[0][] }) {
  const maxValue = Math.max(...data.flatMap((d) => [d.proyectos, d.tareas]));
  
  return (
    <div className="flex items-end justify-between gap-2 h-40">
      {data.map((item, index) => (
        <div key={index} className="flex-1 flex flex-col items-center gap-2">
          <div className="w-full flex gap-1">
            <div
              className="flex-1 bg-primary rounded-t"
              style={{ height: `${(item.proyectos / maxValue) * 100}%` }}
            />
            <div
              className="flex-1 bg-indigo-400 rounded-t"
              style={{ height: `${(item.tareas / maxValue) * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{item.name}</span>
        </div>
      ))}
    </div>
  );
}

// Componente StatusPieChart
export function StatusPieChart({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  
  return (
    <div className="flex items-center justify-center gap-4">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full" viewBox="0 0 36 36">
          {data.map((item, index) => {
            const startAngle = data.slice(0, index).reduce((sum, d) => sum + (d.value / total) * 360, 0);
            const endAngle = startAngle + (item.value / total) * 360;
            const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
            const x1 = 18 + 18 * Math.cos((startAngle * Math.PI) / 180);
            const y1 = 18 + 18 * Math.sin((startAngle * Math.PI) / 180);
            const x2 = 18 + 18 * Math.cos((endAngle * Math.PI) / 180);
            const y2 = 18 + 18 * Math.sin((endAngle * Math.PI) / 180);
            
            return (
              <path
                key={index}
                d={`M18,18 L${x1},${y1} A18,18 0 ${largeArcFlag},1 ${x2},${y2} Z`}
                fill={item.color}
                stroke="none"
              />
            );
          })}
        </svg>
      </div>
      <div className="space-y-2">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm text-foreground">{item.name}</span>
            <span className="text-sm text-muted-foreground">({item.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// PAGINA PRINCIPAL
// ============================================

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Bienvenido a TerLux Coop - Tu plataforma empresarial completa
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.id} stat={stat} />
        ))}
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Actividad Mensual
            </h2>
            <select className="text-sm bg-background border border-border rounded px-2 py-1">
              <option>2024</option>
              <option>2023</option>
            </select>
          </div>
          <ChartBar data={chartData} />
          <div className="flex items-center justify-center gap-4 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-sm text-muted-foreground">Proyectos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-400" />
              <span className="text-sm text-muted-foreground">Tareas</span>
            </div>
          </div>
        </div>

        <div className="glass-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Estado de Proyectos
          </h2>
          <StatusPieChart data={projectStatusData} />
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Acciones Rápidas
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <QuickActionButton key={action.id} action={action} />
          ))}
        </div>
      </section>

      {/* Recent Items */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Proyectos Recientes
            </h2>
            <Link
              href="/projects"
              className="text-sm text-primary hover:underline"
            >
              Ver todos
            </Link>
          </div>
          <div className="space-y-3">
            {recentProjects.map((project) => (
              <RecentProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Tareas Recientes
            </h2>
            <Link
              href="/tasks"
              className="text-sm text-primary hover:underline"
            >
              Ver todas
            </Link>
          </div>
          <div className="space-y-3">
            {recentTasks.map((task) => (
              <RecentTaskItem key={task.id} task={task} />
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Próximas Reuniones
            </h2>
            <Link
              href="/calendar"
              className="text-sm text-primary hover:underline"
            >
              Ver calendario
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingMeetings.map((meeting) => (
              <UpcomingMeetingItem key={meeting.id} meeting={meeting} />
            ))}
          </div>
        </div>
      </section>

      {/* Activity Feed */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Actividad Reciente
        </h2>
        <div className="space-y-2">
          {activityFeed.map((activity) => (
            <ActivityFeedItem key={activity.id} activity={activity} />
          ))}
        </div>
      </section>
    </div>
  );
}

// Funciones de utilidad para el dashboard
function formatNumber(num: number): string {
  return new Intl.NumberFormat("es-ES").format(num);
}

function formatRelative(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `Hace ${days} día${days > 1 ? "s" : ""}`;
  }
  if (hours > 0) {
    return `Hace ${hours} hora${hours > 1 ? "s" : ""}`;
  }
  if (minutes > 0) {
    return `Hace ${minutes} minuto${minutes > 1 ? "s" : ""}`;
  }
  return "Ahora";
}
