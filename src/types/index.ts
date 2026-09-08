// ============================================
// TERLUX COOP - TIPOS GLOBALES
// ============================================

import { User, Project, Task, Meeting, File, Document, Payroll } from "@/db/schema";

// ============================================
// TIPOS DE AUTENTICACION
// ============================================

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: string;
  departmentId?: string;
  preferences: {
    theme: "light" | "dark" | "system";
    notifications: boolean;
  };
}

export interface AuthState {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ============================================
// TIPOS DE NAVEGACION
// ============================================

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
  children?: NavItem[];
  permission?: string;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

// ============================================
// TIPOS DE PROYECTOS
// ============================================

export type ProjectStatus = "pending" | "active" | "completed" | "archived" | "cancelled";
export type ProjectPriority = "low" | "medium" | "high" | "critical";

export interface ProjectWithRelations extends Omit<Project, "startDate" | "endDate"> {
  startDate: Date | null;
  endDate: Date | null;
  department?: {
    id: string;
    name: string;
    color: string;
  };
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  client?: {
    id: string;
    name: string;
  };
  taskCount: number;
  completionPercentage: number;
}

// ============================================
// TIPOS DE TAREAS
// ============================================

export type TaskStatus = "todo" | "in_progress" | "review" | "done" | "blocked";
export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface TaskWithRelations extends Omit<Task, "startDate" | "dueDate" | "createdAt" | "updatedAt"> {
  startDate: Date | null;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  project?: {
    id: string;
    name: string;
    code: string;
    color: string;
  };
  assignedToUser?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  createdByUser?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  subtasks: {
    id: string;
    title: string;
    isCompleted: boolean;
    orderIndex: number;
  }[];
  commentsCount: number;
  filesCount: number;
}

// ============================================
// TIPOS DE CALENDARIO / REUNIONES
// ============================================

export type MeetingStatus = "scheduled" | "cancelled" | "completed" | "postponed";
export type MeetingType = "meeting" | "call" | "event" | "training";

export interface MeetingWithRelations extends Omit<Meeting, "startTime" | "endTime" | "createdAt" | "updatedAt"> {
  startTime: Date;
  endTime: Date;
  createdAt: Date;
  updatedAt: Date;
  project?: {
    id: string;
    name: string;
    color: string;
  };
  createdByUser?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  attendees: {
    id: string;
    userId: string;
    status: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      avatar?: string;
    };
  }[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: MeetingType;
  status: MeetingStatus;
  color: string;
  isRecurring: boolean;
  allDay: boolean;
  location?: string;
}

// ============================================
// TIPOS DE ARCHIVOS Y DOCUMENTOS
// ============================================

export type FileType = "file" | "document" | "image" | "video" | "audio";
export type FileCategory = "general" | "contract" | "invoice" | "report" | "presentation";

export interface FileWithRelations extends Omit<File, "createdAt"> {
  createdAt: Date;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  project?: {
    id: string;
    name: string;
    code: string;
  };
  folder?: {
    id: string;
    name: string;
    path: string;
  };
}

export type DocumentStatus = "draft" | "published" | "archived";
export type DocumentType = "document" | "contract" | "policy" | "procedure" | "manual";

export interface DocumentWithRelations extends Omit<Document, "effectiveDate" | "expiryDate" | "createdAt" | "updatedAt"> {
  effectiveDate: Date | null;
  expiryDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  author?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  project?: {
    id: string;
    name: string;
    code: string;
  };
  folder?: {
    id: string;
    name: string;
    path: string;
  };
  template?: {
    id: string;
    name: string;
    type: string;
  };
  approvedByUser?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

// ============================================
// TIPOS DE NOMINAS
// ============================================

export type PayrollStatus = "draft" | "processed" | "paid" | "cancelled";
export type PayrollPeriod = "monthly" | "biweekly" | "weekly";

export interface PayrollWithRelations extends Omit<Payroll, "startDate" | "endDate" | "processedAt" | "paidAt" | "createdAt" | "updatedAt"> {
  startDate: Date;
  endDate: Date;
  processedAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  department?: {
    id: string;
    name: string;
  };
  createdByUser?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  processedByUser?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  details: {
    id: string;
    userId: string;
    baseSalary: string;
    overtimeHours: string;
    overtimeAmount: string;
    bonusAmount: string;
    deductionAmount: string;
    taxAmount: string;
    socialSecurity: string;
    netAmount: string;
    paymentStatus: string;
    paymentDate: Date | null;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      position: string;
      departmentId: string;
    };
  }[];
}

// ============================================
// TIPOS DE DASHBOARD
// ============================================

export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  completedTasks: number;
  pendingTasks: number;
  totalUsers: number;
  totalRevenue: string;
  upcomingMeetings: number;
  pendingInvoices: number;
}

