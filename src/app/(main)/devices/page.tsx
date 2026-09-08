"use client";

import { useEffect, useState } from "react";
import {
  Laptop, Smartphone, Server, Printer, Plus, Search, Edit, Trash2,
  CheckCircle2, AlertCircle, Clock, XCircle, User, Building2,
  MapPin, Cpu, HardDrive, Wifi, RefreshCw,
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

interface Device {
  device: {
    id: string;
    name: string;
    type: string;
    brand: string | null;
    model: string | null;
    serialNumber: string | null;
    os: string | null;
    osVersion: string | null;
    ipAddress: string | null;
    macAddress: string | null;
    status: string;
    purchaseDate: string | null;
    warrantyExpiry: string | null;
    cost: string | null;
    assignedTo: string | null;
    departmentId: string | null;
    location: string | null;
    notes: string | null;
    specifications: Record<string, unknown>;
    createdAt: string;
  };
  assignee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    position: string | null;
  } | null;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  laptop: <Laptop size={20} />,
  desktop: <Laptop size={20} />,
  mobile: <Smartphone size={20} />,
  tablet: <Smartphone size={20} />,
  server: <Server size={20} />,
  printer: <Printer size={20} />,
};

const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  available: { label: "Disponible", color: "#10b981", icon: CheckCircle2 },
  assigned: { label: "Asignado", color: "#3b82f6", icon: User },
  maintenance: { label: "Mantenimiento", color: "#f59e0b", icon: AlertCircle },
  retired: { label: "Retirado", color: "#6b7280", icon: XCircle },
};

