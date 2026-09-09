"use client";

import { useEffect, useState } from "react";
import {
  FileText, FileSignature, ShieldCheck, BookOpen, Plus, Search, X,
  Trash2, Save, Clock, User,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { useT } from "@/i18n";

interface Doc {
  id: string; title: string; content: string | null; type: string; status: string;
  version: string; updatedAt: string; createdAt: string;
  author: { id: string; name: string } | null;
}

const TYPES = [
  { id: "document", label: "Documentos", icon: FileText, color: "#3b82f6" },
  { id: "contract", label: "Contratos", icon: FileSignature, color: "#8b5cf6" },
  { id: "policy", label: "Políticas", icon: ShieldCheck, color: "#10b981" },
  { id: "manual", label: "Manuales", icon: BookOpen, color: "#f59e0b" },
];

const STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "#6b7280" },
  published: { label: "Publicado", color: "#10b981" },
  archived: { label: "Archivado", color: "#ef4444" },
};

export default function DocumentsPage() {
  const t = useT();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [filter, setFilter] = useState("document");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Doc | "new" | null>(null);
  const [form, setForm] = useState({ title: "", content: "", type: "document", status: "draft" });

  const load = () => fetch("/api/documents").then((r) => r.json()).then((d) => setDocs(d.data || []));
  useEffect(() => { load(); }, []);

  const filtered = docs.filter((d) => {
    const typeOk = filter === "all" || d.type === filter;
    const searchOk = d.title.toLowerCase().includes(search.toLowerCase());
    return typeOk && searchOk;
  });

  const openNew = () => { setForm({ title: "", content: "", type: filter === "all" ? "document" : filter, status: "draft" }); setEditing("new"); };
  const openDoc = (d: Doc) => { setForm({ title: d.title, content: d.content || "", type: d.type, status: d.status }); setEditing(d); };

  const save = async () => {
    if (!form.title.trim()) return;
    if (editing === "new") {
      await fetch("/api/documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    } else if (editing) {
      const id = editing.id;
      await fetch("/api/documents", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...form }) });
    }
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("Documentos")}</h1>
          <p className="page-subtitle">{t("Contratos, políticas, manuales y documentación corporativa")}</p>
        </div>
        <button onClick={openNew} className="btn btn-primary gap-2"><Plus size={16} /> {t("Nuevo documento")}</button>
      </div>

      <div className="glass-card p-3 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("Buscar documentos…")}
            className="w-full pl-9 pr-3 py-2 text-sm bg-background/60 border border-border/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30" />
        </div>
        <button onClick={() => setFilter("all")}
          className={cn("px-3 py-1.5 rounded-lg text-xs font-medium", filter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
          {t("Todos")}
        </button>
        {TYPES.map((ty) => (
          <button key={ty.id} onClick={() => setFilter(ty.id)}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
              filter === ty.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
            <ty.icon size={13} /> {t(ty.label)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((d) => {
          const type = TYPES.find((t) => t.id === d.type) || TYPES[0];
          const st = STATUS[d.status] || STATUS.draft;
          return (
            <div key={d.id} className="glass-card p-4 group hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: type.color + "20", color: type.color }}>
                  <type.icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <button onClick={() => openDoc(d)} className="text-sm font-semibold text-foreground text-left hover:text-primary line-clamp-2">
                    {d.title}
                  </button>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: st.color + "20", color: st.color }}>{t(st.label)}</span>
                    <span className="text-[10px] text-muted-foreground">v{d.version}</span>
                  </div>
                </div>
                <button onClick={() => remove(d.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-destructive transition-opacity">
                  <Trash2 size={13} />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{d.content || t("Sin contenido")}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/20 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><User size={10} /> {d.author?.name || "—"}</span>
                <span className="flex items-center gap-1"><Clock size={10} /> {formatDate(d.updatedAt)}</span>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            <FileText size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">{t("No hay documentos en esta categoría")}</p>
          </div>
        )}
      </div>

      {/* EDITOR MODAL */}
      {editing && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="glass-modal rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
              <h3 className="font-semibold">{editing === "new" ? t("Nuevo documento") : t("Editar documento")}</h3>
              <button onClick={() => setEditing(null)}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t("Título del documento")} className="form-input text-base font-medium" />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="form-select">
                  {TYPES.map((ty) => <option key={ty.id} value={ty.id}>{t(ty.label)}</option>)}
                </select>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="form-select">
                  <option value="draft">{t("Borrador")}</option>
                  <option value="published">{t("Publicado")}</option>
                  <option value="archived">{t("Archivado")}</option>
                </select>
              </div>
              <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={16}
                placeholder={t("Contenido del documento…")} className="form-textarea font-mono text-sm leading-relaxed" />
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border/30">
              <button className="btn btn-outline" onClick={() => setEditing(null)}>{t("Cancelar")}</button>
              <button className="btn btn-primary gap-2" onClick={save}><Save size={15} /> {t("Guardar")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
