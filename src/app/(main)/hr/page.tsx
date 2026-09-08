"use client";

import { useEffect, useState } from "react";
import {
  Users, Award, Calendar, FileText, Plus, X, TrendingUp, Clock,
  CheckCircle2, XCircle, Briefcase, Star, Loader2,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string | null;
  hireDate: string | null;
  department: { id: string; name: string; color: string | null } | null;
}

interface TimeOffRequest {
  id: string;
  userId: string;
  type: string;
  startDate: string;
  endDate: string;
  days: string;
  reason: string | null;
  status: string;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  user?: { firstName: string; lastName: string };
}

interface PerformanceReview {
  id: string;
  userId: string;
  reviewerId: string;
  period: string;
  rating: number | null;
  strengths: string | null;
  improvements: string | null;
  goals: any[];
  status: string;
  submittedAt: string | null;
  createdAt: string;
  user?: { firstName: string; lastName: string };
  reviewer?: { firstName: string; lastName: string };
}

const TIMEOFF_TYPES = [
  { id: "vacation", label: "Vacaciones", color: "#3b82f6" },
  { id: "sick", label: "Enfermedad", color: "#ef4444" },
  { id: "personal", label: "Personal", color: "#f59e0b" },
  { id: "other", label: "Otro", color: "#6b7280" },
];

const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Pendiente", color: "#f59e0b", icon: Clock },
  approved: { label: "Aprobado", color: "#10b981", icon: CheckCircle2 },
  rejected: { label: "Rechazado", color: "#ef4444", icon: XCircle },
  cancelled: { label: "Cancelado", color: "#6b7280", icon: XCircle },
};

