// ============================================
// TERLUX COOP - API DIRECTORIO Y CV
// ============================================

import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, departments, employeeCvs } from "@/db/schema";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") || session.id;

  const rows = await db
    .select({
      id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName,
      position: users.position, role: users.role, phone: users.phone, hireDate: users.hireDate,
      avatar: users.avatar, isActive: users.isActive, departmentId: users.departmentId,
      department: departments,
      cv: employeeCvs,
    })
    .from(users)
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .leftJoin(employeeCvs, eq(employeeCvs.userId, users.id));

  const data = rows.map((r) => ({
    ...r,
    department: r.department ? { id: r.department.id, name: r.department.name, color: r.department.color } : null,
  }));

  if (searchParams.get("id") === "me" || (id === session.id && searchParams.get("all") !== "1")) {
    return NextResponse.json({ success: true, data: data.find((d) => d.id === session.id) || null });
  }
  if (searchParams.get("all") === "1") return NextResponse.json({ success: true, data });
  return NextResponse.json({ success: true, data: data.find((d) => d.id === id) || null });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });

  const body = await request.json();
  const userId = body.userId === session.id || !body.userId ? session.id : body.userId;

  // Solo uno mismo o RRHH/admin puede editar CV ajenos
  if (userId !== session.id && !["admin", "super_admin", "hr", "manager"].includes(session.role)) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Sin permisos" } }, { status: 403 });
  }

  const values = {
    userId,
    title: body.title || null,
    summary: body.summary || null,
    phone: body.phone || null,
    address: body.address || null,
    city: body.city || null,
    country: body.country || null,
    website: body.website || null,
    linkedin: body.linkedin || null,
    experience: body.experience || [],
    education: body.education || [],
    skills: body.skills || [],
    languages: body.languages || [],
    certifications: body.certifications || [],
    isPublic: body.isPublic !== false,
    updatedAt: new Date(),
  };

  const [existing] = await db.select({ id: employeeCvs.id }).from(employeeCvs).where(eq(employeeCvs.userId, userId)).limit(1);
  let row;
  if (existing) {
    [row] = await db.update(employeeCvs).set(values).where(eq(employeeCvs.userId, userId)).returning();
  } else {
    [row] = await db.insert(employeeCvs).values(values).returning();
  }
  return NextResponse.json({ success: true, data: row });
}
