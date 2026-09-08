// ============================================
// TERLUX COOP - DASHBOARD (datos reales de BD)
// ============================================

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Briefcase, CheckCircle, Calendar, TrendingUp, FileText,
  Kanban, Clock, Loader2,
} from "lucide-react";
import { cn, formatCurrency, formatDate, formatPercentage, getStatusColor } from "@/lib/utils";

interface DashboardData {
  stats: { projectsActive: number; tasksCompleted: number; meetingsToday: number; revenue: number; users: number };
  recentProjects: { id: string; name: string; code: string; status: string; progress: number; dueDate: string | null; color: string; managerName: string }[];
  recentTasks: { id: string; title: string; project: string; status: string; priority: string; dueDate: string | null; assignedTo: string }[];
  upcomingMeetings: { id: string; title: string; startTime: string; endTime: string; location: string; color: string }[];
  activityFeed: { id: string; user: string; action: string; entity: string; time: string; avatar: string }[];
  chartData: { name: string; proyectos: number; tareas: number }[];
  projectStatusData: { name: string; value: number; color: string }[];
  taskStatusData: { name: string; value: number; color: string }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard").then((r) => r.json()).then((d) => d.success && setData(d.data)).catch(() => {});
  }, []);

  if (!data) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  }

  const stats = [
    { id: "projects", label: "Proyectos Activos", value: data.stats.projectsActive, icon: <Briefcase className="w-5 h-5" />, color: "#3b82f6", href: "/projects" },
    { id: "tasks", label: "Tareas Completadas", value: data.stats.tasksCompleted, icon: <CheckCircle className="w-5 h-5" />, color: "#10b981", href: "/tasks" },
    { id: "meetings", label: "Reuniones Hoy", value: data.stats.meetingsToday, icon: <Calendar className="w-5 h-5" />, color: "#8b5cf6", href: "/calendar" },
    { id: "revenue", label: "Ingresos del Mes", value: formatCurrency(data.stats.revenue), icon: <TrendingUp className="w-5 h-5" />, color: "#f59e0b", href: "/billing" },
  ];

  const quickActions = [
    { id: "new-project", label: "Nuevo Proyecto", icon: <Briefcase className="w-4 h-4" />, href: "/projects/new", color: "#3b82f6" },
    { id: "new-task", label: "Nueva Tarea", icon: <Kanban className="w-4 h-4" />, href: "/tasks/new", color: "#10b981" },
    { id: "new-meeting", label: "Nueva Reunión", icon: <Calendar className="w-4 h-4" />, href: "/calendar/new", color: "#8b5cf6" },
    { id: "new-document", label: "Nuevo Documento", icon: <FileText className="w-4 h-4" />, href: "/documents/new", color: "#06b6d4" },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Bienvenido a TerLux Coop · {data.stats.users} personas en la plataforma</p>
        </div>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.id} {...stat} />
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Actividad Mensual</h2>
            <span className="text-xs text-muted-foreground">Últimos 10 meses</span>
          </div>
          <ChartBar data={data.chartData} />
          <div className="flex items-center justify-center gap-4 mt-2">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-primary" /><span className="text-sm text-muted-foreground">Proyectos</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-400" /><span className="text-sm text-muted-foreground">Tareas</span></div>
          </div>
        </div>
        <div className="glass-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">Estado de Tareas</h2>
          <StatusPieChart data={data.taskStatusData} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <QuickActionButton key={action.id} {...action} />
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <SectionHeader href="/projects" title="Proyectos Recientes" link="Ver todos" />
          <div className="space-y-3">
            {data.recentProjects.length === 0 && <EmptyMsg />}
            {data.recentProjects.map((project) => <RecentProjectCard key={project.id} project={project} />)}
          </div>
        </div>
        <div>
          <SectionHeader href="/tasks" title="Tareas Recientes" link="Ver todas" />
          <div className="space-y-3">
            {data.recentTasks.length === 0 && <EmptyMsg />}
            {data.recentTasks.map((task) => <RecentTaskItem key={task.id} task={task} />)}
          </div>
        </div>
        <div>
          <SectionHeader href="/calendar" title="Próximas Reuniones" link="Ver calendario" />
          <div className="space-y-3">
            {data.upcomingMeetings.length === 0 && <EmptyMsg />}
            {data.upcomingMeetings.map((meeting) => <UpcomingMeetingItem key={meeting.id} meeting={meeting} />)}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Actividad Reciente</h2>
        <div className="space-y-2">
          {data.activityFeed.length === 0 && <EmptyMsg />}
          {data.activityFeed.map((activity) => <ActivityFeedItem key={activity.id} activity={activity} />)}
        </div>
      </section>
    </div>
  );
}

function EmptyMsg() {
  return <p className="text-sm text-muted-foreground py-3">Sin registros todavía.</p>;
}

