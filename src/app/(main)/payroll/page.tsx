// ============================================
// TERLUX COOP - GESTION DE NOMINAS
// ============================================

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  CreditCard,
  Plus,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Users,
  Calendar,
  FileText,
  X,
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useT } from "@/i18n";

// Tipos
interface EmployeePayroll {
  id: string;
  name: string;
  position: string;
  department: string;
  baseSalary: number;
  overtime: number;
  bonuses: number;
  deductions: number;
  netSalary: number;
  paymentStatus: "paid" | "pending" | "failed";
  paymentDate: string | null;
  paymentMethod: string;
}

interface Payroll {
  id: string;
  period: string;
  month: number;
  year: number;
  startDate: string;
  endDate: string;
  status: "draft" | "processed" | "paid" | "cancelled";
  totalAmount: number;
  taxAmount: number;
  netAmount: number;
  createdAt: string;
  processedAt: string | null;
  paidAt: string | null;
  employees: EmployeePayroll[];
}


const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// Componente PayrollCard
function PayrollCard({ payroll, onSelect }: { payroll: Payroll; onSelect?: () => void }) {
  const t = useT();
  const statusColors = {
    draft: "#6b7280",
    processed: "#3b82f6",
    paid: "#10b981",
    cancelled: "#ef4444",
  };
  
  const statusLabels = {
    draft: "Borrador",
    processed: "Procesado",
    paid: "Pagado",
    cancelled: "Cancelado",
  };

  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  return (
    <div
      onClick={onSelect}
      className="glass-card group p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: statusColors[payroll.status] }}
            />
            <h3 className="font-medium text-foreground">
              {t("Nómina")} {t(months[payroll.month])} {payroll.year}
            </h3>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: statusColors[payroll.status] + "20",
                color: statusColors[payroll.status],
              }}
            >
              {t(statusLabels[payroll.status])}
            </span>
          </div>
          
          <p className="text-sm text-muted-foreground mb-3">
            {t("Período:")} {formatDate(payroll.startDate)} - {formatDate(payroll.endDate)}
          </p>
          
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">{t("Total Bruto")}</p>
              <p className="text-lg font-bold text-foreground">
                {formatCurrency(payroll.totalAmount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">{t("Total Neto")}</p>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(payroll.netAmount)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {payroll.employees.length} {t("empleados")}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {formatDate(payroll.createdAt)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente EmployeePayrollRow
function EmployeePayrollRow({ employee }: { employee: EmployeePayroll }) {
  const t = useT();
  const statusColors = {
    paid: "#10b981",
    pending: "#f59e0b",
    failed: "#ef4444",
  };

  const statusLabels = {
    paid: "Pagado",
    pending: "Pendiente",
    failed: "Fallido",
  };

  return (
    <tr className="hover:bg-muted/50 transition-colors">
      <td className="px-4 py-3 text-sm text-foreground">{employee.name}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{employee.position}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{employee.department}</td>
      <td className="px-4 py-3 text-sm text-foreground">
        {formatCurrency(employee.baseSalary)}
      </td>
      <td className="px-4 py-3 text-sm text-foreground">
        {formatCurrency(employee.overtime)}
      </td>
      <td className="px-4 py-3 text-sm text-foreground">
        {formatCurrency(employee.bonuses)}
      </td>
      <td className="px-4 py-3 text-sm text-foreground">
        {formatCurrency(employee.deductions)}
      </td>
      <td className="px-4 py-3 text-sm font-medium text-foreground">
        {formatCurrency(employee.netSalary)}
      </td>
      <td className="px-4 py-3">
        <span
          className="px-2 py-0.5 rounded-full text-xs font-medium"
          style={{
            backgroundColor: statusColors[employee.paymentStatus] + "20",
            color: statusColors[employee.paymentStatus],
          }}
        >
          {t(statusLabels[employee.paymentStatus])}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {employee.paymentDate ? formatDate(employee.paymentDate) : "-"}
      </td>
    </tr>
  );
}

// Componente PayrollDetail
function PayrollDetail({ payroll }: { payroll: Payroll }) {
  const t = useT();
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  return (
    <div className="space-y-6">
      <div className="glass-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            {t("Nómina")} {t(months[payroll.month])} {payroll.year}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-muted/50 rounded">
            <p className="text-sm text-muted-foreground mb-1">{t("Total Bruto")}</p>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(payroll.totalAmount)}
            </p>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded">
            <p className="text-sm text-muted-foreground mb-1">{t("Impuestos")}</p>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(payroll.taxAmount)}
            </p>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded">
            <p className="text-sm text-muted-foreground mb-1">{t("Total Neto")}</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(payroll.netAmount)}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/20">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("Empleado")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("Puesto")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("Departamento")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("Salario Base")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("Horas Extra")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("Bonos")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("Deducciones")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("Salario Neto")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("Estado")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("Fecha Pago")}
                </th>
              </tr>
            </thead>
            <tbody>
              {payroll.employees.map((employee) => (
                <EmployeePayrollRow key={employee.id} employee={employee} />
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border/20">
                <td colSpan={3} className="px-4 py-3 text-sm font-medium text-foreground">
                  {t("Totales")}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-foreground">
                  {formatCurrency(
                    payroll.employees.reduce(
                      (sum, e) => sum + e.baseSalary,
                      0
                    )
                  )}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-foreground">
                  {formatCurrency(
                    payroll.employees.reduce((sum, e) => sum + e.overtime, 0)
                  )}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-foreground">
                  {formatCurrency(
                    payroll.employees.reduce((sum, e) => sum + e.bonuses, 0)
                  )}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-foreground">
                  {formatCurrency(
                    payroll.employees.reduce((sum, e) => sum + e.deductions, 0)
                  )}
                </td>
                <td className="px-4 py-3 text-sm font-bold text-foreground">
                  {formatCurrency(
                    payroll.employees.reduce((sum, e) => sum + e.netSalary, 0)
                  )}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// Página principal de nóminas
export default function PayrollPage() {
  const t = useT();
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/payrolls");
      const d = await res.json();
      if (d.success) setPayrolls(d.data);
    } catch { /* sin cambios */ }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [showNewModal, setShowNewModal] = useState(false);
  const [newMonth, setNewMonth] = useState(() => new Date().getMonth() + 1);
  const [newYear, setNewYear] = useState(() => new Date().getFullYear());
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const createPayroll = async () => {
    setCreating(true);
    setFormError(null);
    try {
      const res = await fetch("/api/payrolls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: newMonth, year: newYear }),
      });
      const d = await res.json();
      if (!d.success) {
        setFormError(d.error?.message ?? t("No se pudo generar la nómina."));
        return;
      }
      setShowNewModal(false);
      await refresh();
    } catch {
      setFormError(t("Error de conexión al generar la nómina."));
    } finally {
      setCreating(false);
    }
  };

  const exportCsv = () => {
    const rows = [
      [t("Periodo"), t("Mes"), t("Año"), "Status", t("Total Bruto"), t("Impuestos"), t("Total Neto"), t("Empleados")],
      ...filtered.map((p) => [
        p.period, p.month, p.year, p.status,
        p.totalAmount.toFixed(2), p.taxAmount.toFixed(2), p.netAmount.toFixed(2), p.employees.length,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nominas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const availableMonths = useMemo(() => {
    const set = new Set(payrolls.map((p) => `${p.month}-${p.year}`));
    return Array.from(set).sort((a, b) => {
      const [am, ay] = a.split("-").map(Number);
      const [bm, by] = b.split("-").map(Number);
      return by - ay || bm - am;
    });
  }, [payrolls]);

  const filtered = useMemo(() => {
    return payrolls.filter((p) => {
      if (search && !`${p.period} ${p.month} ${p.year}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (monthFilter !== "all" && `${p.month}-${p.year}` !== monthFilter) return false;
      return true;
    });
  }, [payrolls, search, statusFilter, monthFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("Nóminas")}</h1>
          <p className="page-subtitle">
            {t("Gestión completa de las nóminas de la empresa")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowNewModal(true)} className="btn btn-primary gap-2">
            <Plus size={18} />
            <span>{t("Nueva Nómina")}</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="glass-card">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Buscar nóminas...")}
              className="w-64 pl-10 pr-4 py-2 text-sm bg-background/50 border border-border/20 rounded-md focus:outline-none focus:ring-2 focus:ring-ring/20 placeholder:text-muted-foreground/50"
            />
          </div>
          
          <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}
            className="text-sm bg-background/50 border border-border/20 rounded-md px-3 py-2">
            <option value="all">{t("Todos los meses")}</option>
            {availableMonths.map((m) => {
              const [month, year] = m.split("-").map(Number);
              return (
                <option key={m} value={m}>{t(MONTH_NAMES[month])} {year}</option>
              );
            })}
          </select>
          
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm bg-background/50 border border-border/20 rounded-md px-3 py-2">
            <option value="all">{t("Todos los estados")}</option>
            <option value="draft">{t("Borrador")}</option>
            <option value="processed">{t("Procesado")}</option>
            <option value="paid">{t("Pagado")}</option>
            <option value="cancelled">{t("Cancelado")}</option>
          </select>
          
          {(search || statusFilter !== "all" || monthFilter !== "all") && (
            <button onClick={() => { setSearch(""); setStatusFilter("all"); setMonthFilter("all"); }}
              className="text-xs text-primary hover:underline">
              {t("Limpiar filtros")}
            </button>
          )}
        </div>
      </div>

      {/* Lista de nóminas */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            {t("Historial de Nóminas")}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((payroll) => (
            <PayrollCard key={payroll.id} payroll={payroll} onSelect={() => setSelectedPayroll(payroll)} />
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-10">{t("No se encontraron nóminas con los filtros seleccionados.")}</p>
        )}
      </div>

      {/* Detalle de nómina seleccionada */}
      {selectedPayroll && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">{t("Detalle de nómina")}</h2>
            <button onClick={() => setSelectedPayroll(null)} className="p-1.5 rounded hover:bg-muted transition-colors">
              <X size={18} />
            </button>
          </div>
          <PayrollDetail payroll={selectedPayroll} />
        </div>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            {t("Resumen Anual")}
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">{t("Nóminas Procesadas")}</span>
              <span className="text-lg font-bold text-foreground">
                {payrolls.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">{t("Total Bruto")}</span>
              <span className="text-lg font-bold text-foreground">
                {formatCurrency(
                  payrolls.reduce((sum, p) => sum + p.totalAmount, 0)
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">{t("Total Neto")}</span>
              <span className="text-lg font-bold text-green-600">
                {formatCurrency(
                  payrolls.reduce((sum, p) => sum + p.netAmount, 0)
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">{t("Total Impuestos")}</span>
              <span className="text-lg font-bold text-foreground">
                {formatCurrency(
                  payrolls.reduce((sum, p) => sum + p.taxAmount, 0)
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="glass-card">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            {t("Por Estado")}
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">{t("Borrador")}</span>
              <span className="text-lg font-bold text-gray-600">
                {payrolls.filter((p) => p.status === "draft").length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">{t("Procesado")}</span>
              <span className="text-lg font-bold text-blue-600">
                {payrolls.filter((p) => p.status === "processed").length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">{t("Pagado")}</span>
              <span className="text-lg font-bold text-green-600">
                {payrolls.filter((p) => p.status === "paid").length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">{t("Cancelado")}</span>
              <span className="text-lg font-bold text-red-600">
                {payrolls.filter((p) => p.status === "cancelled").length}
              </span>
            </div>
          </div>
        </div>

        <div className="glass-card">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            {t("Acciones Rápidas")}
          </h3>
          <div className="space-y-2">
            <button onClick={() => setShowNewModal(true)} className="w-full btn btn-secondary justify-start gap-3">
              <CreditCard size={18} />
              <span>{t("Generar Nómina Mensual")}</span>
            </button>
            <button onClick={exportCsv} className="w-full btn btn-secondary justify-start gap-3">
              <FileText size={18} />
              <span>{t("Exportar a Excel")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal nueva nómina */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">{t("Generar Nómina")}</h2>
              <button onClick={() => setShowNewModal(false)} className="p-1.5 rounded hover:bg-muted transition-colors">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("Crea una nómina a partir de los salarios registrados de los empleados activos.")}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">{t("Mes")}</span>
                <select
                  value={newMonth}
                  onChange={(e) => setNewMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-background/50 border border-border/20 rounded-md focus:outline-none focus:ring-2 focus:ring-ring/20"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {t(["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"][m - 1])}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">{t("Año")}</span>
                <input
                  type="number"
                  value={newYear}
                  min={2024}
                  max={2100}
                  onChange={(e) => setNewYear(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-background/50 border border-border/20 rounded-md focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </label>
            </div>
            {formError && (
              <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                {formError}
              </p>
            )}
            <button
              onClick={createPayroll}
              disabled={creating}
              className="w-full btn btn-primary gap-2 justify-center disabled:opacity-60"
            >
              {creating ? t("Generando...") : t("Generar Nómina")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
