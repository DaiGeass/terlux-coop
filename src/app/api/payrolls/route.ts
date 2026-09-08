import { NextResponse } from "next/server";
import { eq, desc, inArray, and, gt, ne } from "drizzle-orm";
import { db } from "@/db";
import { payrolls, payrollDetails, users } from "@/db/schema";
import { getSession, hasRole } from "@/lib/auth";

const num = (v: string | null | undefined) => parseFloat(v ?? "0");

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "No autenticado" } }, { status: 401 });
    }

    const payList = await db.select().from(payrolls).orderBy(desc(payrolls.year), desc(payrolls.month));

    const ids = payList.map((p) => p.id);
    const details = ids.length
      ? await db
          .select({
            payrollId: payrollDetails.payrollId,
            id: payrollDetails.id,
            userId: payrollDetails.userId,
            baseSalary: payrollDetails.baseSalary,
            overtimeHours: payrollDetails.overtimeHours,
            overtimeAmount: payrollDetails.overtimeAmount,
            bonusAmount: payrollDetails.bonusAmount,
            deductionAmount: payrollDetails.deductionAmount,
            taxAmount: payrollDetails.taxAmount,
            netAmount: payrollDetails.netAmount,
            paymentMethod: payrollDetails.paymentMethod,
            paymentStatus: payrollDetails.paymentStatus,
            paymentDate: payrollDetails.paymentDate,
            firstName: users.firstName,
            lastName: users.lastName,
            position: users.position,
            departmentId: users.departmentId,
          })
          .from(payrollDetails)
          .leftJoin(users, eq(payrollDetails.userId, users.id))
          .where(inArray(payrollDetails.payrollId, ids))
      : [];

    const detailMap = new Map<string, typeof details>();
    for (const d of details) {
      const arr = detailMap.get(d.payrollId) ?? [];
      arr.push(d);
      detailMap.set(d.payrollId, arr);
    }

    const data = payList.map((p) => {
      const pts = detailMap.get(p.id) ?? [];
      const employees = pts.map((d) => ({
        id: d.id,
        userId: d.userId,
        name: [d.firstName, d.lastName].filter(Boolean).join(" ").trim() || "Sin nombre",
        position: d.position ?? "Empleado",
        department: d.departmentId || "",
        baseSalary: num(d.baseSalary),
        overtime: num(d.overtimeAmount),
        bonuses: num(d.bonusAmount),
        deductions: num(d.taxAmount) + num(d.deductionAmount),
        netSalary: num(d.netAmount),
        paymentStatus: (d.paymentStatus ?? "pending") as "paid" | "pending" | "failed",
        paymentDate: d.paymentDate ? new Date(d.paymentDate).toISOString() : null,
        paymentMethod: d.paymentMethod ?? "Transferencia Bancaria",
      }));
      return {
        id: p.id,
        period: p.period,
        month: p.month,
        year: p.year,
        startDate: new Date(p.startDate).toISOString(),
        endDate: new Date(p.endDate).toISOString(),
        status: p.status,
        totalAmount: num(p.totalAmount),
        taxAmount: num(p.taxAmount),
        netAmount: num(p.netAmount),
        createdAt: p.createdAt.toISOString(),
        processedAt: p.processedAt ? p.processedAt.toISOString() : null,
        paidAt: p.paidAt ? p.paidAt.toISOString() : null,
        employees,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error obteniendo nóminas:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL", message: "Error al obtener nóminas" } }, { status: 500 });
  }
}

// Tasas impositivas aproximadas (ISR simplificado) por rango salarial
function estimateTax(gross: number) {
  if (gross <= 10000) return gross * 0.05;
  if (gross <= 20000) return gross * 0.08;
  if (gross <= 35000) return gross * 0.12;
  return gross * 0.16;
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "No autenticado" } }, { status: 401 });
    }
    if (!hasRole(session.role, ["finance"])) {
      return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "No tienes permisos para generar nóminas" } }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const month = Number(body?.month);
    const year = Number(body?.year);

    if (!month || month < 1 || month > 12 || !year || year < 2000 || year > 2100) {
      return NextResponse.json({ success: false, error: { code: "INVALID", message: "Selecciona un mes y año válidos" } }, { status: 400 });
    }

    const dupe = await db
      .select({ id: payrolls.id })
      .from(payrolls)
      .where(and(eq(payrolls.month, month), eq(payrolls.year, year)))
      .limit(1);

    if (dupe.length > 0) {
      return NextResponse.json({ success: false, error: { code: "DUPLICATE", message: `Ya existe la nómina de ${MESES[month - 1]} ${year}` } }, { status: 409 });
    }

    const employees = await db
      .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, salary: users.salary, departmentId: users.departmentId })
      .from(users)
      .where(and(gt(users.salary, "0"), ne(users.role, "client"), eq(users.isActive, true)));

    if (employees.length === 0) {
      return NextResponse.json({ success: false, error: { code: "NO_EMPLOYEES", message: "No hay empleados con salario registrado" } }, { status: 400 });
    }

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().slice(0, 10);

    let totalAmount = 0;
    let totalTax = 0;
    const rows = employees.map((emp) => {
      const gross = parseFloat(emp.salary ?? "0");
      const tax = estimateTax(gross);
      const social = gross * 0.045;
      const net = gross - tax - social;
      totalAmount += gross;
      totalTax += tax;
      return {
        id: emp.id,
        gross,
        tax,
        social,
        net,
        departmentId: emp.departmentId,
      };
    });

    const [payroll] = await db
      .insert(payrolls)
      .values({
        period: `${MESES[month - 1]} ${year}`,
        month,
        year,
        startDate,
        endDate,
        status: "draft",
        totalAmount: totalAmount.toFixed(2),
        taxAmount: totalTax.toFixed(2),
        netAmount: (totalAmount - totalTax).toFixed(2),
        createdBy: session.id,
      })
      .returning({ id: payrolls.id });

    for (const r of rows) {
      await db.insert(payrollDetails).values({
        payrollId: payroll.id,
        userId: r.id,
        baseSalary: r.gross.toFixed(2),
        overtimeHours: "0",
        overtimeRate: "0",
        overtimeAmount: "0",
        bonusAmount: "0",
        deductionAmount: "0",
        taxAmount: r.tax.toFixed(2),
        socialSecurity: r.social.toFixed(2),
        netAmount: r.net.toFixed(2),
        paymentMethod: "Transferencia Bancaria",
        paymentStatus: "pending",
      });
    }

    return NextResponse.json({ success: true, data: { id: payroll.id, month, year, period: `${MESES[month - 1]} ${year}`, employees: rows.length } }, { status: 201 });
  } catch (error) {
    console.error("Error generando nómina:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL", message: "Error al generar la nómina" } }, { status: 500 });
  }
}