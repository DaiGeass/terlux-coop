/* ============================================================
   TerLux Coop Desktop — Lógica de la interfaz
   Comunicación con el backend Rust mediante comandos de Tauri.
   ============================================================ */

const TAURI = window.__TAURI__ || {};
const invoke = (cmd, args) =>
  TAURI.core ? TAURI.core.invoke(cmd, args) : Promise.reject(new Error("Tauri no disponible"));
const listen = (evt, cb) => (TAURI.event ? TAURI.event.listen(evt, cb) : Promise.resolve(() => {}));

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// ------------------------------------------------------------
// Estado en memoria
// ------------------------------------------------------------
const App = {
  config: null,
  session: null,
  caps: null,
  conn: null,
  view: "dashboard",
  notifications: [],
  chatMessages: [],
  cache: {},
  pendingSession: null,
};

// ------------------------------------------------------------
// Utilidades
// ------------------------------------------------------------
function toast(message, kind = "") {
  const node = document.createElement("div");
  node.className = `toast ${kind}`;
  node.textContent = message;
  $("#toast-stack").appendChild(node);
  setTimeout(() => node.remove(), 4200);
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function bytes(n) {
  const v = Number(n) || 0;
  if (v < 1024) return `${v} B`;
  if (v < 1048576) return `${(v / 1024).toFixed(1)} KB`;
  if (v < 1073741824) return `${(v / 1048576).toFixed(1)} MB`;
  return `${(v / 1073741824).toFixed(2)} GB`;
}

function when(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Llama a la API web a través del backend Rust (con caché sin conexión). */
async function api(method, path, body = null, cacheKey = null) {
  try {
    const res = await invoke("api_request", { method, path, body, cacheKey });
    if (res && res._offline) setOffline(true);
    return res;
  } catch (e) {
    const msg = String(e);
    if (msg.includes("SESSION_EXPIRED")) {
      toast("La sesión ha caducado, vuelve a iniciar sesión", "warn");
      showLogin();
      throw e;
    }
    throw e;
  }
}

function setOffline(on) {
  $("#offline-banner").classList.toggle("hidden", !on);
}

// ------------------------------------------------------------
// Navegación (filtrada por rol)
// ------------------------------------------------------------
const NAV = [
  { group: "Principal", items: [
    { id: "dashboard", label: "Panel", icon: "◈", cap: "dashboard", title: "Panel", sub: "Resumen de tu actividad y del sistema" },
    { id: "tasks", label: "Tareas", icon: "☑", cap: "tasks", title: "Tareas", sub: "Tablero Kanban sincronizado con la plataforma" },
    { id: "files", label: "Archivos", icon: "🗂", cap: "files", title: "Archivos", sub: "Sube y sincroniza documentos con el almacenamiento" },
    { id: "messages", label: "Mensajes", icon: "✉", cap: "messages", title: "Mensajería", sub: "Chat del equipo y bandeja de correo" },
    { id: "directory", label: "Directorio", icon: "👥", cap: "directory", title: "Directorio", sub: "Personas de la organización" },
  ]},
  { group: "Personal", items: [
    { id: "hr", label: "RR. HH.", icon: "🏛", cap: "hr_self", title: "Recursos Humanos", sub: "Días libres y solicitudes" },
  ]},
  { group: "Operaciones", items: [
    { id: "devices", label: "Dispositivos", icon: "💻", cap: "devices_view", title: "Dispositivos", sub: "Inventario de equipos (MDM)" },
    { id: "jobs", label: "Trabajos", icon: "⚡", cap: "jobs", title: "Cola de trabajos", sub: "Procesos en segundo plano" },
  ]},
  { group: "Administración", items: [
    { id: "admin", label: "Administración", icon: "🛡", cap: "admin_users", title: "Administración", sub: "Usuarios y métricas de la plataforma" },
    { id: "tech", label: "Técnico / BD", icon: "🗄", cap: "technician_sql", title: "Panel técnico", sub: "Acceso directo a PostgreSQL por VPN" },
  ]},
  { group: "Sistema", items: [
    { id: "settings", label: "Ajustes", icon: "⚙", cap: null, title: "Ajustes", sub: "Servidor, VPN y preferencias" },
  ]},
];

function buildNav() {
  const nav = $("#nav");
  nav.innerHTML = "";
  NAV.forEach((section) => {
    const allowed = section.items.filter((i) => !i.cap || (App.caps && App.caps[i.cap]));
    if (!allowed.length) return;

    const label = document.createElement("div");
    label.className = "nav-group";
    label.textContent = section.group;
    nav.appendChild(label);

    allowed.forEach((item) => {
      const btn = document.createElement("button");
      btn.className = "nav-item" + (item.id === App.view ? " active" : "");
      btn.dataset.view = item.id;
      btn.innerHTML = `<span class="nav-ico">${item.icon}</span><span>${esc(item.label)}</span>`;
      btn.onclick = () => switchView(item.id);
      nav.appendChild(btn);
    });
  });
}

function findNavItem(id) {
  for (const s of NAV) {
    const found = s.items.find((i) => i.id === id);
    if (found) return found;
  }
  return null;
}

function switchView(id) {
  App.view = id;
  $$(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.view === id));
  $$(".view").forEach((v) => v.classList.toggle("hidden", v.dataset.view !== id));

  const meta = findNavItem(id);
  if (meta) {
    $("#view-title").textContent = meta.title;
    $("#view-sub").textContent = meta.sub;
  }
  loadView(id);
}

async function loadView(id) {
  try {
    if (id === "dashboard") await renderDashboard();
    if (id === "tasks") await renderTasks();
    if (id === "files") await renderFiles();
    if (id === "messages") await renderMessages();
    if (id === "directory") await renderDirectory();
    if (id === "hr") await renderHR();
    if (id === "devices") await renderDevices();
    if (id === "jobs") await renderJobs();
    if (id === "admin") await renderAdmin();
    if (id === "tech") await renderTech();
    if (id === "settings") await renderSettings();
  } catch (e) {
    console.error(`[view:${id}]`, e);
  }
}

// ------------------------------------------------------------
// Conexión / VPN
// ------------------------------------------------------------
function paintConnection(status) {
  App.conn = status;
  const dotClass = status.api_reachable ? (status.vpn_interface ? "dot-ok" : "dot-warn") : "dot-off";

  const pill = $("#conn-pill");
  if (pill) {
    pill.querySelector(".dot").className = `dot ${dotClass}`;
    $("#conn-title").textContent = status.api_reachable ? "Conectado" : "Sin conexión";
    $("#conn-sub").textContent = status.vpn_ip
      ? `VPN ${status.vpn_ip}${status.latency_ms != null ? ` · ${status.latency_ms} ms` : ""}`
      : status.vpn_interface ? "VPN activa" : "Fuera de la VPN";
  }

  const loginDot = $("#login-conn .dot");
  if (loginDot) {
    loginDot.className = `dot ${dotClass}`;
    $("#login-conn-text").textContent = status.summary;
  }

  setOffline(!status.api_reachable);
}

async function refreshConnection() {
  try {
    paintConnection(await invoke("check_connection"));
  } catch (e) {
    console.error("[conn]", e);
  }
}

// ------------------------------------------------------------
// Sesión
// ------------------------------------------------------------
function showLogin() {
  App.session = null;
  App.caps = null;
  App.pendingSession = null;
  $("#app-shell").classList.add("hidden");
  $("#terms-screen").classList.add("hidden");
  $("#login-screen").classList.remove("hidden");
}

async function showApp(session) {
  App.session = session;
  App.caps = await invoke("capabilities");

  // Gate de términos y condiciones (primer acceso / políticas nuevas)
  const accepted = await termsAccepted();
  if (!accepted) {
    App.pendingSession = session;
    $("#login-screen").classList.add("hidden");
    $("#terms-screen").classList.remove("hidden");
    return;
  }

  await enterApp(session);
}

async function termsAccepted() {
  try {
    const d = await api("GET", "/api/auth/me");
    return !!(d && d.data && d.data.termsAcceptedAt);
  } catch {
    // Si la API no responde, no bloqueamos el acceso
    return true;
  }
}

async function enterApp(session) {
  $("#login-screen").classList.add("hidden");
  $("#terms-screen").classList.add("hidden");
  $("#app-shell").classList.remove("hidden");

  $("#user-name").textContent = `${session.firstName} ${session.lastName}`;
  $("#user-role").textContent = roleLabel(session.role);
  $("#user-avatar").textContent =
    (session.firstName[0] || "?") + (session.lastName[0] || "?");

  buildNav();
  switchView("dashboard");
}

function roleLabel(role) {
  return ({
    super_admin: "Super administrador",
    admin: "Administrador",
    manager: "Gestor",
    hr: "Recursos Humanos",
    finance: "Finanzas",
    support: "Soporte",
    employee: "Empleado",
    client: "Cliente",
  })[role] || "Invitado";
}

// ------------------------------------------------------------
// VISTA · PANEL
// ------------------------------------------------------------
async function renderDashboard() {
  const info = await invoke("device_info").catch(() => null);
  const conn = App.conn || {};

  let tasks = [];
  try {
    const res = await api("GET", "/api/tasks", null, "tasks");
    tasks = res?.data || [];
  } catch { /* modo sin conexión */ }

  const done = tasks.filter((t) => t.status === "done").length;
  const pending = tasks.length - done;

  $("#dash-stats").innerHTML = [
    card("Tareas pendientes", pending, "asignadas a la organización"),
    card("Tareas completadas", done, "histórico registrado"),
    card("Latencia API", conn.latency_ms != null ? `${conn.latency_ms} ms` : "—", conn.api_reachable ? "servidor accesible" : "sin respuesta"),
    card("Estado VPN", conn.vpn_interface ? "Activa" : "Inactiva", conn.vpn_ip || "sin dirección asignada"),
  ].join("");

  $("#dash-tasks").innerHTML = tasks.length
    ? tasks.slice(0, 8).map((t) => `
        <div class="list-item">
          <span class="tag ${t.priority === "critical" ? "tag-danger" : t.priority === "high" ? "tag-warn" : "tag-info"}">${esc(t.priority)}</span>
          <div class="li-main">
            <div class="li-title">${esc(t.title)}</div>
            <div class="li-sub">${esc(statusLabel(t.status))}</div>
          </div>
        </div>`).join("")
    : `<p class="muted pad">No hay tareas registradas.</p>`;

  $("#dash-infra").innerHTML = [
    infraRow("Servidor web", conn.api_reachable, `${App.config?.host}:${App.config?.port}`),
    infraRow("Puerta de enlace VPN", conn.gateway_reachable, App.config?.vpn_gateway),
    infraRow("Base de datos", conn.database_reachable, `${App.config?.db_host}:${App.config?.db_port}`),
    infraRow("Almacenamiento", conn.storage_reachable, `${App.config?.storage_host}:${App.config?.storage_port}`),
  ].join("");

  if (info) {
    $("#dash-device").innerHTML = kv({
      Equipo: info.device_name,
      Plataforma: `${info.platform} ${info.arch}`,
      Sistema: info.os_version,
      Procesador: info.cpu,
      Núcleos: info.cpu_cores,
      Memoria: `${info.total_memory_mb} MB`,
      "IP en la VPN": info.vpn_ip || "no asignada",
      "ID de cliente": info.client_id.slice(0, 16) + "…",
    });
  }
}

function card(label, value, hint) {
  return `<div class="stat-card glass">
    <div class="label">${esc(label)}</div>
    <div class="value">${esc(value)}</div>
    <div class="hint">${esc(hint)}</div>
  </div>`;
}

function infraRow(name, ok, detail) {
  return `<div class="list-item">
    <span class="dot ${ok ? "dot-ok" : "dot-off"}"></span>
    <div class="li-main">
      <div class="li-title">${esc(name)}</div>
      <div class="li-sub mono">${esc(detail || "")}</div>
    </div>
    <span class="tag ${ok ? "tag-ok" : "tag-danger"}">${ok ? "OK" : "sin respuesta"}</span>
  </div>`;
}

function kv(obj) {
  return Object.entries(obj)
    .map(([k, v]) => `<div><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`)
    .join("");
}

function statusLabel(s) {
  return ({ todo: "Por hacer", in_progress: "En progreso", review: "En revisión", done: "Completada", blocked: "Bloqueada" })[s] || s;
}

// ------------------------------------------------------------
// VISTA · TAREAS (Kanban con arrastrar y soltar)
// ------------------------------------------------------------
const COLUMNS = [
  { id: "todo", label: "Por hacer", color: "#94a3b8" },
  { id: "in_progress", label: "En progreso", color: "#3b82f6" },
  { id: "review", label: "En revisión", color: "#f59e0b" },
  { id: "done", label: "Completadas", color: "#10b981" },
];

async function renderTasks() {
  let tasks = [];
  try {
    const res = await api("GET", "/api/tasks", null, "tasks");
    tasks = res?.data || [];
  } catch (e) {
    toast("No se pudieron cargar las tareas", "error");
  }

  $("#kanban").innerHTML = COLUMNS.map((col) => {
    const items = tasks.filter((t) => t.status === col.id);
    return `<div class="kcol" data-col="${col.id}">
      <h4><span class="dot" style="background:${col.color}"></span>${esc(col.label)}
        <span class="tag">${items.length}</span></h4>
      ${items.map((t) => `
        <div class="kcard" draggable="true" data-id="${esc(t.id)}">
          <div class="kt">${esc(t.title)}</div>
          <span class="tag ${t.priority === "critical" ? "tag-danger" : t.priority === "high" ? "tag-warn" : "tag-info"}">${esc(t.priority)}</span>
        </div>`).join("")}
    </div>`;
  }).join("");

  // Arrastrar y soltar
  let dragId = null;
  $$(".kcard").forEach((c) => {
    c.addEventListener("dragstart", () => { dragId = c.dataset.id; });
  });
  $$(".kcol").forEach((col) => {
    col.addEventListener("dragover", (e) => { e.preventDefault(); col.classList.add("drag-over"); });
    col.addEventListener("dragleave", () => col.classList.remove("drag-over"));
    col.addEventListener("drop", async () => {
      col.classList.remove("drag-over");
      if (!dragId) return;
      const status = col.dataset.col;
      try {
        await api("PATCH", "/api/tasks", { id: dragId, status, completionPercentage: status === "done" ? 100 : 0 });
        dragId = null;
        renderTasks();
      } catch { toast("No se pudo mover la tarea", "error"); }
    });
  });
}

// ------------------------------------------------------------
// VISTA · ARCHIVOS
// ------------------------------------------------------------
async function renderFiles() {
  $("#sync-folder").textContent = App.config?.sync_folder || "No configurada";
  $("#sync-auto").checked = !!App.config?.auto_sync;

  if (App.config?.sync_folder) {
    try {
      const p = await invoke("preview_sync");
      $("#sync-pending").textContent = `${p.pendingFiles} de ${p.totalFiles} (${bytes(p.pendingBytes)})`;
      $("#sync-last").textContent = when(p.lastSync);
    } catch { /* carpeta no disponible */ }
  }

  try {
    const res = await api("GET", "/api/files", null, "files");
    const files = res?.data?.files || [];
    $("#file-list").innerHTML = files.length
      ? `<table><thead><tr><th>Nombre</th><th>Tipo</th><th>Tamaño</th><th>Subido</th><th></th></tr></thead><tbody>
          ${files.map((f) => `<tr>
            <td>${esc(f.name)}</td>
            <td class="mono">${esc(f.extension || "—")}</td>
            <td>${bytes(f.size)}</td>
            <td>${when(f.createdAt)}</td>
            <td><button class="btn btn-ghost btn-sm" data-dl="${esc(f.url || "")}" data-name="${esc(f.name)}">Descargar</button></td>
          </tr>`).join("")}
        </tbody></table>`
      : `<p class="muted pad">Todavía no hay archivos en el servidor.</p>`;

    $$("[data-dl]").forEach((b) => {
      b.onclick = async () => {
        try {
          const r = await invoke("download_file", { urlPath: b.dataset.dl, suggestedName: b.dataset.name });
          if (!r.cancelled) toast(`Guardado en ${r.path}`, "ok");
        } catch (e) { toast(String(e), "error"); }
      };
    });
  } catch {
    $("#file-list").innerHTML = `<p class="muted pad">Sin conexión con el servidor de archivos.</p>`;
  }
}

function renderUploadProgress(p) {
  let node = document.getElementById(`up-${p.id}`);
  if (!node) {
    node = document.createElement("div");
    node.id = `up-${p.id}`;
    node.className = "up-item";
    $("#upload-list").prepend(node);
  }
  const label = p.status === "done" ? "Completado" : p.status === "error" ? `Error: ${p.error || ""}` : `${bytes(p.uploaded)} / ${bytes(p.total)}`;
  node.innerHTML = `
    <div class="up-head"><strong>${esc(p.file_name)}</strong><span class="muted small">${esc(label)}</span></div>
    <div class="bar"><i style="width:${p.percent}%"></i></div>`;
  if (p.status === "done") setTimeout(() => node.remove(), 4000);
}

async function doUpload(paths) {
  if (!paths || !paths.length) return;
  try {
    const results = await invoke("upload_files", { paths, folderId: null, category: "general" });
    const ok = results.filter((r) => r.ok).length;
    toast(`${ok} de ${results.length} archivo(s) subidos`, ok === results.length ? "ok" : "warn");
    renderFiles();
  } catch (e) {
    toast(String(e), "error");
  }
}

// ------------------------------------------------------------
// VISTA · MENSAJES
// ------------------------------------------------------------
async function renderMessages() {
  try {
    const res = await api("GET", "/api/messages/chat", null, "chat");
    App.chatMessages = res?.data?.messages || [];
    App.chatConversation = res?.data?.conversation?.id || null;
    paintChat();
  } catch {
    $("#chat-log").innerHTML = `<p class="muted pad">Sin conexión con el chat.</p>`;
  }

  try {
    const res = await api("GET", "/api/messages/mail?folder=inbox", null, "mail");
    const mails = res?.data || [];
    $("#mail-list").innerHTML = mails.length
      ? mails.map((m) => `<div class="list-item">
          <div class="li-main">
            <div class="li-title">${esc(m.subject)}</div>
            <div class="li-sub">${esc(m.fromName || m.fromEmail)} · ${when(m.sentAt || m.createdAt)}</div>
          </div>
          ${m.isRead ? "" : '<span class="tag tag-info">nuevo</span>'}
        </div>`).join("")
      : `<p class="muted pad">La bandeja está vacía.</p>`;
  } catch {
    $("#mail-list").innerHTML = `<p class="muted pad">Sin conexión con el correo.</p>`;
  }
}

function paintChat() {
  const log = $("#chat-log");
  log.innerHTML = App.chatMessages.map((m) => {
    const mine = m.senderId === App.session?.id;
    const who = m.sender?.name || "Equipo";
    return `<div class="msg ${mine ? "mine" : ""}">
      <div>
        <div class="who">${esc(who)} · ${when(m.createdAt)}</div>
        <div class="bubble">${esc(m.body)}</div>
      </div>
    </div>`;
  }).join("");
  log.scrollTop = log.scrollHeight;
}

async function sendChat() {
  const input = $("#chat-text");
  const body = input.value.trim();
  if (!body) return;
  input.value = "";
  try {
    await api("POST", "/api/messages/chat", { conversationId: App.chatConversation, body });
    await renderMessages();
  } catch { toast("No se pudo enviar el mensaje", "error"); }
}

// ------------------------------------------------------------
// VISTA · DIRECTORIO
// ------------------------------------------------------------
async function renderDirectory() {
  try {
    const res = await api("GET", "/api/directory?all=1", null, "directory");
    App.cache.people = res?.data || [];
  } catch {
    App.cache.people = App.cache.people || [];
  }
  paintDirectory();
}

function paintDirectory() {
  const q = ($("#dir-search").value || "").toLowerCase();
  const people = (App.cache.people || []).filter((p) =>
    !q || `${p.firstName} ${p.lastName} ${p.email} ${p.position || ""}`.toLowerCase().includes(q)
  );

  $("#dir-grid").innerHTML = people.length
    ? people.map((p) => `<div class="stat-card glass">
        <div style="display:flex;gap:10px;align-items:center">
          <div class="avatar">${esc((p.firstName[0] || "") + (p.lastName[0] || ""))}</div>
          <div style="min-width:0">
            <strong style="font-size:13px">${esc(p.firstName)} ${esc(p.lastName)}</strong>
            <div class="muted small">${esc(p.position || roleLabel(p.role))}</div>
          </div>
        </div>
        <div class="muted small" style="margin-top:10px">${esc(p.email)}</div>
        ${p.department ? `<span class="tag tag-info" style="margin-top:8px;display:inline-block">${esc(p.department.name)}</span>` : ""}
      </div>`).join("")
    : `<p class="muted pad">No hay personas que coincidan.</p>`;
}

// ------------------------------------------------------------
// VISTA · RRHH
// ------------------------------------------------------------
async function renderHR() {
  try {
    const res = await api("GET", "/api/hr/timeoff", null, "timeoff");
    const items = res?.data || [];
    $("#hr-list").innerHTML = items.length
      ? items.map((r) => `<div class="list-item">
          <div class="li-main">
            <div class="li-title">${esc(typeLabel(r.type))} · ${esc(r.days)} día(s)</div>
            <div class="li-sub">${esc(r.startDate)} → ${esc(r.endDate)} · ${esc(r.user ? r.user.firstName + " " + r.user.lastName : "")}</div>
          </div>
          <span class="tag ${r.status === "approved" ? "tag-ok" : r.status === "rejected" ? "tag-danger" : "tag-warn"}">${esc(r.status)}</span>
        </div>`).join("")
      : `<p class="muted pad">No hay solicitudes registradas.</p>`;
  } catch {
    $("#hr-list").innerHTML = `<p class="muted pad">Sin conexión con RR. HH.</p>`;
  }
}

function typeLabel(t) {
  return ({ vacation: "Vacaciones", sick: "Enfermedad", personal: "Asuntos propios", other: "Otro" })[t] || t;
}

// ------------------------------------------------------------
// VISTA · DISPOSITIVOS
// ------------------------------------------------------------
async function renderDevices() {
  const info = await invoke("device_info").catch(() => null);
  if (info) {
    $("#device-self").innerHTML = kv({
      Nombre: info.device_name,
      Sistema: info.os_version,
      Plataforma: `${info.platform} · ${info.arch}`,
      Procesador: info.cpu,
      Memoria: `${info.total_memory_mb} MB`,
      "IP VPN": info.vpn_ip || "no asignada",
      "Versión app": info.app_version,
    });
  }

  try {
    const res = await api("GET", "/api/devices", null, "devices");
    const rows = res?.data || [];
    $("#device-list").innerHTML = rows.length
      ? `<table><thead><tr><th>Equipo</th><th>Tipo</th><th>Sistema</th><th>IP</th><th>Asignado</th><th>Estado</th></tr></thead><tbody>
          ${rows.map((r) => {
            const d = r.device || r;
            const a = r.assignee;
            return `<tr>
              <td><strong>${esc(d.name)}</strong><div class="muted small">${esc(d.brand || "")} ${esc(d.model || "")}</div></td>
              <td>${esc(d.type)}</td>
              <td>${esc(d.os || "—")}</td>
              <td class="mono">${esc(d.ipAddress || "—")}</td>
              <td>${a ? esc(a.firstName + " " + a.lastName) : '<span class="muted">sin asignar</span>'}</td>
              <td><span class="tag ${d.status === "available" ? "tag-ok" : d.status === "assigned" ? "tag-info" : "tag-warn"}">${esc(d.status)}</span></td>
            </tr>`;
          }).join("")}
        </tbody></table>`
      : `<p class="muted pad">El inventario está vacío.</p>`;
  } catch {
    $("#device-list").innerHTML = `<p class="muted pad">Sin conexión con el inventario.</p>`;
  }
}

// ------------------------------------------------------------
// VISTA · TRABAJOS
// ------------------------------------------------------------
async function renderJobs() {
  try {
    const res = await api("GET", "/api/jobs", null, "jobs");
    const queues = res?.data?.queues || [];
    const jobs = res?.data?.jobs || [];

    $("#job-queue").innerHTML = queues.length
      ? queues.map((q) => `<option value="${esc(q.id)}">${esc(q.name)}</option>`).join("")
      : `<option value="">Sin colas disponibles</option>`;

    $("#job-list").innerHTML = jobs.length
      ? jobs.map((row) => {
          const j = row.job || row;
          const tag = j.status === "completed" ? "tag-ok" : j.status === "failed" ? "tag-danger" : j.status === "processing" ? "tag-info" : "tag-warn";
          return `<div class="list-item">
            <div class="li-main">
              <div class="li-title">${esc(j.name)}</div>
              <div class="li-sub">${esc(j.type)} · intentos ${j.attempts}/${j.maxAttempts} · ${when(j.createdAt)}</div>
              ${j.status === "processing" ? `<div class="bar" style="margin-top:6px"><i style="width:${j.progress || 0}%"></i></div>` : ""}
            </div>
            <span class="tag ${tag}">${esc(j.status)}</span>
          </div>`;
        }).join("")
      : `<p class="muted pad">No hay trabajos en la cola.</p>`;
  } catch {
    $("#job-list").innerHTML = `<p class="muted pad">Sin conexión con el servicio de trabajos.</p>`;
  }
}

// ------------------------------------------------------------
// VISTA · ADMINISTRACIÓN
// ------------------------------------------------------------
async function renderAdmin() {
  try {
    const s = await api("GET", "/api/admin?section=stats", null, "admin-stats");
    const d = s?.data || {};
    $("#admin-stats").innerHTML = [
      card("Usuarios", d.totalUsers ?? "—", `${d.activeUsers ?? 0} activos`),
      card("Proyectos", d.totalProjects ?? "—", "en la plataforma"),
      card("Tareas", d.totalTasks ?? "—", `${d.completedTasks ?? 0} completadas`),
      card("Ingresos", d.revenue ? `€${d.revenue}` : "—", `${d.paidOrders ?? 0} pedidos pagados`),
    ].join("");
  } catch { /* sin conexión */ }

  try {
    const u = await api("GET", "/api/admin?section=users", null, "admin-users");
    const users = u?.data || [];
    $("#admin-users").innerHTML = `<table><thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Puesto</th><th>Estado</th></tr></thead><tbody>
      ${users.map((x) => `<tr>
        <td><strong>${esc(x.firstName)} ${esc(x.lastName)}</strong></td>
        <td class="mono">${esc(x.email)}</td>
        <td><span class="tag tag-info">${esc(roleLabel(x.role))}</span></td>
        <td>${esc(x.position || "—")}</td>
        <td><span class="tag ${x.isActive ? "tag-ok" : "tag-danger"}">${x.isActive ? "activo" : "inactivo"}</span></td>
      </tr>`).join("")}
    </tbody></table>`;
  } catch {
    $("#admin-users").innerHTML = `<p class="muted pad">Sin conexión con el panel de administración.</p>`;
  }
}

// ------------------------------------------------------------
// VISTA · TÉCNICO (PostgreSQL directo)
// ------------------------------------------------------------
async function renderTech() {
  const c = App.config || {};
  $("#db-host").value = c.db_host || "";
  $("#db-port").value = c.db_port || 5432;
  $("#db-name").value = c.db_name || "";
  $("#db-user").value = c.db_user || "";

  const hasPass = await invoke("db_has_password").catch(() => false);
  $("#db-pass").placeholder = hasPass ? "•••••••• (guardada en el llavero)" : "Se guarda en el llavero del sistema";

  invoke("read_audit_log").then((t) => { $("#audit-log").textContent = t; }).catch(() => {});
}

async function dbConnectAndList() {
  try {
    const r = await invoke("db_test");
    $("#db-badge").className = "tag tag-ok";
    $("#db-badge").textContent = "conectado";
    toast("Conexión con PostgreSQL establecida", "ok");

    const stats = await invoke("db_stats").catch(() => null);
    if (stats) {
      $("#db-stats").innerHTML = kv({
        "Base de datos": stats.database,
        Tamaño: stats.size,
        Tablas: stats.tables,
        Conexiones: stats.connections,
        "En marcha desde": stats.uptime,
        Versión: (r.version || "").split(",")[0],
      });
    }

    const tables = await invoke("db_tables");
    $("#db-tables").innerHTML = tables.map((t) => `
      <div class="list-item clickable" data-table="${esc(t.name)}">
        <div class="li-main">
          <div class="li-title mono">${esc(t.name)}</div>
          <div class="li-sub">${t.estimated_rows} filas aprox. · ${esc(t.total_size)}</div>
        </div>
      </div>`).join("");

    $$("[data-table]").forEach((el) => {
      el.onclick = async () => {
        const name = el.dataset.table;
        $("#sql-editor").value = `SELECT * FROM "${name}" LIMIT 100;`;
        try {
          paintQuery(await invoke("db_preview", { table: name, limit: 100 }));
        } catch (e) { showSqlAlert(String(e), "alert-error"); }
      };
    });
  } catch (e) {
    $("#db-badge").className = "tag tag-danger";
    $("#db-badge").textContent = "sin conexión";
    showSqlAlert(String(e), "alert-error");
  }
}

function showSqlAlert(message, cls) {
  const box = $("#sql-alert");
  box.className = `alert ${cls}`;
  box.textContent = message.replace(/^Error:\s*/, "");
  box.classList.remove("hidden");
}

function paintQuery(result) {
  $("#sql-alert").classList.add("hidden");
  $("#sql-meta").textContent = `${result.row_count} fila(s) · ${result.elapsed_ms} ms${result.truncated ? " · resultado recortado" : ""}`;
  $("#sql-result").innerHTML = result.columns.length
    ? `<table><thead><tr>${result.columns.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>
        ${result.rows.map((row) => `<tr>${row.map((v) =>
          v === null ? `<td class="null">NULL</td>` : `<td class="mono">${esc(v.length > 120 ? v.slice(0, 120) + "…" : v)}</td>`
        ).join("")}</tr>`).join("")}
      </tbody></table>`
    : `<p class="muted pad">La consulta no devolvió columnas.</p>`;
}

// ------------------------------------------------------------
// VISTA · AJUSTES
// ------------------------------------------------------------
async function renderSettings() {
  const c = App.config || {};
  $("#set-host").value = c.host || "";
  $("#set-port").value = c.port || 8443;
  $("#set-vpn").value = c.vpn_network || "";
  $("#set-gw").value = c.vpn_gateway || "";
  $("#set-storage").value = c.storage_host || "";
  $("#set-storage-port").value = c.storage_port || 9000;
  $("#set-tls").checked = !!c.use_tls;
  $("#set-insecure").checked = !!c.accept_invalid_certs;
  $("#set-notif").checked = !!c.notifications_enabled;
  $("#set-tray").checked = !!c.close_to_tray;
  $("#set-autosync").checked = !!c.auto_sync;
  $("#set-heartbeat").value = c.heartbeat_seconds || 30;

  const v = await invoke("app_version").catch(() => ({}));
  $("#set-version").textContent = v.version || "—";
  $("#set-os").textContent = `${v.os || "—"} ${v.arch || ""}`;
  $("#set-vpnip").textContent = App.conn?.vpn_ip || "no asignada";
}

async function runDiagnostics() {
  $("#diag").innerHTML = `<div><span>Estado</span><strong>Comprobando…</strong></div>`;
  const c = App.config;
  const targets = [
    ["API web", c.host, c.port],
    ["Puerta VPN", c.vpn_gateway, c.port],
    ["PostgreSQL", c.db_host, c.db_port],
    ["Almacenamiento", c.storage_host, c.storage_port],
  ];

  const results = {};
  for (const [name, host, port] of targets) {
    try {
      const r = await invoke("probe_host", { host, port });
      results[name] = r.reachable ? `OK · ${r.latencyMs} ms` : "sin respuesta";
    } catch { results[name] = "error"; }
  }

  const ips = await invoke("local_addresses").catch(() => []);
  results["IPs locales"] = ips.join(", ") || "—";
  $("#diag").innerHTML = kv(results);
}

// ------------------------------------------------------------
// Notificaciones en la campana
// ------------------------------------------------------------
function pushNotification(title, body) {
  App.notifications.unshift({ title, body, at: new Date().toISOString() });
  App.notifications = App.notifications.slice(0, 30);
  const badge = $("#bell-count");
  badge.textContent = App.notifications.length;
  badge.classList.remove("hidden");

  $("#bell-list").innerHTML = App.notifications.map((n) => `
    <div class="list-item">
      <div class="li-main">
        <div class="li-title">${esc(n.title)}</div>
        <div class="li-sub">${esc(n.body)} · ${when(n.at)}</div>
      </div>
    </div>`).join("");
}

// ------------------------------------------------------------
// Arranque
// ------------------------------------------------------------
async function boot() {
  try {
    App.config = await invoke("get_config");
  } catch (e) {
    console.error("[config]", e);
    App.config = {};
  }

  document.documentElement.dataset.theme = App.config.theme || "dark";

  // Formulario de acceso
  $("#login-email").value = App.config.remember_email || "";
  $("#cfg-host").value = App.config.host || "";
  $("#cfg-port").value = App.config.port || 8443;
  $("#cfg-vpn").value = App.config.vpn_network || "";
  $("#cfg-tls").value = String(!!App.config.use_tls);
  $("#cfg-insecure").checked = !!App.config.accept_invalid_certs;

  await refreshConnection();
  setInterval(refreshConnection, 30000);

  // Reanudar sesión guardada
  try {
    const session = await invoke("restore_session");
    if (session) {
      await showApp(session);
      toast(`Sesión reanudada · ${session.firstName}`, "ok");
      return;
    }
  } catch (e) {
    console.warn("[session]", e);
  }
  showLogin();
}

// ------------------------------------------------------------
// Eventos de la interfaz
// ------------------------------------------------------------
function wireEvents() {
  // --- Acceso ---
  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("#login-submit");
    const errBox = $("#login-error");
    errBox.classList.add("hidden");
    btn.disabled = true;
    btn.textContent = "Conectando…";

    try {
      const session = await invoke("login", {
        email: $("#login-email").value.trim(),
        password: $("#login-password").value,
        remember: $("#login-remember").checked,
      });
      $("#login-password").value = "";
      App.config = await invoke("get_config");
      await showApp(session);
      toast(`Bienvenido/a, ${session.firstName}`, "ok");
    } catch (err) {
      errBox.textContent = String(err).replace("Error: ", "");
      errBox.classList.remove("hidden");
    } finally {
      btn.disabled = false;
      btn.textContent = "Entrar a la plataforma";
    }
  });

  $("#login-toggle-server").onclick = () => $("#login-server").classList.toggle("hidden");

  // --- Términos y condiciones (primer acceso) ---
  $("#terms-open-web").onclick = () => invoke("open_in_browser", { path: "/terminos" }).catch(() => {});
  $("#terms-open-privacy").onclick = () => invoke("open_in_browser", { path: "/privacidad" }).catch(() => {});
  $("#terms-accept").onchange = () => {
    const ok = $("#terms-accept").checked;
    $("#terms-submit").disabled = !ok;
    $("#terms-error").classList.add("hidden");
  };
  $("#terms-submit").onclick = async () => {
    if (!$("#terms-accept").checked) {
      $("#terms-error").textContent = "Debes marcar la casilla para aceptar los términos.";
      $("#terms-error").classList.remove("hidden");
      return;
    }
    const btn = $("#terms-submit");
    btn.disabled = true;
    btn.textContent = "Guardando…";
    try {
      await api("POST", "/api/auth/terms", {});
      if (App.pendingSession) {
        const session = App.pendingSession;
        App.pendingSession = null;
        await enterApp(session);
        toast("Términos aceptados. ¡Bienvenido/a!", "ok");
      } else {
        showLogin();
      }
    } catch {
      $("#terms-error").textContent = "No se pudo guardar la aceptación. Verifica tu conexión.";
      $("#terms-error").classList.remove("hidden");
      btn.disabled = false;
      btn.textContent = "Aceptar y continuar";
    }
  };
  $("#cfg-test").onclick = async () => {
    const r = await invoke("probe_host", { host: $("#cfg-host").value, port: Number($("#cfg-port").value) })
      .catch(() => ({ reachable: false }));
    toast(r.reachable ? `Servidor accesible (${r.latencyMs} ms)` : "El servidor no responde", r.reachable ? "ok" : "error");
  };
  $("#cfg-save").onclick = async () => {
    App.config = await invoke("save_config", {
      newConfig: {
        ...App.config,
        host: $("#cfg-host").value.trim(),
        port: Number($("#cfg-port").value),
        vpn_network: $("#cfg-vpn").value.trim(),
        use_tls: $("#cfg-tls").value === "true",
        accept_invalid_certs: $("#cfg-insecure").checked,
      },
    });
    toast("Configuración guardada", "ok");
    refreshConnection();
  };

  // --- Cabecera ---
  $("#btn-refresh").onclick = () => { refreshConnection(); loadView(App.view); };
  $("#btn-open-web").onclick = () => invoke("open_in_browser", { path: "/dashboard" }).catch(() => {});
  $("#btn-bell").onclick = () => {
    $("#bell-panel").classList.toggle("hidden");
    $("#bell-count").classList.add("hidden");
  };
  $("#btn-logout").onclick = async () => {
    await invoke("logout").catch(() => {});
    showLogin();
    toast("Sesión cerrada");
  };
  $("#btn-theme").onclick = async () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    App.config = await invoke("save_config", { newConfig: { ...App.config, theme: next } }).catch(() => App.config);
  };

  // --- Tareas ---
  $("#task-add").onclick = async () => {
    const title = $("#task-title").value.trim();
    if (!title) return;
    try {
      await api("POST", "/api/tasks", { title, priority: $("#task-priority").value, status: "todo" });
      $("#task-title").value = "";
      renderTasks();
      toast("Tarea creada", "ok");
    } catch { toast("No se pudo crear la tarea", "error"); }
  };

  // --- Archivos ---
  $("#btn-pick-files").onclick = async () => {
    const paths = await invoke("pick_files").catch(() => []);
    doUpload(paths);
  };
  $("#btn-pick-folder").onclick = async () => {
    const folder = await invoke("pick_folder").catch(() => null);
    if (!folder) return;
    App.config = await invoke("save_config", { newConfig: { ...App.config, sync_folder: folder } });
    renderFiles();
    toast("Carpeta de sincronización actualizada", "ok");
  };
  $("#btn-sync-now").onclick = async () => {
    try {
      const s = await invoke("sync_now");
      toast(`Sincronización: ${s.uploaded} subidos, ${s.failed} con error`, s.failed ? "warn" : "ok");
      renderFiles();
    } catch (e) { toast(String(e), "error"); }
  };
  $("#btn-sync-reset").onclick = async () => {
    await invoke("reset_sync_index");
    toast("Índice reiniciado: la próxima sincronización subirá todo");
    renderFiles();
  };
  $("#sync-auto").onchange = async (e) => {
    App.config = await invoke("save_config", { newConfig: { ...App.config, auto_sync: e.target.checked } });
  };

  const dz = $("#dropzone");
  ["dragenter", "dragover"].forEach((ev) =>
    dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("over"); })
  );
  ["dragleave", "drop"].forEach((ev) =>
    dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("over"); })
  );

  // --- Mensajes ---
  $("#chat-send").onclick = sendChat;
  $("#chat-text").addEventListener("keydown", (e) => { if (e.key === "Enter") sendChat(); });

  // --- Directorio ---
  $("#dir-search").addEventListener("input", paintDirectory);

  // --- RRHH ---
  $("#hr-submit").onclick = async () => {
    const payload = {
      type: $("#hr-type").value,
      startDate: $("#hr-start").value,
      endDate: $("#hr-end").value,
      reason: $("#hr-reason").value,
    };
    if (!payload.startDate || !payload.endDate) return toast("Indica las fechas", "warn");
    try {
      await api("POST", "/api/hr/timeoff", payload);
      $("#hr-reason").value = "";
      renderHR();
      toast("Solicitud enviada", "ok");
    } catch { toast("No se pudo enviar la solicitud", "error"); }
  };

  // --- Dispositivos ---
  $("#btn-register-device").onclick = async () => {
    try {
      await invoke("register_device");
      toast("Equipo registrado en el inventario", "ok");
      renderDevices();
    } catch (e) { toast(String(e), "error"); }
  };

  // --- Trabajos ---
  $("#job-add").onclick = async () => {
    const queueId = $("#job-queue").value;
    const name = $("#job-name").value.trim();
    if (!queueId || !name) return toast("Elige una cola y escribe el nombre", "warn");
    try {
      await api("POST", "/api/jobs", { queueId, name, jobType: $("#job-type").value, payload: {} });
      $("#job-name").value = "";
      renderJobs();
      toast("Trabajo encolado", "ok");
    } catch { toast("No se pudo encolar el trabajo", "error"); }
  };

  // --- Panel técnico ---
  $("#db-save").onclick = async () => {
    const pass = $("#db-pass").value;
    if (pass) {
      await invoke("db_save_password", { password: pass });
      $("#db-pass").value = "";
    }
    App.config = await invoke("save_config", {
      newConfig: {
        ...App.config,
        db_host: $("#db-host").value.trim(),
        db_port: Number($("#db-port").value),
        db_name: $("#db-name").value.trim(),
        db_user: $("#db-user").value.trim(),
      },
    });
    toast("Datos de conexión guardados", "ok");
  };
  $("#db-test").onclick = dbConnectAndList;

  $("#sql-run").onclick = async () => {
    try {
      paintQuery(await invoke("db_query", { sql: $("#sql-editor").value, limit: 200 }));
    } catch (e) { showSqlAlert(String(e), "alert-error"); }
  };

  $("#sql-exec").onclick = async () => {
    const sql = $("#sql-editor").value;
    try {
      const r = await invoke("db_execute", { sql, confirmed: false });
      showSqlAlert(`Ejecutado: ${r.rows_affected} fila(s) en ${r.elapsed_ms} ms`, "alert-ok");
      invoke("read_audit_log").then((t) => { $("#audit-log").textContent = t; });
    } catch (e) {
      const msg = String(e);
      if (msg.includes("CONFIRMACION_REQUERIDA")) {
        const reason = msg.split("CONFIRMACION_REQUERIDA:")[1] || "";
        if (confirm(`Atención:${reason}\n\n¿Confirmas que quieres ejecutarla?`)) {
          try {
            const r = await invoke("db_execute", { sql, confirmed: true });
            showSqlAlert(`Ejecutado: ${r.rows_affected} fila(s) en ${r.elapsed_ms} ms`, "alert-warn");
            invoke("read_audit_log").then((t) => { $("#audit-log").textContent = t; });
          } catch (e2) { showSqlAlert(String(e2), "alert-error"); }
        }
      } else {
        showSqlAlert(msg, "alert-error");
      }
    }
  };

  // --- Ajustes ---
  $("#set-save").onclick = async () => {
    App.config = await invoke("save_config", {
      newConfig: {
        ...App.config,
        host: $("#set-host").value.trim(),
        port: Number($("#set-port").value),
        vpn_network: $("#set-vpn").value.trim(),
        vpn_gateway: $("#set-gw").value.trim(),
        storage_host: $("#set-storage").value.trim(),
        storage_port: Number($("#set-storage-port").value),
        use_tls: $("#set-tls").checked,
        accept_invalid_certs: $("#set-insecure").checked,
        notifications_enabled: $("#set-notif").checked,
        close_to_tray: $("#set-tray").checked,
        auto_sync: $("#set-autosync").checked,
        heartbeat_seconds: Number($("#set-heartbeat").value),
      },
    });
    toast("Configuración guardada", "ok");
    refreshConnection();
  };
  $("#set-reset").onclick = async () => {
    App.config = await invoke("reset_config");
    renderSettings();
    toast("Valores restaurados");
  };
  $("#btn-test-notif").onclick = () =>
    invoke("send_notification", { title: "TerLux Coop", body: "Las notificaciones funcionan correctamente." });
  $("#btn-check-update").onclick = async () => {
    try {
      const r = await invoke("check_updates");
      const box = $("#update-alert");
      box.className = `alert ${r.updateAvailable ? "alert-warn" : "alert-ok"}`;
      box.textContent = r.updateAvailable
        ? `Hay una versión nueva disponible: ${r.latest} (tienes la ${r.current})`
        : `Estás en la última versión (${r.current})`;
      box.classList.remove("hidden");
    } catch (e) { toast(String(e), "error"); }
  };
  $("#btn-diag").onclick = runDiagnostics;
}

