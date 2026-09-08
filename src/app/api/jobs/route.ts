// ============================================
// TERLUX COOP - API DE COLAS DE TRABAJO (JOB QUEUE)
// ============================================

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { jobQueues, jobs, jobLogs, users } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// GET - Listar colas y trabajos
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const queueId = searchParams.get("queueId");
  const status = searchParams.get("status");

  try {
    // Listar colas
    const queues = await db.select().from(jobQueues).orderBy(desc(jobQueues.createdAt));

    // Listar trabajos (filtrados o todos)
    let jobRows;
    if (queueId) {
      jobRows = await db
        .select({
          job: jobs,
          creator: users,
        })
        .from(jobs)
        .leftJoin(users, eq(jobs.createdBy, users.id))
        .where(eq(jobs.queueId, queueId))
        .orderBy(desc(jobs.createdAt))
        .limit(100);
    } else {
      const conditions = [];
      if (status) conditions.push(eq(jobs.status, status));

      jobRows = await db
        .select({
          job: jobs,
          creator: users,
        })
        .from(jobs)
        .leftJoin(users, eq(jobs.createdBy, users.id))
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(jobs.createdAt))
        .limit(100);
    }

    return NextResponse.json({ success: true, data: { queues, jobs: jobRows } });
  } catch (error) {
    console.error("[jobs:get]", error);
    return NextResponse.json({ success: false, error: "Error al obtener trabajos" }, { status: 500 });
  }
}

// POST - Crear nuevo trabajo o cola
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();

    // Crear cola
    if (body.type === "queue") {
      const [queue] = await db
        .insert(jobQueues)
        .values({
          name: body.name,
          description: body.description,
          type: body.queueType || "standard",
          concurrency: body.concurrency || 5,
          maxRetries: body.maxRetries || 3,
          retryDelay: body.retryDelay || 60,
          timeout: body.timeout || 300,
        })
        .returning();
      return NextResponse.json({ success: true, data: queue });
    }

    // Crear trabajo
    if (!body.queueId || !body.name) {
      return NextResponse.json({ success: false, error: "queueId y name requeridos" }, { status: 400 });
    }

    const [job] = await db
      .insert(jobs)
      .values({
        queueId: body.queueId,
        name: body.name,
        type: body.jobType || "custom",
        payload: body.payload || {},
        priority: body.priority || 0,
        maxAttempts: body.maxAttempts || 3,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        createdBy: session.id,
      })
      .returning();

    // Crear log inicial
    await db.insert(jobLogs).values({
      jobId: job.id,
      level: "info",
      message: `Trabajo creado por ${session.firstName} ${session.lastName}`,
    });

    // Simular procesamiento si no está programado
    if (!body.scheduledAt) {
      setTimeout(() => simulateJobProcessing(job.id), 2000);
    }

    return NextResponse.json({ success: true, data: job });
  } catch (error) {
    console.error("[jobs:post]", error);
    return NextResponse.json({ success: false, error: "Error al crear trabajo" }, { status: 500 });
  }
}

// PATCH - Actualizar trabajo (cancelar, reintentar)
export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ success: false, error: "ID requerido" }, { status: 400 });

    const updateData: any = { updatedAt: new Date() };

    if (body.status) {
      updateData.status = body.status;
      if (body.status === "cancelled") updateData.failedAt = new Date();
      if (body.status === "completed") updateData.completedAt = new Date();
    }

    if (body.retry) {
      updateData.status = "pending";
      updateData.attempts = 0;
      updateData.failedAt = null;
      updateData.completedAt = null;
      updateData.startedAt = null;
    }

    const [job] = await db.update(jobs).set(updateData).where(eq(jobs.id, body.id)).returning();

    await db.insert(jobLogs).values({
      jobId: body.id,
      level: "info",
      message: `Trabajo actualizado por ${session.firstName} ${session.lastName}: ${body.status || "reintentado"}`,
    });

    return NextResponse.json({ success: true, data: job });
  } catch (error) {
    console.error("[jobs:patch]", error);
    return NextResponse.json({ success: false, error: "Error al actualizar trabajo" }, { status: 500 });
  }
}

// DELETE - Eliminar trabajo o cola
export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type");

    if (!id) return NextResponse.json({ success: false, error: "ID requerido" }, { status: 400 });

    if (type === "queue") {
      await db.delete(jobs).where(eq(jobs.queueId, id));
      await db.delete(jobQueues).where(eq(jobQueues.id, id));
    } else {
      await db.delete(jobLogs).where(eq(jobLogs.jobId, id));
      await db.delete(jobs).where(eq(jobs.id, id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[jobs:delete]", error);
    return NextResponse.json({ success: false, error: "Error al eliminar" }, { status: 500 });
  }
}

// Simulación de procesamiento de trabajos (en producción sería un worker separado)
async function simulateJobProcessing(jobId: string) {
  try {
    // Marcar como procesando
    await db.update(jobs).set({ status: "processing", startedAt: new Date() }).where(eq(jobs.id, jobId));
    await db.insert(jobLogs).values({ jobId, level: "info", message: "Procesamiento iniciado" });

    // Simular progreso
    for (let progress = 0; progress <= 100; progress += 20) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await db.update(jobs).set({ progress }).where(eq(jobs.id, jobId));
      if (progress < 100) {
        await db.insert(jobLogs).values({ jobId, level: "info", message: `Progreso: ${progress}%` });
      }
    }

    // Marcar como completado (90% éxito, 10% fallo simulado)
    const success = Math.random() > 0.1;
    if (success) {
      await db.update(jobs).set({
        status: "completed",
        completedAt: new Date(),
        progress: 100,
        result: { message: "Trabajo completado exitosamente", timestamp: new Date().toISOString() },
      }).where(eq(jobs.id, jobId));
      await db.insert(jobLogs).values({ jobId, level: "info", message: "Trabajo completado exitosamente" });
    } else {
      const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
      const attempts = job.attempts || 0;
      const maxAttempts = job.maxAttempts || 3;
      if (attempts < maxAttempts) {
        await db.update(jobs).set({
          status: "pending",
          attempts: attempts + 1,
          failedAt: new Date(),
          progress: 0,
          error: "Error simulado, reintentando...",
        }).where(eq(jobs.id, jobId));
        await db.insert(jobLogs).values({ jobId, level: "warning", message: `Intento ${attempts + 1} fallido, reintentando` });
        setTimeout(() => simulateJobProcessing(jobId), 5000);
      } else {
        await db.update(jobs).set({
          status: "failed",
          failedAt: new Date(),
          error: "Máximo de intentos alcanzado",
        }).where(eq(jobs.id, jobId));
        await db.insert(jobLogs).values({ jobId, level: "error", message: "Trabajo falló después de máximos intentos" });
      }
    }
  } catch (error) {
    console.error("[simulateJobProcessing]", error);
    await db.update(jobs).set({ status: "failed", error: "Error interno", failedAt: new Date() }).where(eq(jobs.id, jobId));
  }
}
