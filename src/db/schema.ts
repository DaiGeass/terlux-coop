import {
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
  jsonb,
  date,
  decimal,
  bigint,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================
// SCHEMA DE TERLUX COOP - PLATAFORMA EMPRESARIAL
// ============================================

// -- USUARIOS --
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  password: text("password"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  avatar: text("avatar"),
  role: text("role").notNull().default("user"),
  departmentId: uuid("department_id"),
  position: text("position"),
  salary: decimal("salary", { precision: 12, scale: 2 }),
  hireDate: date("hire_date"),
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  preferences: jsonb("preferences").default({ theme: "system", notifications: true }),
  termsAcceptedAt: timestamp("terms_accepted_at"),
  resetToken: text("reset_token"),
  resetTokenExpires: timestamp("reset_token_expires"),
  twoFactorSecret: text("two_factor_secret"),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// -- DEPARTAMENTOS --
export const departments = pgTable("departments", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  managerId: uuid("manager_id"),
  color: text("color").default("#6366f1"),
  icon: text("icon"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// -- PROYECTOS / AREAS DE TRABAJO --
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  code: text("code").unique(),
  status: text("status").notNull().default("pending"),
  priority: text("priority").default("medium"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  budget: decimal("budget", { precision: 15, scale: 2 }),
  departmentId: uuid("department_id"),
  managerId: uuid("manager_id"),
  clientId: uuid("client_id"),
  color: text("color").default("#6366f1"),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// -- CLIENTES --
export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  taxId: text("tax_id"),
  website: text("website"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// -- TAREAS --
export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("todo"),
  priority: text("priority").default("medium"),
  projectId: uuid("project_id"),
  parentTaskId: uuid("parent_task_id"),
  assignedTo: uuid("assigned_to"),
  createdBy: uuid("created_by").notNull(),
  startDate: date("start_date"),
  dueDate: date("due_date"),
  estimatedHours: integer("estimated_hours"),
  actualHours: integer("actual_hours"),
  completionPercentage: integer("completion_percentage").default(0),
  orderIndex: integer("order_index").default(0),
  isMilestone: boolean("is_milestone").notNull().default(false),
  color: text("color"),
  tags: jsonb("tags").default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// -- SUBTAREAS --
export const subtasks = pgTable("subtasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id").notNull(),
  title: text("title").notNull(),
  isCompleted: boolean("is_completed").notNull().default(false),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// -- COMENTARIOS DE TAREAS --
export const taskComments = pgTable("task_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id").notNull(),
  userId: uuid("user_id").notNull(),
  content: text("content").notNull(),
  mentions: jsonb("mentions").default([]),
  isEdited: boolean("is_edited").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// -- ARCHIVOS Y DOCUMENTOS --
export const files = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  originalName: text("original_name").notNull(),
  path: text("path").notNull(),
  url: text("url"),
  size: integer("size").notNull(),
  mimeType: text("mime_type").notNull(),
  extension: text("extension").notNull(),
  type: text("type").notNull().default("file"),
  category: text("category").default("general"),
  projectId: uuid("project_id"),
  taskId: uuid("task_id"),
  userId: uuid("user_id").notNull(),
  departmentId: uuid("department_id"),
  folderId: uuid("folder_id"),
  isPublic: boolean("is_public").notNull().default(false),
  isShared: boolean("is_shared").notNull().default(false),
  version: text("version").default("1.0"),
  tags: jsonb("tags").default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// -- CARPETAS --
export const folders = pgTable("folders", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  parentId: uuid("parent_id"),
  projectId: uuid("project_id"),
  departmentId: uuid("department_id"),
  userId: uuid("user_id"),
  color: text("color").default("#6366f1"),
  icon: text("icon"),
  isPublic: boolean("is_public").notNull().default(false),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// -- DOCUMENTOS (Estructurados) --
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  content: text("content"),
  type: text("type").notNull().default("document"),
  status: text("status").notNull().default("draft"),
  version: text("version").default("1.0"),
  authorId: uuid("author_id").notNull(),
  projectId: uuid("project_id"),
  departmentId: uuid("department_id"),
  folderId: uuid("folder_id"),
  templateId: uuid("template_id"),
  approvalRequired: boolean("approval_required").notNull().default(false),
  approvedBy: uuid("approved_by"),
  approvedAt: timestamp("approved_at"),
  effectiveDate: date("effective_date"),
  expiryDate: date("expiry_date"),
  tags: jsonb("tags").default([]),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// -- PLANTILLAS DE DOCUMENTOS --
export const documentTemplates = pgTable("document_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  content: text("content"),
  type: text("type").notNull(),
  category: text("category"),
  version: text("version").default("1.0"),
  createdBy: uuid("created_by").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// -- REUNIONES / EVENTOS DE CALENDARIO --
export const meetings = pgTable("meetings", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull().default("meeting"),
  status: text("status").notNull().default("scheduled"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  location: text("location"),
  isOnline: boolean("is_online").notNull().default(false),
  meetingLink: text("meeting_link"),
  projectId: uuid("project_id"),
  createdBy: uuid("created_by").notNull(),
  color: text("color").default("#6366f1"),
  isRecurring: boolean("is_recurring").notNull().default(false),
  recurrencePattern: text("recurrence_pattern"),
  recurrenceEndDate: date("recurrence_end_date"),
  reminders: jsonb("reminders").default([{ minutesBefore: 15 }, { minutesBefore: 60 }]),
  attendees: jsonb("attendees").default([]),
  agenda: jsonb("agenda").default([]),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// -- ASISTENTES A REUNIONES --
export const meetingAttendees = pgTable("meeting_attendees", {
  id: uuid("id").primaryKey().defaultRandom(),
  meetingId: uuid("meeting_id").notNull(),
  userId: uuid("user_id").notNull(),
  status: text("status").notNull().default("pending"),
  responseTime: timestamp("response_time"),
  notes: text("notes"),
});

// -- NOMINAS --
export const payrolls = pgTable("payrolls", {
  id: uuid("id").primaryKey().defaultRandom(),
  period: text("period").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: text("status").notNull().default("draft"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).default("0"),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).default("0"),
  netAmount: decimal("net_amount", { precision: 15, scale: 2 }).default("0"),
  departmentId: uuid("department_id"),
  createdBy: uuid("created_by").notNull(),
  processedBy: uuid("processed_by"),
  processedAt: timestamp("processed_at"),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// -- DETALLES DE NOMINA (por empleado) --
export const payrollDetails = pgTable("payroll_details", {
  id: uuid("id").primaryKey().defaultRandom(),
  payrollId: uuid("payroll_id").notNull(),
  userId: uuid("user_id").notNull(),
  baseSalary: decimal("base_salary", { precision: 12, scale: 2 }).default("0"),
  overtimeHours: decimal("overtime_hours", { precision: 6, scale: 2 }).default("0"),
  overtimeRate: decimal("overtime_rate", { precision: 10, scale: 2 }).default("0"),
  overtimeAmount: decimal("overtime_amount", { precision: 12, scale: 2 }).default("0"),
  bonusAmount: decimal("bonus_amount", { precision: 12, scale: 2 }).default("0"),
  deductionAmount: decimal("deduction_amount", { precision: 12, scale: 2 }).default("0"),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).default("0"),
  socialSecurity: decimal("social_security", { precision: 12, scale: 2 }).default("0"),
  netAmount: decimal("net_amount", { precision: 12, scale: 2 }).default("0"),
  paymentMethod: text("payment_method"),
  bankAccount: text("bank_account"),
  paymentStatus: text("payment_status").default("pending"),
  paymentDate: date("payment_date"),
  notes: text("notes"),
});

// -- CONCEPTOS DE NOMINA --
export const payrollConcepts = pgTable("payroll_concepts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  type: text("type").notNull(),
  calculationType: text("calculation_type").notNull().default("fixed"),
  value: decimal("value", { precision: 12, scale: 2 }).default("0"),
  percentage: decimal("percentage", { precision: 5, scale: 2 }),
  isTaxable: boolean("is_taxable").notNull().default(true),
  isSocialSecurity: boolean("is_social_security").notNull().default(false),
  orderIndex: integer("order_index").default(0),
  isActive: boolean("is_active").notNull().default(true),
  description: text("description"),
});

// -- ASISTENCIA / REGISTRO DE HORAS --
export const attendances = pgTable("attendances", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  date: date("date").notNull(),
  clockIn: timestamp("clock_in"),
  clockOut: timestamp("clock_out"),
  breakStart: timestamp("break_start"),
  breakEnd: timestamp("break_end"),
  totalHours: decimal("total_hours", { precision: 6, scale: 2 }).default("0"),
  overtimeHours: decimal("overtime_hours", { precision: 6, scale: 2 }).default("0"),
  status: text("status").notNull().default("present"),
  notes: text("notes"),
  location: text("location"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// -- VACACIONES / AUSENCIAS --
export const leaves = pgTable("leaves", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  type: text("type").notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("pending"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  halfDayStart: boolean("half_day_start").notNull().default(false),
  halfDayEnd: boolean("half_day_end").notNull().default(false),
  totalDays: decimal("total_days", { precision: 5, scale: 2 }).default("0"),
  approvedBy: uuid("approved_by"),
  approvedAt: timestamp("approved_at"),
  rejectedReason: text("rejected_reason"),
  documents: jsonb("documents").default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// -- GASTOS --
export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  projectId: uuid("project_id"),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("MXN"),
  receiptNumber: text("receipt_number"),
  receiptFile: text("receipt_file"),
  expenseDate: date("expense_date").notNull(),
  status: text("status").notNull().default("pending"),
  approvedBy: uuid("approved_by"),
  approvedAt: timestamp("approved_at"),
  reimbursedAt: timestamp("reimbursed_at"),
  paymentMethod: text("payment_method"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// -- FACTURAS --
export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  clientId: uuid("client_id").notNull(),
  projectId: uuid("project_id"),
  type: text("type").notNull().default("invoice"),
  status: text("status").notNull().default("draft"),
  issueDate: date("issue_date").notNull(),
  dueDate: date("due_date").notNull(),
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).default("0"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("0"),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).default("0"),
  total: decimal("total", { precision: 15, scale: 2 }).default("0"),
  paidAmount: decimal("paid_amount", { precision: 15, scale: 2 }).default("0"),
  currency: text("currency").notNull().default("MXN"),
  paymentTerms: text("payment_terms"),
  paymentMethod: text("payment_method"),
  notes: text("notes"),
  createdBy: uuid("created_by").notNull(),
  sentAt: timestamp("sent_at"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// -- ITEMS DE FACTURA --
export const invoiceItems = pgTable("invoice_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id").notNull(),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("0"),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).default("0"),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  orderIndex: integer("order_index").default(0),
});

// -- NOTIFICACIONES --
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"),
  entityType: text("entity_type"),
  entityId: uuid("entity_id"),
  fromUserId: uuid("from_user_id"),
  isRead: boolean("is_read").notNull().default(false),
  isArchived: boolean("is_archived").notNull().default(false),
  actionUrl: text("action_url"),
  icon: text("icon"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// -- ACTIVIDAD / AUDITORIA --
export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// -- CONFIGURACION DE LA EMPRESA --
export const companySettings = pgTable("company_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyName: text("company_name").notNull().default("TerLux Coop"),
  companyEmail: text("company_email"),
  companyPhone: text("company_phone"),
  companyAddress: text("company_address"),
  companyTaxId: text("company_tax_id"),
  companyWebsite: text("company_website"),
  logo: text("logo"),
  favicon: text("favicon"),
  currency: text("currency").notNull().default("MXN"),
  dateFormat: text("date_format").notNull().default("DD/MM/YYYY"),
  timeFormat: text("time_format").notNull().default("24h"),
  timezone: text("timezone").notNull().default("Europe/Madrid"),
  language: text("language").notNull().default("es"),
  workHoursStart: text("work_hours_start").notNull().default("09:00"),
  workHoursEnd: text("work_hours_end").notNull().default("18:00"),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// -- PERMISOS --
export const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  code: text("code").notNull().unique(),
  description: text("description"),
  category: text("category"),
  isActive: boolean("is_active").notNull().default(true),
});

// -- ROLES --
export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isDefault: boolean("is_default").notNull().default(false),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// -- PERMISOS POR ROL --
export const rolePermissions = pgTable("role_permissions", {
  roleId: uuid("role_id").notNull(),
  permissionId: uuid("permission_id").notNull(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
  };
});

// -- PERMISOS POR USUARIO --
export const userPermissions = pgTable("user_permissions", {
  userId: uuid("user_id").notNull(),
  permissionId: uuid("permission_id").notNull(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.permissionId] }),
  };
});

// ============================================
// RELACIONES
// ============================================

// Relaciones de usuarios
export const usersRelations = relations(users, ({ many, one }) => ({
  department: one(departments, { fields: [users.departmentId], references: [departments.id] }),
  projectsManaged: many(projects, { relationName: "managed_projects" }),
  tasksAssigned: many(tasks, { relationName: "assigned_tasks" }),
  tasksCreated: many(tasks, { relationName: "created_tasks" }),
  meetingsCreated: many(meetings, { relationName: "created_meetings" }),
  meetingAttendees: many(meetingAttendees),
  files: many(files),
  documents: many(documents),
  payrollDetails: many(payrollDetails),
  attendances: many(attendances),
  leaves: many(leaves),
  expenses: many(expenses),
  notifications: many(notifications),
  activities: many(activities),
  role: one(roles, { fields: [users.role], references: [roles.name] }),
}));

// Relaciones de departamentos
export const departmentsRelations = relations(departments, ({ many, one }) => ({
  manager: one(users, { fields: [departments.managerId], references: [users.id] }),
  users: many(users),
  projects: many(projects),
  files: many(files),
  documents: many(documents),
  payrolls: many(payrolls),
  folders: many(folders),
}));

// Relaciones de proyectos
export const projectsRelations = relations(projects, ({ many, one }) => ({
  department: one(departments, { fields: [projects.departmentId], references: [departments.id] }),
  manager: one(users, { fields: [projects.managerId], references: [users.id], relationName: "managed_projects" }),
  client: one(clients, { fields: [projects.clientId], references: [clients.id] }),
  tasks: many(tasks),
  files: many(files),
  documents: many(documents),
  meetings: many(meetings),
  invoices: many(invoices),
  folders: many(folders),
}));

// Relaciones de tareas
export const tasksRelations = relations(tasks, ({ many, one }) => ({
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  parentTask: one(tasks, { fields: [tasks.parentTaskId], references: [tasks.id], relationName: "parent" }),
  subtasks: many(tasks, { relationName: "parent" }),
  assignedToUser: one(users, { fields: [tasks.assignedTo], references: [users.id], relationName: "assigned_tasks" }),
  createdByUser: one(users, { fields: [tasks.createdBy], references: [users.id], relationName: "created_tasks" }),
  subtasksList: many(subtasks),
  comments: many(taskComments),
  files: many(files),
}));

// Relaciones de subtareas
export const subtasksRelations = relations(subtasks, ({ one }) => ({
  task: one(tasks, { fields: [subtasks.taskId], references: [tasks.id] }),
}));

// Relaciones de comentarios de tareas
export const taskCommentsRelations = relations(taskComments, ({ one }) => ({
  task: one(tasks, { fields: [taskComments.taskId], references: [tasks.id] }),
  user: one(users, { fields: [taskComments.userId], references: [users.id] }),
}));

// Relaciones de archivos
export const filesRelations = relations(files, ({ one }) => ({
  project: one(projects, { fields: [files.projectId], references: [projects.id] }),
  task: one(tasks, { fields: [files.taskId], references: [tasks.id] }),
  user: one(users, { fields: [files.userId], references: [users.id] }),
  department: one(departments, { fields: [files.departmentId], references: [departments.id] }),
  folder: one(folders, { fields: [files.folderId], references: [folders.id] }),
}));

// Relaciones de carpetas
export const foldersRelations = relations(folders, ({ many, one }) => ({
  parent: one(folders, { fields: [folders.parentId], references: [folders.id], relationName: "parent_folder" }),
  subfolders: many(folders, { relationName: "parent_folder" }),
  project: one(projects, { fields: [folders.projectId], references: [projects.id] }),
  department: one(departments, { fields: [folders.departmentId], references: [departments.id] }),
  user: one(users, { fields: [folders.userId], references: [users.id] }),
  files: many(files),
  documents: many(documents),
}));

// Relaciones de documentos
export const documentsRelations = relations(documents, ({ one }) => ({
  author: one(users, { fields: [documents.authorId], references: [users.id] }),
  project: one(projects, { fields: [documents.projectId], references: [projects.id] }),
  department: one(departments, { fields: [documents.departmentId], references: [departments.id] }),
  folder: one(folders, { fields: [documents.folderId], references: [folders.id] }),
  template: one(documentTemplates, { fields: [documents.templateId], references: [documentTemplates.id] }),
  approvedByUser: one(users, { fields: [documents.approvedBy], references: [users.id] }),
}));

// Relaciones de plantillas de documentos
export const documentTemplatesRelations = relations(documentTemplates, ({ many, one }) => ({
  createdByUser: one(users, { fields: [documentTemplates.createdBy], references: [users.id] }),
  documents: many(documents),
}));

// Relaciones de reuniones
export const meetingsRelations = relations(meetings, ({ many, one }) => ({
  project: one(projects, { fields: [meetings.projectId], references: [projects.id] }),
  createdByUser: one(users, { fields: [meetings.createdBy], references: [users.id], relationName: "created_meetings" }),
  attendees: many(meetingAttendees),
}));

// Relaciones de asistentes a reuniones
export const meetingAttendeesRelations = relations(meetingAttendees, ({ one }) => ({
  meeting: one(meetings, { fields: [meetingAttendees.meetingId], references: [meetings.id] }),
  user: one(users, { fields: [meetingAttendees.userId], references: [users.id] }),
}));

// Relaciones de nominas
export const payrollsRelations = relations(payrolls, ({ many, one }) => ({
  department: one(departments, { fields: [payrolls.departmentId], references: [departments.id] }),
  createdByUser: one(users, { fields: [payrolls.createdBy], references: [users.id] }),
  processedByUser: one(users, { fields: [payrolls.processedBy], references: [users.id] }),
  details: many(payrollDetails),
}));

// Relaciones de detalles de nomina
export const payrollDetailsRelations = relations(payrollDetails, ({ one }) => ({
  payroll: one(payrolls, { fields: [payrollDetails.payrollId], references: [payrolls.id] }),
  user: one(users, { fields: [payrollDetails.userId], references: [users.id] }),
}));

// Relaciones de conceptos de nomina
export const payrollConceptsRelations = relations(payrollConcepts, ({ many }) => ({
  payrollDetails: many(payrollDetails),
}));

// Relaciones de asistencia
export const attendancesRelations = relations(attendances, ({ one }) => ({
  user: one(users, { fields: [attendances.userId], references: [users.id] }),
}));

// Relaciones de vacaciones
export const leavesRelations = relations(leaves, ({ one }) => ({
  user: one(users, { fields: [leaves.userId], references: [users.id] }),
  approvedByUser: one(users, { fields: [leaves.approvedBy], references: [users.id] }),
}));

// Relaciones de gastos
export const expensesRelations = relations(expenses, ({ one }) => ({
  user: one(users, { fields: [expenses.userId], references: [users.id] }),
  project: one(projects, { fields: [expenses.projectId], references: [projects.id] }),
  approvedByUser: one(users, { fields: [expenses.approvedBy], references: [users.id] }),
}));

// Relaciones de facturas
export const invoicesRelations = relations(invoices, ({ many, one }) => ({
  client: one(clients, { fields: [invoices.clientId], references: [clients.id] }),
  project: one(projects, { fields: [invoices.projectId], references: [projects.id] }),
  createdByUser: one(users, { fields: [invoices.createdBy], references: [users.id] }),
  items: many(invoiceItems),
}));

// Relaciones de items de factura
export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceItems.invoiceId], references: [invoices.id] }),
}));

// Relaciones de notificaciones
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
  fromUser: one(users, { fields: [notifications.fromUserId], references: [users.id] }),
}));

