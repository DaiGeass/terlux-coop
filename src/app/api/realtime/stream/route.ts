// ============================================
// TERLUX COOP - SOCKET EN TIEMPO REAL (SSE)
//
// GET  /api/realtime/stream?channel=chat:general  -> stream Server-Sent Events
// POST /api/realtime/stream  { channel, event, data } -> difunde evento
//
// La app de escritorio se suscribe a este mismo
// endpoint a traves de la VPN (https://<IP>:8443).
// Plantilla en PLANTILLA_APP_ESCRITORIO.txt
// ============================================

import { NextResponse, type NextRequest } from "next/server";
import { subscribe, publish } from "@/lib/realtime";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const channel = searchParams.get("channel") || "global";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (obj: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        } catch {
          /* cerrado */
        }
      };

      send({ event: "connected", channel, user: session.email, at: new Date().toISOString() });

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 25000);

      const unsub = subscribe(channel, (evt) => send(evt));

      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsub();
        try { controller.close(); } catch { /* noop */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.channel || !body?.event) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION", message: "channel y event son obligatorios" } }, { status: 400 });
  }

  publish(body.channel, body.event, {
    ...(body.data || {}),
    from: { id: session.id, name: `${session.firstName} ${session.lastName}`, email: session.email },
  });

  return NextResponse.json({ success: true });
}