// ------------------------------------------------------------
// Eventos que llegan desde Rust
// ------------------------------------------------------------
function wireBackendEvents() {
  listen("connection-status", (e) => paintConnection(e.payload));

  listen("upload-progress", (e) => renderUploadProgress(e.payload));

  listen("upload-finished", () => {
    if (App.view === "files") renderFiles();
  });

  listen("sync-status", (e) => {
    const s = e.payload || {};
    const box = $("#sync-status");
    if (s.phase === "scanned") {
      box.className = "alert alert-info";
      box.textContent = `Analizados ${s.scanned} archivo(s) · ${s.pending} pendiente(s) de subir`;
    } else if (s.phase === "done") {
      box.className = "alert alert-ok";
      box.textContent = `Sincronización completada · ${s.uploaded} subidos, ${s.failed} con error`;
    }
    box.classList.remove("hidden");
  });

  listen("realtime-event", (e) => {
    const evt = e.payload || {};
    if (evt.event === "message" || evt.event === "chat") {
      const from = evt.data?.sender?.name || evt.data?.from || "Equipo";
      const text = evt.data?.body || evt.data?.preview || "Nuevo mensaje";
      pushNotification(from, text);
      if (App.view === "messages") renderMessages();
    } else if (evt.event === "reply") {
      pushNotification("Soporte", evt.data?.body || "Respuesta recibida");
    }
  });

  listen("realtime-status", (e) => {
    if (e.payload === "connected") console.info("[realtime] canal abierto");
  });

  listen("tray-sync-requested", async () => {
    try {
      const s = await invoke("sync_now");
      toast(`Sincronización: ${s.uploaded} archivo(s) subidos`, "ok");
    } catch (e) { toast(String(e), "error"); }
  });

  // Arrastrar archivos desde el explorador del sistema
  listen("tauri://drag-drop", (e) => {
    const paths = e.payload?.paths || [];
    if (paths.length && App.session) {
      switchView("files");
      doUpload(paths);
    }
  });
}

// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  wireEvents();
  wireBackendEvents();
  boot();
});
