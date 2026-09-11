import { NextRequest, NextResponse } from "next/server";
import { eq, desc, and, or, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { projects, departments, users, tasks } from "@/db/schema";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "No autenticado" } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedScope = searchParams.get("scope");
    const roleLevel = ({ super_admin: 100, admin: 90, director: 80, manager: 60, finance: 50, hr: 55, support: 40, employee: 30, client: 10, guest: 0 })[session.role] ?? 30;
    const canCorporate = roleLevel >= 50;
    const canDept = roleLevel >= 30;
    const scope =
      requestedScope && ["mine", "dept", "directs", "all"].includes(requestedScope) &&
      (requestedScope === "mine" || (requestedScope === "dept" ? canDept : canCorporate))
        ? requestedScope
        : canCorporate ? "all" : session.departmentId ? "dept" : "mine";

    let projectFilter = undefined;
    if (scope === "mine") {
      const taskProjects = db.select({ id: tasks.projectId }).from(tasks).where(eq(tasks.assignedTo, session.id));
      projectFilter = or(
        eq(projects.managerId, session.id),
        inArray(projects.id, taskProjects),
      );
    } else if (scope === "directs") {
      const myManagedDepts = db.select({ id: departments.id }).from(departments).where(eq(departments.managerId, session.id));
      const myTeam = db.select({ id: users.id }).from(users).where(inArray(users.departmentId, myManagedDepts));
      const myProjects = db.select({ id: projects.id }).from(projects).where(eq(projects.managerId, session.id));
      projectFilter = or(
        inArray(projects.id, myProjects),
        inArray(projects.managerId, myTeam),
      );
    } else if (scope === "dept" && session.departmentId) {
      const myTeam = db.select({ id: users.id }).from(users).where(eq(users.departmentId, session.departmentId));
      projectFilter = or(
        eq(projects.departmentId, session.departmentId),
        inArray(projects.managerId, myTeam),
      );
    }

    const list = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        code: projects.code,
        status: projects.status,
        priority: projects.priority,
        startDate: projects.startDate,
        endDate: projects.endDate,
        budget: projects.budget,
        color: projects.color,
        managerId: projects.managerId,
        managerFirstName: users.firstName,
        managerLastName: users.lastName,
        managerAvatar: users.avatar,
        departmentId: projects.departmentId,
        departmentName: departments.name,
        departmentColor: departments.color,
      })
      .from(projects)
      .leftJoin(users, eq(projects.managerId, users.id))
      .leftJoin(departments, eq(projects.departmentId, departments.id))
      .where(projectFilter ?? undefined)
      .orderBy(desc(projects.createdAt));

    const taskRows = await db
      .select({
        projectId: tasks.projectId,
        total: sql<number>`count(*)::int`,
        completed: sql<number>`count(*) filter (where ${tasks.status} = 'done')::int`,
        donePct: sql<number>`coalesce(avg(${tasks.completionPercentage}), 0)::int`,
        assignees: sql<string[]>`array_agg(distinct ${tasks.assignedTo}) filter (where ${tasks.assignedTo} is not null)`,
      })
      .from(tasks)
      .groupBy(tasks.projectId);

    const taskMap = new Map(taskRows.map((r) => [r.projectId, r]));
    const managerName = (p: { managerFirstName: string | null; managerLastName: string | null }) =>
      [p.managerFirstName, p.managerLastName].filter(Boolean).join(" ").trim() || "Sin asignar";

    const data = list.map((p) => {
      const t = taskMap.get(p.id);
      return {
        id: p.id,
        name: p.name,
        code: p.code ?? "",
        description: p.description ?? "",
        status: p.status ?? "pending",
        priority: p.priority ?? "medium",
        startDate: p.startDate ? new Date(p.startDate).toISOString() : new Date().toISOString(),
        endDate: p.endDate ? new Date(p.endDate).toISOString() : new Date().toISOString(),
        budget: parseFloat(p.budget ?? "0"),
        color: p.color ?? "#6366f1",
        manager: {
          name: managerName(p),
          avatar: p.managerAvatar ?? (managerName(p) === "Sin asignar" ? "SA" : managerName(p).split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()),
        },
        department: {
          name: p.departmentName ?? "Sin departamento",
          color: p.departmentColor ?? "#6b7280",
        },
        progress: t ? t.donePct : 0,
        tasks: t ? t.total : 0,
        completedTasks: t ? t.completed : 0,
        teamSize: t && t.assignees ? t.assignees.filter(Boolean).length : 0,
        tags: [],
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error obteniendo proyectos:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL", message: "Error al obtener proyectos" } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "No autenticado" } }, { status: 401 });
    }

    const body = await request.json();
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION", message: "El nombre del proyecto es obligatorio" } }, { status: 400 });
    }

    const code = body.code ? String(body.code).trim() : null;
    const color = String(body.color ?? "#6366f1");
    const priority = String(body.priority ?? "medium");
    const startDate = body.startDate ? String(body.startDate) : null;
    const endDate = body.endDate ? String(body.endDate) : null;
    const budget = body.budget != null ? String(Number(body.budget)) : null;
    const description = body.description ? String(body.description) : null;

    let [created] = await db
      .insert(projects)
      .values({
        name,
        code,
        color,
        priority,
        description,
        startDate,
        endDate,
        budget,
        status: "active",
      })
      .returning({ id: projects.id, name: projects.name, createdAt: projects.createdAt });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error("Error creando proyecto:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL", message: "Error al crear proyecto" } }, { status: 500 });
  }
}