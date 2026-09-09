"use client";

import { useEffect, useState } from "react";
import {
  Play, Pause, RotateCcw, Trash2, Plus, Zap, Mail, FileDown,
  RefreshCw, CheckCircle2, XCircle, Clock, AlertCircle, Loader2,
  X, Database, Upload, Download, Send,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { useT } from "@/i18n";

interface JobRow {
  job: {
    id: string; name: string; type: string; status: string; priority: number;
    attempts: number; maxAttempts: number; progress: number;
    payload: Record<string, unknown>; result: Record<string, unknown> | null; error: string | null;
    scheduledAt: string | null; startedAt: string | null; completedAt: string | null;
    failedAt: string | null; createdAt: string; queueId: string;
  };
  creator: { id: string; firstName: string; lastName: string } | null;
}

interface Queue {
  id: string; name: string; description: string | null; type: string;
  concurrency: number; isActive: boolean; createdAt: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  email: <Mail size={16} />,
  report: <FileDown size={16} />,
  import: <Upload size={16} />,
  export: <Download size={16} />,
  sync: <RefreshCw size={16} />,
  database: <Database size={16} />,
  custom: <Zap size={16} />,
};

const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "En cola", color: "#6b7280", icon: Clock },
  processing: { label: "Procesando", color: "#3b82f6", icon: Loader2 },
  completed: { label: "Completado", color: "#10b981", icon: CheckCircle2 },
  failed: { label: "Fallido", color: "#ef4444", icon: XCircle },
  cancelled: { label: "Cancelado", color: "#f59e0b", icon: AlertCircle },
};