export default function HRPage() {
  const [tab, setTab] = useState<"overview" | "timeoff" | "reviews" | "documents">("overview");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [showTimeOffForm, setShowTimeOffForm] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const [timeOffForm, setTimeOffForm] = useState({
    type: "vacation", startDate: "", endDate: "", reason: "",
  });
  const [reviewForm, setReviewForm] = useState({
    userId: "", period: "", rating: 3, strengths: "", improvements: "", goals: [] as string[],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [empRes, timeRes, revRes] = await Promise.all([
        fetch("/api/directory?all=1"),
        fetch("/api/hr/timeoff"),
        fetch("/api/hr/reviews"),
      ]);
      const empData = await empRes.json();
      const timeData = await timeRes.json();
      const revData = await revRes.json();

      setEmployees(empData.data || []);
      setTimeOffRequests(timeData.data || []);
      setReviews(revData.data || []);
    } catch (error) {
      console.error("[hr:load]", error);
    }
    setLoading(false);
  };

  const submitTimeOff = async () => {
    if (!timeOffForm.startDate || !timeOffForm.endDate) return;
    await fetch("/api/hr/timeoff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(timeOffForm),
    });
    setShowTimeOffForm(false);
    setTimeOffForm({ type: "vacation", startDate: "", endDate: "", reason: "" });
    loadData();
  };

  const approveTimeOff = async (id: string, approve: boolean) => {
    await fetch("/api/hr/timeoff", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: approve ? "approved" : "rejected" }),
    });
    loadData();
  };

  const submitReview = async () => {
    if (!reviewForm.userId || !reviewForm.period) return;
    await fetch("/api/hr/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reviewForm),
    });
    setShowReviewForm(false);
    setReviewForm({ userId: "", period: "", rating: 3, strengths: "", improvements: "", goals: [] });
    loadData();
  };

  const stats = {
    totalEmployees: employees.length,
    pendingTimeOff: timeOffRequests.filter((r) => r.status === "pending").length,
    avgRating: reviews.filter((r) => r.rating).reduce((acc, r) => acc + (r.rating || 0), 0) / (reviews.filter((r) => r.rating).length || 1),
    completedReviews: reviews.filter((r) => r.status === "completed").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recursos Humanos</h1>
          <p className="text-muted-foreground">Gestión de empleados, evaluaciones y días libres</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border/30">
        {[
          { id: "overview", label: "Resumen", icon: TrendingUp },
          { id: "timeoff", label: "Días libres", icon: Calendar },
          { id: "reviews", label: "Evaluaciones", icon: Award },
          { id: "documents", label: "Documentos", icon: FileText },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="glass-card p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalEmployees}</p>
                  <p className="text-xs text-muted-foreground">Empleados</p>
                </div>
              </div>
            </div>
            <div className="glass-card p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pendingTimeOff}</p>
                  <p className="text-xs text-muted-foreground">Solicitudes pendientes</p>
                </div>
              </div>
            </div>
            <div className="glass-card p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Award className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.completedReviews}</p>
                  <p className="text-xs text-muted-foreground">Evaluaciones</p>
                </div>
              </div>
            </div>
            <div className="glass-card p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Star className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.avgRating.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">Rating promedio</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-5">
              <h3 className="font-semibold mb-4">Solicitudes recientes</h3>
              <div className="space-y-3">
                {timeOffRequests.slice(0, 5).map((req) => (
                  <div key={req.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-semibold text-white">
                      {req.user?.firstName?.[0]}{req.user?.lastName?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {req.user?.firstName} {req.user?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {TIMEOFF_TYPES.find((t) => t.id === req.type)?.label} · {formatDate(req.startDate)}
                      </p>
                    </div>
                    <span
                      className="text-xs px-2 py-1 rounded-full"
                      style={{ background: STATUS_META[req.status].color + "20", color: STATUS_META[req.status].color }}
                    >
                      {STATUS_META[req.status].label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-5">
              <h3 className="font-semibold mb-4">Últimas evaluaciones</h3>
              <div className="space-y-3">
                {reviews.slice(0, 5).map((rev) => (
                  <div key={rev.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center text-xs font-semibold text-white">
                      {rev.user?.firstName?.[0]}{rev.user?.lastName?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {rev.user?.firstName} {rev.user?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{rev.period}</p>
                    </div>
                    {rev.rating && (
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={14} className={i < rev.rating! ? "fill-amber-400 text-amber-400" : "text-muted"} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TIME OFF */}
      {tab === "timeoff" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowTimeOffForm(true)} className="btn btn-primary gap-2">
              <Plus size={16} /> Solicitar días libres
            </button>
          </div>

          <div className="glass-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Empleado</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Tipo</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Fechas</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Días</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Motivo</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Estado</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {timeOffRequests.map((req) => {
                  const type = TIMEOFF_TYPES.find((t) => t.id === req.type);
                  const status = STATUS_META[req.status];
                  const StatusIcon = status.icon;
                  return (
                    <tr key={req.id} className="border-b border-border/20 hover:bg-muted/20">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-semibold text-white">
                            {req.user?.firstName?.[0]}{req.user?.lastName?.[0]}
                          </div>
                          <span className="font-medium">
                            {req.user?.firstName} {req.user?.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-xs px-2 py-1 rounded-full" style={{ background: type?.color + "20", color: type?.color }}>
                          {type?.label}
                        </span>
                      </td>
                      <td className="p-3 text-sm">
                        {formatDate(req.startDate)} → {formatDate(req.endDate)}
                      </td>
                      <td className="p-3 text-sm font-medium">{req.days}</td>
                      <td className="p-3 text-sm text-muted-foreground max-w-xs truncate">{req.reason || "—"}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ background: status.color + "20", color: status.color }}>
                          <StatusIcon size={12} />
                          {status.label}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {req.status === "pending" && (
                          <div className="flex justify-end gap-1">
                            <button onClick={() => approveTimeOff(req.id, true)} className="p-1.5 rounded hover:bg-emerald-500/10 text-emerald-500">
                              <CheckCircle2 size={16} />
                            </button>
                            <button onClick={() => approveTimeOff(req.id, false)} className="p-1.5 rounded hover:bg-red-500/10 text-red-500">
                              <XCircle size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REVIEWS */}
      {tab === "reviews" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowReviewForm(true)} className="btn btn-primary gap-2">
              <Plus size={16} /> Nueva evaluación
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((rev) => (
              <div key={rev.id} className="glass-card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center text-sm font-semibold text-white">
                      {rev.user?.firstName?.[0]}{rev.user?.lastName?.[0]}
                    </div>
                    <div>
                      <p className="font-medium">{rev.user?.firstName} {rev.user?.lastName}</p>
                      <p className="text-xs text-muted-foreground">{rev.period}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-full",
                    rev.status === "completed" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                  )}>
                    {rev.status === "completed" ? "Completada" : "Borrador"}
                  </span>
                </div>

                {rev.rating && (
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={18} className={i < rev.rating! ? "fill-amber-400 text-amber-400" : "text-muted"} />
                    ))}
                    <span className="ml-2 text-sm font-medium">{rev.rating}/5</span>
                  </div>
                )}

                {rev.strengths && (
                  <div className="mb-2">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Fortalezas</p>
                    <p className="text-sm">{rev.strengths}</p>
                  </div>
                )}

                {rev.improvements && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Áreas de mejora</p>
                    <p className="text-sm">{rev.improvements}</p>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-border/30 text-xs text-muted-foreground">
                  Evaluado por: {rev.reviewer?.firstName} {rev.reviewer?.lastName}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DOCUMENTS */}
      {tab === "documents" && (
        <div className="glass-card p-12 text-center">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Documentos de empleados</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Gestiona contratos, certificados y documentos importantes de tu equipo
          </p>
          <button className="btn btn-primary gap-2">
            <Plus size={16} /> Subir documento
          </button>
        </div>
      )}

      {/* MODAL SOLICITUD DÍAS LIBRES */}
      {showTimeOffForm && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowTimeOffForm(false)}>
          <div className="glass-modal rounded-2xl w-full max-w-md animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
              <h3 className="font-semibold">Solicitar días libres</h3>
              <button onClick={() => setShowTimeOffForm(false)}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Tipo</label>
                <select className="form-select" value={timeOffForm.type} onChange={(e) => setTimeOffForm({ ...timeOffForm, type: e.target.value })}>
                  {TIMEOFF_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Desde</label>
                  <input type="date" className="form-input" value={timeOffForm.startDate} onChange={(e) => setTimeOffForm({ ...timeOffForm, startDate: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Hasta</label>
                  <input type="date" className="form-input" value={timeOffForm.endDate} onChange={(e) => setTimeOffForm({ ...timeOffForm, endDate: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Motivo (opcional)</label>
                <textarea className="form-textarea" rows={3} value={timeOffForm.reason} onChange={(e) => setTimeOffForm({ ...timeOffForm, reason: e.target.value })} placeholder="Ej: Viaje familiar, cita médica..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border/30">
              <button className="btn btn-outline" onClick={() => setShowTimeOffForm(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={submitTimeOff}>Enviar solicitud</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EVALUACIÓN */}
      {showReviewForm && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowReviewForm(false)}>
          <div className="glass-modal rounded-2xl w-full max-w-lg animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
              <h3 className="font-semibold">Nueva evaluación de desempeño</h3>
              <button onClick={() => setShowReviewForm(false)}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Empleado</label>
                <select className="form-select" value={reviewForm.userId} onChange={(e) => setReviewForm({ ...reviewForm, userId: e.target.value })}>
                  <option value="">Seleccionar...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} - {emp.position || "Sin cargo"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Período</label>
                <input className="form-input" value={reviewForm.period} onChange={(e) => setReviewForm({ ...reviewForm, period: e.target.value })} placeholder="Ej: Q1 2024, Anual 2024" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Calificación (1-5)</label>
                <div className="flex items-center gap-2 mt-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setReviewForm({ ...reviewForm, rating: n })}
                      className="p-1"
                    >
                      <Star size={24} className={n <= reviewForm.rating ? "fill-amber-400 text-amber-400" : "text-muted"} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Fortalezas</label>
                <textarea className="form-textarea" rows={3} value={reviewForm.strengths} onChange={(e) => setReviewForm({ ...reviewForm, strengths: e.target.value })} placeholder="Aspectos positivos del desempeño..." />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Áreas de mejora</label>
                <textarea className="form-textarea" rows={3} value={reviewForm.improvements} onChange={(e) => setReviewForm({ ...reviewForm, improvements: e.target.value })} placeholder="Oportunidades de desarrollo..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border/30">
              <button className="btn btn-outline" onClick={() => setShowReviewForm(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={submitReview}>Guardar evaluación</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
