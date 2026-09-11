// ============================================
// TERLUX COOP - API DASHBOARD (datos reales)
// ALCANCE: mine | dept | directs | all
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, tasks, meetings, activities, orders, users, departments } from "@/db/schema";
import { eq, and, or, inArray, gte, lte, desc, count, sum, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";

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

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Sesión requerida" } }, { status: 401 });
  }

  // ============================================================
  // ALCANCE DEL DASHBOARD (no global):
  //   ?scope=mine     → solo tareas ASIGNADAS a mí
  //   ?scope=dept     → tareas/proyectos de MI DEPARTAMENTO
  //   ?scope=directs  → tareas a mi cargo (yo soy manager del depto o del proyecto)
  //   ?scope=all      → corporativo (solo admin/finance + gerentes de área)
  //   null (default)  → 'mine' para empleados, 'dept' para gerentes, 'all' para admin
  // ============================================================
  const { searchParams } = new URL(request.url);
  const requestedScope = searchParams.get("scope");
  const isAdmin = ["super_admin", "admin", "finance", "director"].includes(session.role);
  const scope =
    requestedScope && ["mine", "dept", "directs", "all"].includes(requestedScope)
      ? requestedScope
      : isAdmin ? "all" : session.departmentId ? "dept" : "mine";

  // ============================================================
  // RESOLUCIÓN DE "MI GENTE":
  //   departments.managerId = session.id  → deptos que YO gestiono
  //   projects.managerId    = session.id  → proyectos que YO gestiono
  //   scope=dept → usuarios de MI departamento (o de los depto que gestiono)
  //   scope=directs → usuarios que dependen de MIS deptos/proyectos
  // ============================================================
  let myDeptUsers: string[] = [];
  let myManagedProjects: string[] = [];
  if (scope === "directs" || scope === "dept") {
    const [myManagedDepartments, myProjects] = await Promise.all([
      db.select({ id: departments.id }).from(departments)
        .where(eq(departments.managerId, session.id)),
      db.select({ id: projects.id }).from(projects)
        .where(eq(projects.managerId, session.id)),
    ]);
    myManagedProjects = myProjects.map((p) => p.id);
    if (myManagedDepartments.length > 0) {
      const deptIds = myManagedDepartments.map((d) => d.id);
      const deptUserRows = await db.select({ id: users.id }).from(users)
        .where(inArray(users.departmentId, deptIds));
      myDeptUsers = deptUserRows.map((u) => u.id);
    }
    // "dept" = mi propio departamento (mis compañeros), "directs" = los que cuelgan de MÍ
    if (scope === "dept" && session.departmentId) {
      const team = await db.select({ id: users.id }).from(users)
        .where(eq(users.departmentId, session.departmentId));
      myDeptUsers = team.map((u) => u.id);
    }
  }
  const myDept = session.departmentId;

  // ============================================================
  // CONDICIONES REUTILIZABLES DE FILTRADO
  // ============================================================
  const taskScopeFilter =
    scope === "mine"
      ? eq(tasks.assignedTo, session.id)
      : scope === "directs"
        ? or(
            ...(myDeptUsers.length ? myDeptUsers.map((uid) => eq(tasks.assignedTo, uid)) : []),
            ...(myManagedProjects.length ? myManagedProjects.map((pid) => eq(tasks.projectId, pid)) : []),
          )
        : scope === "dept"
          ? or(
              ...(myDeptUsers.length ? myDeptUsers.map((uid) => eq(tasks.assignedTo, uid)) : []),
              ...(myDept
                ? [inArray(tasks.projectId, db.select({ id: projects.id }).from(projects).where(eq(projects.departmentId, myDept)))]
                : []),
            )
          : undefined;

  const projectScopeFilter =
    scope === "mine"
      ? or(
          sql`${projects.id} IN (SELECT DISTINCT project_id FROM tasks WHERE assigned_to = ${session.id})`,
          eq(projects.managerId, session.id),
        )
      : scope === "directs"
        ? or(
            ...(myManagedProjects.length ? myManagedProjects.map((pid) => eq(projects.id, pid)) : []),
            ...(myDeptUsers.length ? [inArray(projects.managerId, myDeptUsers)] : []),
          )
        : scope === "dept"
          ? or(
              ...(myDept ? [eq(projects.departmentId, myDept)] : []),
              ...(myDeptUsers.length ? [inArray(projects.managerId, myDeptUsers)] : []),
            )
          : undefined;

  const now = new Date();

  const [activeProjects, completedTasks, meetingsToday, revenue] = await Promise.all([
    db.select({ count: count() }).from(projects)
      .where(and(eq(projects.status, "active"), ...(projectScopeFilter ? [projectScopeFilter] : []))),
    db.select({ count: count() }).from(tasks)
      .where(and(eq(tasks.status, "done"), ...(taskScopeFilter ? [taskScopeFilter] : []))),
    db.select({ count: count() })
      .from(meetings)
      .where(and(
        gte(meetings.startTime, new Date(now.getFullYear(), now.getMonth(), now.getDate())),
        lte(meetings.startTime, new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)),
      )),
    db.select({ total: sql<string>`COALESCE(SUM(${orders.total}), 0)` })
      .from(orders)
      .where(and(eq(orders.status, "paid"), gte(orders.createdAt, new Date(now.getFullYear(), now.getMonth(), 1)))),
  ]);

  const [recentProjects, recentTasks, upcomingMeetings, recentActivity] = await Promise.all([
    db.select({
      id: projects.id, name: projects.name, code: projects.code, status: projects.status,
      dueDate: projects.endDate, color: projects.color, managerName: users.firstName,
    })
      .from(projects)
      .leftJoin(users, eq(projects.managerId, users.id))
      .where(projectScopeFilter ?? undefined)
      .orderBy(desc(projects.createdAt)).limit(4),
    db.select({
      id: tasks.id, title: tasks.title, status: tasks.status, priority: tasks.priority,
      dueDate: tasks.dueDate, assignedTo: users.firstName, lastName: users.lastName,
      projectName: projects.name,
    })
      .from(tasks)
      .leftJoin(users, eq(tasks.assignedTo, users.id))
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(taskScopeFilter ?? undefined)
      .orderBy(desc(tasks.createdAt)).limit(5),
    db.select({
      id: meetings.id, title: meetings.title, startTime: meetings.startTime,
      endTime: meetings.endTime, location: meetings.location, color: meetings.color,
    })
      .from(meetings)
      .where(gte(meetings.startTime, now))
      .orderBy(meetings.startTime).limit(3),
    db.select({
      id: activities.id, action: activities.action, entityType: activities.entityType,
      createdAt: activities.createdAt, userName: users.firstName, lastName: users.lastName,
    })
      .from(activities)
      .leftJoin(users, eq(activities.userId, users.id))
      .orderBy(desc(activities.createdAt)).limit(8),
  ]);

  const [totalUsers, projectRows, taskRows] = await Promise.all([
    db.select({ count: count() }).from(users),
    db.select({ status: projects.status, count: count() }).from(projects)
      .where(projectScopeFilter ?? undefined)
      .groupBy(projects.status),
    db.select({ status: tasks.status, count: count() }).from(tasks)
      .where(taskScopeFilter ?? undefined)
      .groupBy(tasks.status),
  ]);

  // Actividad mensual: últimos 10 meses (creados proyectos y tareas)
  const monthStart = new Date(now.getFullYear(), now.getMonth() - 9, 1);
  const [projByMonth, tasksByMonth] = await Promise.all([
    db.select({ month: sql<string>`to_char(${projects.createdAt}, 'YYYY-MM')`, count: count() })
      .from(projects)
      .where(and(gte(projects.createdAt, monthStart), ...(projectScopeFilter ? [projectScopeFilter] : [])))
      .groupBy(sql`to_char(${projects.createdAt}, 'YYYY-MM')`),
    db.select({ month: sql<string>`to_char(${tasks.createdAt}, 'YYYY-MM')`, count: count() })
      .from(tasks)
      .where(and(gte(tasks.createdAt, monthStart), ...(taskScopeFilter ? [taskScopeFilter] : [])))
      .groupBy(sql`to_char(${tasks.createdAt}, 'YYYY-MM')`),
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
