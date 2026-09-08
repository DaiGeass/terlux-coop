"use client";

import { useEffect, useRef, useState } from "react";
import {
  Upload, UploadCloud, FolderPlus, Search, Grid3x3, List, Download, Trash2,
  FileText, FileImage, FileVideo, FileAudio, File as FileIcon,
  Folder, HardDrive, Cloud, RefreshCw, X,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

interface FileRow {
  id: string;
  name: string;
  url: string | null;
  downloadUrl?: string | null;
  size: number;
  type: string;
  extension: string;
  category: string | null;
  createdAt: string;
}
interface FolderRow { id: string; name: string; color: string | null; createdAt: string; }

const BUCKETS = [
  { name: "Documentos corporativos", used: 18.4, quota: 100, color: "#3b82f6" },
  { name: "Proyectos", used: 132.7, quota: 500, color: "#8b5cf6" },
  { name: "Personal", used: 3.1, quota: 10, color: "#10b981" },
];

function fileIcon(type: string) {
  switch (type) {
    case "image": return <FileImage size={28} className="text-purple-500" />;
    case "video": return <FileVideo size={28} className="text-red-500" />;
    case "audio": return <FileAudio size={28} className="text-cyan-500" />;
    case "document": return <FileText size={28} className="text-blue-500" />;
    default: return <FileIcon size={28} className="text-muted-foreground" />;
  }
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

const STARTER_FOLDERS = [
  { name: "Contratos", color: "#3b82f6" },
  { name: "Facturas", color: "#f59e0b" },
  { name: "Recursos Humanos", color: "#10b981" },
  { name: "Marketing", color: "#ec4899" },
];

export default function DrivePage() {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<"files" | "folder">("files");
  const inputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const res = await fetch("/api/files");
    const data = await res.json();
    if (data.success) {
      setFiles(data.data.files);
      let folds: FolderRow[] = data.data.folders;
      if (folds.length === 0) {
        for (const f of STARTER_FOLDERS) {
          const fd = new FormData();
          fd.append("name", f.name);
          await fetch("/api/files", { method: "POST", body: fd });
        }
        const res2 = await fetch("/api/files");
        const d2 = await res2.json();
        folds = d2.data.folders;
      }
      setFolders(folds);
    }
  };

  useEffect(() => { load(); }, []);

  const uploadFiles = async (list: FileList | File[]) => {
    const fd = new FormData();
    Array.from(list).forEach((f) => fd.append("files", f));
    setUploading(true);
    setProgress(10);
    const timer = setInterval(() => setProgress((p) => Math.min(p + 15, 90)), 180);
    await fetch("/api/files", {
      method: "POST",
      body: fd,
      headers: {},
    });
    clearInterval(timer);
    setProgress(100);
    setTimeout(() => { setUploading(false); setProgress(0); load(); }, 400);
  };

  const uploadFolder = async (list: FileList) => {
    const fd = new FormData();
    const filesArr: File[] = Array.from(list);
    if (!filesArr.length) return;
    const basePath = filesArr[0].webkitRelativePath?.split("/")[0] || "carpeta";
    fd.append("basePath", basePath);
    filesArr.forEach((f) => fd.append("files", f));
    setUploading(true);
    setProgress(10);
    const timer = setInterval(() => setProgress((p) => Math.min(p + 15, 90)), 180);
    await fetch("/api/files", { method: "POST", body: fd });
    clearInterval(timer);
    setProgress(100);
    setTimeout(() => { setUploading(false); setProgress(0); load(); }, 400);
  };

  const remove = async (id: string) => {
    await fetch(`/api/files?id=${id}`, { method: "DELETE" });
    setFiles((p) => p.filter((f) => f.id !== id));
  };

  const filtered = files.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex gap-6">
      {/* Panel lateral */}
      <aside className="w-64 flex-shrink-0 space-y-4 hidden lg:block">
        <div className="glass-card p-4 space-y-2">
          <button onClick={() => inputRef.current?.click()} className="w-full btn btn-primary gap-2">
            <Upload size={16} /> Subir archivos
          </button>
          <button onClick={() => folderInputRef.current?.click()} className="w-full btn btn-outline gap-2">
            <UploadCloud size={16} /> Subir carpeta
          </button>
          <button
            onClick={async () => {
              const name = prompt("Nombre de la carpeta:");
              if (!name) return;
              const fd = new FormData();
              fd.append("name", name);
              await fetch("/api/files", { method: "POST", body: fd });
              load();
            }}
            className="w-full btn btn-outline gap-2"
          >
            <FolderPlus size={16} /> Nueva carpeta
          </button>
        </div>

        <div className="glass-card p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3 flex items-center gap-2">
            <Cloud size={14} /> Almacenamiento conectado
          </h3>
          <div className="space-y-4">
            {BUCKETS.map((b) => (
              <div key={b.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-foreground">{b.name}</span>
                  <span className="text-muted-foreground">{b.used}/{b.quota} GB</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(b.used / b.quota) * 100}%`, background: b.color }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-border/30 flex items-center gap-2 text-[11px] text-muted-foreground">
            <HardDrive size={12} />
            Almacén: <span className="font-mono">MinIO S3 · 127.0.0.1:9000</span>
          </div>
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex-1 space-y-4 min-w-0">
        <div className="glass-card p-3 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar en Mi unidad…"
              className="w-full pl-9 pr-3 py-2 text-sm bg-background/60 border border-border/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <button onClick={load} className="p-2 rounded-lg hover:bg-accent"><RefreshCw size={16} /></button>
          <div className="flex rounded-lg border border-border/40 overflow-hidden">
            <button onClick={() => setView("grid")} className={cn("p-2", view === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-accent")}><Grid3x3 size={16} /></button>
            <button onClick={() => setView("list")} className={cn("p-2", view === "list" ? "bg-primary text-primary-foreground" : "hover:bg-accent")}><List size={16} /></button>
          </div>
          <button onClick={() => inputRef.current?.click()} className="lg:hidden btn btn-primary gap-2 btn-sm"><Upload size={14} /> Subir</button>
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          // @ts-expect-error webkitdirectory no está en los tipos estándar de React
          webkitdirectory=""
          className="hidden"
          onChange={(e) => e.target.files && uploadFolder(e.target.files)}
        />

        {/* Zona de arrastre */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault(); setDragOver(false);
            if (!e.dataTransfer.files.length) return;
            const arr = Array.from(e.dataTransfer.files);
            if (arr.some((f) => f.webkitRelativePath)) uploadFolder(e.dataTransfer.files);
            else uploadFiles(e.dataTransfer.files);
          }}
          className={cn(
            "glass-card border-2 border-dashed p-10 text-center transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-border/50"
          )}
        >
          <Upload size={32} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-foreground font-medium">Arrastra archivos o carpetas aquí, o usa “Subir archivos / Subir carpeta”</p>
          <p className="text-xs text-muted-foreground mt-1">Documentos, imágenes, vídeo, audio · se guardan en MinIO S3 y se indexan en el Drive</p>
          {uploading && (
            <div className="max-w-xs mx-auto mt-4">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Subiendo… {progress}%</p>
            </div>
          )}
        </div>

        {/* Carpetas */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Carpetas</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {folders.map((f) => (
              <div key={f.id} className="glass-card p-4 flex items-center gap-3 hover:shadow-md transition-shadow cursor-pointer">
                <Folder size={26} style={{ color: f.color || "#6366f1" }} fill={f.color || "#6366f1"} fillOpacity={0.15} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
                  <p className="text-[11px] text-muted-foreground">{formatDate(f.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Archivos */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Archivos ({filtered.length})</h2>
          {filtered.length === 0 ? (
            <div className="glass-card p-10 text-center text-sm text-muted-foreground">
              Aún no hay archivos. Sube el primero para verlo aquí.
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
              {filtered.map((f) => (
                <div key={f.id} className="glass-card p-4 flex flex-col items-center text-center gap-2 group hover:shadow-md transition-shadow">
                  {fileIcon(f.type)}
                  <p className="text-xs font-medium text-foreground line-clamp-2 w-full">{f.name}</p>
                  <p className="text-[10px] text-muted-foreground">{formatSize(f.size)}</p>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {f.downloadUrl && (
                      <a href={f.downloadUrl} target="_blank" className="p-1.5 rounded hover:bg-accent" title="Descargar"><Download size={13} /></a>
                    )}
                    <button onClick={() => remove(f.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive" title="Eliminar"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 text-left text-xs text-muted-foreground uppercase">
                    <th className="p-3">Nombre</th><th className="p-3">Tipo</th><th className="p-3">Tamaño</th><th className="p-3">Subido</th><th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f) => (
                    <tr key={f.id} className="border-b border-border/15 hover:bg-accent/40">
                      <td className="p-3 flex items-center gap-2">{fileIcon(f.type)} <span className="text-foreground">{f.name}</span></td>
                      <td className="p-3 text-muted-foreground uppercase text-xs">{f.extension || "—"}</td>
                      <td className="p-3 text-muted-foreground">{formatSize(f.size)}</td>
                      <td className="p-3 text-muted-foreground">{formatDate(f.createdAt)}</td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          {f.downloadUrl && <a href={f.downloadUrl} className="p-1.5 rounded hover:bg-accent"><Download size={14} /></a>}
                          <button onClick={() => remove(f.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