const TYPES = [
  { id: "laptop", label: "Portátil" },
  { id: "desktop", label: "Sobremesa" },
  { id: "mobile", label: "Móvil" },
  { id: "tablet", label: "Tablet" },
  { id: "server", label: "Servidor" },
  { id: "printer", label: "Impresora" },
];

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Device | null>(null);
  const [form, setForm] = useState({
    name: "", type: "laptop", brand: "", model: "", serialNumber: "",
    os: "", osVersion: "", ipAddress: "", macAddress: "", status: "available",
    purchaseDate: "", warrantyExpiry: "", cost: "", location: "", notes: "",
    specifications: { cpu: "", ram: "", storage: "", gpu: "" } as Record<string, string>,
  });

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/devices");
    const data = await res.json();
    setDevices(data.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({
      name: "", type: "laptop", brand: "", model: "", serialNumber: "",
      os: "", osVersion: "", ipAddress: "", macAddress: "", status: "available",
      purchaseDate: "", warrantyExpiry: "", cost: "", location: "", notes: "",
      specifications: { cpu: "", ram: "", storage: "", gpu: "" },
    });
    setShowForm(true);
  };

  const openEdit = (d: Device) => {
    setEditing(d);
    const dev = d.device;
    setForm({
      name: dev.name, type: dev.type, brand: dev.brand || "", model: dev.model || "",
      serialNumber: dev.serialNumber || "", os: dev.os || "", osVersion: dev.osVersion || "",
      ipAddress: dev.ipAddress || "", macAddress: dev.macAddress || "", status: dev.status,
      purchaseDate: dev.purchaseDate || "", warrantyExpiry: dev.warrantyExpiry || "",
      cost: dev.cost || "", location: dev.location || "", notes: dev.notes || "",
      specifications: (dev.specifications ? Object.fromEntries(Object.entries(dev.specifications).map(([k, v]) => [k, String(v || "")])) : { cpu: "", ram: "", storage: "", gpu: "" }) as Record<string, string>,
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    const payload = editing ? { id: editing.device.id, ...form } : form;
    const method = editing ? "PATCH" : "POST";
    await fetch("/api/devices", {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    setShowForm(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar este dispositivo?")) return;
    await fetch(`/api/devices?id=${id}`, { method: "DELETE" });
    load();
  };

  const filtered = devices.filter((d) => {
    const dev = d.device;
    const q = search.toLowerCase();
    const matchSearch = !q || dev.name.toLowerCase().includes(q) || (dev.brand || "").toLowerCase().includes(q) || (dev.model || "").toLowerCase().includes(q) || (dev.serialNumber || "").toLowerCase().includes(q);
    const matchType = filterType === "all" || dev.type === filterType;
    const matchStatus = filterStatus === "all" || dev.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  const stats = {
    total: devices.length,
    available: devices.filter((d) => d.device.status === "available").length,
    assigned: devices.filter((d) => d.device.status === "assigned").length,
    maintenance: devices.filter((d) => d.device.status === "maintenance").length,
  };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de dispositivos (MDM)</h1>
          <p className="page-subtitle">Inventario, asignación y seguimiento de equipos de la empresa</p>
        </div>
        <button onClick={openNew} className="btn btn-primary gap-2"><Plus size={16} /> Nuevo dispositivo</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Disponibles</p>
          <p className="text-2xl font-bold mt-1 text-emerald-500">{stats.available}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Asignados</p>
          <p className="text-2xl font-bold mt-1 text-blue-500">{stats.assigned}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Mantenimiento</p>
          <p className="text-2xl font-bold mt-1 text-amber-500">{stats.maintenance}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="glass-card p-3 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, marca, modelo o nº serie…"
            className="w-full pl-9 pr-3 py-2 text-sm bg-background/60 border border-border/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30" />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="form-select text-sm w-40">
          <option value="all">Todos los tipos</option>
          {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="form-select text-sm w-40">
          <option value="all">Todos los estados</option>
          {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw className="animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase text-muted-foreground border-b border-border/30">
                <th className="p-3">Dispositivo</th>
                <th className="p-3">Sistema</th>
                <th className="p-3">Red</th>
                <th className="p-3">Asignado a</th>
                <th className="p-3">Ubicación</th>
                <th className="p-3">Estado</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ device: d, assignee }) => {
                const meta = STATUS_META[d.status] || STATUS_META.available;
                const StatusIcon = meta.icon;
                return (
                  <tr key={d.id} className="border-b border-border/15 hover:bg-accent/30">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                          {TYPE_ICONS[d.type] || <Laptop size={18} />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{d.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{d.brand} {d.model}</p>
                          {d.serialNumber && <p className="text-[10px] font-mono text-muted-foreground truncate">S/N: {d.serialNumber}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      {d.os ? (
                        <>
                          <p className="text-foreground">{d.os}</p>
                          {d.osVersion && <p className="text-xs text-muted-foreground">{d.osVersion}</p>}
                        </>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="p-3">
                      {d.ipAddress ? (
                        <>
                          <p className="font-mono text-xs flex items-center gap-1"><Wifi size={11} /> {d.ipAddress}</p>
                          {d.macAddress && <p className="text-[10px] font-mono text-muted-foreground">{d.macAddress}</p>}
                        </>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="p-3">
                      {assignee ? (
                        <>
                          <p className="text-foreground">{assignee.firstName} {assignee.lastName}</p>
                          {assignee.position && <p className="text-xs text-muted-foreground">{assignee.position}</p>}
                        </>
                      ) : <span className="text-muted-foreground text-xs">Sin asignar</span>}
                    </td>
                    <td className="p-3">
                      {d.location ? <span className="flex items-center gap-1 text-muted-foreground"><MapPin size={12} /> {d.location}</span> : "—"}
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: meta.color + "20", color: meta.color }}>
                        <StatusIcon size={11} /> {meta.label}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit({ device: d, assignee })} className="p-1.5 rounded hover:bg-accent"><Edit size={14} /></button>
                        <button onClick={() => remove(d.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">
                  {loading ? "Cargando…" : "No hay dispositivos. Haz clic en 'Nuevo dispositivo' para empezar."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL FORM */}
      {showForm && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="glass-modal rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 glass-navbar px-6 py-4 flex items-center justify-between z-10 border-b border-border/30">
              <h3 className="font-semibold">{editing ? "Editar dispositivo" : "Nuevo dispositivo"}</h3>
              <button onClick={() => setShowForm(false)}><XCircle size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="text-xs text-muted-foreground">Nombre</label>
                  <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Laptop María 2024" /></div>
                <div><label className="text-xs text-muted-foreground">Tipo</label>
                  <select className="form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select></div>
                <div><label className="text-xs text-muted-foreground">Estado</label>
                  <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select></div>
                <div><label className="text-xs text-muted-foreground">Marca</label>
                  <input className="form-input" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Dell, Apple, HP…" /></div>
                <div><label className="text-xs text-muted-foreground">Modelo</label>
                  <input className="form-input" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="XPS 15, MacBook Pro…" /></div>
                <div><label className="text-xs text-muted-foreground">Nº Serie</label>
                  <input className="form-input font-mono" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Ubicación</label>
                  <input className="form-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Oficina Madrid, Almacén…" /></div>
                <div><label className="text-xs text-muted-foreground">Sistema operativo</label>
                  <input className="form-input" value={form.os} onChange={(e) => setForm({ ...form, os: e.target.value })} placeholder="Windows 11, macOS Sonoma…" /></div>
                <div><label className="text-xs text-muted-foreground">Versión OS</label>
                  <input className="form-input" value={form.osVersion} onChange={(e) => setForm({ ...form, osVersion: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">IP</label>
                  <input className="form-input font-mono" value={form.ipAddress} onChange={(e) => setForm({ ...form, ipAddress: e.target.value })} placeholder="10.8.0.101" /></div>
                <div><label className="text-xs text-muted-foreground">MAC</label>
                  <input className="form-input font-mono" value={form.macAddress} onChange={(e) => setForm({ ...form, macAddress: e.target.value })} placeholder="AA:BB:CC:DD:EE:FF" /></div>
                <div><label className="text-xs text-muted-foreground">Fecha de compra</label>
                  <input type="date" className="form-input" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Expira garantía</label>
                  <input type="date" className="form-input" value={form.warrantyExpiry} onChange={(e) => setForm({ ...form, warrantyExpiry: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Coste (€)</label>
                  <input type="number" className="form-input" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><Cpu size={14} /> Especificaciones</h4>
                <div className="grid grid-cols-2 gap-3">
                  <input className="form-input" placeholder="CPU (Ej: Intel i7-13700H)"
                    value={form.specifications.cpu || ""} onChange={(e) => setForm({ ...form, specifications: { ...form.specifications, cpu: e.target.value } })} />
                  <input className="form-input" placeholder="RAM (Ej: 32GB DDR5)"
                    value={form.specifications.ram || ""} onChange={(e) => setForm({ ...form, specifications: { ...form.specifications, ram: e.target.value } })} />
                  <input className="form-input" placeholder="Almacenamiento (Ej: 1TB NVMe SSD)"
                    value={form.specifications.storage || ""} onChange={(e) => setForm({ ...form, specifications: { ...form.specifications, storage: e.target.value } })} />
                  <input className="form-input" placeholder="GPU (Ej: RTX 4070)"
                    value={form.specifications.gpu || ""} onChange={(e) => setForm({ ...form, specifications: { ...form.specifications, gpu: e.target.value } })} />
                </div>
              </div>

              <div><label className="text-xs text-muted-foreground">Notas</label>
                <textarea className="form-textarea" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <div className="sticky bottom-0 glass-navbar px-6 py-4 flex justify-end gap-2 border-t border-border/30">
              <button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn btn-primary gap-2" onClick={save}>Guardar dispositivo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