export default function JobsPage() {
  const t = useT();
  const [queues, setQueues] = useState<Queue[]>([]);
  const [jobRows, setJobRows] = useState<JobRow[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [showQueueForm, setShowQueueForm] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [queueForm, setQueueForm] = useState({
    name: "", description: "", queueType: "standard", concurrency: 5,
    maxRetries: 3, retryDelay: 60, timeout: 300,
  });
  const [jobForm, setJobForm] = useState({
    name: "", jobType: "custom", payload: "{}", priority: 0,
    scheduledAt: "", maxAttempts: 3,
  });

  const load = async () => {
    const url = selectedQueue ? `/api/jobs?queueId=${selectedQueue}${filterStatus !== "all" ? `&status=${filterStatus}` : ""}` : `/api/jobs${filterStatus !== "all" ? `?status=${filterStatus}` : ""}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.success) {
      setQueues(data.data.queues || []);
      setJobRows(data.data.jobs || []);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [selectedQueue, filterStatus]);

  const createQueue = async () => {
    if (!queueForm.name) return;
    await fetch("/api/jobs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "queue", ...queueForm }),
    });
    setShowQueueForm(false);
    load();
  };

  const createJob = async () => {
    if (!jobForm.name || !selectedQueue) return;
    let payload = {};
    try { payload = JSON.parse(jobForm.payload); } catch { payload = {}; }
    await fetch("/api/jobs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        queueId: selectedQueue, name: jobForm.name, jobType: jobForm.jobType,
        payload, priority: jobForm.priority, maxAttempts: jobForm.maxAttempts,
        scheduledAt: jobForm.scheduledAt || undefined,
      }),
    });
    setShowJobForm(false);
    setJobForm({ name: "", jobType: "custom", payload: "{}", priority: 0, scheduledAt: "", maxAttempts: 3 });
    load();
  };

  const retryJob = async (id: string) => {
    await fetch("/api/jobs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, retry: true }) });
    load();
  };

  const cancelJob = async (id: string) => {
    await fetch("/api/jobs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "cancelled" }) });
    load();
  };

  const remove = async (id: string, type: "job" | "queue") => {
    if (!confirm(t(`¿Eliminar ${type === "queue" ? "esta cola" : "este trabajo"}?`))) return;
    await fetch(`/api/jobs?id=${id}&type=${type}`, { method: "DELETE" });
    load();
  };

  const stats = {
    pending: jobRows.filter((r) => r.job.status === "pending").length,
    processing: jobRows.filter((r) => r.job.status === "processing").length,
    completed: jobRows.filter((r) => r.job.status === "completed").length,
    failed: jobRows.filter((r) => r.job.status === "failed").length,
  };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("Cola de trabajos (Job Queue)")}</h1>
          <p className="page-subtitle">{t("Procesamiento asíncrono de tareas: informes, emails, sincronizaciones, importaciones")}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowQueueForm(true)} className="btn btn-outline gap-2"><Plus size={16} /> {t("Nueva cola")}</button>
          <button onClick={() => selectedQueue && setShowJobForm(true)} disabled={!selectedQueue}
            className="btn btn-primary gap-2"><Zap size={16} /> {t("Nuevo trabajo")}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* COLAS (sidebar) */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">{t("Colas")}</h3>
            <button onClick={load} className="p-1 rounded hover:bg-accent"><RefreshCw size={13} /></button>
          </div>
          <button onClick={() => setSelectedQueue(null)}
            className={cn("w-full text-left p-2.5 rounded-lg mb-1 text-sm transition-colors",
              !selectedQueue ? "bg-primary text-primary-foreground" : "hover:bg-accent")}>
            {t("Todos los trabajos")}
          </button>
          {queues.map((q) => (
            <div key={q.id} className="group flex items-center">
              <button onClick={() => setSelectedQueue(q.id)}
                className={cn("flex-1 text-left p-2.5 rounded-lg text-sm transition-colors",
                  selectedQueue === q.id ? "bg-primary text-primary-foreground" : "hover:bg-accent")}>
                <p className="font-medium truncate">{q.name}</p>
                <p className={cn("text-[10px] truncate",
                  selectedQueue === q.id ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {q.type} · {t("concurrencia")} {q.concurrency}
                </p>
              </button>
              <button onClick={() => remove(q.id, "queue")} className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-destructive">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {queues.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">{t("Crea una cola para empezar")}</p>}
        </div>

        {/* JOBS (principal) */}
        <div className="glass-card p-4 lg:col-span-3">
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex gap-1 p-1 bg-muted/40 rounded-lg">
              {["all", "pending", "processing", "completed", "failed"].map((s) => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={cn("px-3 py-1 rounded-md text-xs font-medium transition-colors",
                    filterStatus === s ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {s === "all" ? t("Todos") : t(STATUS_META[s].label)}
                </button>
              ))}
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-2 h-2 rounded-full bg-gray-500" /> {t("En cola:")} {stats.pending}</span>
              <span className="flex items-center gap-1.5 text-blue-500"><Loader2 size={11} className="animate-spin" /> {stats.processing}</span>
              <span className="flex items-center gap-1.5 text-emerald-500"><CheckCircle2 size={11} /> {stats.completed}</span>
              <span className="flex items-center gap-1.5 text-red-500"><XCircle size={11} /> {stats.failed}</span>
            </div>
          </div>

          <div className="space-y-2">
            {jobRows.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Zap size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">{selectedQueue ? t("Sin trabajos en esta cola") : t("Selecciona una cola o crea una nueva")}</p>
              </div>
            )}
            {jobRows.map(({ job: j, creator }) => {
              const meta = STATUS_META[j.status] || STATUS_META.pending;
              const Icon = meta.icon;
              const TypeIcon = TYPE_ICONS[j.type] || TYPE_ICONS.custom;
              return (
                <div key={j.id} className="p-4 rounded-lg border border-border/30 hover:bg-accent/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                      j.status === "processing" ? "bg-blue-500/15 text-blue-500" : "bg-muted/50 text-muted-foreground")}>
                      {j.status === "processing" ? <Loader2 size={18} className="animate-spin" /> : TypeIcon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-foreground">{j.name}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                          style={{ background: meta.color + "20", color: meta.color }}>
                          {t(meta.label)}
                        </span>
                        {j.priority > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500">{t("Prioridad")} {j.priority}</span>}
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {creator ? `${creator.firstName} ${creator.lastName}` : t("Sistema")} · {formatDate(j.createdAt, "Pp")}
                        </span>
                      </div>
                      {j.status === "processing" && (
                        <div className="mt-2">
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                            <span>{t("Progresando…")}</span>
                            <span>{j.progress}%</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary transition-all" style={{ width: `${j.progress}%` }} />
                          </div>
                        </div>
                      )}
                      {j.error && <p className="text-xs text-red-500 mt-1">⚠ {j.error}</p>}
                      {j.result && <p className="text-xs text-muted-foreground mt-1">✓ {t("Resultado:")} {JSON.stringify(j.result).slice(0, 120)}</p>}
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                        <span>{t("Intentos:")} {j.attempts}/{j.maxAttempts}</span>
                        {j.scheduledAt && <span>{t("Programado:")} {formatDate(j.scheduledAt, "Pp")}</span>}
                        {j.startedAt && <span>{t("Iniciado:")} {formatDate(j.startedAt, "p")}</span>}
                        {j.completedAt && <span>{t("Completado:")} {formatDate(j.completedAt, "p")}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {j.status === "failed" && <button onClick={() => retryJob(j.id)} className="p-1.5 rounded hover:bg-accent" title={t("Reintentar")}><RotateCcw size={14} /></button>}
                      {(j.status === "pending" || j.status === "processing") && <button onClick={() => cancelJob(j.id)} className="p-1.5 rounded hover:bg-accent" title={t("Cancelar")}><Pause size={14} /></button>}
                      <button onClick={() => remove(j.id, "job")} className="p-1.5 rounded hover:bg-destructive/10 text-destructive" title={t("Eliminar")}><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODAL CREAR COLA */}
      {showQueueForm && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowQueueForm(false)}>
          <div className="glass-modal rounded-2xl w-full max-w-lg animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
              <h3 className="font-semibold">{t("Nueva cola de trabajos")}</h3>
              <button onClick={() => setShowQueueForm(false)}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-3">
              <div><label className="text-xs text-muted-foreground">{t("Nombre")}</label>
                <input className="form-input" value={queueForm.name} onChange={(e) => setQueueForm({ ...queueForm, name: e.target.value })} placeholder={t("Ej: Envío de emails")} /></div>
              <div><label className="text-xs text-muted-foreground">{t("Descripción")}</label>
                <textarea className="form-textarea" rows={2} value={queueForm.description} onChange={(e) => setQueueForm({ ...queueForm, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground">{t("Tipo")}</label>
                  <select className="form-select" value={queueForm.queueType} onChange={(e) => setQueueForm({ ...queueForm, queueType: e.target.value })}>
                    <option value="standard">{t("Estándar")}</option><option value="priority">{t("Prioritaria")}</option><option value="batch">Batch</option>
                  </select></div>
                <div><label className="text-xs text-muted-foreground">{t("Concurrencia")}</label>
                  <input type="number" className="form-input" value={queueForm.concurrency} onChange={(e) => setQueueForm({ ...queueForm, concurrency: +e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">{t("Reintentos máx.")}</label>
                  <input type="number" className="form-input" value={queueForm.maxRetries} onChange={(e) => setQueueForm({ ...queueForm, maxRetries: +e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">{t("Timeout (seg)")}</label>
                  <input type="number" className="form-input" value={queueForm.timeout} onChange={(e) => setQueueForm({ ...queueForm, timeout: +e.target.value })} /></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border/30">
              <button className="btn btn-outline" onClick={() => setShowQueueForm(false)}>{t("Cancelar")}</button>
              <button className="btn btn-primary" onClick={createQueue}>{t("Crear cola")}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR TRABAJO */}
      {showJobForm && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowJobForm(false)}>
          <div className="glass-modal rounded-2xl w-full max-w-lg animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
              <h3 className="font-semibold">{t("Nuevo trabajo")}</h3>
              <button onClick={() => setShowJobForm(false)}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-3">
              <div><label className="text-xs text-muted-foreground">{t("Nombre del trabajo")}</label>
                <input className="form-input" value={jobForm.name} onChange={(e) => setJobForm({ ...jobForm, name: e.target.value })} placeholder={t("Ej: Enviar informe semanal")} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground">{t("Tipo")}</label>
                  <select className="form-select" value={jobForm.jobType} onChange={(e) => setJobForm({ ...jobForm, jobType: e.target.value })}>
                    <option value="email">Email</option><option value="report">{t("Informe")}</option>
                    <option value="import">{t("Importación")}</option><option value="export">{t("Exportación")}</option>
                    <option value="sync">{t("Sincronización")}</option><option value="database">{t("Base de datos")}</option>
                    <option value="custom">{t("Personalizado")}</option>
                  </select></div>
                <div><label className="text-xs text-muted-foreground">{t("Prioridad")}</label>
                  <input type="number" className="form-input" value={jobForm.priority} onChange={(e) => setJobForm({ ...jobForm, priority: +e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">{t("Máx. intentos")}</label>
                  <input type="number" className="form-input" value={jobForm.maxAttempts} onChange={(e) => setJobForm({ ...jobForm, maxAttempts: +e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">{t("Programado (opcional)")}</label>
                  <input type="datetime-local" className="form-input" value={jobForm.scheduledAt} onChange={(e) => setJobForm({ ...jobForm, scheduledAt: e.target.value })} /></div>
              </div>
              <div><label className="text-xs text-muted-foreground">Payload (JSON)</label>
                <textarea className="form-textarea font-mono text-xs" rows={4} value={jobForm.payload} onChange={(e) => setJobForm({ ...jobForm, payload: e.target.value })} /></div>
              <p className="text-[11px] text-muted-foreground">
                {t("Al guardar, el trabajo se ejecutará automáticamente (o en la fecha programada). Verás su progreso en tiempo real.")}
              </p>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border/30">
              <button className="btn btn-outline" onClick={() => setShowJobForm(false)}>{t("Cancelar")}</button>
              <button className="btn btn-primary gap-2" onClick={createJob}><Play size={14} /> {t("Ejecutar trabajo")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
