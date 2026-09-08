// ============================================
// TERLUX COOP - CALENDARIO
// ============================================

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  Video,
  MapPin,
  MoreVertical,
  Edit,
  Trash2,
} from "lucide-react";
import { cn, formatDate, formatTime, getTypeColor } from "@/lib/utils";

// Tipos
interface Meeting {
  id: string;
  title: string;
  description: string;
  type: "meeting" | "call" | "event" | "training";
  status: "scheduled" | "cancelled" | "completed" | "postponed";
  startTime: Date;
  endTime: Date;
  location: string;
  isOnline: boolean;
  meetingLink: string;
  color: string;
  attendees: { name: string; avatar: string }[];
  agenda: { time: string; item: string }[];
}

// Datos mock
const meetingsData: Meeting[] = [
  {
    id: "1",
    title: "Reunión de Equipo",
    description: "Reunión semanal de seguimiento de proyectos",
    type: "meeting",
    status: "scheduled",
    startTime: new Date("2024-10-10T10:00:00"),
    endTime: new Date("2024-10-10T11:00:00"),
    location: "Sala de Reuniones A",
    isOnline: false,
    meetingLink: "",
    color: "#3b82f6",
    attendees: [
      { name: "Juan Pérez", avatar: "JP" },
      { name: "Ana García", avatar: "AG" },
      { name: "Carlos López", avatar: "CL" },
    ],
    agenda: [
      { time: "10:00-10:15", item: "Apertura" },
      { time: "10:15-10:45", item: "Avances de proyectos" },
      { time: "10:45-11:00", item: "Cierre" },
    ],
  },
  {
    id: "2",
    title: "Presentación a Clientes",
    description: "Presentación de la nueva plataforma TerLux Coop",
    type: "meeting",
    status: "scheduled",
    startTime: new Date("2024-10-12T14:00:00"),
    endTime: new Date("2024-10-12T15:30:00"),
    location: "Online - Zoom",
    isOnline: true,
    meetingLink: "https://zoom.us/j/123456789",
    color: "#8b5cf6",
    attendees: [
      { name: "Juan Pérez", avatar: "JP" },
      { name: "María Martínez", avatar: "MM" },
      { name: "Cliente X", avatar: "CX" },
    ],
    agenda: [
      { time: "14:00-14:30", item: "Presentación" },
      { time: "14:30-15:00", item: "Demo" },
      { time: "15:00-15:30", item: "Preguntas" },
    ],
  },
  {
    id: "3",
    title: "Capacitación en Nuevas Herramientas",
    description: "Capacitación para el equipo en las nuevas herramientas de la plataforma",
    type: "training",
    status: "scheduled",
    startTime: new Date("2024-10-15T09:00:00"),
    endTime: new Date("2024-10-15T12:00:00"),
    location: "Sala de Capacitación",
    isOnline: false,
    meetingLink: "",
    color: "#10b981",
    attendees: [
      { name: "Juan Pérez", avatar: "JP" },
      { name: "Ana García", avatar: "AG" },
      { name: "Carlos López", avatar: "CL" },
      { name: "María Martínez", avatar: "MM" },
      { name: "Sofía Ramírez", avatar: "SR" },
    ],
    agenda: [
      { time: "09:00-10:30", item: "Módulo 1" },
      { time: "10:30-12:00", item: "Módulo 2" },
    ],
  },
  {
    id: "4",
    title: "Llamada con Proveedor",
    description: "Llamada de seguimiento con proveedor de servicios",
    type: "call",
    status: "scheduled",
    startTime: new Date("2024-10-11T16:00:00"),
    endTime: new Date("2024-10-11T16:30:00"),
    location: "Online - Teams",
    isOnline: true,
    meetingLink: "https://teams.microsoft.com/l/meetup-join/19:meeting",
    color: "#06b6d4",
    attendees: [
      { name: "Juan Pérez", avatar: "JP" },
      { name: "Proveedor Y", avatar: "PY" },
    ],
    agenda: [
      { time: "16:00-16:30", item: "Seguimiento" },
    ],
  },
];

// Días de la semana
const daysOfWeek = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// Meses
const months = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// Componente MeetingCard
function MeetingCard({ meeting }: { meeting: Meeting }) {
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
              <button className="p-1.5 rounded hover:bg-muted transition-colors">
                <Edit size={16} className="text-muted-foreground" />
              </button>
              <button className="p-1.5 rounded hover:bg-muted transition-colors">
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
}: {
  year: number;
  month: number;
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
}) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Obtener reuniones para el mes
  const meetingsInMonth = meetingsData.filter((meeting) => {
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
          {day}
        </div>
      ))}
      {days}
    </div>
  );
}

