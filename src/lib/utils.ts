// ============================================
// TERLUX COOP - UTILIDADES
// ============================================

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// ============================================
// COMBINAR CLASSES DE TAILWIND
// ============================================

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================
// FORMATO DE FECHAS
// ============================================

import { format, formatDistance, formatDistanceToNow, isToday, isYesterday, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export function formatDate(date: Date | string, formatStr: string = "PPP"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, formatStr, { locale: es });
}

export function formatDateShort(date: Date | string): string {
  return formatDate(date, "P");
}

export function formatDateLong(date: Date | string): string {
  return formatDate(date, "PPPP");
}

export function formatDateTime(date: Date | string): string {
  return formatDate(date, "Pp");
}

export function formatTime(date: Date | string): string {
  return formatDate(date, "p");
}

export function formatRelative(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  if (isToday(d)) return "Hoy";
  if (isYesterday(d)) return "Ayer";
  return formatDistanceToNow(d, { locale: es, addSuffix: true });
}

export function formatDistanceDate(date: Date | string, baseDate: Date = new Date()): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistance(d, baseDate, { locale: es });
}

// ============================================
// FORMATO DE NUMEROS
// ============================================

export function formatNumber(num: number | string): string {
  const n = typeof num === "string" ? parseFloat(num) : num;
  return new Intl.NumberFormat("es-ES").format(n);
}

export function formatCurrency(amount: number | string, currency: string = "MXN"): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatPercentage(value: number | string, decimals: number = 2): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("es-ES", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n / 100);
}

export function formatDecimal(value: number | string, decimals: number = 2): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return n.toFixed(decimals).replace(".", ",");
}

// ============================================
// FORMATO DE TEXTO
// ============================================

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export function capitalizeWords(text: string): string {
  return text.split(" ").map(capitalize).join(" ");
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

// ============================================
// COLORES Y ESTILOS
// ============================================

export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    // Tareas
    todo: "#6b7280",
    in_progress: "#3b82f6",
    review: "#f59e0b",
    done: "#10b981",
    blocked: "#ef4444",
    
    // Proyectos
    project_pending: "#6b7280",
    project_active: "#3b82f6",
    project_completed: "#10b981",
    project_archived: "#6b7280",
    project_cancelled: "#ef4444",
    
    // Reuniones
    meeting_scheduled: "#3b82f6",
    meeting_cancelled: "#ef4444",
    meeting_completed: "#10b981",
    meeting_postponed: "#f59e0b",
    
    // Nómina
    payroll_draft: "#6b7280",
    payroll_processed: "#3b82f6",
    payroll_paid: "#10b981",
    
    // Prioridad
    priority_low: "#10b981",
    priority_medium: "#f59e0b",
    priority_high: "#f97316",
    priority_critical: "#ef4444",
    
    // Asistencias
    present: "#10b981",
    absent: "#ef4444",
    late: "#f97316",
    half_day: "#8b5cf6",
    remote: "#06b6d4",
    
    // Online
    online: "#10b981",
    offline: "#6b7280",
    busy: "#ef4444",
    away: "#f59e0b",
  };
  return statusColors[status.toLowerCase()] || "#6b7280";
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    low: "#10b981",
    medium: "#f59e0b",
    high: "#f97316",
    critical: "#ef4444",
  };
  return colors[priority.toLowerCase()] || "#6b7280";
}

export function getTypeColor(type: string): string {
  const typeColors: Record<string, string> = {
    meeting: "#3b82f6",
    call: "#06b6d4",
    event: "#8b5cf6",
    training: "#10b981",
    
    // Facturas
    invoice: "#3b82f6",
    credit_note: "#10b981",
    debit_note: "#ef4444",
    
    // Documentos
    doc: "#6b7280",
    contract: "#3b82f6",
    policy: "#8b5cf6",
    procedure: "#06b6d4",
    manual: "#f59e0b",
    
    // Archivos
    file: "#6b7280",
    image: "#8b5cf6",
    video: "#ef4444",
    audio: "#06b6d4",
  };
  return typeColors[type.toLowerCase()] || "#6b7280";
}

// ============================================
// GENERADORES
// ============================================

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function generateCode(prefix: string = ""): string {
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return prefix ? `${prefix}-${random}` : random;
}

export function generateColor(index: number): string {
  const colors = [
    "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
    "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#0ea5e9",
  ];
  return colors[index % colors.length];
}

// ============================================
// VALIDACIONES
// ============================================

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\+\(\)]{8,}$/;
  return phoneRegex.test(phone);
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ============================================
// MANEJO DE ERRORES
// ============================================

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
    public readonly details?: Record<string, string[]>
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function handleError(error: unknown): { code: string; message: string; details?: Record<string, string[]> } {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }
  
  if (error instanceof Error) {
    return {
      code: "INTERNAL_ERROR",
      message: error.message || "Error interno del servidor",
    };
  }
  
  return {
    code: "UNKNOWN_ERROR",
    message: "Ha ocurrido un error desconocido",
  };
}

// ============================================
// ALMACENAMIENTO LOCAL
// ============================================

export function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setToStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Error al guardar
  }
}

export function removeFromStorage(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    // Error al eliminar
  }
}

// ============================================
// COOKIES
// ============================================

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}

export function setCookie(name: string, value: string, days: number = 7): void {
  if (typeof document === "undefined") return;
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`;
}

export function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

// ============================================
// DEBOUNCE Y THROTTLE
// ============================================

export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  };
}

// ============================================
// FUNCIONES DE ARRAYS
// ============================================

export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((acc, item) => {
    const groupKey = String(item[key]);
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

export function uniqueBy<T>(array: T[], key: keyof T): T[] {
  const seen = new Set<string>();
  return array.filter((item) => {
    const keyValue = String(item[key]);
    if (seen.has(keyValue)) return false;
    seen.add(keyValue);
    return true;
  });
}

export function sortBy<T>(array: T[], key: keyof T, order: "asc" | "desc" = "asc"): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    if (aVal === bVal) return 0;
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    const comparison = aVal < bVal ? -1 : 1;
    return order === "asc" ? comparison : -comparison;
  });
}

export function filterBySearch<T extends Record<string, unknown>>(
  array: T[],
  searchTerm: string,
  keys: (keyof T)[]
): T[] {
  if (!searchTerm) return array;
  const lowerSearch = searchTerm.toLowerCase();
  return array.filter((item) =>
    keys.some((key) => {
      const value = item[key];
      if (value === null || value === undefined) return false;
      return String(value).toLowerCase().includes(lowerSearch);
    })
  );
}

// ============================================
// FUNCIONES DE PAGINACION
// ============================================

export interface PaginationResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export function paginate<T>(
  array: T[],
  page: number = 1,
  pageSize: number = 10
): PaginationResult<T> {
  const total = array.length;
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);
  const data = array.slice(startIndex, endIndex);
  
  return {
    data,
    meta: {
      total,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}
