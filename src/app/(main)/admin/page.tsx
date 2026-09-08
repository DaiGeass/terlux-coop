"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import {
  Users as UsersIcon, Shield, Database, Activity, Plus, X, Search,
  Loader2, Ban, CheckCircle2, RefreshCw, Table2, KeyRound, Menu, Wallet, Coins,
} from "lucide-react";
import { cn, formatDate, initials } from "@/lib/utils";

const ROLES = [
  { id: "super_admin", label: "Super administrador", color: "#dc2626" },
  { id: "admin", label: "Administrador", color: "#ea580c" },
  { id: "manager", label: "Gestor/a", color: "#2563eb" },
  { id: "hr", label: "RR. HH.", color: "#16a34a" },
  { id: "finance", label: "Finanzas", color: "#ca8a04" },
  { id: "support", label: "Soporte", color: "#0891b2" },
  { id: "employee", label: "Empleado/a", color: "#6b7280" },
  { id: "client", label: "Cliente", color: "#9333ea" },
];

export default function AdminPage() {
  const [tab, setTab] = useState("overview");
  const tabs = [
    { id: "overview", label: "Resumen", icon: Activity },
    { id: "users", label: "Usuarios", icon: UsersIcon },
    { id: "roles", label: "Roles y permisos", icon: Shield },
    { id: "menus", label: "Menús por rol", icon: Menu },
    { id: "wallets", label: "Créditos", icon: Wallet },
    { id: "database", label: "Base de datos", icon: Database },
    { id: "audit", label: "Auditoría", icon: KeyRound },
  ];
  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Panel de Administración</h1>
          <p className="page-subtitle">Gestión de usuarios, privilegios, base de datos y seguridad</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 p-1 glass-card w-fit">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>
      {tab === "overview" && <Overview />}
      {tab === "users" && <Users />}
      {tab === "roles" && <Roles />}
      {tab === "menus" && <MenuManager />}
      {tab === "wallets" && <Wallets />}
      {tab === "database" && <DbExplorer />}
      {tab === "audit" && <Audit />}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="glass-card p-5">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold mt-2" style={{ color }}>{value}</p>
    </div>
  );
}

function Overview() {
  const [stats, setStats] = useState<any>(null);
  useEffect(() => { fetch("/api/admin?section=stats").then((r) => r.json()).then((d) => setStats(d.data)); }, []);
  if (!stats) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Usuarios totales" value={stats.totalUsers} color="#3b82f6" />
        <Stat label="Usuarios activos" value={stats.activeUsers} color="#10b981" />
        <Stat label="Proyectos" value={stats.totalProjects} color="#8b5cf6" />
        <Stat label="Tareas" value={stats.totalTasks} color="#f59e0b" />
        <Stat label="Tareas completadas" value={stats.completedTasks} color="#10b981" />
        <Stat label="Pedidos" value={stats.totalOrders} color="#06b6d4" />
        <Stat label="Pedidos pagados" value={stats.paidOrders} color="#10b981" />
        <Stat label="Ingresos" value={`$${Number(stats.revenue).toLocaleString("es-MX")}`} color="#22c55e" />
      </div>
    </div>
  );
}

interface AdminUser {
  id: string; email: string; firstName: string; lastName: string; role: string;
  position: string | null; phone: string | null; isActive: boolean; createdAt: string;
  department: { id: string; name: string; color: string | null } | null;
}

