// ============================================
// TERLUX COOP - GESTION DE NOMINAS
// ============================================

"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Users,
  Calendar,
  FileText,
  Download,
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

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
  paymentDate: Date | null;
  paymentMethod: string;
}

interface Payroll {
  id: string;
  period: string;
  month: number;
  year: number;
  startDate: Date;
  endDate: Date;
  status: "draft" | "processed" | "paid" | "cancelled";
  totalAmount: number;
  taxAmount: number;
  netAmount: number;
  createdAt: Date;
  processedAt: Date | null;
  paidAt: Date | null;
  employees: EmployeePayroll[];
}

// Datos mock
const payrollsData: Payroll[] = [
  {
    id: "1",
    period: "Mensual",
    month: 9,
    year: 2024,
    startDate: new Date("2024-09-01"),
    endDate: new Date("2024-09-30"),
    status: "paid",
    totalAmount: 125000,
    taxAmount: 25000,
    netAmount: 100000,
    createdAt: new Date("2024-09-25"),
    processedAt: new Date("2024-09-28"),
    paidAt: new Date("2024-10-01"),
    employees: [
      {
        id: "1",
        name: "Juan Pérez",
        position: "Desarrollador Senior",
        department: "Tecnología",
        baseSalary: 45000,
        overtime: 2000,
        bonuses: 1500,
        deductions: 500,
        netSalary: 48000,
        paymentStatus: "paid",
        paymentDate: new Date("2024-10-01"),
        paymentMethod: "Transferencia Bancaria",
      },
      {
        id: "2",
        name: "Ana García",
        position: "Jefa de Proyecto",
        department: "Tecnología",
        baseSalary: 55000,
        overtime: 3000,
        bonuses: 2000,
        deductions: 800,
        netSalary: 59200,
        paymentStatus: "paid",
        paymentDate: new Date("2024-10-01"),
        paymentMethod: "Transferencia Bancaria",
      },
    ],
  },
  {
    id: "2",
    period: "Mensual",
    month: 8,
    year: 2024,
    startDate: new Date("2024-08-01"),
    endDate: new Date("2024-08-31"),
    status: "processed",
    totalAmount: 118000,
    taxAmount: 23600,
    netAmount: 94400,
    createdAt: new Date("2024-08-25"),
    processedAt: new Date("2024-08-28"),
    paidAt: null,
    employees: [
      {
        id: "1",
        name: "Juan Pérez",
        position: "Desarrollador Senior",
        department: "Tecnología",
        baseSalary: 45000,
        overtime: 1500,
        bonuses: 1000,
        deductions: 500,
        netSalary: 47000,
        paymentStatus: "pending",
        paymentDate: null,
        paymentMethod: "Transferencia Bancaria",
      },
      {
        id: "2",
        name: "Ana García",
        position: "Jefa de Proyecto",
        department: "Tecnología",
        baseSalary: 55000,
        overtime: 2500,
        bonuses: 1500,
        deductions: 800,
        netSalary: 57200,
        paymentStatus: "pending",
        paymentDate: null,
        paymentMethod: "Transferencia Bancaria",
      },
    ],
  },
  {
    id: "3",
    period: "Mensual",
    month: 7,
    year: 2024,
    startDate: new Date("2024-07-01"),
    endDate: new Date("2024-07-31"),
    status: "paid",
    totalAmount: 115000,
    taxAmount: 23000,
    netAmount: 92000,
    createdAt: new Date("2024-07-25"),
    processedAt: new Date("2024-07-28"),
    paidAt: new Date("2024-08-01"),
    employees: [
      {
        id: "1",
        name: "Juan Pérez",
        position: "Desarrollador Senior",
        department: "Tecnología",
        baseSalary: 45000,
        overtime: 2500,
        bonuses: 2000,
        deductions: 500,
        netSalary: 49000,
        paymentStatus: "paid",
        paymentDate: new Date("2024-08-01"),
        paymentMethod: "Transferencia Bancaria",
      },
    ],
  },
];