// Relaciones de actividades
export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, { fields: [activities.userId], references: [users.id] }),
}));

// Relaciones de clientes
export const clientsRelations = relations(clients, ({ many }) => ({
  projects: many(projects),
  invoices: many(invoices),
}));

// Relaciones de roles
export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
  permissions: many(rolePermissions),
}));

// Relaciones de permisos
export const permissionsRelations = relations(permissions, ({ many }) => ({
  roles: many(rolePermissions),
  users: many(userPermissions),
}));

// Relaciones de permisos por rol
export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, { fields: [rolePermissions.permissionId], references: [permissions.id] }),
}));

// Relaciones de permisos por usuario
export const userPermissionsRelations = relations(userPermissions, ({ one }) => ({
  user: one(users, { fields: [userPermissions.userId], references: [users.id] }),
  permission: one(permissions, { fields: [userPermissions.permissionId], references: [permissions.id] }),
}));

// ============================================
// MODULO MDM: GESTIÓN DE DISPOSITIVOS/MÁQUINAS
// ============================================

export const devices = pgTable("devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  serialNumber: text("serial_number").unique(),
  name: text("name").notNull(),
  type: text("type").notNull(), // laptop, desktop, mobile, tablet, server, printer
  brand: text("brand"),
  model: text("model"),
  os: text("os"),
  osVersion: text("os_version"),
  ipAddress: text("ip_address"),
  macAddress: text("mac_address"),
  status: text("status").notNull().default("available"), // available, assigned, maintenance, retired
  purchaseDate: date("purchase_date"),
  warrantyExpiry: date("warranty_expiry"),
  cost: decimal("cost", { precision: 12, scale: 2 }),
  assignedTo: uuid("assigned_to"), // user_id
  departmentId: uuid("department_id"),
  location: text("location"),
  notes: text("notes"),
  specifications: jsonb("specifications").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const deviceAssignments = pgTable("device_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  deviceId: uuid("device_id").notNull(),
  userId: uuid("user_id").notNull(),
  assignedBy: uuid("assigned_by").notNull(),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  returnedAt: timestamp("returned_at"),
  condition: text("condition").default("good"), // good, fair, damaged
  notes: text("notes"),
});