function SectionHeader({ href, title, link }: { href: string; title: string; link: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <Link href={href} className="text-sm text-primary hover:underline">{link}</Link>
    </div>
  );
}

function StatCard({ label, value, icon, color, href }: { label: string; value: string | number; icon: React.ReactNode; color: string; href: string }) {
  return (
    <Link href={href} className="stat-card group">
      <div className="flex items-center justify-between">
        <div className="stat-icon" style={{ backgroundColor: color + "20" }}><span style={{ color }}>{icon}</span></div>
      </div>
      <div>
        <div className="stat-value">{typeof value === "number" ? value.toLocaleString("es-MX") : value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </Link>
  );
}

function QuickActionButton({ label, icon, href, color }: { label: string; icon: React.ReactNode; href: string; color: string }) {
  return (
    <Link href={href} className="glass-card group flex flex-col items-center justify-center gap-3 p-4 hover:scale-105 transition-transform">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + "20" }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </Link>
  );
}

function RecentProjectCard({ project }: { project: DashboardData["recentProjects"][0] }) {
  return (
    <Link href={`/projects/${project.id}`} className="glass-card group p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
            <h3 className="font-medium text-foreground truncate">{project.name}</h3>
          </div>
          <p className="text-sm text-muted-foreground">{project.code}</p>
          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1">
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${project.progress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{formatPercentage(project.progress, 0)}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {project.dueDate ? formatDate(project.dueDate) : "Sin fecha"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function RecentTaskItem({ task }: { task: DashboardData["recentTasks"][0] }) {
  const statusColor = getStatusColor(task.status);
  const priorityColor = getStatusColor(task.priority);
  return (
    <Link href={`/tasks/${task.id}`} className="glass-card group p-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor }} />
            <h3 className="font-medium text-foreground truncate">{task.title}</h3>
          </div>
          <p className="text-sm text-muted-foreground">{task.project}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: priorityColor + "20", color: priorityColor }}>{task.priority}</span>
            <span className="text-xs text-muted-foreground">Asignado a: {task.assignedTo}</span>
          </div>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">{task.dueDate ? formatDate(task.dueDate) : "—"}</span>
      </div>
    </Link>
  );
}

function UpcomingMeetingItem({ meeting }: { meeting: DashboardData["upcomingMeetings"][0] }) {
  return (
    <Link href={`/calendar/${meeting.id}`} className="glass-card group p-3 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="w-3 h-3 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: meeting.color }} />
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate">{meeting.title}</h3>
          <p className="text-sm text-muted-foreground">{meeting.location}</p>
          <p className="text-xs text-muted-foreground mt-1">{formatDate(meeting.startTime, "Pp")} - {formatDate(meeting.endTime, "p")}</p>
        </div>
      </div>
    </Link>
  );
}

function ActivityFeedItem({ activity }: { activity: DashboardData["activityFeed"][0] }) {
  return (
    <div className="flex items-start gap-3 p-3 hover:bg-muted/50 rounded transition-colors">
      <div className={`w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium flex-shrink-0 ${cn(activity.avatar === "S" && "bg-primary/10 text-primary")}`}>
        {activity.avatar}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground"><span className="font-medium">{activity.user}</span> <span>{activity.action}</span> <span className="text-muted-foreground">{activity.entity}</span></p>
        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Clock size={11} /> {formatRelative(activity.time)}</p>
      </div>
    </div>
  );
}

function ChartBar({ data }: { data: DashboardData["chartData"] }) {
  const maxValue = Math.max(...data.flatMap((d) => [d.proyectos, d.tareas]), 1);
  return (
    <div className="flex items-end justify-between gap-2 h-40">
      {data.map((item, index) => (
        <div key={index} className="flex-1 flex flex-col items-center gap-2">
          <div className="w-full flex gap-1">
            <div className="flex-1 bg-primary rounded-t" style={{ height: `${Math.max((item.proyectos / maxValue) * 100, 2)}%` }} />
            <div className="flex-1 bg-indigo-400 rounded-t" style={{ height: `${Math.max((item.tareas / maxValue) * 100, 2)}%` }} />
          </div>
          <span className="text-xs text-muted-foreground">{item.name}</span>
        </div>
      ))}
    </div>
  );
}

function StatusPieChart({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return <EmptyMsg />;
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
            return <path key={index} d={`M18,18 L${x1},${y1} A18,18 0 ${largeArcFlag},1 ${x2},${y2} Z`} fill={item.color} stroke="none" />;
          })}
        </svg>
      </div>
      <div className="space-y-2">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-sm text-foreground">{item.name}</span>
            <span className="text-sm text-muted-foreground">({item.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatRelative(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `Hace ${days} día${days > 1 ? "s" : ""}`;
  if (hours > 0) return `Hace ${hours} hora${hours > 1 ? "s" : ""}`;
  if (minutes > 0) return `Hace ${minutes} minuto${minutes > 1 ? "s" : ""}`;
  return "Ahora";
}