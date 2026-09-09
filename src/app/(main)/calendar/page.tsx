// ============================================
// TERLUX COOP - CALENDARIO
// ============================================

"use client";

import { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Video,
  MapPin,
  Trash2,
  X,
} from "lucide-react";
import { cn, formatDate, formatTime, getTypeColor } from "@/lib/utils";
import { useT } from "@/i18n";

// Tipos
interface Meeting {
  id: string;
  title: string;
  description: string;
  type: "meeting" | "call" | "event" | "training";
  status: "scheduled" | "cancelled" | "completed" | "postponed";
  startTime: string;
  endTime: string;
  location: string;
  isOnline: boolean;
  meetingLink: string;
  color: string;
  attendees: { name: string; avatar: string }[];
  agenda: { time: string; item: string }[];
}
    // Días de la semana
const daysOfWeek = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// Meses
const months = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// Componente MeetingCard
function MeetingCard({ meeting, onDelete }: { meeting: Meeting; onDelete?: (id: string) => void }) {
  const t = useT();
  const typeColor = getTypeColor(meeting.type);
  const statusColor = getTypeColor(meeting.status);

  return (
    <div className="glass-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: meeting.color }}
            />
            <h3 className="font-medium text-foreground truncate">{meeting.title}</h3>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: typeColor + "20", color: typeColor }}
            >
              {meeting.type}
            </span>
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {meeting.description}
          </p>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span>
                {formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {meeting.isOnline ? (
                <Video size={14} />
              ) : (
                <MapPin size={14} />
              )}
              <span>{meeting.location}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex -space-x-1">
              {meeting.attendees.slice(0, 4).map((attendee, index) => (
                <div
                  key={index}
                  className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs"
                >
                  {attendee.avatar}
                </div>
              ))}
              {meeting.attendees.length > 4 && (
                <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                  +{meeting.attendees.length - 4}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => onDelete?.(meeting.id)} className="p-1.5 rounded hover:bg-muted transition-colors" title={t("Eliminar reunión")}>
                <Trash2 size={16} className="text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente CalendarGrid
function CalendarGrid({
  year,
  month,
  selectedDate,
  onDateSelect,
  meetings,
}: {
  year: number;
  month: number;
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  meetings: Meeting[];
}) {
  const t = useT();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Obtener reuniones para el mes
  const meetingsInMonth = meetings.filter((meeting) => {
    const meetingDate = new Date(meeting.startTime);
    return (
      meetingDate.getFullYear() === year &&
      meetingDate.getMonth() === month
    );
  });

  // Obtener días con reuniones
  const daysWithMeetings = new Set(
    meetingsInMonth.map((m) => new Date(m.startTime).getDate())
  );

  const days = [];
  
  // Días del mes anterior
  for (let i = 0; i < startDay; i++) {
    days.push(
      <div
        key={`prev-${i}`}
        className="calendar-day empty"
      />
    );
  }

  // Días del mes actual
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const isToday = date.getTime() === today.getTime();
    const isSelected = selectedDate && date.getTime() === selectedDate.getTime();
    const hasMeeting = daysWithMeetings.has(day);
    
    days.push(
      <button
        key={day}
        onClick={() => onDateSelect(date)}
        className={cn(
          "calendar-day",
          isToday && "today",
          isSelected && "selected",
          hasMeeting && "has-event"
        )}
      >
        {day}
      </button>
    );
  }

  // Días del mes siguiente
  const remainingDays = 42 - (startDay + daysInMonth);
  for (let i = 1; i <= remainingDays; i++) {
    days.push(
      <div
        key={`next-${i}`}
        className="calendar-day other-month"
      >
        {i}
      </div>
    );
  }

  return (
    <div className="calendar-grid">
      {daysOfWeek.map((day) => (
        <div
          key={day}
          className="calendar-day text-xs font-medium text-muted-foreground p-2"
        >
          {t(day)}
        </div>
      ))}
      {days}
    </div>
  );
}

// Componente MeetingList
function MeetingList({ date, meetings, onDelete }: { date: Date; meetings: Meeting[]; onDelete?: (id: string) => void }) {
  const t = useT();
  const meetingsOnDate = meetings.filter((meeting) => {
    const meetingDate = new Date(meeting.startTime);
    return (
      meetingDate.getFullYear() === date.getFullYear() &&
      meetingDate.getMonth() === date.getMonth() &&
      meetingDate.getDate() === date.getDate()
    );
  });

  if (meetingsOnDate.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("No hay reuniones programadas para este día")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {meetingsOnDate.map((meeting) => (
        <MeetingCard key={meeting.id} meeting={meeting} onDelete={onDelete} />
      ))}
    </div>
  );
}

// Página principal de calendario
export default function CalendarPage() {
  const t = useT();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<"day" | "week" | "month">("month");
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: "", type: "meeting", date: "", start: "09:00", end: "10:00", location: "", isOnline: false, color: "#6366f1" });

  useEffect(() => {
    fetch("/api/calendar").then((r) => r.json()).then((d) => d.success && setMeetings(d.data)).catch(() => setMeetings([]));
  }, []);

  const refresh = async () => {
    const r = await (await fetch("/api/calendar")).json();
    if (r.success) setMeetings(r.data);
  };

  const createMeeting = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/calendar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const d = await res.json();
    if (d.success) await refresh();
    return d;
  };

  const deleteMeeting = async (id: string) => {
    const res = await fetch(`/api/calendar?id=${id}`, { method: "DELETE" });
    const d = await res.json();
    if (d.success) await refresh();
    return d;
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("Calendario")}</h1>
          <p className="page-subtitle">
            {t("Gestión de reuniones, eventos y citas")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNew(true)}
            className="btn btn-primary gap-2"
          >
            <Plus size={18} />
            <span>{t("Nueva Reunión")}</span>
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setView("day")}
              className={cn(
                "p-2 rounded transition-colors",
                view === "day" ? "bg-primary/10 text-primary" : "hover:bg-muted"
              )}
            >
              {t("Día")}
            </button>
            <button
              onClick={() => setView("week")}
              className={cn(
                "p-2 rounded transition-colors",
                view === "week" ? "bg-primary/10 text-primary" : "hover:bg-muted"
              )}
            >
              {t("Semana")}
            </button>
            <button
              onClick={() => setView("month")}
              className={cn(
                "p-2 rounded transition-colors",
                view === "month" ? "bg-primary/10 text-primary" : "hover:bg-muted"
              )}
            >
              {t("Mes")}
            </button>
          </div>
        </div>
      </div>

      {/* Calendario */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm rounded hover:bg-muted transition-colors"
            >
              {t("Hoy")}
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousMonth}
                className="p-1.5 rounded hover:bg-muted transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <h2 className="text-lg font-semibold text-foreground">
                {t(months[month])} {year}
              </h2>
              <button
                onClick={goToNextMonth}
                className="p-1.5 rounded hover:bg-muted transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CalendarIcon size={18} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {selectedDate ? formatDate(selectedDate) : t("Selecciona una fecha")}
            </span>
          </div>
        </div>

        {view === "month" && (
          <CalendarGrid
            year={year}
            month={month}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            meetings={meetings}
          />
        )}

        {view === "week" && (
          <div className="glass-card p-4">
            <div className="grid grid-cols-7 gap-2">
              {(() => {
                const ref = selectedDate || new Date();
                const startOfWeek = new Date(ref);
                startOfWeek.setDate(ref.getDate() - ref.getDay());
                startOfWeek.setHours(0, 0, 0, 0);
                return Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(startOfWeek);
                  d.setDate(startOfWeek.getDate() + i);
                  const dayMeetings = meetings.filter((m) => new Date(m.startTime).toDateString() === d.toDateString());
                  const isToday = d.toDateString() === new Date().toDateString();
                  return (
                    <button key={i} onClick={() => setSelectedDate(d)}
                      className={`text-left p-3 rounded-xl border transition-colors ${isToday ? "border-primary bg-primary/5" : "border-border/30 hover:border-primary/30"} ${selectedDate?.toDateString() === d.toDateString() ? "ring-2 ring-primary" : ""}`}>
                      <div className={`text-xs font-medium mb-1 ${isToday ? "text-primary" : "text-muted-foreground"}`}>{t(daysOfWeek[d.getDay()])}</div>
                      <div className={`text-lg font-bold ${isToday ? "text-primary" : "text-foreground"}`}>{d.getDate()}</div>
                      {dayMeetings.length > 0 && (
                        <div className="flex gap-0.5 mt-1.5">
                          {dayMeetings.slice(0, 3).map((m, j) => <div key={j} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: m.color }} />)}
                        </div>
                      )}
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {view === "day" && (
          <div className="glass-card p-5">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              {selectedDate ? formatDate(selectedDate) : t("Hoy")}
            </h2>
            <MeetingList date={selectedDate || new Date()} meetings={meetings} onDelete={deleteMeeting} />
            {meetings.filter((m) => {
              const d = selectedDate || new Date();
              return new Date(m.startTime).toDateString() === d.toDateString();
            }).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">{t("No hay reuniones este día.")}</p>
            )}
          </div>
        )}
      </div>

      {/* Reuniones del día seleccionado */}
      {selectedDate && (
        <div className="glass-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            {t("Reuniones para")} {formatDate(selectedDate)}
          </h2>
          <MeetingList date={selectedDate} meetings={meetings} onDelete={deleteMeeting} />
        </div>
      )}

      {/* Próximas reuniones */}
      <div className="glass-card">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            {t("Próximas Reuniones")}
          </h2>
        </div>
        <div className="space-y-3">
          {[...meetings]
            .sort(
              (a, b) =>
                new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            )
            .slice(0, 5)
            .map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} onDelete={deleteMeeting} />
            ))}
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            {t("Reuniones por Tipo")}
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">{t("Reuniones")}</span>
              <span className="text-lg font-bold text-blue-600">
                {meetings.filter((m) => m.type === "meeting").length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">{t("Llamadas")}</span>
              <span className="text-lg font-bold text-cyan-600">
                {meetings.filter((m) => m.type === "call").length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">{t("Eventos")}</span>
              <span className="text-lg font-bold text-purple-600">
                {meetings.filter((m) => m.type === "event").length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">{t("Capacitaciones")}</span>
              <span className="text-lg font-bold text-green-600">
                {meetings.filter((m) => m.type === "training").length}
              </span>
            </div>
          </div>
        </div>

        <div className="glass-card">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            {t("Reuniones por Estado")}
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">{t("Programadas")}</span>
              <span className="text-lg font-bold text-blue-600">
                {meetings.filter((m) => m.status === "scheduled").length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">{t("Completadas")}</span>
              <span className="text-lg font-bold text-green-600">
                {meetings.filter((m) => m.status === "completed").length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">{t("Canceladas")}</span>
              <span className="text-lg font-bold text-red-600">
                {meetings.filter((m) => m.status === "cancelled").length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">{t("Pospuestas")}</span>
              <span className="text-lg font-bold text-orange-600">
                {meetings.filter((m) => m.status === "postponed").length}
              </span>
            </div>
          </div>
        </div>

        <div className="glass-card">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            {t("Total de Reuniones")}
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">{t("Este Mes")}</span>
              <span className="text-lg font-bold text-foreground">
                {meetings.filter((m) => {
                  const date = new Date(m.startTime);
                  return (
                    date.getFullYear() === new Date().getFullYear() &&
                    date.getMonth() === new Date().getMonth()
                  );
                }).length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">{t("Esta Semana")}</span>
              <span className="text-lg font-bold text-foreground">
                {meetings.filter((m) => {
                  const date = new Date(m.startTime);
                  const now = new Date();
                  const startOfWeek = new Date(
                    now.setDate(now.getDate() - now.getDay())
                  );
                  const endOfWeek = new Date(
                    now.setDate(now.getDate() + 6)
                  );
                  return date >= startOfWeek && date <= endOfWeek;
                }).length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">{t("Hoy")}</span>
              <span className="text-lg font-bold text-foreground">
                {meetings.filter((m) => {
                  const date = new Date(m.startTime);
                  const today = new Date();
                  return (
                    date.getFullYear() === today.getFullYear() &&
                    date.getMonth() === today.getMonth() &&
                    date.getDate() === today.getDate()
                  );
                }).length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">{t("Total")}</span>
              <span className="text-lg font-bold text-foreground">
                {meetings.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal nueva reunión */}
      {showNew && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowNew(false)}>
          <div className="glass-modal rounded-2xl p-6 w-full max-w-md animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t("Nueva reunión")}</h3>
              <button onClick={() => setShowNew(false)} className="p-1.5 rounded hover:bg-muted transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t("Título de la reunión")} className="form-input" />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="form-select">
                  <option value="meeting">{t("Reunión")}</option>
                  <option value="call">{t("Llamada")}</option>
                  <option value="event">{t("Evento")}</option>
                  <option value="training">{t("Capacitación")}</option>
                </select>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="form-input" />
                <input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className="form-input" />
                <input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className="form-input" />
              </div>
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder={t("Ubicación (o sala)")} className="form-input" />
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={form.isOnline} onChange={(e) => setForm({ ...form, isOnline: e.target.checked })} />
                {t("Es en línea (videollamada)")}
              </label>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">{t("Color:")}</label>
                <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-10 h-8 cursor-pointer rounded" />
              </div>
              <button
                disabled={!form.title || !form.date}
                onClick={async () => {
                  const startTime = new Date(`${form.date}T${form.start}`);
                  const endTime = new Date(`${form.date}T${form.end}`);
                  const d = await createMeeting({ ...form, startTime: startTime.toISOString(), endTime: endTime.toISOString(), description: "" });
                  if (d.success) { setShowNew(false); setForm({ title: "", type: "meeting", date: "", start: "09:00", end: "10:00", location: "", isOnline: false, color: "#6366f1" }); }
                }}
                className="btn btn-primary w-full gap-2"
              >
                <CalendarIcon size={15} /> {t("Guardar reunión")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