function Users() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", role: "employee", position: "", phone: "" });
  const load = useCallback(() => {
    fetch(`/api/admin?section=users&q=${q}`).then((r) => r.json()).then((d) => setUsers(d.data || []));
  }, [q]);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    const res = await fetch("/api/admin", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_user", ...form }),
    });
    const d = await res.json();
    if (d.success) { setShowForm(false); setForm({ firstName: "", lastName: "", email: "", password: "", role: "employee", position: "", phone: "" }); load(); }
    else alert(d.error?.message || "Error");
  };

  const changeRole = async (id: string, role: string) => {
    await fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, role }) });
    load();
  };
  const toggleActive = async (u: AdminUser) => {
    await fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: u.id, isActive: !u.isActive }) });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="glass-card p-3 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por correo…"
            className="w-full pl-9 pr-3 py-2 text-sm bg-background/60 border border-border/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30" />
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary gap-2"><Plus size={15} /> Nuevo usuario</button>
      </div>

      {showForm && (
        <div className="glass-card p-5 grid grid-cols-1 md:grid-cols-3 gap-3 animate-slide-in">
          <input className="form-input" placeholder="Nombre" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          <input className="form-input" placeholder="Apellidos" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          <input className="form-input" placeholder="Correo corporativo" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="form-input" type="password" placeholder="Contraseña temporal (mín. 8)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <input className="form-input" placeholder="Puesto" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
          <input className="form-input" placeholder="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          <div className="md:col-span-2 flex justify-end gap-2">
            <button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancelar</button>
            <button className="btn btn-primary gap-2" onClick={create}><CheckCircle2 size={15} /> Crear usuario</button>
          </div>
        </div>
      )}

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase text-muted-foreground border-b border-border/30">
              <th className="p-3">Usuario</th><th className="p-3">Puesto</th><th className="p-3">Departamento</th>
              <th className="p-3">Rol / privilegios</th><th className="p-3">Alta</th><th className="p-3">Estado</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const role = ROLES.find((r) => r.id === u.role);
              return (
                <tr key={u.id} className="border-b border-border/15 hover:bg-accent/30">
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-[10px] font-semibold text-white">
                        {initials(u.firstName, u.lastName)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{u.firstName} {u.lastName}</p>
                        <p className="text-[11px] text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{u.position || "—"}</td>
                  <td className="p-3">{u.department ? <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: (u.department.color || "#6b7280") + "20", color: u.department.color || "#6b7280" }}>{u.department.name}</span> : "—"}</td>
                  <td className="p-3">
                    <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)}
                      className="text-xs bg-background border border-border/40 rounded-lg px-2 py-1 font-medium"
                      style={{ color: role?.color }}>
                      {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                    </select>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{formatDate(u.createdAt)}</td>
                  <td className="p-3">
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium",
                      u.isActive ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-500")}>
                      {u.isActive ? "Activo" : "Desactivado"}
                    </span>
                  </td>
                  <td className="p-3">
                    <button onClick={() => toggleActive(u)} title={u.isActive ? "Desactivar" : "Activar"}
                      className={cn("p-1.5 rounded-lg", u.isActive ? "hover:bg-red-500/10 text-red-500" : "hover:bg-emerald-500/10 text-emerald-500")}>
                      {u.isActive ? <Ban size={15} /> : <CheckCircle2 size={15} />}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Roles() {
  const [data, setData] = useState<{ roles: any[]; permissions: any[]; rolePermissions: any[] } | null>(null);
  useEffect(() => { fetch("/api/admin?section=roles").then((r) => r.json()).then((d) => setData(d.data)); }, []);
  if (!data) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  const categories = Array.from(new Set(data.permissions.map((p) => p.category)));
  return (
    <div className="glass-card p-5">
      <h3 className="font-semibold mb-1">Matriz de privilegios</h3>
      <p className="text-xs text-muted-foreground mb-4">Los permisos se asignan por rol. Los usuarios heredan los permisos de su rol; los super administradores tienen acceso total.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/30">
              <th className="text-left p-2">Permiso</th>
              {data.roles.map((r) => (
                <th key={r.id} className="p-2 text-center">
                  <span className="inline-block px-2 py-0.5 rounded-full font-medium"
                    style={{ background: (ROLES.find((x) => x.id === r.name)?.color || "#6b7280") + "20", color: ROLES.find((x) => x.id === r.name)?.color }}>
                    {ROLES.find((x) => x.id === r.name)?.label || r.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <Fragment key={cat}>
                <tr><td colSpan={data.roles.length + 1} className="pt-3 pb-1 font-semibold uppercase text-[10px] text-muted-foreground">{cat}</td></tr>
                {data.permissions.filter((p) => p.category === cat).map((p) => (
                  <tr key={p.id} className="border-b border-border/10">
                    <td className="p-2 font-medium">{p.description}</td>
                    {data.roles.map((r) => {
                      const adminAll = ["super_admin", "admin"].includes(r.name) && !["payroll", "admin"].includes(p.category) || r.name === "super_admin";
                      const granted = r.isAdmin || adminAll || data.rolePermissions.some((rp) => rp.roleId === r.id && rp.permissionId === p.id);
                      return (
                        <td key={r.id} className="p-2 text-center">
                          {granted ? <CheckCircle2 size={15} className="inline text-emerald-500" /> : <span className="text-muted-foreground/40">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DbExplorer() {
  const [tables, setTables] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTables = () => {
    fetch("/api/admin?section=database").then((r) => r.json()).then((d) => setTables(d.data.tables));
  };
  useEffect(() => { loadTables(); }, []);
  const open = async (t: string) => {
    setSelected(t); setLoading(true);
    const d = await (await fetch(`/api/admin?section=database&table=${t}`)).json();
    setRows(d.data.rows); setColumns(d.data.columns); setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" style={{ minHeight: "60vh" }}>
      <div className="glass-card p-3">
        <div className="flex items-center justify-between mb-2 px-1">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Database size={14} /> Tablas ({tables.length})</h3>
          <button onClick={loadTables} className="p-1 rounded hover:bg-accent"><RefreshCw size={13} /></button>
        </div>
        <div className="space-y-0.5 max-h-[60vh] overflow-y-auto">
          {tables.map((t) => (
            <button key={t} onClick={() => open(t)}
              className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs font-mono transition-colors",
                selected === t ? "bg-primary text-primary-foreground" : "hover:bg-accent")}>
              <Table2 size={12} /> {t}
            </button>
          ))}
        </div>
      </div>
      <div className="glass-card p-3 lg:col-span-3 overflow-auto">
        {!selected ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Selecciona una tabla para inspeccionar sus registros (máx. 100 filas)</div>
        ) : loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/30">
                {columns.map((c) => <th key={c} className="text-left p-2 font-mono whitespace-nowrap">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-border/10 hover:bg-accent/30">
                  {columns.map((c) => {
                    const v = r[c];
                    return (
                      <td key={c} className="p-2 whitespace-nowrap max-w-[260px] truncate font-mono">
                        {v === null ? <span className="text-muted-foreground/50">NULL</span> : typeof v === "object" ? JSON.stringify(v) : String(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={columns.length} className="p-6 text-center text-muted-foreground">Sin registros</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Audit() {
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => { fetch("/api/admin?section=activities").then((r) => r.json()).then((d) => setLogs(d.data || [])); }, []);
  const ACTIONS: Record<string, string> = { login: "Inició sesión", logout: "Cerró sesión", register: "Se registró", create: "Creó", update: "Actualizó", delete: "Eliminó" };
  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><KeyRound size={14} /> Registro de actividad y seguridad</h3>
      <div className="space-y-1 max-h-[65vh] overflow-y-auto">
        {logs.map((l) => (
          <div key={l.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/40 text-sm">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
              {initials(l.userName?.split(" ")[0] || "S", l.userName?.split(" ")[1] || "")}
            </div>
            <div className="flex-1 min-w-0">
              <p><span className="font-medium">{l.userName}</span> <span className="text-muted-foreground">{ACTIONS[l.action] || l.action}</span> <span className="text-xs px-1.5 py-0.5 rounded bg-muted font-mono">{l.entityType}</span></p>
              {l.ipAddress && <p className="text-[10px] text-muted-foreground font-mono">{l.ipAddress}</p>}
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatDate(l.createdAt, "p")}</span>
          </div>
        ))}
        {logs.length === 0 && <p className="text-center text-xs text-muted-foreground py-8">Sin actividad registrada todavía.</p>}
      </div>
    </div>
  );
}

const ALL_MENU_ITEMS = [
  "dashboard", "projects", "gantt", "tasks", "calendar",
  "messages", "directory", "documents", "files",
  "store", "billing", "payroll", "hr",
  "devices", "jobs",
  "admin", "admin-db", "admin-vpn", "settings", "reports",
  "notifications", "help",
];

const ROL_TABLE = [
  "super_admin", "admin", "manager", "hr", "finance", "support", "employee", "client",
];

const MENU_LABELS: Record<string, string> = {
  dashboard: "Dashboard", projects: "Proyectos", gantt: "Gantt", tasks: "Tareas",
  calendar: "Calendario", messages: "Mensajería", directory: "Directorio",
  documents: "Documentos", files: "Drive", store: "Tienda", billing: "Facturación",
  payroll: "Nóminas", hr: "RR. HH.", devices: "Dispositivos", jobs: "Cola Trabajos",
  admin: "Panel Admin", "admin-db": "Base de datos", "admin-vpn": "VPN / Integr.",
  settings: "Configuración", reports: "Reportes", notifications: "Notificaciones", help: "Ayuda",
};

function MenuManager() {
  const [toggles, setToggles] = useState<Record<string, Record<string, boolean>> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch("/api/admin?section=menus").then((r) => r.json()).then((d) => setToggles(d.data?.toggles || null));
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (role: string, item: string, value: boolean) => {
    setSaving(true);
    setToggles((prev) => prev && { ...prev, [role]: { ...prev[role], [item]: value } });
    await fetch("/api/admin", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_menu", role, item, enabled: value }),
    });
    setSaving(false);
  };

  if (!toggles) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div>;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold flex items-center gap-2"><Menu size={16} /> Menús activables por rol</h3>
        <button onClick={load} className="p-1.5 rounded hover:bg-accent" title="Recargar"><RefreshCw size={14} /></button>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        El administrador o el personal TIC activa/desactiva cada ítem del menú lateral por rol. Un ítem desactivado se oculta para todos los usuarios de ese rol.
        {saving && <span className="ml-2 text-primary">Guardando…</span>}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/30">
              <th className="text-left p-2">Menú</th>
              {ROL_TABLE.map((r) => {
                const c = ROLES.find((x) => x.id === r);
                return (
                  <th key={r} className="p-2 text-center">
                    <span className="inline-block px-2 py-0.5 rounded-full font-medium"
                      style={{ background: (c?.color || "#6b7280") + "20", color: c?.color }}>
                      {c?.label || r}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {ALL_MENU_ITEMS.map((item) => (
              <tr key={item} className="border-b border-border/10">
                <td className="p-2 font-medium">{MENU_LABELS[item] || item}</td>
                {ROL_TABLE.map((role) => {
                  const enabled = toggles[role]?.[item] !== false;
                  return (
                    <td key={role} className="p-2 text-center">
                      <button
                        onClick={() => toggle(role, item, !enabled)}
                        className={cn(
                          "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                          enabled ? "bg-emerald-500" : "bg-muted"
                        )}
                        title={enabled ? "Desactivar" : "Activar"}
                      >
                        <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", enabled ? "translate-x-4" : "translate-x-0.5")} />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Wallets() {
  const [data, setData] = useState<{ wallets: any[]; transactions: any[] } | null>(null);
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    fetch("/api/admin?section=wallets").then((r) => r.json()).then((d) => setData(d.data));
  }, []);
  useEffect(() => { load(); }, [load]);

  const addCredit = async (userId: string) => {
    const amount = Number(amounts[userId]);
    if (!amount || amount <= 0) return;
    const res = await fetch("/api/admin", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_credit", userId, amount }),
    });
    const d = await res.json();
    if (!d.success) alert(d.error?.message || "Error");
    setAmounts((p) => ({ ...p, [userId]: "" }));
    load();
  };

  if (!data) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold flex items-center gap-2"><Coins size={16} /> Cuentas de crédito (wallet)</h3>
          <button onClick={load} className="p-1.5 rounded hover:bg-accent" title="Recargar"><RefreshCw size={14} /></button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Saldo de crédito de cada usuario. Puedes añadir crédito a cualquier cuenta (PoC: la cuenta tester@terluxcoop.com se creó con 5.000 MXN de saldo inicial).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 text-left text-xs text-muted-foreground uppercase">
                <th className="p-2">Usuario</th><th className="p-2">Rol</th><th className="p-2">Saldo</th><th className="p-2">Añadir crédito</th>
              </tr>
            </thead>
            <tbody>
              {data.wallets.map((w) => (
                <tr key={w.id} className="border-b border-border/10 hover:bg-accent/30">
                  <td className="p-2">
                    <div className="font-medium">{w.firstName} {w.lastName}</div>
                    <div className="text-[11px] text-muted-foreground">{w.email}</div>
                  </td>
                  <td className="p-2"><span className="text-xs capitalize">{w.role.replace("_", " ")}</span></td>
                  <td className="p-2 font-semibold" style={{ color: w.balance > 0 ? "#10b981" : undefined }}>
                    {Number(w.balance).toLocaleString("es-ES", { style: "currency", currency: "MXN" })}
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min="0" step="0.01"
                        value={amounts[w.id] || ""}
                        onChange={(e) => setAmounts((p) => ({ ...p, [w.id]: e.target.value }))}
                        placeholder="Importe MXN"
                        className="w-32 px-2 py-1 text-sm bg-background/60 border border-border/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30"
                      />
                      <button onClick={() => addCredit(w.id)} className="btn btn-primary btn-sm gap-1">
                        <Plus size={13} /> Añadir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Wallet size={14} /> Movimientos recientes</h3>
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {data.transactions.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg border border-border/10 text-sm">
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                t.type === "credit" ? "bg-emerald-500/15 text-emerald-600" : "bg-rose-500/15 text-rose-600")}>
                {t.type === "credit" ? "+" : "−"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{t.description || t.type}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{t.reference}</p>
              </div>
              <div className="text-right">
                <div className="font-semibold" style={{ color: t.type === "credit" ? "#10b981" : "#e11d48" }}>
                  {t.type === "credit" ? "+" : "−"}{Number(t.amount).toLocaleString("es-ES", { style: "currency", currency: "MXN" })}
                </div>
                <div className="text-[10px] text-muted-foreground">{formatDate(t.createdAt)}</div>
              </div>
            </div>
          ))}
          {data.transactions.length === 0 && <p className="text-center text-xs text-muted-foreground py-6">Sin movimientos todavía.</p>}
        </div>
      </div>
    </div>
  );
}