// ============================================
// MODULO JOB QUEUE: COLAS DE TRABAJO
// ============================================

export const jobQueues = pgTable("job_queues", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull().default("standard"), // standard, priority, batch
  concurrency: integer("concurrency").default(5),
  maxRetries: integer("max_retries").default(3),
  retryDelay: integer("retry_delay").default(60), // seconds
  timeout: integer("timeout").default(300), // seconds
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  queueId: uuid("queue_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // email, report, import, export, sync, custom
  payload: jsonb("payload").default({}),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed, cancelled
  priority: integer("priority").default(0),
  attempts: integer("attempts").default(0),
  maxAttempts: integer("max_attempts").default(3),
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  failedAt: timestamp("failed_at"),
  result: jsonb("result"),
  error: text("error"),
  progress: integer("progress").default(0), // 0-100
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const jobLogs = pgTable("job_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id").notNull(),
  level: text("level").notNull().default("info"), // info, warning, error, debug
  message: text("message").notNull(),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============================================
// MODULO CHAT MEJORADO: CANALES, MENCIONES, REACCIONES
// ============================================

export const channels = pgTable("channels", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  type: text("type").notNull().default("public"), // public, private, direct
  createdBy: uuid("created_by"),
  isArchived: boolean("is_archived").notNull().default(false),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const channelMembers = pgTable("channel_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  channelId: uuid("channel_id").notNull(),
  userId: uuid("user_id").notNull(),
  role: text("role").default("member"), // owner, admin, member
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  lastReadAt: timestamp("last_read_at"),
});

export const messageReactions = pgTable("message_reactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: uuid("message_id").notNull(),
  userId: uuid("user_id").notNull(),
  emoji: text("emoji").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messageMentions = pgTable("message_mentions", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: uuid("message_id").notNull(),
  userId: uuid("user_id").notNull(),
  type: text("type").notNull().default("user"), // user, channel, everyone
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const threads = pgTable("threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  parentMessageId: uuid("parent_message_id").notNull(),
  channelId: uuid("channel_id").notNull(),
  createdBy: uuid("created_by").notNull(),
  lastReplyAt: timestamp("last_reply_at"),
  replyCount: integer("reply_count").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============================================
// MODULO RRHH MEJORADO
// ============================================

export const employeeDocuments = pgTable("employee_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  type: text("type").notNull(), // contract, id, certificate, other
  name: text("name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  expiresAt: date("expires_at"),
  uploadedBy: uuid("uploaded_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const performanceReviews = pgTable("performance_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  reviewerId: uuid("reviewer_id").notNull(),
  period: text("period").notNull(), // Q1-2024, Annual-2024, etc
  rating: integer("rating"), // 1-5
  strengths: text("strengths"),
  improvements: text("improvements"),
  goals: jsonb("goals").default([]),
  status: text("status").notNull().default("draft"), // draft, submitted, completed
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const timeOffRequests = pgTable("time_off_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  type: text("type").notNull(), // vacation, sick, personal, other
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  days: decimal("days", { precision: 5, scale: 2 }).notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("pending"), // pending, approved, rejected, cancelled
  approvedBy: uuid("approved_by"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============================================
// MODULO COMERCIAL: PRODUCTOS, PEDIDOS, PAGOS
// ============================================

export const productCategories = pgTable("product_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  descriptionEn: text("description_en"),
  icon: text("icon"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  slug: text("slug").notNull(),
  description: text("description"),
  descriptionEn: text("description_en"),
  longDescription: text("long_description"),
  longDescriptionEn: text("long_description_en"),
  categoryId: uuid("category_id"),
  type: text("type").notNull().default("service"), // service, plan, product, pack, hosting
  price: decimal("price", { precision: 12, scale: 2 }).notNull().default("0"),
  compareAtPrice: decimal("compare_at_price", { precision: 12, scale: 2 }),
  recurringPeriod: text("recurring_period"), // monthly, yearly, one_time
  image: text("image"),
  features: jsonb("features").default([]),
  featuresEn: jsonb("features_en").default([]),
  stock: integer("stock").default(-1), // -1 = ilimitado (servicios)
  isActive: boolean("is_active").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const cartItems = pgTable("cart_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  productId: uuid("product_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNumber: text("order_number").notNull().unique(),
  userId: uuid("user_id").notNull(),
  status: text("status").notNull().default("pending"), // pending, paid, processing, completed, cancelled, refunded
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).default("0"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("21"),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).default("0"),
  total: decimal("total", { precision: 15, scale: 2 }).default("0"),
  currency: text("currency").notNull().default("MXN"),
  billingName: text("billing_name"),
  billingTaxId: text("billing_tax_id"),
  billingAddress: jsonb("billing_address").default({}),
  paymentMethodId: uuid("payment_method_id"),
  paymentProvider: text("payment_provider"), // stripe, redsys, paypal, bizum, transfer
  paymentReference: text("payment_reference"),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull(),
  productId: uuid("product_id"),
  name: text("name").notNull(),
  sku: text("sku"),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
});

export const paymentMethods = pgTable("payment_methods", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  type: text("type").notNull(), // card, paypal, bizum, transfer, sepa
  brand: text("brand"), // visa, mastercard, amex
  holderName: text("holder_name"),
  last4: text("last4"),
  expiryMonth: text("expiry_month"),
  expiryYear: text("expiry_year"),
  email: text("email"), // paypal/bizum
  iban: text("iban"), // sepa (ultimos caracteres)
  tokenReference: text("token_reference"), // token del TPV, nunca el numero completo
  isDefault: boolean("is_default").notNull().default(false),
  isVerified: boolean("is_verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  reference: text("reference").notNull().unique(),
  orderId: uuid("order_id"),
  userId: uuid("user_id").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("MXN"),
  provider: text("provider").notNull().default("card"),
  status: text("status").notNull().default("pending"), // pending, authorized, captured, failed, refunded
  providerResponse: jsonb("provider_response").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============================================
// CUENTAS DE TARJETA (simulador de crédito)
// 1:1 con payment_methods: cada tarjeta tiene su
// propia línea de crédito y saldo (puede quedar
// en números rojos = deuda). Ledger en card_transactions.
// ============================================

export const cardAccounts = pgTable("card_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentMethodId: uuid("payment_method_id").notNull().unique(),
  userId: uuid("user_id").notNull(),
  creditLimit: decimal("credit_limit", { precision: 15, scale: 2 }).notNull().default("10000"),
  balance: decimal("balance", { precision: 15, scale: 2 }).notNull().default("0"), // puede ser negativo (deuda)
  currency: text("currency").notNull().default("MXN"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const cardTransactions = pgTable("card_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  cardAccountId: uuid("card_account_id").notNull(),
  userId: uuid("user_id").notNull(),
  type: text("type").notNull(), // charge, refund, adjustment
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  balanceBefore: decimal("balance_before", { precision: 15, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 15, scale: 2 }).notNull(),
  description: text("description").default(""),
  reference: text("reference").default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============================================
// CUOTAS DE ALMACENAMIENTO (drive)
// 1:1 con users; max_bytes por defecto (100 MB).
// El uso se calcula sumando el size de los archivos.
// ============================================

export const storageQuotas = pgTable("storage_quotas", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique(),
  maxBytes: bigint("max_bytes", { mode: "number" }).notNull().default(100 * 1024 * 1024),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============================================
// MODULO MENSAJERIA: CORREO, CHAT, SOPORTE
// ============================================

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull().default("direct"), // direct, group, project
  name: text("name"),
  projectId: uuid("project_id"),
  createdBy: uuid("created_by"),
  isArchived: boolean("is_archived").notNull().default(false),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const conversationParticipants = pgTable("conversation_participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull(),
  userId: uuid("user_id").notNull(),
  role: text("role").default("member"), // owner, admin, member
  lastReadAt: timestamp("last_read_at"),
  mutedUntil: timestamp("muted_until"),
});

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull(),
  senderId: uuid("sender_id").notNull(),
  body: text("body").notNull(),
  attachmentFileId: uuid("attachment_file_id"),
  replyToId: uuid("reply_to_id"),
  isEdited: boolean("is_edited").notNull().default(false),
  readBy: jsonb("read_by").default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const mailMessages = pgTable("mail_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  folder: text("folder").notNull().default("inbox"), // inbox, sent, drafts, trash, spam, archive
  ownerId: uuid("owner_id").notNull(),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name"),
  toRecipients: jsonb("to_recipients").default([]),
  ccRecipients: jsonb("cc_recipients").default([]),
  bccRecipients: jsonb("bcc_recipients").default([]),
  subject: text("subject").notNull(),
  body: text("body"),
  bodyHtml: text("body_html"),
  isRead: boolean("is_read").notNull().default(false),
  isStarred: boolean("is_starred").notNull().default(false),
  isImportant: boolean("is_important").notNull().default(false),
  hasAttachments: boolean("has_attachments").notNull().default(false),
  attachments: jsonb("attachments").default([]),
  labels: jsonb("labels").default([]),
  threadId: text("thread_id"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const supportTickets = pgTable("support_tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketNumber: integer("ticket_number").notNull().generatedAlwaysAsIdentity(),
  subject: text("subject").notNull(),
  category: text("category").notNull().default("general"), // general, technical, billing, sales, hr
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("open"), // open, waiting, resolved, closed
  requesterId: uuid("requester_id").notNull(),
  assigneeId: uuid("assignee_id"),
  satisfactionRating: integer("satisfaction_rating"),
  resolution: text("resolution"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const ticketMessages = pgTable("ticket_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketId: uuid("ticket_id").notNull(),
  senderId: uuid("sender_id").notNull(),
  body: text("body").notNull(),
  isInternalNote: boolean("is_internal_note").notNull().default(false),
  attachmentFileId: uuid("attachment_file_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============================================
// HOJAS DE VIDA (CV) DE EMPLEADOS
// ============================================

export const employeeCvs = pgTable("employee_cvs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique(),
  title: text("title"),
  summary: text("summary"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  country: text("country"),
  website: text("website"),
  linkedin: text("linkedin"),
  experience: jsonb("experience").default([]),
  education: jsonb("education").default([]),
  skills: jsonb("skills").default([]),
  languages: jsonb("languages").default([]),
  certifications: jsonb("certifications").default([]),
  isPublic: boolean("is_public").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============================================
// INTEGRACIONES: BASE DE DATOS, ALMACENAMIENTO, CORREO, VPN
// ============================================

export const integrations = pgTable("integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: text("type").notNull(), // database, storage, mail, vpn, sso, desktop, webhook
  protocol: text("protocol"), // postgres, mysql, mssql, smtp, imap, s3, smb, ftp, wireguard, openvpn
  host: text("host"), // IP o hostname (ej: 100.106.108.98)
  port: integer("port"),
  username: text("username"),
  secret: text("secret"), // contraseña / token (solo servidor, nunca exponer al cliente)
  databaseName: text("database_name"),
  bucket: text("bucket"),
  vpnNetwork: text("vpn_network"), // ej: 100.64.0.0/10
  config: jsonb("config").default({}),
  status: text("status").notNull().default("disconnected"), // connected, disconnected, error
  autoConnect: boolean("auto_connect").notNull().default(true),
  lastTestedAt: timestamp("last_tested_at"),
  lastTestResult: text("last_test_result"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const connectedClients = pgTable("connected_clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: text("client_id").notNull().unique(),
  deviceName: text("device_name"),
  platform: text("platform"), // windows, macos, linux, android, ios
  appVersion: text("app_version"),
  userId: uuid("user_id"),
  ipAddress: text("ip_address"),
  vpnIp: text("vpn_ip"),
  status: text("status").notNull().default("offline"), // online, offline, blocked
  userAgent: text("user_agent"),
  socketId: text("socket_id"),
  metadata: jsonb("metadata").default({}),
  connectedAt: timestamp("connected_at"),
  lastSeenAt: timestamp("last_seen_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const storageBuckets = pgTable("storage_buckets", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  integrationId: uuid("integration_id"),
  path: text("path"),
  quotaBytes: bigint("quota_bytes", { mode: "number" }).default(0),
  usedBytes: bigint("used_bytes", { mode: "number" }).default(0),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Registro de retransmisiones / sockets (para auditoria de app escritorio)
export const socketEvents = pgTable("socket_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: text("client_id"),
  channel: text("channel").notNull(),
  event: text("event").notNull(),
  payload: jsonb("payload").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// -- WALLET / CRÉDITOS (saldo por usuario, PoC: tester con saldo) --
export const userWallets = pgTable("user_wallets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique(),
  balance: decimal("balance", { precision: 14, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("MXN"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const walletTransactions = pgTable("wallet_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  walletId: uuid("wallet_id").notNull(),
  userId: uuid("user_id").notNull(),
  type: text("type").notNull(), // credit | debit
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  reference: text("reference"),
  description: text("description"),
  createdBy: uuid("created_by"),
  balanceAfter: decimal("balance_after", { precision: 14, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// -- MENÚS POR ROL (admin/TIC activa o desactiva ítems del menú) --
export const menuToggles = pgTable("menu_toggles", {
  id: uuid("id").primaryKey().defaultRandom(),
  role: text("role").notNull(),
  item: text("item").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  updatedBy: uuid("updated_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Exportar todas las tablas
export const schema = {
  users,
  departments,
  projects,
  clients,
  tasks,
  subtasks,
  taskComments,
  files,
  folders,
  documents,
  documentTemplates,
  meetings,
  meetingAttendees,
  payrolls,
  payrollDetails,
  payrollConcepts,
  attendances,
  leaves,
  expenses,
  invoices,
  invoiceItems,
  notifications,
  activities,
  companySettings,
  permissions,
  roles,
  rolePermissions,
  userPermissions,
  // MDM
  devices,
  deviceAssignments,
  // Job Queue
  jobQueues,
  jobs,
  jobLogs,
  // Chat mejorado
  channels,
  channelMembers,
  messageReactions,
  messageMentions,
  threads,
  // RRHH mejorado
  employeeDocuments,
  performanceReviews,
  timeOffRequests,
  // Comercial
  productCategories,
  products,
  cartItems,
  orders,
  orderItems,
  paymentMethods,
  payments,
  // Mensajería
  conversations,
  conversationParticipants,
  chatMessages,
  mailMessages,
  supportTickets,
  ticketMessages,
  // CV
  employeeCvs,
  // Integraciones / VPN / sockets
  integrations,
  connectedClients,
  storageBuckets,
  socketEvents,
  // Wallet / créditos
  userWallets,
  walletTransactions,
  // Cuentas de tarjeta (simulador de crédito)
  cardAccounts,
  cardTransactions,
  // Cuotas de almacenamiento (drive)
  storageQuotas,
  // Menús por rol
  menuToggles,
};

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
export type Meeting = typeof meetings.$inferSelect;
export type NewMeeting = typeof meetings.$inferInsert;
export type Payroll = typeof payrolls.$inferSelect;
export type NewPayroll = typeof payrolls.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type Attendance = typeof attendances.$inferSelect;
export type NewAttendance = typeof attendances.$inferInsert;
export type Leave = typeof leaves.$inferSelect;
export type NewLeave = typeof leaves.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
