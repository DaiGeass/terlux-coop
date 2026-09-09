"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, ChevronLeft, ChevronRight, Flag } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { useT } from "@/i18n";

interface GanttTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  completionPercentage: number | null;
  startDate: string | null;
  dueDate: string | null;
  isMilestone: boolean | null;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "#10b981", medium: "#3b82f6", high: "#f97316", critical: "#ef4444",
};

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export default function GanttPage() {
  const t = useT();
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [origin, setOrigin] = useState(() => {
    const d = new Date(); d.setDate(1); return d;
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", priority: "medium", startOffset: 2, duration: 7 });
  const DAYS = 45;

  const days = useMemo(() => Array.from({ length: DAYS }, (_, i) => addDays(origin, i)), [origin]);

  useEffect(() => {
    fetch("/api/tasks").then((r) => r.json()).then((data) => {
      let list: GanttTask[] = data.data || [];
      // Garantizar fechas para visualizar
      const today = new Date(); today.setDate(1);
      list = list.map((t, i) => {
        if (!t.startDate) t.startDate = addDays(today, (i * 3) % 20).toISOString().slice(0, 10);
        if (!t.dueDate) t.dueDate = addDays(new Date(t.startDate), 5 + (i % 12)).toISOString().slice(0, 10);
        return t;
      });
      setTasks(list);
    });
  }, []);

  const addTask = async () => {
    if (!form.title.trim()) return;
    const start = addDays(origin, form.startOffset).toISOString().slice(0, 10);
    const end = addDays(origin, form.startOffset + form.duration).toISOString().slice(0, 10);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: form.title, priority: form.priority, startDate: start, dueDate: end }),
    });
    const data = await res.json();
    if (data.data) setTasks((p) => [...p, data.data]);
    setShowForm(false);
    setForm({ title: "", priority: "medium", startOffset: 2, duration: 7 });
  };

  const barStyle = (t: GanttTask) => {
    const s = new Date(t.startDate!);
    const e = new Date(t.dueDate!);
    const startDiff = Math.floor((s.getTime() - origin.getTime()) / 86400000);
    const duration = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / 86400000));
    const left = Math.max(0, startDiff) * (100 / DAYS);
    const widthPct = Math.min(duration, DAYS - Math.max(0, startDiff)) * (100 / DAYS);
    return { left: `${left}%`, width: `${widthPct}%`, color: PRIORITY_COLORS[t.priority] || "#3b82f6" };
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("Diagrama de Gantt")}</h1>
          <p className="page-subtitle">{t("Planificación temporal de tareas e hitos del proyecto")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setOrigin(addDays(origin, -30))} className="p-2 rounded-lg glass-card hover:bg-accent"><ChevronLeft size={16} /></button>
          <button onClick={() => { const d = new Date(); d.setDate(1); setOrigin(d); }} className="px-3 py-2 text-sm rounded-lg glass-card">{t("Hoy")}</button>
          <button onClick={() => setOrigin(addDays(origin, 30))} className="p-2 rounded-lg glass-card hover:bg-accent"><ChevronRight size={16} /></button>
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary gap-2">
            <Plus size={16} /> {t("Nueva tarea")}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="glass-card p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t("Nombre de la tarea")} className="md:col-span-2 form-input" />
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="form-select">
            <option value="low">{t("Baja")}</option><option value="medium">{t("Media")}</option><option value="high">{t("Alta")}</option><option value="critical">{t("Crítica")}</option>
          </select>
          <input type="number" min={0} value={form.startOffset} onChange={(e) => setForm({ ...form, startOffset: +e.target.value })} placeholder={t("Inicio (día)")} className="form-input" />
          <div className="flex gap-2">
            <input type="number" min={1} value={form.duration} onChange={(e) => setForm({ ...form, duration: +e.target.value })} placeholder={t("Duración")} className="form-input" />
            <button onClick={addTask} className="btn btn-primary px-3">✓</button>
          </div>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Cabecera de días */}
            <div className="flex border-b border-border/40 sticky top-0 bg-card/80 backdrop-blur z-10">
              <div className="w-64 flex-shrink-0 p-3 text-xs font-semibold text-muted-foreground uppercase">{t("Tarea")}</div>
              <div className="flex-1 flex">
                {days.map((d, i) => {
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  const isToday = new Date().toDateString() === d.toDateString();
                  return (
                    <div key={i} className={cn("flex-1 min-w-[24px] text-center py-2 text-[10px] border-l border-border/20", isWeekend && "bg-muted/40", isToday && "bg-primary/15 text-primary font-bold")}>
                      <div>{d.getDate()}</div>
                      <div className="text-[9px] text-muted-foreground">{["D","L","M","X","J","V","S"][d.getDay()]}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Filas */}
            {tasks
              .filter((t) => t.startDate && t.dueDate)
              .sort((a, b) => (a.startDate! > b.startDate! ? 1 : -1))
              .map((task) => {
              const s = barStyle(task);
              return (
                <div key={task.id} className="flex border-b border-border/20 hover:bg-accent/30 group">
                  <div className="w-64 flex-shrink-0 p-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {task.startDate ? formatDate(task.startDate) : "—"} → {task.dueDate ? formatDate(task.dueDate) : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex-1 relative h-12">
                    {days.map((d, i) => {
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      return <div key={i} className={cn("absolute inset-y-0 border-l border-border/10", isWeekend && "bg-muted/30")} style={{ left: `${i * (100 / DAYS)}%`, width: `${100 / DAYS}%` }} />;
                    })}
                    {(() => {
                      const delta = Math.floor((Date.now() - origin.getTime()) / 86400000);
                      if (delta >= 0 && delta < DAYS) {
                        return <div className="absolute inset-y-0 w-px bg-red-500/60 z-[5]" style={{ left: `${(delta + 0.5) * (100 / DAYS)}%` }} title={t("Hoy")} />;
                      }
                      return null;
                    })()}
                    {task.isMilestone ? (
                      <div className="absolute top-1/2 -translate-y-1/2" style={{ left: s.left }}>
                        <Flag size={18} style={{ color: s.color }} fill={s.color} />
                      </div>
                    ) : (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 h-6 rounded-md flex items-center px-2 text-[10px] font-medium text-white shadow-sm cursor-pointer hover:brightness-110 overflow-hidden"
                        style={{ left: s.left, width: s.width, background: `linear-gradient(135deg, ${s.color}, ${s.color}cc)` }}
                        title={`${task.title} · ${task.completionPercentage || 0}% ${t("completado")} · ${task.startDate ? formatDate(task.startDate) : "—"} → ${task.dueDate ? formatDate(task.dueDate) : "—"}`}
                      >
                        <span
                          className="absolute inset-y-0 left-0 bg-black/25"
                          style={{ width: `${Math.min(100, Math.max(0, task.completionPercentage || 0))}%` }}
                        />
                        <span className="relative truncate drop-shadow">{task.title}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="glass-card p-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{t("Leyenda:")}</span>
        {Object.entries(PRIORITY_COLORS).map(([p, c]) => (
          <span key={p} className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ background: c }} /> {p === "low" ? t("Baja") : p === "medium" ? t("Media") : p === "high" ? t("Alta") : t("Crítica")}</span>
        ))}
        <span className="flex items-center gap-1.5"><Flag size={12} /> {t("Hito")}</span>
      </div>
    </div>
  );
}
