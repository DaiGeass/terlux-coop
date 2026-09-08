"use client";

import { useEffect, useState } from "react";
import {
  Search, Mail, Phone, Briefcase, Building2, MapPin, Globe, Link2,
  GraduationCap, Award, Languages, X, Plus, Trash2, Download, BadgeCheck,
} from "lucide-react";
import { cn, initials, formatDate } from "@/lib/utils";

interface Person {
  id: string; email: string; firstName: string; lastName: string;
  position: string | null; role: string; phone: string | null; hireDate: string | null;
  isActive: boolean; department: { id: string; name: string; color: string } | null;
  cv: {
    id: string; title: string | null; summary: string | null; phone: string | null;
    address: string | null; city: string | null; country: string | null;
    website: string | null; linkedin: string | null;
    experience: { title: string; company: string; start: string; end: string; description: string }[];
    education: { degree: string; school: string; year: string }[];
    skills: string[]; languages: { name: string; level: string }[];
    certifications: { name: string; issuer: string; year: string }[];
  } | null;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Dirección", admin: "Administración", manager: "Gestor/a",
  hr: "Recursos Humanos", finance: "Finanzas", support: "Soporte",
  employee: "Empleado/a", client: "Cliente",
};

export function DirectoryView({ openMe = false }: { openMe?: boolean }) {
  const [people, setPeople] = useState<Person[]>([]);
  const [me, setMe] = useState<Person | null>(null);
  const [selected, setSelected] = useState<Person | null>(null);
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("all");
  const [cvForm, setCvForm] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const [all, mine] = await Promise.all([
        fetch("/api/directory?all=1").then((r) => r.json()),
        fetch("/api/directory?id=me").then((r) => r.json()),
      ]);
      setPeople(all.data || []);
      setMe(mine.data || null);
      if (openMe && mine.data) setSelected(mine.data);
    })();
  }, [openMe]);

  const departments = Array.from(new Set(people.map((p) => p.department?.name).filter(Boolean))) as string[];
  const filtered = people.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q || `${p.firstName} ${p.lastName} ${p.position} ${p.email}`.toLowerCase().includes(q);
    const matchDept = dept === "all" || p.department?.name === dept;
    return matchSearch && matchDept;
  });

  const openEditor = (p: Person) => {
    setSelected(p);
    setEditing(true);
    setCvForm(p.cv ? {
      title: p.cv.title || p.position || "",
      summary: p.cv.summary || "",
      phone: p.cv.phone || p.phone || "",
      city: p.cv.city || "", country: p.cv.country || "",
      website: p.cv.website || "", linkedin: p.cv.linkedin || "",
      experience: p.cv.experience || [],
      education: p.cv.education || [],
      skills: p.cv.skills || [],
      languages: p.cv.languages || [],
      certifications: p.cv.certifications || [],
    } : {
      title: p.position || "", summary: "", phone: p.phone || "", city: "", country: "",
      website: "", linkedin: "", experience: [], education: [], skills: [],
      languages: [], certifications: [],
    });
  };

  const saveCv = async () => {
    await fetch("/api/directory", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cvForm),
    });
    const all = await (await fetch("/api/directory?all=1")).json();
    setPeople(all.data || []);
    setEditing(false);
    setSelected((s) => (s ? (all.data as Person[]).find((p) => p.id === s.id) || s : s));
  };

  const isMe = selected?.id === me?.id;

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">{openMe ? "Mi perfil y CV" : "Directorio de empleados"}</h1>
          <p className="page-subtitle">Organización, contactos y hojas de vida del equipo</p>
        </div>
      </div>

      <div className="glass-card p-3 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, cargo o correo…"
            className="w-full pl-9 pr-3 py-2 text-sm bg-background/60 border border-border/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30" />
        </div>
        <select value={dept} onChange={(e) => setDept(e.target.value)} className="form-select text-sm w-48">
          <option value="all">Todos los departamentos</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((p) => (
          <button key={p.id} onClick={() => { setSelected(p); setEditing(false); }}
            className="glass-card p-5 text-left hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-start gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-sm font-semibold text-white">
                  {initials(p.firstName, p.lastName)}
                </div>
                <span className={cn("absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card", p.isActive ? "bg-emerald-500" : "bg-muted-foreground")} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate flex items-center gap-1">
                  {p.firstName} {p.lastName}
                  {["super_admin", "admin"].includes(p.role) && <BadgeCheck size={14} className="text-primary flex-shrink-0" />}
                </p>
                <p className="text-xs text-muted-foreground truncate">{p.position || ROLE_LABELS[p.role]}</p>
                {p.department && (
                  <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: p.department.color + "20", color: p.department.color }}>
                    <Building2 size={9} /> {p.department.name}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-3 space-y-1 text-[11px] text-muted-foreground">
              <p className="flex items-center gap-1.5 truncate"><Mail size={11} /> {p.email}</p>
              {p.hireDate && <p className="flex items-center gap-1.5"><Briefcase size={11} /> Desde {formatDate(p.hireDate)}</p>}
            </div>
          </button>
        ))}
      </div>

      {/* PERFIL / CV MODAL */}
      {selected && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="glass-modal rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 glass-navbar px-6 py-4 flex items-center gap-4 z-10 border-b border-border/30">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-lg font-semibold text-white">
                {initials(selected.firstName, selected.lastName)}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-foreground">{selected.firstName} {selected.lastName}</h2>
                <p className="text-xs text-muted-foreground">{selected.position} · {selected.department?.name}</p>
              </div>
              {isMe && !editing && (
                <button onClick={() => openEditor(selected)} className="btn btn-primary btn-sm">Editar CV</button>
              )}
              <button onClick={() => setSelected(null)}><X size={18} /></button>
            </div>

            {!editing ? (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground"><Mail size={14} /> {selected.email}</span>
                  {selected.phone && <span className="flex items-center gap-2 text-muted-foreground"><Phone size={14} /> {selected.phone}</span>}
                  {selected.cv?.city && <span className="flex items-center gap-2 text-muted-foreground"><MapPin size={14} /> {selected.cv.city}, {selected.cv.country}</span>}
                  {selected.cv?.linkedin && <a href={selected.cv.linkedin} className="flex items-center gap-2 text-primary"><Link2 size={14} /> LinkedIn</a>}
                  {selected.cv?.website && <a href={selected.cv.website} className="flex items-center gap-2 text-primary"><Globe size={14} /> Sitio web</a>}
                </div>

                {selected.cv?.summary && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Perfil profesional</h3>
                    <p className="text-sm text-muted-foreground">{selected.cv.summary}</p>
                  </div>
                )}

                {(selected.cv?.experience?.length ?? 0) > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Briefcase size={15} /> Experiencia</h3>
                    <div className="space-y-3 border-l-2 border-border pl-4">
                      {selected.cv?.experience?.map((e, i) => (
                        <div key={i} className="relative">
                          <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary" />
                          <p className="text-sm font-medium">{e.title} · {e.company}</p>
                          <p className="text-xs text-muted-foreground">{e.start} - {e.end || "Actualidad"}</p>
                          {e.description && <p className="text-xs text-muted-foreground mt-0.5">{e.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(selected.cv?.education?.length ?? 0) > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><GraduationCap size={15} /> Formación</h3>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {selected.cv?.education?.map((e, i) => (
                        <div key={i} className="p-3 rounded-lg bg-muted/40">
                          <p className="text-sm font-medium">{e.degree}</p>
                          <p className="text-xs text-muted-foreground">{e.school} · {e.year}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(selected.cv?.skills?.length ?? 0) > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Competencias</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.cv?.skills?.map((s, i) => (
                        <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  {(selected.cv?.languages?.length ?? 0) > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Languages size={15} /> Idiomas</h3>
                      {selected.cv?.languages?.map((l, i) => (
                        <div key={i} className="flex justify-between text-xs py-1"><span>{l.name}</span><span className="text-muted-foreground">{l.level}</span></div>
                      ))}
                    </div>
                  )}
                  {(selected.cv?.certifications?.length ?? 0) > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Award size={15} /> Certificaciones</h3>
                      {selected.cv?.certifications?.map((c, i) => (
                        <p key={i} className="text-xs py-1">{c.name} <span className="text-muted-foreground">· {c.issuer} {c.year}</span></p>
                      ))}
                    </div>
                  )}
                </div>

                {!selected.cv && <p className="text-sm text-muted-foreground text-center py-6">Esta persona aún no ha completado su hoja de vida.</p>}
              </div>
            ) : (
              /* EDITOR DE CV */
              <div className="p-6 space-y-5">
                <div className="grid sm:grid-cols-2 gap-3">
                  <input className="form-input" placeholder="Puesto profesional" value={cvForm.title} onChange={(e) => setCvForm({ ...cvForm, title: e.target.value })} />
                  <input className="form-input" placeholder="Teléfono" value={cvForm.phone} onChange={(e) => setCvForm({ ...cvForm, phone: e.target.value })} />
                  <input className="form-input" placeholder="Ciudad" value={cvForm.city} onChange={(e) => setCvForm({ ...cvForm, city: e.target.value })} />
                  <input className="form-input" placeholder="País" value={cvForm.country} onChange={(e) => setCvForm({ ...cvForm, country: e.target.value })} />
                  <input className="form-input" placeholder="LinkedIn (URL)" value={cvForm.linkedin} onChange={(e) => setCvForm({ ...cvForm, linkedin: e.target.value })} />
                  <input className="form-input" placeholder="Sitio web (URL)" value={cvForm.website} onChange={(e) => setCvForm({ ...cvForm, website: e.target.value })} />
                </div>
                <textarea className="form-textarea" rows={3} placeholder="Resumen profesional…" value={cvForm.summary} onChange={(e) => setCvForm({ ...cvForm, summary: e.target.value })} />
                <input className="form-input" placeholder="Competencias separadas por coma (React, Gestión de equipos, SQL…)"
                  value={cvForm.skills.join(", ")} onChange={(e) => setCvForm({ ...cvForm, skills: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })} />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold">Experiencia</h3>
                    <button className="btn btn-outline btn-sm gap-1" onClick={() => setCvForm({ ...cvForm, experience: [...cvForm.experience, { title: "", company: "", start: "", end: "", description: "" }] })}>
                      <Plus size={13} /> Añadir
                    </button>
                  </div>
                  {cvForm.experience.map((e: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/40 mb-2 space-y-2 relative">
                      <button className="absolute top-2 right-2 text-destructive" onClick={() => setCvForm({ ...cvForm, experience: cvForm.experience.filter((_: any, x: number) => x !== i) })}><Trash2 size={13} /></button>
                      <div className="grid sm:grid-cols-2 gap-2">
                        <input className="form-input" placeholder="Puesto" value={e.title} onChange={(ev) => { const arr = [...cvForm.experience]; arr[i].title = ev.target.value; setCvForm({ ...cvForm, experience: arr }); }} />
                        <input className="form-input" placeholder="Empresa" value={e.company} onChange={(ev) => { const arr = [...cvForm.experience]; arr[i].company = ev.target.value; setCvForm({ ...cvForm, experience: arr }); }} />
                        <input className="form-input" placeholder="Inicio (2022)" value={e.start} onChange={(ev) => { const arr = [...cvForm.experience]; arr[i].start = ev.target.value; setCvForm({ ...cvForm, experience: arr }); }} />
                        <input className="form-input" placeholder="Fin (o vacío = actual)" value={e.end} onChange={(ev) => { const arr = [...cvForm.experience]; arr[i].end = ev.target.value; setCvForm({ ...cvForm, experience: arr }); }} />
                      </div>
                      <textarea className="form-textarea" rows={2} placeholder="Descripción de logros…" value={e.description} onChange={(ev) => { const arr = [...cvForm.experience]; arr[i].description = ev.target.value; setCvForm({ ...cvForm, experience: arr }); }} />
                    </div>
                  ))}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold">Formación</h3>
                    <button className="btn btn-outline btn-sm gap-1" onClick={() => setCvForm({ ...cvForm, education: [...cvForm.education, { degree: "", school: "", year: "" }] })}>
                      <Plus size={13} /> Añadir
                    </button>
                  </div>
                  {cvForm.education.map((e: any, i: number) => (
                    <div key={i} className="grid sm:grid-cols-[2fr_2fr_1fr_auto] gap-2 mb-2">
                      <input className="form-input" placeholder="Título" value={e.degree} onChange={(ev) => { const arr = [...cvForm.education]; arr[i].degree = ev.target.value; setCvForm({ ...cvForm, education: arr }); }} />
                      <input className="form-input" placeholder="Centro" value={e.school} onChange={(ev) => { const arr = [...cvForm.education]; arr[i].school = ev.target.value; setCvForm({ ...cvForm, education: arr }); }} />
                      <input className="form-input" placeholder="Año" value={e.year} onChange={(ev) => { const arr = [...cvForm.education]; arr[i].year = ev.target.value; setCvForm({ ...cvForm, education: arr }); }} />
                      <button className="btn btn-ghost btn-icon text-destructive" onClick={() => setCvForm({ ...cvForm, education: cvForm.education.filter((_: any, x: number) => x !== i) })}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2">Idiomas (nombre: nivel, separados por coma)</h3>
                  <input className="form-input" placeholder="Español: Nativo, Inglés: B2"
                    value={cvForm.languages.map((l: any) => `${l.name}: ${l.level}`).join(", ")}
                    onChange={(e) => setCvForm({ ...cvForm, languages: e.target.value.split(",").map((s: string) => { const [name, level] = s.split(":"); return { name: name?.trim(), level: level?.trim() }; }).filter((l: any) => l.name) })} />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-border/30">
                  <button className="btn btn-outline" onClick={() => setEditing(false)}>Cancelar</button>
                  <button className="btn btn-primary gap-2" onClick={saveCv}><Download size={15} /> Guardar CV</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DirectoryPage() {
  return <DirectoryView />;
}
