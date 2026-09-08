// ============================================
// TERLUX COOP - BUS DE TIEMPO REAL (SSE)
// Usado por la web y por la app de escritorio
// conectada por VPN (10.8.0.0/24) en /api/realtime/stream
// ============================================

export interface RealtimeEvent {
  channel: string;
  event: string;
  data: unknown;
  at: string;
}

type Listener = (evt: RealtimeEvent) => void;

interface Hub {
  listeners: Map<string, Set<Listener>>;
}

const g = globalThis as typeof globalThis & { __terluxRealtime?: Hub };

if (!g.__terluxRealtime) {
  g.__terluxRealtime = { listeners: new Map() };
}

const hub = g.__terluxRealtime;

export function subscribe(channel: string, listener: Listener): () => void {
  if (!hub.listeners.has(channel)) hub.listeners.set(channel, new Set());
  hub.listeners.get(channel)!.add(listener);
  return () => {
    hub.listeners.get(channel)?.delete(listener);
  };
}

export function publish(channel: string, event: string, data: unknown) {
  const evt: RealtimeEvent = { channel, event, data, at: new Date().toISOString() };
  hub.listeners.get(channel)?.forEach((l) => {
    try { l(evt); } catch { /* ignore */ }
  });
  // Canal global
  hub.listeners.get("*")?.forEach((l) => {
    try { l(evt); } catch { /* ignore */ }
  });
}

export function channelCount(channel: string) {
  return hub.listeners.get(channel)?.size || 0;
}

export function totalConnections() {
  let n = 0;
  hub.listeners.forEach((set) => (n += set.size));
  return n;
}