// Componente MeetingList
function MeetingList({ date }: { date: Date }) {
  const meetingsOnDate = meetingsData.filter((meeting) => {
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
        No hay reuniones programadas para este día
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {meetingsOnDate.map((meeting) => (
        <MeetingCard key={meeting.id} meeting={meeting} />
      ))}
    </div>
  );
}

// Página principal de calendario
export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<"day" | "week" | "month">("month");

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
          <h1 className="page-title">Calendario</h1>
          <p className="page-subtitle">
            Gestión de reuniones, eventos y citas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/calendar/new"
            className="btn btn-primary gap-2"
          >
            <Plus size={18} />
            <span>Nueva Reunión</span>
          </Link>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setView("day")}
              className={cn(
                "p-2 rounded transition-colors",
                view === "day" ? "bg-primary/10 text-primary" : "hover:bg-muted"
              )}
            >
              Día
            </button>
            <button
              onClick={() => setView("week")}
              className={cn(
                "p-2 rounded transition-colors",
                view === "week" ? "bg-primary/10 text-primary" : "hover:bg-muted"
              )}
            >
              Semana
            </button>
            <button
              onClick={() => setView("month")}
              className={cn(
                "p-2 rounded transition-colors",
                view === "month" ? "bg-primary/10 text-primary" : "hover:bg-muted"
              )}
            >
              Mes
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
              Hoy
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousMonth}
                className="p-1.5 rounded hover:bg-muted transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <h2 className="text-lg font-semibold text-foreground">
                {months[month]} {year}
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
              {selectedDate ? formatDate(selectedDate) : "Selecciona una fecha"}
            </span>
          </div>
        </div>

        <CalendarGrid
          year={year}
          month={month}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
        />
      </div>

      {/* Reuniones del día seleccionado */}
      {selectedDate && (
        <div className="glass-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Reuniones para {formatDate(selectedDate)}
          </h2>
          <MeetingList date={selectedDate} />
        </div>
      )}

      {/* Próximas reuniones */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Próximas Reuniones
          </h2>
          <Link
            href="/calendar"
            className="text-sm text-primary hover:underline"
          >
            Ver todas
          </Link>
        </div>
        <div className="space-y-3">
          {[...meetingsData]
            .sort(
              (a, b) =>
                new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            )
            .slice(0, 5)
            .map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            Reuniones por Tipo
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Reuniones</span>
              <span className="text-lg font-bold text-blue-600">
                {meetingsData.filter((m) => m.type === "meeting").length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Llamadas</span>
              <span className="text-lg font-bold text-cyan-600">
                {meetingsData.filter((m) => m.type === "call").length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Eventos</span>
              <span className="text-lg font-bold text-purple-600">
                {meetingsData.filter((m) => m.type === "event").length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Capacitaciones</span>
              <span className="text-lg font-bold text-green-600">
                {meetingsData.filter((m) => m.type === "training").length}
              </span>
            </div>
          </div>
        </div>

        <div className="glass-card">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            Reuniones por Estado
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Programadas</span>
              <span className="text-lg font-bold text-blue-600">
                {meetingsData.filter((m) => m.status === "scheduled").length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Completadas</span>
              <span className="text-lg font-bold text-green-600">
                {meetingsData.filter((m) => m.status === "completed").length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Canceladas</span>
              <span className="text-lg font-bold text-red-600">
                {meetingsData.filter((m) => m.status === "cancelled").length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Pospuestas</span>
              <span className="text-lg font-bold text-orange-600">
                {meetingsData.filter((m) => m.status === "postponed").length}
              </span>
            </div>
          </div>
        </div>

        <div className="glass-card">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            Total de Reuniones
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Este Mes</span>
              <span className="text-lg font-bold text-foreground">
                {meetingsData.filter((m) => {
                  const date = new Date(m.startTime);
                  return (
                    date.getFullYear() === new Date().getFullYear() &&
                    date.getMonth() === new Date().getMonth()
                  );
                }).length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Esta Semana</span>
              <span className="text-lg font-bold text-foreground">
                {meetingsData.filter((m) => {
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
              <span className="text-sm text-foreground">Hoy</span>
              <span className="text-lg font-bold text-foreground">
                {meetingsData.filter((m) => {
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
              <span className="text-sm text-foreground">Total</span>
              <span className="text-lg font-bold text-foreground">
                {meetingsData.length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
