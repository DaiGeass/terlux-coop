"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, GripVertical, Calendar, Flag, X, Loader2 } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { useT } from "@/i18n";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  tags: string[] | null;
}

const COLUMNS = [
  { id: "todo", label: "Por hacer", color: "#6b7280" },
  { id: "in_progress", label: "En progreso", color: "#3b82f6" },
  { id: "review", label: "En revisión", color: "#f59e0b" },
  { id: "done", label: "Completadas", color: "#10b981" },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

const SAMPLE = [
  { title: "Configure Tailscale 100.64.0.0/10 network", status: "todo", priority: "high", description: "Enable Tailscale on the gateway" },
  { title: "Review MinIO storage contract", status: "todo", priority: "medium", description: "" },
  { title: "Develop Drive synchronization", status: "in_progress", priority: "high", description: "Connect to storage at 100.106.108.98:9000" },
  { title: "Design email inbox", status: "in_progress", priority: "medium", description: "Outlook-style" },
  { title: "Test Redsys payment gateway", status: "review", priority: "critical", description: "Cards and Bizum in sandbox environment" },
  { title: "Create payroll templates", status: "done", priority: "medium", description: "" },
];

export default function TasksPage() {
  const t = useT();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  const [addingIn, setAddingIn] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState("medium");

  const load = useCallback(async () => {
    const res = await fetch("/api/tasks");
    const data = await res.json();
    let list: Task[] = data.data || [];
    if (list.length === 0) {
      for (const s of SAMPLE) {
        await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(s),
        });
      }
      const res2 = await fetch("/api/tasks");
      const data2 = await res2.json();
      list = data2.data || [];
    }
    setTasks(list);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const moveTask = async (taskId: string, status: string) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId, status, completionPercentage: status === "done" ? 100 : 0 }),
    });
  };

  const addTask = async () => {
    if (!newTitle.trim() || !addingIn) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim(), status: addingIn, priority: newPriority }),
    });
    const data = await res.json();
    if (data.data) setTasks((prev) => [...prev, data.data]);
    setNewTitle("");
    setAddingIn(null);
  };

  const removeTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/tasks?id=${id}`, { method: "DELETE" });
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("Tareas")}</h1>
          <p className="page-subtitle">{t("Tablero Kanban · arrastra las tarjetas entre columnas")}</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {Object.entries(PRIORITY_COLORS).map(([p, c]) => (
            <span key={p} className="flex items-center gap-1.5 text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
              {p === "low" ? t("Baja") : p === "medium" ? t("Media") : p === "high" ? t("Alta") : t("Crítica")}
            </span>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                onDragOver={(e) => { e.preventDefault(); setOverColumn(col.id); }}
                onDragLeave={() => setOverColumn(null)}
                onDrop={() => { if (dragId) moveTask(dragId, col.id); setDragId(null); setOverColumn(null); }}
                className={cn(
                  "glass-card p-3 min-h-[300px] transition-colors",
                  overColumn === col.id && "ring-2 ring-primary/50"
                )}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: col.color }} />
                    <h3 className="text-sm font-semibold text-foreground">{t(col.label)}</h3>
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{colTasks.length}</span>
                  </div>
                  <button onClick={() => { setAddingIn(col.id); setNewPriority("medium"); }} className="p-1 rounded hover:bg-accent">
                    <Plus size={15} />
                  </button>
                </div>

                <div className="space-y-2">
                  {addingIn === col.id && (
                    <div className="rounded-lg border border-border/50 bg-background/60 p-2.5 space-y-2">
                      <textarea
                        autoFocus
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") addTask(); if (e.key === "Escape") setAddingIn(null); }}
                        placeholder={t("Título de la tarea…")}
                        className="w-full text-sm bg-transparent resize-none focus:outline-none"
                        rows={2}
                      />
                      <div className="flex items-center gap-2">
                        <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)} className="text-xs bg-muted rounded px-1.5 py-1">
                          <option value="low">{t("Baja")}</option>
                          <option value="medium">{t("Media")}</option>
                          <option value="high">{t("Alta")}</option>
                          <option value="critical">{t("Crítica")}</option>
                        </select>
                        <button onClick={addTask} className="ml-auto text-xs px-2 py-1 rounded bg-primary text-primary-foreground">{t("Añadir")}</button>
                        <button onClick={() => setAddingIn(null)} className="text-xs p-1"><X size={14} /></button>
                      </div>
                    </div>
                  )}

                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => setDragId(task.id)}
                      onDragEnd={() => setDragId(null)}
                      className={cn(
                        "rounded-lg border border-border/40 bg-background/70 p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group",
                        dragId === task.id && "opacity-50"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical size={14} className="text-muted-foreground/40 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-medium text-foreground", col.id === "done" && "line-through text-muted-foreground")}>
                            {task.title}
                          </p>
                          {task.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>}
                          <div className="flex items-center gap-2 mt-2">
                            <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                              style={{ background: (PRIORITY_COLORS[task.priority] || "#6b7280") + "20", color: PRIORITY_COLORS[task.priority] }}>
                              <Flag size={9} /> {task.priority}
                            </span>
                            {task.dueDate && (
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Calendar size={9} /> {formatDate(task.dueDate)}
                              </span>
                            )}
                          </div>
                        </div>
                        <button onClick={() => removeTask(task.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-destructive transition-opacity">
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
