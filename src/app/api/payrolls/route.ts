import { NextResponse } from "next/server";
import { eq, desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { payrolls, payrollDetails, users } from "@/db/schema";
import { getSession } from "@/lib/auth";

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