// Componente PayrollCard
function PayrollCard({ payroll }: { payroll: Payroll }) {
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
    <Link
      href={`/payroll/${payroll.id}`}
      className="glass-card group p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: statusColors[payroll.status] }}
            />
            <h3 className="font-medium text-foreground">
              Nómina {months[payroll.month]} {payroll.year}
            </h3>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: statusColors[payroll.status] + "20",
                color: statusColors[payroll.status],
              }}
            >
              {statusLabels[payroll.status]}
            </span>
          </div>
          
          <p className="text-sm text-muted-foreground mb-3">
            Período: {formatDate(payroll.startDate)} - {formatDate(payroll.endDate)}
          </p>
          
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Total Bruto</p>
              <p className="text-lg font-bold text-foreground">
                {formatCurrency(payroll.totalAmount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Total Neto</p>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(payroll.netAmount)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {payroll.employees.length} empleados
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {formatDate(payroll.createdAt)}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Componente EmployeePayrollRow
function EmployeePayrollRow({ employee }: { employee: EmployeePayroll }) {
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
          {statusLabels[employee.paymentStatus]}
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
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  return (
    <div className="space-y-6">
      <div className="glass-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Nómina {months[payroll.month]} {payroll.year}
          </h2>
          <div className="flex items-center gap-2">
            <button className="btn btn-secondary gap-2">
              <Download size={16} />
              <span>Exportar PDF</span>
            </button>
            <button className="btn btn-secondary gap-2">
              <Download size={16} />
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-muted/50 rounded">
            <p className="text-sm text-muted-foreground mb-1">Total Bruto</p>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(payroll.totalAmount)}
            </p>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded">
            <p className="text-sm text-muted-foreground mb-1">Impuestos</p>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(payroll.taxAmount)}
            </p>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded">
            <p className="text-sm text-muted-foreground mb-1">Total Neto</p>
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
                  Empleado
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Puesto
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Departamento
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Salario Base
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Horas Extra
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Bonos
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Deducciones
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Salario Neto
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Fecha Pago
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
                  Totales
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
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Nóminas</h1>
          <p className="page-subtitle">
            Gestión completa de las nóminas de la empresa
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/payroll/new"
            className="btn btn-primary gap-2"
          >
            <Plus size={18} />
            <span>Nueva Nómina</span>
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="glass-card">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar nóminas..."
              className="w-64 pl-10 pr-4 py-2 text-sm bg-background/50 border border-border/20 rounded-md focus:outline-none focus:ring-2 focus:ring-ring/20 placeholder:text-muted-foreground/50"
            />
          </div>
          
          <select className="text-sm bg-background/50 border border-border/20 rounded-md px-3 py-2">
            <option>Todos los meses</option>
            <option>Enero 2024</option>
            <option>Febrero 2024</option>
            <option>Marzo 2024</option>
          </select>
          
          <select className="text-sm bg-background/50 border border-border/20 rounded-md px-3 py-2">
            <option>Todos los estados</option>
            <option>Borrador</option>
            <option>Procesado</option>
            <option>Pagado</option>
            <option>Cancelado</option>
          </select>
          
          <button className="p-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Lista de nóminas */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Historial de Nóminas
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {payrollsData.map((payroll) => (
            <PayrollCard key={payroll.id} payroll={payroll} />
          ))}
        </div>
      </div>

      {/* Detalle de nómina seleccionada */}
      {selectedPayroll && (
        <PayrollDetail payroll={selectedPayroll} />
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            Resumen Anual
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Nóminas Procesadas</span>
              <span className="text-lg font-bold text-foreground">
                {payrollsData.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Total Bruto</span>
              <span className="text-lg font-bold text-foreground">
                {formatCurrency(
                  payrollsData.reduce((sum, p) => sum + p.totalAmount, 0)
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Total Neto</span>
              <span className="text-lg font-bold text-green-600">
                {formatCurrency(
                  payrollsData.reduce((sum, p) => sum + p.netAmount, 0)
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Total Impuestos</span>
              <span className="text-lg font-bold text-foreground">
                {formatCurrency(
                  payrollsData.reduce((sum, p) => sum + p.taxAmount, 0)
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="glass-card">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            Por Estado
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Borrador</span>
              <span className="text-lg font-bold text-gray-600">
                {payrollsData.filter((p) => p.status === "draft").length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Procesado</span>
              <span className="text-lg font-bold text-blue-600">
                {payrollsData.filter((p) => p.status === "processed").length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Pagado</span>
              <span className="text-lg font-bold text-green-600">
                {payrollsData.filter((p) => p.status === "paid").length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Cancelado</span>
              <span className="text-lg font-bold text-red-600">
                {payrollsData.filter((p) => p.status === "cancelled").length}
              </span>
            </div>
          </div>
        </div>

        <div className="glass-card">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            Acciones Rápidas
          </h3>
          <div className="space-y-2">
            <button className="w-full btn btn-secondary justify-start gap-3">
              <CreditCard size={18} />
              <span>Generar Nómina Mensual</span>
            </button>
            <button className="w-full btn btn-secondary justify-start gap-3">
              <FileText size={18} />
              <span>Exportar a Excel</span>
            </button>
            <button className="w-full btn btn-secondary justify-start gap-3">
              <Download size={18} />
              <span>Exportar Reportes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
