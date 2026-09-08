"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface RealtimeEvent {
  event: string;
  from?: string;
  preview?: string;
  channel?: string;
}

export function RealtimeBell({ className }: { className?: string }) {
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/realtime/stream?channel=global");
    esRef.current = es;
    es.onmessage = (ev) => {
      try {
        const parsed = JSON.parse(ev.data);
        if (!parsed?.event) return;
        const e: RealtimeEvent = {
          event: parsed.event,
          from: parsed.data?.from || parsed.data?.sender?.name,
          preview: parsed.data?.preview || parsed.data?.body,
          channel: parsed.channel,
        };
        setEvents((prev) => [e, ...prev].slice(0, 5));
        setUnread((u) => u + 1);
        if ("Notification" in window && Notification.permission === "granted") {
          const body = e.preview ? `${e.from ? e.from + ": " : ""}${e.preview}` : e.event;
          new Notification("TerLux Coop", { body, icon: "/icon.png" });
        }
      } catch { /* noop */ }
    };
    return () => es.close();
  }, []);

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-1.5 rounded-lg hover:bg-accent transition-colors"
        title="Notificaciones en vivo"
        onClickCapture={() => { if (unread > 0 && !open) setUnread(0); }}
      >
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-0.5 rounded-full bg-destructive text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 bottom-full mb-2 w-72 z-50 glass-card rounded-xl shadow-2xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/20">
              <span className="text-xs font-semibold text-foreground">Notificaciones en vivo</span>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-accent"><X size={12} /></button>
            </div>
            {events.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                Aún no hay notificaciones. Actívalas pidiendo permiso del navegador para avisos.
              </p>
            ) : (
              <ul className="max-h-64 overflow-y-auto divide-y divide-border/10">
                {events.map((e, i) => (
                  <li key={i} className="px-3 py-2">
                    <p className="text-xs font-medium text-foreground capitalize">{e.event}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {e.from ? `${e.from}: ` : ""}{e.preview || e.channel || ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={() => { if ("Notification" in window) Notification.requestPermission(); }}
              className="w-full border-t border-border/20 px-3 py-2 text-[11px] text-primary hover:bg-accent/40"
            >
              Activar avisos del navegador
            </button>
          </div>
        </>
      )}
    </div>
  );
}