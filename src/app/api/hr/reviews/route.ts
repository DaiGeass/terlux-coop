// ============================================
// TERLUX COOP - API DE RRHH: EVALUACIONES
// ============================================

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { performanceReviews, users } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const rows = await db
      .select({
        id: performanceReviews.id,
        userId: performanceReviews.userId,
        reviewerId: performanceReviews.reviewerId,
        period: performanceReviews.period,
        rating: performanceReviews.rating,
        strengths: performanceReviews.strengths,
        improvements: performanceReviews.improvements,
        goals: performanceReviews.goals,
        status: performanceReviews.status,
        submittedAt: performanceReviews.submittedAt,
        createdAt: performanceReviews.createdAt,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(performanceReviews)
      .leftJoin(users, eq(performanceReviews.userId, users.id))
      .orderBy(desc(performanceReviews.createdAt));

    // Obtener revisores
    const reviewerIds = Array.from(new Set(rows.map((r) => r.reviewerId).filter(Boolean)));
    let reviewers: Record<string, { firstName: string; lastName: string }> = {};
    if (reviewerIds.length > 0) {
      const revRows = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName }).from(users);
      reviewers = Object.fromEntries(revRows.map((r) => [r.id, { firstName: r.firstName, lastName: r.lastName }]));
    }

    const data = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      reviewerId: r.reviewerId,
      period: r.period,
      rating: r.rating,
      strengths: r.strengths,
      improvements: r.improvements,
      goals: r.goals || [],
      status: r.status,
      submittedAt: r.submittedAt,
      createdAt: r.createdAt,
      user: r.firstName ? { firstName: r.firstName, lastName: r.lastName } : null,
      reviewer: r.reviewerId ? reviewers[r.reviewerId] || null : null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[hr/reviews:get]", error);
    return NextResponse.json({ success: false, error: "Error al obtener evaluaciones" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();

    const [row] = await db
      .insert(performanceReviews)
      .values({
        userId: body.userId,
        reviewerId: session.id,
        period: body.period,
        rating: body.rating || null,
        strengths: body.strengths || null,
        improvements: body.improvements || null,
        goals: body.goals || [],
        status: "completed",
        submittedAt: new Date(),
      })
      .returning();

    return NextResponse.json({ success: true, data: row });
  } catch (error) {
    console.error("[hr/reviews:post]", error);
    return NextResponse.json({ success: false, error: "Error al crear evaluación" }, { status: 500 });
  }
}
