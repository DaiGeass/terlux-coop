"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Mail, Send, Inbox, Star, Trash2, PenLine, Search as SearchIcon,
  MessageSquare, LifeBuoy, Paperclip, X, CheckCircle2, Clock, AlertCircle,
} from "lucide-react";
import { cn, formatDate, initials } from "@/lib/utils";
import { useT } from "@/i18n";

// ============================================================
// CORREO (estilo Outlook)
// ============================================================
interface MailRow {
  id: string; folder: string; fromEmail: string; fromName: string | null;
  subject: string; body: string; isRead: boolean; isStarred: boolean; isImportant: boolean;
  sentAt: string | null; createdAt: string;
  attachments?: { name: string; url: string; size: number; mimeType: string }[] | null;
}

const FOLDERS = [
  { id: "inbox", label: "Bandeja de entrada", icon: Inbox },
  { id: "sent", label: "Enviados", icon: Send },
  { id: "starred", label: "Destacados", icon: Star },
  { id: "trash", label: "Papelera", icon: Trash2 },
];

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

function MailTab() {
  const t = useT();
  const [mails, setMails] = useState<MailRow[]>([]);
  const [folder, setFolder] = useState("inbox");
  const [selected, setSelected] = useState<MailRow | null>(null);
  const [composing, setComposing] = useState(false);
  const [compose, setCompose] = useState({
    to: "", subject: "", body: "",
    attachments: [] as { name: string; url: string; size: number; mimeType: string }[],
  });
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sendNote, setSendNote] = useState("");

  const attachMail = async (f: File) => {
    const fd = new FormData();
    fd.append("file", f);
    try {
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const d = await res.json();
      if (d.success) {
        setCompose((c) => ({
          ...c,
          attachments: [...c.attachments, { name: d.data.name, url: d.data.url, size: d.data.size, mimeType: d.data.mimeType }],
        }));
      }
    } catch { /* noop */ }
  };
  const removeMailAttach = (url: string) =>
    setCompose((c) => ({ ...c, attachments: c.attachments.filter((a) => a.url !== url) }));

  const load = (f: string) => {
    const actual = f === "starred" ? "inbox" : f;
    fetch(`/api/messages/mail?folder=${actual}`).then((r) => r.json()).then((d) => {
      let list: MailRow[] = d.data || [];
      if (f === "starred") list = list.filter((m) => m.isStarred);
      setMails(list);
      setSelected(null);
    });
  };
  useEffect(() => { load(folder); /* eslint-disable-next-line */ }, [folder]);

  const send = async () => {
    try {
      const res = await fetch("/api/messages/mail", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(compose),
      });
      const d = await res.json();
      if (!d.success) {
        setSendNote(d.error?.message || t("No se pudo enviar el correo"));
        return;
      }
      const external = d.data?.external || [];
      setSendNote(external.length
        ? `${t("Correo enviado")}. ${t("Destinatario(s) externo(s) (sin cuenta interna)")}: ${external.join(", ")}. ${t("Se guardó una copia en Enviados")}.`
        : t("Correo enviado"));
    } catch {
      setSendNote(t("No se pudo enviar el correo"));
    }
    setComposing(false); setCompose({ to: "", subject: "", body: "", attachments: [] });
    setFolder("sent"); load("sent");
  };

  const filtered = mails.filter((m) => m.subject.toLowerCase().includes(search.toLowerCase()) || (m.fromName || m.fromEmail).toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="glass-card overflow-hidden flex" style={{ height: "calc(100vh - 170px)" }}>
      {/* Carpetas */}
      <div className="w-56 flex-shrink-0 border-r border-border/30 p-3 hidden md:flex flex-col">
        <button onClick={() => setComposing(true)} className="btn btn-primary gap-2 mb-4 w-full">
          <PenLine size={15} /> {t("Nuevo correo")}
        </button>
        {FOLDERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFolder(f.id)}
            className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full transition-colors",
              folder === f.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent")}
          >
            <f.icon size={16} /> {t(f.label)}
          </button>
        ))}
        <div className="mt-auto p-3 rounded-lg bg-muted/50 text-[11px] text-muted-foreground">
          {t("Correo interno")}<br /><span className="font-normal">{t("Sincronizado con el buzón corporativo")}</span>
        </div>
      </div>

      {/* Lista */}
      <div className="w-80 flex-shrink-0 border-r border-border/30 flex flex-col">
        <div className="p-2 border-b border-border/20">
          <div className="relative">
            <SearchIcon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("Buscar correo")}
              className="w-full pl-8 pr-2 py-1.5 text-xs bg-background/60 border border-border/40 rounded-md focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((m) => (
            <button key={m.id} onClick={() => setSelected(m)}
              className={cn("w-full text-left p-3 border-b border-border/15 hover:bg-accent/50", selected?.id === m.id && "bg-primary/5")}>
              <div className="flex items-center gap-2">
                {m.isImportant && <AlertCircle size={12} className="text-red-500 flex-shrink-0" />}
                <span className={cn("text-sm truncate flex-1", !m.isRead && "font-semibold text-foreground")}>
                  {m.fromName || m.fromEmail}
                </span>
                {m.isStarred && <Star size={12} className="text-amber-400 fill-amber-400" />}
              </div>
              <p className={cn("text-xs truncate mt-0.5", !m.isRead ? "text-foreground" : "text-muted-foreground")}>{m.subject}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{m.sentAt ? formatDate(m.sentAt, "P") : ""}</p>
            </button>
          ))}
          {filtered.length === 0 && <p className="text-center text-xs text-muted-foreground p-6">{t("Sin correos en esta carpeta")}</p>}
        </div>
      </div>

      {/* Lectura */}
      <div className="flex-1 overflow-y-auto p-6 relative">
        {selected ? (
          <div>
            <h2 className="text-xl font-semibold text-foreground">{selected.subject}</h2>
            <div className="flex items-center gap-3 mt-3 pb-4 border-b border-border/20">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-xs font-semibold text-white">
                {initials(selected.fromName?.split(" ")[0] || "S", selected.fromName?.split(" ")[1] || "T")}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{selected.fromName}</p>
                <p className="text-xs text-muted-foreground">{selected.fromEmail}</p>
              </div>
              <span className="ml-auto text-xs text-muted-foreground">{selected.sentAt ? formatDate(selected.sentAt, "Pp") : ""}</span>
            </div>
            <div className="mt-4 text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
              {selected.body.split("\n").map((line, i) => {
                const m = line.match(/^📎 (.+?) (\/[^\s]+)$/);
                return m ? (
                  <div key={i}>
                    <a href={m[2]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-primary underline decoration-primary/40">
                      <Paperclip size={13} /> {m[1]}
                    </a>
                  </div>
                ) : (
                  <span key={i} className="block">{line || "\u00A0"}</span>
                );
              })}
            </div>
            {selected.attachments && selected.attachments.length > 0 && (
              <div className="mt-4 space-y-1.5">
                {selected.attachments.map((a) => (
                  <a key={a.url} href={a.url} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-muted/60 hover:bg-muted border border-border/40 max-w-full">
                    <Paperclip size={14} className="text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{a.name}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">· {formatSize(a.size)}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <Mail size={40} className="mb-3 opacity-30" />
            <p className="text-sm">{t("Selecciona un correo para leerlo")}</p>
          </div>
        )}

        {composing && (
          <div className="absolute bottom-4 right-4 w-96 glass-modal rounded-xl shadow-2xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-4 py-2.5 bg-primary text-primary-foreground">
              <span className="text-sm font-medium">{t("Nuevo mensaje")}</span>
              <button onClick={() => setComposing(false)}><X size={15} /></button>
            </div>
            <div className="p-3 space-y-2">
              <input value={compose.to} onChange={(e) => setCompose({ ...compose, to: e.target.value })} placeholder={t("Para: correo@terluxcoop.com (separar con coma para varios)")}
                className="w-full text-sm bg-transparent border-b border-border/30 py-1.5 focus:outline-none" />
              {sendNote && (
                <p className={cn("text-[11px] px-1", sendNote.includes(t("Correo enviado")) ? "text-emerald-500" : "text-destructive")}>
                  {sendNote}
                </p>
              )}
              <input value={compose.subject} onChange={(e) => setCompose({ ...compose, subject: e.target.value })} placeholder={t("Asunto")}
                className="w-full text-sm bg-transparent border-b border-border/30 py-1.5 focus:outline-none" />
              <textarea value={compose.body} onChange={(e) => setCompose({ ...compose, body: e.target.value })} rows={7}
                className="w-full text-sm bg-transparent py-1.5 focus:outline-none resize-none" placeholder={t("Escribe tu mensaje…")} />
              <div className="flex items-center justify-between">
                {compose.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-w-full min-h-0 pr-2">
                    {compose.attachments.map((a) => (
                      <span key={a.url} className="inline-flex items-center gap-1 text-[11px] bg-muted/70 border border-border/40 rounded-md px-2 py-1">
                        <Paperclip size={11} className="text-muted-foreground" />
                        <span className="max-w-[140px] truncate">{a.name}</span>
                        <span className="text-muted-foreground">· {formatSize(a.size)}</span>
                        <button onClick={() => removeMailAttach(a.url)} title={t("Quitar adjunto")} className="text-muted-foreground hover:text-destructive"><X size={11} /></button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) attachMail(f); e.target.value = ""; }}
                  />
                  <button onClick={() => fileInputRef.current?.click()} title={t("Adjuntar archivo")} className="p-2 rounded hover:bg-accent"><Paperclip size={15} /></button>
                  <button onClick={send} className="btn btn-primary btn-sm gap-2"><Send size={13} /> {t("Enviar")}</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// CHAT EN TIEMPO REAL (SSE)
// ============================================================
interface ChatMessage {
  id: string; body: string; senderId: string; createdAt: string;
  sender: { id: string; name: string; role: string } | null;
  attachment?: { id: string; name: string; size: number; downloadUrl?: string } | null;
}

function ChatTab() {
  const t = useT();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [conversationId, setConversationId] = useState<string>("");
  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<{ id: string; name: string; role: string; position: string | null; lastLogin: string | null; isActive: boolean }[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([]);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [driveAttachId, setDriveAttachId] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/files?scope=mine").then((r) => r.json()).then((d) => {
      if (d.success) setDriveFiles((d.data?.files || []).map((f: DriveFile) => ({ id: f.id, name: f.name, size: f.size })));
    });
  }, []);

  useEffect(() => {
    let es: EventSource | null = null;
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setMe(d.data ? { id: d.data.id, name: `${d.data.firstName} ${d.data.lastName}` } : null));
    fetch("/api/messages/chat").then((r) => r.json()).then((d) => {
      if (d.data) {
        setMessages(d.data.messages);
        setOnlineUsers(d.data.users);
        setOnlineCount(d.data.online);
        setConversationId(d.data.conversation.id);
        es = new EventSource(`/api/realtime/stream?channel=chat:${d.data.conversation.id}`);
        es.onmessage = (ev) => {
          try {
            const parsed = JSON.parse(ev.data);
            if (parsed.event === "message") {
              setMessages((prev) => [...prev.filter((x) => x.id !== parsed.data.id), parsed.data]);
            }
          } catch { /* noop */ }
        };
      }
    });
    return () => { es?.close(); };
  }, []);

  const isOnline = (u: { lastLogin: string | null; isActive: boolean }) =>
    u.isActive && !!u.lastLogin && Date.now() - new Date(u.lastLogin).getTime() < 5 * 60_000;

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!text.trim() && attachments.length === 0) return;
    const body = text.trim();
    setText("");
    setAttachments([]);
    const attId = driveAttachId;
    setDriveAttachId("");
    await fetch("/api/messages/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, body, attachmentFileId: attId || null }),
    });
  };

  const attachFile = async (f: File) => {
    const fd = new FormData();
    fd.append("file", f);
    try {
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const d = await res.json();
      if (d.success) setAttachments((prev) => [...prev, { name: d.data.name, url: d.data.url }]);
    } catch { /* noop */ }
  };

  const renderBody = (body: string) =>
    body.split("\n").map((line, i) => {
      const m = line.match(/^📎 (.+?) (\/[^\s]+)$/);
      return m ? (
        <a key={i} href={m[2]} target="_blank" rel="noreferrer" className="underline decoration-primary/50 text-primary break-all">
          📎 {m[1]}
        </a>
      ) : (
        <span key={i} className="block">{line || "\u00A0"}</span>
      );
    });

  const submitWithAttachments = async () => {
    for (const a of attachments) {
      await fetch("/api/messages/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, body: `📎 ${a.name} ${a.url}` }),
      });
    }
    await send();
  };

  return (
    <div className="glass-card overflow-hidden flex" style={{ height: "calc(100vh - 170px)" }}>
      {/* Usuarios */}
      <div className="w-64 flex-shrink-0 border-r border-border/30 p-3 hidden lg:block overflow-y-auto">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase px-2 mb-2">
          {t("Directorio")} · {onlineCount} {t("en línea")}
        </h3>
        {onlineUsers.map((u) => (
          <div key={u.id} className={`flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors ${isOnline(u) ? "hover:bg-accent/50" : "opacity-60"}`}>
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-[10px] font-semibold text-white">
                {initials(u.name.split(" ")[0], u.name.split(" ")[1] || "")}
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${isOnline(u) ? "bg-emerald-500" : "bg-gray-500/50"}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{u.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{isOnline(u) ? t("En línea") : (u.position || u.role)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
          <MessageSquare size={16} className="text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">{t("Canal General")}</p>
            <p className="text-[10px] text-muted-foreground">{t("Sincronizado por socket · app de escritorio por VPN")}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
          {messages.map((m) => {
            const mine = m.senderId === me?.id;
            return (
              <div key={m.id} className={cn("flex gap-2.5", mine && "flex-row-reverse")}>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0">
                  {m.sender ? initials(m.sender.name.split(" ")[0], m.sender.name.split(" ")[1] || "") : "??"}
                </div>
                <div className={cn("max-w-[70%]", mine && "text-right")}>
                  <p className="text-[10px] text-muted-foreground mb-0.5">
                    {m.sender?.name || t("Usuario")} · {formatDate(m.createdAt, "p")}
                  </p>
                  <div className={cn("inline-block px-3 py-2 rounded-2xl text-sm",
                    mine ? "bg-primary text-primary-foreground rounded-tr-sm" : "glass-card rounded-tl-sm text-foreground")}>
                    {renderBody(m.body)}
                    {m.attachment && (
                      <a href={m.attachment.downloadUrl} target="_blank" rel="noreferrer" className={cn("mt-1.5 inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg", mine ? "bg-white/15 hover:bg-white/25" : "bg-muted/60 hover:bg-muted")}>
                        <Paperclip size={11} /> {m.attachment.name}
                        <span className={mine ? "text-primary-foreground/70" : "text-muted-foreground"}>· {m.attachment.size ? formatSize(m.attachment.size) : ""}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <div className="p-3 border-t border-border/30 flex flex-col gap-2">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((a, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md bg-primary/10 text-primary">
                  <Paperclip size={11} /> {a.name}
                  <button onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))} className="hover:text-red-400"><X size={11} /></button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) attachFile(f); e.target.value = ""; }}
            />
            <button onClick={() => fileInputRef.current?.click()} title={t("Adjuntar archivo")} className="px-3 py-2 text-muted-foreground hover:text-foreground transition-colors">
              <Paperclip size={17} />
            </button>
            <select
              value={driveAttachId}
              onChange={(e) => setDriveAttachId(e.target.value)}
              title={t("Adjuntar archivo del drive")}
              className="px-2 py-2 text-xs bg-background/60 border border-border/40 rounded-lg focus:outline-none max-w-[140px]"
            >
              <option value="">{t("Drive")}</option>
              {driveFiles.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (attachments.length ? submitWithAttachments() : send())}
              placeholder={t("Escribe un mensaje al equipo…")}
              className="flex-1 px-3 py-2 text-sm bg-background/60 border border-border/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
            <button onClick={attachments.length ? submitWithAttachments : send} className="btn btn-primary gap-2"><Send size={15} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SOPORTE (tickets)
// ============================================================
interface Ticket {
  id: string; subject: string; category: string; priority: string; status: string;
  createdAt: string; messages: { id: string; body: string; senderId: string; createdAt: string; isInternalNote: boolean; attachment?: { id: string; name: string; size: number; downloadUrl?: string } | null }[];
}

interface DriveFile { id: string; name: string; size: number; }

const STATUS_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  open: { label: "Abierto", icon: AlertCircle, color: "#ef4444" },
  waiting: { label: "En proceso", icon: Clock, color: "#f59e0b" },
  resolved: { label: "Resuelto", icon: CheckCircle2, color: "#10b981" },
  closed: { label: "Cerrado", icon: CheckCircle2, color: "#6b7280" },
};

function SupportTab() {
  const t = useT();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: "", category: "technical", priority: "medium", body: "" });
  const [reply, setReply] = useState("");
  const [me, setMe] = useState<{ id: string } | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [replyAttachId, setReplyAttachId] = useState("");

  const load = () => fetch("/api/messages/tickets").then((r) => r.json()).then((d) => setTickets(d.data || []));
  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setMe(d.data || null));
    load();
    fetch("/api/files?scope=mine").then((r) => r.json()).then((d) => {
      if (d.success) setDriveFiles((d.data?.files || []).map((f: DriveFile) => ({ id: f.id, name: f.name, size: f.size })));
    });
  }, []);

  const createTicket = async () => {
    if (!form.subject.trim() || !form.body.trim()) return;
    await fetch("/api/messages/tickets", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    setForm({ subject: "", category: "technical", priority: "medium", body: "" });
    setShowForm(false);
    load();
  };

  const sendReply = async () => {
    if ((!reply.trim() && !replyAttachId) || !selected) return;
    await fetch("/api/messages/tickets", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: selected.id, body: reply, attachmentFileId: replyAttachId || null }),
    });
    setReply("");
    setReplyAttachId("");
    const d = await (await fetch("/api/messages/tickets")).json();
    setTickets(d.data || []);
    setSelected((d.data || []).find((t: Ticket) => t.id === selected.id) || null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ minHeight: "calc(100vh - 190px)" }}>
      <div className="glass-card p-4 lg:col-span-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><LifeBuoy size={15} /> {t("Mis tickets")}</h3>
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary btn-sm gap-1"><PenLine size={13} /> {t("Nuevo")}</button>
        </div>
        {showForm && (
          <div className="space-y-2 mb-3 p-3 rounded-lg bg-muted/40">
            <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder={t("Asunto")} className="form-input text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="form-select text-sm">
                <option value="technical">{t("Técnico")}</option><option value="billing">{t("Facturación")}</option>
                <option value="sales">{t("Comercial")}</option><option value="hr">{t("RRHH")}</option><option value="general">{t("General")}</option>
              </select>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="form-select text-sm">
                <option value="low">{t("Baja")}</option><option value="medium">{t("Media")}</option><option value="high">{t("Alta")}</option><option value="critical">{t("Urgente")}</option>
              </select>
            </div>
            <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={3} placeholder={t("Describe tu consulta…")} className="form-textarea text-sm" />
            <button onClick={createTicket} className="btn btn-primary btn-sm w-full">{t("Enviar ticket")}</button>
          </div>
        )}
        <div className="space-y-2">
          {tickets.map((tk) => {
            const meta = STATUS_META[tk.status];
            return (
              <button key={tk.id} onClick={() => setSelected(tk)}
                className={cn("w-full text-left p-3 rounded-lg border transition-colors",
                  selected?.id === tk.id ? "border-primary/50 bg-primary/5" : "border-border/30 hover:bg-accent/40")}>
                <div className="flex items-center gap-2">
                  <meta.icon size={13} style={{ color: meta.color }} />
                  <span className="text-sm font-medium text-foreground truncate flex-1">{tk.subject}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: meta.color + "20", color: meta.color }}>{t(meta.label)}</span>
                  <span className="text-[10px] text-muted-foreground">{formatDate(tk.createdAt)}</span>
                </div>
              </button>
            );
          })}
          {tickets.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">{t("No tienes tickets. Crea uno y el equipo de soporte te responderá.")}</p>}
        </div>
      </div>

      <div className="glass-card p-4 lg:col-span-2 flex flex-col">
        {selected ? (
          <>
            <div className="pb-3 border-b border-border/30">
              <h3 className="text-base font-semibold text-foreground">{selected.subject}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {selected.category} · {selected.priority} · {formatDate(selected.createdAt, "Pp")}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {selected.messages.map((m) => {
                const mine = m.senderId === me?.id;
                return (
                  <div key={m.id} className={cn("flex gap-2.5", mine && "flex-row-reverse")}>
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold">
                      {mine ? t("Me") : t("ST")}
                    </div>
                    <div className={cn("max-w-[75%] glass-card p-3 rounded-2xl text-sm", mine && "bg-primary/10")}>
                      <p className="text-foreground whitespace-pre-wrap">{m.body}</p>
                      {m.attachment && (
                        <div className="mt-2">
                          <a href={m.attachment.downloadUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg bg-muted/60 hover:bg-muted text-foreground">
                            <Paperclip size={12} /> {m.attachment.name}
                            <span className="text-muted-foreground">· {m.attachment.size ? formatSize(m.attachment.size) : ""}</span>
                          </a>
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">{formatDate(m.createdAt, "p")}{mine ? " · " + t("tú") : " · " + t("soporte")}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 pt-3 border-t border-border/30">
              <input value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendReply()}
                placeholder={t("Escribe una respuesta…")} className="flex-1 form-input text-sm" />
              <select value={replyAttachId} onChange={(e) => setReplyAttachId(e.target.value)} title={t("Adjuntar archivo del drive")}
                className="form-select text-sm max-w-[160px]">
                <option value="">{t("Adjuntar")}</option>
                {driveFiles.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <button onClick={sendReply} className="btn btn-primary gap-2"><Send size={14} /> {t("Responder")}</button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <LifeBuoy size={40} className="mb-3 opacity-30" />
            <p className="text-sm">{t("Selecciona un ticket o crea uno nuevo")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// CONTENEDOR CON PESTAÑAS
// ============================================================
function MessagesInner() {
  const t = useT();
  const params = useSearchParams();
  const [tab, setTab] = useState(params.get("tab") || (params.get("soporte") ? "support" : "mail"));
  const tabs = [
    { id: "mail", label: t("Correo"), icon: Mail },
    { id: "chat", label: t("Chat de equipo"), icon: MessageSquare },
    { id: "support", label: t("Soporte"), icon: LifeBuoy },
  ];
  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("Mensajería")}</h1>
          <p className="page-subtitle">{t("Correo corporativo, chat en tiempo real y tickets de soporte")}</p>
        </div>
      </div>
      <div className="flex gap-1 p-1 glass-card w-fit">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>
      {tab === "mail" && <MailTab />}
      {tab === "chat" && <ChatTab />}
      {tab === "support" && <SupportTab />}
    </div>
  );
}

export default function MessagesPage() {
  const t = useT();
  return (
    <Suspense fallback={<div className="p-10 text-center text-muted-foreground">{t("Cargando…")}</div>}>
      <MessagesInner />
    </Suspense>
  );
}