export interface ChartData {
  name: string;
  value: number;
  color?: string;
}

export interface ActivityFeedItem {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: Date;
  user?: {
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

// ============================================
// TIPOS DE NOTIFICACIONES
// ============================================

export type NotificationType = "info" | "success" | "warning" | "error";

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  entityType: string;
  entityId: string;
  isRead: boolean;
  isArchived: boolean;
  actionUrl?: string;
  icon?: string;
  createdAt: Date;
}

// ============================================
// TIPOS DE USUARIO
// ============================================

export interface UserProfile extends Omit<User, "hireDate" | "lastLogin" | "createdAt" | "updatedAt" | "preferences"> {
  hireDate: Date | null;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
  preferences: {
    theme: string;
    notifications: boolean;
  };
  department?: {
    id: string;
    name: string;
    color: string;
  };
  statistics: {
    totalTasks: number;
    completedTasks: number;
    activeProjects: number;
    meetingsAttended: number;
  };
}

// ============================================
// TIPOS DE FORMULARIOS
// ============================================

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  color?: string;
}

export interface FormError {
  field: string;
  message: string;
}

export interface FormState<T> {
  data: T;
  errors: FormError[];
  isSubmitting: boolean;
  isDirty: boolean;
}

// ============================================
// TIPOS DE TABLAS
// ============================================

export interface ColumnDef<T> {
  accessorKey: keyof T | string;
  header: string;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  width?: number | string;
}

export interface TableState {
  pageIndex: number;
  pageSize: number;
  sortBy: { id: string; desc: boolean }[];
  filters: Record<string, string>;
  search: string;
}

// ============================================
// TIPOS DE CONFIGURACION
// ============================================

export interface CompanySettings {
  id: string;
  companyName: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyTaxId?: string;
  companyWebsite?: string;
  logo?: string;
  favicon?: string;
  currency: string;
  dateFormat: string;
  timeFormat: string;
  timezone: string;
  language: string;
  workHoursStart: string;
  workHoursEnd: string;
  settings: Record<string, unknown>;
}

// ============================================
// TIPOS DE PERMISOS
// ============================================

export type UserRole = "super_admin" | "admin" | "manager" | "user" | "guest";

export interface Permission {
  id: string;
  name: string;
  code: string;
  description: string;
  category: string;
  isActive: boolean;
}

export interface Role {
  id: string;
  name: UserRole;
  description: string;
  isDefault: boolean;
  isAdmin: boolean;
  permissions: Permission[];
}

// ============================================
// TIPOS DE RESPUESTA API
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
  message?: string;
}

export interface PaginatedResponse<T> {
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

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  filters?: Record<string, string>;
}

// ============================================
// TIPOS DE FILTROS
// ============================================

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  field: string;
  label: string;
  type: "select" | "date" | "text" | "boolean";
  options?: FilterOption[];
  placeholder?: string;
}

// ============================================
// TIPOS DE EXPORTACION
// ============================================

export type ExportFormat = "csv" | "excel" | "pdf" | "json";

export interface ExportRequest {
  entity: string;
  format: ExportFormat;
  filters?: Record<string, string>;
  dateRange?: {
    start: Date;
    end: Date;
  };
}
