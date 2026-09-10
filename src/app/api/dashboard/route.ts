// ============================================
// TERLUX COOP - API DASHBOARD (datos reales)
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, tasks, meetings, activities, orders, users } from "@/db/schema";
import { eq, and, gte, lte, desc, count, sum, sql } from "drizzle-orm";

const PROJECT_LABELS: Record<string, string> = {
  pending: "Pendientes", active: "Activos", completed: "Completados", cancelled: "Cancelados",
};
const TASK_LABELS: Record<string, string> = {
  todo: "Por Hacer", in_progress: "En Progreso", review: "En Revisión",
  done: "Completadas", blocked: "Bloqueadas",
};
const PROJECT_COLORS: Record<string, string> = {
  pending: "#6b7280", active: "#3b82f6", completed: "#10b981", cancelled: "#ef4444",
};
const TASK_COLORS: Record<string, string> = {
  todo: "#6b7280", in_progress: "#3b82f6", review: "#f59e0b", done: "#10b981", blocked: "#ef4444",
};
const STATUS_FALLBACK = { name: "Otros", color: "#6366f1" };

export async function GET() {
  const now = new Date();

  const [activeProjects, completedTasks, meetingsToday, revenue] = await Promise.all([
    db.select({ count: count() }).from(projects).where(eq(projects.status, "active")),
    db.select({ count: count() }).from(tasks).where(eq(tasks.status, "done")),
    db.select({ count: count() })
      .from(meetings)
      .where(and(gte(meetings.startTime, new Date(now.getFullYear(), now.getMonth(), now.getDate())), lte(meetings.startTime, new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)))),
    db.select({ total: sql<string>`COALESCE(SUM(${orders.total}), 0)` })
      .from(orders)
      .where(and(eq(orders.status, "paid"), gte(orders.createdAt, new Date(now.getFullYear(), now.getMonth(), 1)))),
  ]);

  const [recentProjects, recentTasks, upcomingMeetings, recentActivity] = await Promise.all([
    db.select({
      id: projects.id, name: projects.name, code: projects.code, status: projects.status,
      progress: sql<number>`0`, dueDate: projects.endDate, color: projects.color, managerName: users.firstName,
    })
      .from(projects).leftJoin(users, eq(projects.managerId, users.id))
      .orderBy(desc(projects.createdAt)).limit(4),
    db.select({
      id: tasks.id, title: tasks.title, status: tasks.status, priority: tasks.priority,
      dueDate: tasks.dueDate, assignedTo: users.firstName, lastName: users.lastName, projectName: projects.name,
    })
      .from(tasks)
      .leftJoin(users, eq(tasks.assignedTo, users.id))
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .orderBy(desc(tasks.createdAt)).limit(5),
    db.select({ id: meetings.id, title: meetings.title, startTime: meetings.startTime, endTime: meetings.endTime, location: meetings.location, color: meetings.color })
      .from(meetings)
      .where(gte(meetings.startTime, now))
      .orderBy(meetings.startTime).limit(3),
    db.select({ id: activities.id, action: activities.action, entityType: activities.entityType, createdAt: activities.createdAt, userName: users.firstName, lastName: users.lastName })
      .from(activities)
      .leftJoin(users, eq(activities.userId, users.id))
      .orderBy(desc(activities.createdAt)).limit(8),
  ]);

  const [totalUsers, projectRows, taskRows] = await Promise.all([
    db.select({ count: count() }).from(users),
    db.select({ status: projects.status, count: count() }).from(projects).groupBy(projects.status),
    db.select({ status: tasks.status, count: count() }).from(tasks).groupBy(tasks.status),
  ]);

  // Actividad mensual: últimos 10 meses (creados proyectos y tareas)
  const monthStart = new Date(now.getFullYear(), now.getMonth() - 9, 1);
  const [projByMonth, tasksByMonth] = await Promise.all([
    db.select({ month: sql<string>`to_char(${projects.createdAt}, 'YYYY-MM')`, count: count() })
      .from(projects).where(gte(projects.createdAt, monthStart)).groupBy(sql`to_char(${projects.createdAt}, 'YYYY-MM')`),
    db.select({ month: sql<string>`to_char(${tasks.createdAt}, 'YYYY-MM')`, count: count() })
      .from(tasks).where(gte(tasks.createdAt, monthStart)).groupBy(sql`to_char(${tasks.createdAt}, 'YYYY-MM')`),
  ]);
  const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const chartData = Array.from({ length: 10 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 9 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return {
      name: MESES[d.getMonth()],
      proyectos: Number(projByMonth.find((p) => p.month === key)?.count || 0),
      tareas: Number(tasksByMonth.find((t) => t.month === key)?.count || 0),
    };
  });

  return NextResponse.json({ success: true, data: {
    stats: {
      projectsActive: Number(activeProjects[0]?.count || 0),
      tasksCompleted: Number(completedTasks[0]?.count || 0),
      meetingsToday: Number(meetingsToday[0]?.count || 0),
      revenue: Number(revenue[0]?.total || 0),
      users: Number(totalUsers[0]?.count || 0),
    },
    recentProjects: recentProjects.map((p) => ({
      id: p.id, name: p.name, code: p.code || "TLC", status: p.status,
      progress: 50, dueDate: p.dueDate, color: p.color || "#6366f1",
      managerName: p.managerName || "—",
    })),
    recentTasks: recentTasks.map((t) => ({
      id: t.id, title: t.title, project: t.projectName || "—", status: t.status,
      priority: t.priority || "medium", dueDate: t.dueDate,
      assignedTo: `${t.assignedTo || ""} ${t.lastName || ""}`.trim() || "—",
    })),
    upcomingMeetings: upcomingMeetings.map((m) => ({
      id: m.id, title: m.title, startTime: m.startTime, endTime: m.endTime,
      location: m.location || "Sala", color: m.color || "#6366f1",
    })),
    activityFeed: recentActivity.map((a) => ({
      id: a.id, user: a.userName || "Sistema",
      action: a.action, entity: a.entityType,
      time: a.createdAt, avatar: `${(a.userName || "S")[0]}${(a.lastName || "")[0] || ""}`.toUpperCase(),
    })),
    chartData,
    projectStatusData: projectRows.map((r) => ({
      name: PROJECT_LABELS[r.status] || STATUS_FALLBACK.name,
      value: Number(r.count),
      color: PROJECT_COLORS[r.status] || STATUS_FALLBACK.color,
    })),
    taskStatusData: taskRows.map((r) => ({
      name: TASK_LABELS[r.status] || STATUS_FALLBACK.name,
      value: Number(r.count),
      color: TASK_COLORS[r.status] || STATUS_FALLBACK.color,
    })),
  }});
}