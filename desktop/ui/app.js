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
// i18n — alias global
// ------------------------------------------------------------
function t(key) { return window.I18n?.t?.(key) || key; }

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

// Traduce el texto ya renderizado de una vista consultando el diccionario de i18n.
// No toca elementos gobernados por applyTranslations ([data-i18n]).
const _sweepOrig = new WeakMap();
function trSweep(root) {
  if (!root || !window.I18n) return;
  const locale = window.I18n.getLocale();
  const dict = window.I18n.dict;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentNode;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.hasAttribute && (parent.hasAttribute("data-i18n") || parent.hasAttribute("data-i18n-title") || parent.hasAttribute("data-i18n-placeholder"))) return NodeFilter.FILTER_REJECT;
      if (["STYLE", "SCRIPT", "TEXTAREA"].includes(parent.nodeName)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const clean = node.nodeValue.replace(/\s+/g, " ").trim();
    if (!clean) continue;
    if (locale === "es") {
      if (_sweepOrig.has(node)) node.nodeValue = _sweepOrig.get(node);
    } else if (dict[clean]) {
      if (!_sweepOrig.has(node)) _sweepOrig.set(node, node.nodeValue);
      node.nodeValue = dict[clean];
    }
  }
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
  const loc = (window.I18n?.getLocale?.()) || "en";
  return d.toLocaleString(loc === "en" ? "en-US" : "es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
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
      toast(t("La sesión ha caducado, vuelve a iniciar sesión"), "warn");
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
    { id: "calendar", label: "Calendario", icon: "📅", cap: "calendar", title: "Calendario", sub: "Reuniones y eventos de la organización" },
    { id: "files", label: "Archivos", icon: "🗂", cap: "files", title: "Archivos", sub: "Sube y sincroniza documentos con el almacenamiento" },
    { id: "messages", label: "Mensajes", icon: "✉", cap: "messages", title: "Mensajería", sub: "Chat del equipo y bandeja de correo" },
    { id: "directory", label: "Directorio", icon: "👥", cap: "directory", title: "Directorio", sub: "Personas de la organización" },
  ]},
  { group: "Personal", items: [
    { id: "hr", label: "RR. HH.", icon: "🏛", cap: "hr_self", title: "Recursos Humanos", sub: "Días libres y solicitudes" },
  ]},
  { group: "Operaciones", items: [
    { id: "projects", label: "Proyectos", icon: "▤", cap: null, roles: ["super_admin", "admin", "manager", "hr", "finance"], title: "Proyectos", sub: "Alta y cartera de proyectos de la organización" },
    { id: "devices", label: "Dispositivos", icon: "💻", cap: "devices_view", title: "Dispositivos", sub: "Inventario de equipos (MDM)" },
    { id: "jobs", label: "Trabajos", icon: "⚡", cap: "jobs", title: "Cola de trabajos", sub: "Procesos en segundo plano" },
    { id: "documents", label: "Documentos", icon: "📄", cap: "documents", title: "Documentos", sub: "Políticas, informes, contratos y manuales" },
  ]},
  { group: "Comercial", items: [
    { id: "store", label: "Tienda y pagos", icon: "🛒", cap: "store", title: "Tienda y pagos", sub: "Catálogo, pedidos y saldo de crédito" },
    { id: "billing", label: "Tarjetas y facturación", icon: "💳", cap: "billing", title: "Facturación", sub: "Métodos de pago, saldo, movimientos y pedidos" },
  ]},
  { group: "Finanzas", items: [
    { id: "payrolls", label: "Nóminas", icon: "₨", cap: "payroll", title: "Nóminas", sub: "Desglose salarial por empleado y periodos (datos sensibles)" },
  ]},
  { group: "Administración", items: [
    { id: "admin", label: "Administración", icon: "🛡", cap: "admin_users", title: "Administración", sub: "Usuarios, clientes y métricas de la plataforma" },
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
    const allowed = section.items.filter((i) =>
      (!i.cap || (App.caps && App.caps[i.cap])) &&
      (!i.roles || (App.session && i.roles.includes(App.session.role)))
    );
    if (!allowed.length) return;

    const label = document.createElement("div");
    label.className = "nav-group";
    label.textContent = t(section.group);
    nav.appendChild(label);

    allowed.forEach((item) => {
      const btn = document.createElement("button");
      btn.className = "nav-item" + (item.id === App.view ? " active" : "");
      btn.dataset.view = item.id;
      btn.innerHTML = `<span class="nav-ico">${item.icon}</span><span>${esc(t(item.label))}</span>`;
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
    $("#view-title").textContent = t(meta.title);
    $("#view-sub").textContent = t(meta.sub);
  }
  loadView(id);
}

async function loadView(id) {
  try {
    if (id === "dashboard") await renderDashboard();
    if (id === "tasks") await renderTasks();
    if (id === "calendar") await renderCalendar();
    if (id === "files") await renderFiles();
    if (id === "messages") await renderMessages();
    if (id === "directory") await renderDirectory();
    if (id === "hr") await renderHR();
    if (id === "devices") await renderDevices();
    if (id === "jobs") await renderJobs();
    if (id === "projects") await renderProjects();
    if (id === "documents") await renderDocuments();
    if (id === "store") await renderStore();
    if (id === "billing") await renderBilling();
    if (id === "payrolls") await renderPayrolls();
    if (id === "admin") await renderAdmin();
    if (id === "tech") await renderTech();
    if (id === "settings") await renderSettings();
    const active = document.querySelector(".view:not(.hidden)");
    if (active) trSweep(active);
  } catch (e) {
    console.error(`[view:${id}]`, e);
  }
}

// Re-traduce la interfaz dinámica cuando cambia el idioma (dispara desde i18n.js).
window.addEventListener("terlux:localechange", function () {
  if (typeof buildNav === "function") buildNav();
  const meta = findNavItem(App.view);
  if (meta) {
    $("#view-title").textContent = t(meta.title);
    $("#view-sub").textContent = t(meta.sub);
  }
  if (App.session) {
    $("#user-role").textContent = roleLabel(App.session.role);
    $("#conn-title").textContent = App.conn?.api_reachable ? t("Conectado") : t("Sin conexión");
    $("#conn-sub").textContent = App.conn?.vpn_ip
      ? `VPN ${App.conn.vpn_ip}${App.conn.latency_ms != null ? ` · ${App.conn.latency_ms} ms` : ""}`
      : App.conn?.vpn_interface ? t("VPN activa") : t("Fuera de la VPN");
  }
  const navActive = document.querySelector(".view:not(.hidden)");
  if (navActive) trSweep(navActive);
});

// ------------------------------------------------------------
// Conexión / VPN
// ------------------------------------------------------------
function paintConnection(status) {
  App.conn = status;
  const dotClass = status.api_reachable ? (status.vpn_interface ? "dot-ok" : "dot-warn") : "dot-off";

  const pill = $("#conn-pill");
  if (pill) {
    pill.querySelector(".dot").className = `dot ${dotClass}`;
    $("#conn-title").textContent = status.api_reachable ? t("Conectado") : t("Sin conexión");
    $("#conn-sub").textContent = status.vpn_ip
      ? `VPN ${status.vpn_ip}${status.latency_ms != null ? ` · ${status.latency_ms} ms` : ""}`
      :     status.vpn_interface ? t("VPN activa") : t("Fuera de la VPN");
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
  return t(({
    super_admin: "Super administrador",
    admin: "Administrador",
    manager: "Gestor",
    hr: "Recursos Humanos",
    finance: "Finanzas",
    support: "Soporte",
    employee: "Empleado",
    client: "Cliente",
  })[role] || "Invitado");
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
    card(t("Tareas pendientes"), pending, t("asignadas a la organización")),
    card(t("Tareas completadas"), done, t("histórico registrado")),
    card(t("Latencia API"), conn.latency_ms != null ? `${conn.latency_ms} ms` : "—", conn.api_reachable ? t("servidor accesible") : t("sin respuesta")),
    card(t("Estado VPN"), conn.vpn_interface ? t("Activa") : t("Inactiva"), conn.vpn_ip || t("sin dirección asignada")),
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
    : `<p class="muted pad">${t("No hay tareas registradas.")}</p>`;

  $("#dash-infra").innerHTML = [
infraRow(t("Servidor web"), conn.api_reachable, `${App.config?.host}:${App.config?.port}`),
    infraRow(t("Puerta de enlace VPN"), conn.gateway_reachable, App.config?.vpn_gateway),
    infraRow(t("Base de datos"), conn.database_reachable, `${App.config?.db_host}:${App.config?.db_port}`),
    infraRow(t("Almacenamiento"), conn.storage_reachable, `${App.config?.storage_host}:${App.config?.storage_port}`),
  ].join("");

  if (info) {
    $("#dash-device").innerHTML = kv({
      [t("Equipo")]: info.device_name,
      [t("Plataforma")]: `${info.platform} ${info.arch}`,
      [t("Sistema")]: info.os_version,
      [t("Procesador")]: info.cpu,
      [t("Núcleos")]: info.cpu_cores,
      [t("Memoria")]: `${info.total_memory_mb} MB`,
      [t("IP en la VPN")]: info.vpn_ip || t("no asignada"),
      [t("ID de cliente")]: info.client_id.slice(0, 16) + "…",
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
    <span class="tag ${ok ? "tag-ok" : "tag-danger"}">${ok ? "OK" : t("sin respuesta")}</span>
  </div>`;
}

function kv(obj) {
  return Object.entries(obj)
    .map(([k, v]) => `<div><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`)
    .join("");
}

function statusLabel(s) {
  return t(({ todo: "Por hacer", in_progress: "En progreso", review: "En revisión", done: "Completada", blocked: "Bloqueada" })[s] || s);
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
    toast(t("No se pudieron cargar las tareas"), "error");
  }

  $("#kanban").innerHTML = COLUMNS.map((col) => {
    const items = tasks.filter((t) => t.status === col.id);
    return `<div class="kcol" data-col="${col.id}">
      <h4><span class="dot" style="background:${col.color}"></span>${esc(t(col.label))}
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
      } catch { toast(t("No se pudo mover la tarea"), "error"); }
    });
  });
}

// ------------------------------------------------------------
// VISTA · ARCHIVOS
// ------------------------------------------------------------
async function renderFiles() {
  $("#sync-folder").textContent = App.config?.sync_folder || t("No configurada");
  $("#sync-auto").checked = !!App.config?.auto_sync;

  if (App.config?.sync_folder) {
    try {
      const p = await invoke("preview_sync");
      $("#sync-pending").textContent = `${p.pendingFiles} ${t("de")} ${p.totalFiles} (${bytes(p.pendingBytes)})`;
      $("#sync-last").textContent = when(p.lastSync);
    } catch { /* carpeta no disponible */ }
  }

  try {
    const res = await api("GET", "/api/files", null, "files");
    const files = res?.data?.files || [];
    $("#file-list").innerHTML = files.length
      ? `<table><thead><tr><th>${t("Nombre")}</th><th>${t("Tipo")}</th><th>${t("Tamaño")}</th><th>${t("Subido")}</th><th>${t("Compartido")}</th><th></th></tr></thead><tbody>
          ${files.map((f) => {
            const mine = f.isMine;
            return `<tr>
            <td>${esc(f.name)}</td>
            <td class="mono">${esc(f.extension || "—")}</td>
            <td>${bytes(f.size)}</td>
            <td>${when(f.createdAt)}</td>
            <td>${f.isShared ? `<span class="tag tag-info">${t("compartido")}</span>` : `<span class="tag">${t("solo tú")}</span>`}</td>
            <td style="white-space:nowrap">
              <button class="btn btn-ghost btn-sm" data-dl="${esc(f.url || "")}" data-name="${esc(f.name)}">${t("Descargar")}</button>
              <button class="btn btn-outline btn-sm" data-share="${esc(f.id)}" data-shared="${f.isShared ? 1 : 0}" data-name="${esc(f.name)}">${f.isShared ? t("Descompartir") : t("Compartir")}</button>
              ${mine ? `<button class="btn btn-danger btn-sm" data-del-file="${esc(f.id)}" data-name="${esc(f.name)}">${t("Eliminar")}</button>` : ""}
            </td>
          </tr>`;
          }).join("")}
        </tbody></table>`
      : `<p class="muted pad">${t("Todavía no hay archivos en el servidor.")}</p>`;

    $$("[data-dl]").forEach((b) => {
      b.onclick = async () => {
        try {
          const r = await invoke("download_file", { urlPath: b.dataset.dl, suggestedName: b.dataset.name });
          if (!r.cancelled) toast(`${t("Guardado en")} ${r.path}`, "ok");
        } catch (e) { toast(String(e), "error"); }
      };
    });

    $$("[data-share]").forEach((b) => {
      b.onclick = async () => {
        const next = b.dataset.shared === "1" ? false : true;
        try {
          await api("PATCH", "/api/files", { id: b.dataset.share, isShared: next });
          toast(`${b.dataset.name} ${next ? t("compartido con la organización") : t("ya no es compartido")}`, next ? "ok" : "warn");
          renderFiles();
        } catch { toast(t("No se pudo cambiar el estado de compartido"), "error"); }
      };
    });

    $$("[data-del-file]").forEach((b) => {
      b.onclick = async () => {
        if (!confirm(`${t("¿Eliminar")} ${b.dataset.name} ${t("del almacenamiento?")}`)) return;
        try {
          await api("DELETE", `/api/files?id=${b.dataset.delFile}`);
          toast(t("Archivo eliminado"), "ok");
          renderFiles();
        } catch { toast(t("No se pudo eliminar el archivo"), "error"); }
      };
    });
  } catch {
    $("#file-list").innerHTML = `<p class="muted pad">${t("Sin conexión con el servidor de archivos.")}</p>`;
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
  const label = p.status === "done" ? t("Completado") : p.status === "error" ? `${t("Error:")} ${p.error || ""}` : `${bytes(p.uploaded)} / ${bytes(p.total)}`;
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
    toast(`${ok} ${t("de")} ${results.length} ${t("archivo(s) subidos")}`, ok === results.length ? "ok" : "warn");
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
    $("#chat-log").innerHTML = `<p class="muted pad">${t("Sin conexión con el chat.")}</p>`;
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
          ${m.isRead ? "" : `<span class="tag tag-info">${t("nuevo")}</span>`}
        </div>`).join("")
      : `<p class="muted pad">${t("La bandeja está vacía.")}</p>`;
  } catch {
    $("#mail-list").innerHTML = `<p class="muted pad">${t("Sin conexión con el correo.")}</p>`;
  }
}

function paintChat() {
  const log = $("#chat-log");
  log.innerHTML = App.chatMessages.map((m) => {
    const mine = m.senderId === App.session?.id;
    const who = m.sender?.name || t("Equipo");
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
  } catch { toast(t("No se pudo enviar el mensaje"), "error"); }
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
    : `<p class="muted pad">${t("No hay personas que coincidan.")}</p>`;
}

// ------------------------------------------------------------
// VISTA · RRHH
// ------------------------------------------------------------
async function renderHR() {
  const canApprove = ["super_admin", "admin", "hr", "manager"].includes(App.session?.role);
  try {
    const res = await api("GET", "/api/hr/timeoff", null, "timeoff");
    const items = res?.data || [];
    $("#hr-list").innerHTML = items.length
      ? items.map((r) => `<div class="list-item">
          <div class="li-main">
            <div class="li-title">${esc(typeLabel(r.type))} · ${esc(r.days)} ${t("día(s)")}</div>
            <div class="li-sub">${esc(r.startDate)} → ${esc(r.endDate)} · ${esc(r.user ? r.user.firstName + " " + r.user.lastName : "")}</div>
            ${r.reason ? `<div class="li-sub muted">${esc(r.reason)}</div>` : ""}
          </div>
          <span class="tag ${r.status === "approved" ? "tag-ok" : r.status === "rejected" ? "tag-danger" : "tag-warn"}">${esc(r.status)}</span>
          ${canApprove && r.status === "pending" ? `
            <div class="row" style="gap:4px">
              <button class="btn btn-success btn-sm" data-timeoff-approve="${esc(r.id)}">${t("Aprobar")}</button>
              <button class="btn btn-danger btn-sm" data-timeoff-reject="${esc(r.id)}">${t("Rechazar")}</button>
            </div>` : ""}
        </div>`).join("")
      : `<p class="muted pad">${t("No hay solicitudes registradas.")}</p>`;

    $$("[data-timeoff-approve]").forEach((b) => {
      b.onclick = () => timeoffDecision(b.dataset.timeoffApprove, "approved");
    });
    $$("[data-timeoff-reject]").forEach((b) => {
      b.onclick = () => timeoffDecision(b.dataset.timeoffReject, "rejected");
    });
  } catch {
    $("#hr-list").innerHTML = `<p class="muted pad">${t("Sin conexión con RR. HH.")}</p>`;
  }
}

async function timeoffDecision(id, status) {
  try {
    await api("PATCH", "/api/hr/timeoff", { id, status });
    toast(status === "approved" ? t("Solicitud aprobada") : t("Solicitud rechazada"), status === "approved" ? "ok" : "warn");
    renderHR();
  } catch { toast(t("No se pudo actualizar la solicitud"), "error"); }
}

function typeLabel(type) {
  return t(({ vacation: "Vacaciones", sick: "Enfermedad", personal: "Asuntos propios", other: "Otro" })[type] || type);
}

// ------------------------------------------------------------
// VISTA · DISPOSITIVOS
// ------------------------------------------------------------
async function renderDevices() {
  const info = await invoke("device_info").catch(() => null);
  if (info) {
    $("#device-self").innerHTML = kv({
      [t("Nombre")]: info.device_name,
      [t("Sistema")]: info.os_version,
      [t("Plataforma")]: `${info.platform} · ${info.arch}`,
      [t("Procesador")]: info.cpu,
      [t("Memoria")]: `${info.total_memory_mb} MB`,
      [t("IP VPN")]: info.vpn_ip || t("no asignada"),
      [t("Versión app")]: info.app_version,
    });
  }

  try {
    const res = await api("GET", "/api/devices", null, "devices");
    const rows = res?.data || [];
    $("#device-list").innerHTML = rows.length
      ? `<table><thead><tr><th>${t("Equipo")}</th><th>${t("Tipo")}</th><th>${t("Sistema")}</th><th>IP</th><th>${t("Asignado")}</th><th>${t("Estado")}</th></tr></thead><tbody>
          ${rows.map((r) => {
            const d = r.device || r;
            const a = r.assignee;
            return `<tr>
              <td><strong>${esc(d.name)}</strong><div class="muted small">${esc(d.brand || "")} ${esc(d.model || "")}</div></td>
              <td>${esc(d.type)}</td>
              <td>${esc(d.os || "—")}</td>
              <td class="mono">${esc(d.ipAddress || "—")}</td>
              <td>${a ? esc(a.firstName + " " + a.lastName) : `<span class="muted">${t("sin asignar")}</span>`}</td>
              <td><span class="tag ${d.status === "available" ? "tag-ok" : d.status === "assigned" ? "tag-info" : "tag-warn"}">${esc(d.status)}</span></td>
            </tr>`;
          }).join("")}
        </tbody></table>`
      : `<p class="muted pad">${t("El inventario está vacío.")}</p>`;
  } catch {
    $("#device-list").innerHTML = `<p class="muted pad">${t("Sin conexión con el inventario.")}</p>`;
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
      : `<option value="">${t("Sin colas disponibles")}</option>`;

    $("#job-list").innerHTML = jobs.length
      ? jobs.map((row) => {
          const j = row.job || row;
          const tag = j.status === "completed" ? "tag-ok" : j.status === "failed" ? "tag-danger" : j.status === "processing" ? "tag-info" : "tag-warn";
          return `<div class="list-item">
            <div class="li-main">
              <div class="li-title">${esc(j.name)}</div>
              <div class="li-sub">${esc(j.type)} · ${t("intentos")} ${j.attempts}/${j.maxAttempts} · ${when(j.createdAt)}</div>
              ${j.status === "processing" ? `<div class="bar" style="margin-top:6px"><i style="width:${j.progress || 0}%"></i></div>` : ""}
            </div>
            <span class="tag ${tag}">${esc(j.status)}</span>
          </div>`;
        }).join("")
      : `<p class="muted pad">${t("No hay trabajos en la cola.")}</p>`;
  } catch {
    $("#job-list").innerHTML = `<p class="muted pad">${t("Sin conexión con el servicio de trabajos.")}</p>`;
  }
}

// ------------------------------------------------------------
// VISTA · PROYECTOS
// ------------------------------------------------------------
async function renderProjects() {
  try {
    const res = await api("GET", "/api/projects", null, "projects");
    const list = res?.data || [];
    $("#project-list").innerHTML = list.length
      ? `<table><thead><tr><th>${t("Proyecto")}</th><th>${t("Estado")}</th><th>${t("Prioridad")}</th><th>${t("Presupuesto")}</th><th>${t("Responsable")}</th><th>${t("Progreso")}</th></tr></thead><tbody>
          ${list.map((p) => `<tr>
            <td><strong>${esc(p.name)}</strong>${p.code ? `<div class="muted small mono">${esc(p.code)}</div>` : ""}</td>
            <td><span class="tag tag-info">${esc(statusLabel(p.status))}</span></td>
            <td><span class="tag ${p.priority === "critical" ? "tag-danger" : p.priority === "high" ? "tag-warn" : "tag-info"}">${esc(p.priority)}</span></td>
            <td>${p.budget ? new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(p.budget)) : "—"}</td>
            <td>${p.manager ? esc(p.manager.firstName + " " + p.manager.lastName) : `<span class="muted">${t("sin asignar")}</span>`}</td>
            <td>
              ${p.progress != null ? `<div class="bar" style="min-width:90px"><i style="width:${Math.max(0, Math.min(100, p.progress))}%"></i></div><div class="muted small">${p.progress}% · ${p.tasks ?? 0} ${t("tareas")}</div>` : '<span class="muted">—</span>'}
            </td>
          </tr>`).join("")}
        </tbody></table>`
      : `<p class="muted pad">${t("No hay proyectos registrados.")}</p>`;
  } catch {
    $("#project-list").innerHTML = `<p class="muted pad">${t("Sin conexión con los proyectos.")}</p>`;
  }
}

async function projectCreate() {
  const name = $("#pr-name").value.trim();
  if (!name) return toast(t("El nombre del proyecto es obligatorio"), "warn");
  const payload = {
    name,
    code: $("#pr-code").value.trim() || undefined,
    priority: $("#pr-priority").value,
    startDate: $("#pr-start").value || undefined,
    endDate: $("#pr-end").value || undefined,
    budget: $("#pr-budget").value ? Number($("#pr-budget").value) : undefined,
    description: $("#pr-description").value.trim() || undefined,
  };
  try {
    await api("POST", "/api/projects", payload);
    $("#pr-name").value = ""; $("#pr-code").value = ""; $("#pr-description").value = "";
    $("#pr-error").classList.add("hidden");
    toast(t("Proyecto creado"), "ok");
    renderProjects();
  } catch (e) {
    const msg = String(e).replace("Error: ", "");
    const box = $("#pr-error");
    box.textContent = msg; box.classList.remove("hidden");
  }
}

// ------------------------------------------------------------
// VISTA · TIENDA Y PAGOS
// ------------------------------------------------------------
async function renderStore() {
  await loadWallet();
  await loadProducts();
  await loadCart();
  await loadOrders();
}

async function loadWallet() {
  try {
    const r = await api("GET", "/api/store/wallet", null, "store-wallet");
    const wallet = r?.data?.wallet;
    const tx = r?.data?.transactions || [];
    const balance = wallet ? Number(wallet.balance ?? 0) : 0;
    $("#store-stats").innerHTML = [
      card(t("Saldo de crédito"), new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(balance), t("recargable desde esta vista")),
      card(t("Última recarga"), tx[0] ? `${new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(tx[0].amount || 0))}` : "—", tx[0] ? when(tx[0].createdAt) : t("sin movimientos")),
      card(t("Pedidos"), (App.cache.orders || []).length, t("histórico de compras")),
    ].join("");
    $("#store-wallet").innerHTML = wallet
      ? kv({
          [t("Saldo actual")]: new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(balance),
          [t("Movimientos")]: tx.length,
          [t("Última operación")]: tx[0] ? `${tx[0].type || "—"} · ${when(tx[0].createdAt)}` : "—",
        })
      : `<p class="muted pad">${t("Sin información de saldo.")}</p>`;
  } catch {
    $("#store-wallet").innerHTML = `<p class="muted pad">${t("Sin conexión con el saldo.")}</p>`;
  }
}

async function loadProducts() {
  try {
    const r = await api("GET", "/api/store/products", null, "store-products");
    const products = r?.data || [];
    $("#store-products").innerHTML = products.length
      ? `<table><thead><tr><th>${t("Producto")}</th><th>${t("Precio")}</th><th></th></tr></thead><tbody>
          ${products.map((p) => `<tr>
            <td><strong>${esc(p.name)}</strong><div class="muted small">${esc(p.category?.name || p.description || "")}</div></td>
            <td>${new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(p.price || 0))}</td>
            <td><button class="btn btn-primary btn-sm" data-add-cart="${esc(p.id)}" data-cart-name="${esc(p.name)}">${t("Añadir al carrito")}</button></td>
          </tr>`).join("")}
        </tbody></table>`
      : `<p class="muted pad">${t("El catálogo está vacío.")}</p>`;
    $$("[data-add-cart]").forEach((b) => {
      b.onclick = async () => {
        try {
          await api("POST", "/api/store/cart", { productId: b.dataset.addCart, quantity: 1 });
          toast(`${b.dataset.cartName} ${t("añadido al carrito")}`, "ok");
          loadCart();
        } catch { toast(t("No se pudo añadir al carrito"), "error"); }
      };
    });
  } catch {
    $("#store-products").innerHTML = `<p class="muted pad">${t("Sin conexión con el catálogo.")}</p>`;
  }
}

async function loadCart() {
  try {
    const r = await api("GET", "/api/store/cart", null, "store-cart");
    const items = r?.data?.items || [];
    const box = $("#store-cart");
    if (!items.length) {
      box.innerHTML = `<p class="muted pad">${t("El carrito está vacío.")}</p>`;
      $("#store-checkout").classList.add("hidden");
      return;
    }
    const fmt = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
    box.innerHTML = items.map((it) => `<div class="list-item">
        <div class="li-main">
          <div class="li-title">${esc(it.product?.name || it.name || "")} × ${esc(it.quantity || 1)}</div>
          <div class="li-sub">${fmt(Number(it.unitPrice || it.price || 0))} ${t("c/u")}</div>
        </div>
        <button class="btn btn-ghost btn-sm" data-cart-remove="${esc(it.id)}">${t("Quitar")}</button>
      </div>`).join("")
      + `<div class="list-item" style="border-top:1px solid var(--border)"><div class="li-main"><strong>${t("Total (IVA incl.)")}</strong></div><strong>${fmt(Number(r?.data?.total || 0))}</strong></div>`;
    $("#store-checkout").classList.remove("hidden");
    $$("[data-cart-remove]").forEach((b) => {
      b.onclick = async () => {
        try { await api("DELETE", `/api/store/cart?id=${b.dataset.cartRemove}`); loadCart(); }
        catch { toast(t("No se pudo quitar el producto"), "error"); }
      };
    });
  } catch {
    $("#store-cart").innerHTML = `<p class="muted pad">${t("Sin conexión con el carrito.")}</p>`;
  }
}

async function storeCheckout(payWithCredit) {
  const payload = {
    billingName: $("#co-billing").value.trim() || App.session?.firstName + " " + App.session?.lastName,
    billingTaxId: $("#co-taxid").value.trim() || undefined,
    billingAddress: $("#co-address").value.trim() || undefined,
    payWithCredit: !!payWithCredit,
  };
  const btn = $("#co-pay-credit");
  btn.disabled = true;
  try {
    const r = await api("POST", "/api/store/orders", payload);
    $("#co-error").classList.add("hidden");
    toast(`${t("Pedido")} ${r?.data?.number || ""} ${t("registrado")} · ${t("estado:")} ${r?.data?.status || "ok"}`, "ok");
    $("#co-billing").value = ""; $("#co-taxid").value = ""; $("#co-address").value = "";
    App.cache.orders = null;
    loadCart();
    loadWallet();
    loadOrders();
  } catch (e) {
    const box = $("#co-error");
    box.textContent = String(e).replace("Error: ", ""); box.classList.remove("hidden");
  } finally {
    btn.disabled = false;
  }
}

async function loadOrders() {
  try {
    const r = await api("GET", "/api/store/orders", null, "store-orders");
    App.cache.orders = r?.data || [];
    const orders = App.cache.orders;
    $("#store-orders").innerHTML = orders.length
      ? orders.map((o) => `<div class="list-item">
          <div class="li-main">
            <div class="li-title">${esc(o.number || t("Pedido"))} · ${new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(o.total || 0))}</div>
            <div class="li-sub">${when(o.createdAt)} · ${esc(o.paymentStatus || o.status || "")}</div>
          </div>
          <span class="tag ${o.status === "paid" ? "tag-ok" : o.status === "pending" ? "tag-warn" : "tag-info"}">${esc(o.status)}</span>
        </div>`).join("")
      : `<p class="muted pad">${t("Aún no has hecho pedidos.")}</p>`;
    loadWallet();
  } catch {
    $("#store-orders").innerHTML = `<p class="muted pad">${t("Sin conexión con los pedidos.")}</p>`;
  }
}

async function walletRecharge() {
  const amount = Number($("#wallet-amount").value);
  if (!amount || amount <= 0) return toast(t("Indica una cantidad válida"), "warn");
  if (amount > 50000) return toast(t("El máximo por recarga es 50.000 MXN"), "warn");
  try {
    const r = await api("POST", "/api/store/wallet", { amount, last4: "4242" });
    toast(`${t("Saldo recargado:")} ${new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(r?.data?.wallet?.balance || amount))}`, "ok");
    $("#wallet-amount").value = "";
    loadWallet();
  } catch { toast(t("No se pudo recargar el saldo"), "error"); }
}

// ------------------------------------------------------------
// VISTA · CALENDARIO
// ------------------------------------------------------------
async function renderCalendar() {
  try {
    const r = await api("GET", "/api/calendar", null, "cal");
    const events = r?.data || [];
    const canEdit = ["super_admin", "admin", "manager"].includes(App.session?.role);
    $("#cal-list").innerHTML = events.length
      ? events.map((m) => `<div class="list-item">
          <div class="li-main">
            <div class="li-title">${esc(m.title)} <span class="tag tag-info">${esc(m.type)}</span></div>
            <div class="li-sub">${when(m.startTime)} → ${when(m.endTime)} · ${esc(m.location || t("Sala"))}</div>
          </div>
          ${canEdit ? `<button class="btn btn-ghost btn-sm" data-cal-del="${esc(m.id)}">${t("Eliminar")}</button>` : ""}
        </div>`).join("")
      : `<p class="muted pad">${t("No hay reuniones programadas.")}</p>`;
    $$("[data-cal-del]").forEach((b) => {
      b.onclick = async () => {
        try { await api("DELETE", `/api/calendar?id=${b.dataset.calDel}`); renderCalendar(); toast(t("Reunión eliminada"), "ok"); }
        catch { toast(t("No se pudo eliminar la reunión"), "error"); }
      };
    });
  } catch {
    $("#cal-list").innerHTML = `<p class="muted pad">${t("Sin conexión con el calendario.")}</p>`;
  }
}

async function calendarCreate() {
  const title = $("#cal-title").value.trim();
  const start = $("#cal-start").value;
  const end = $("#cal-end").value;
  if (!title || !start || !end) return toast(t("Completa título, inicio y fin"), "warn");
  try {
    await api("POST", "/api/calendar", {
      title,
      type: $("#cal-type").value,
      status: "scheduled",
      startTime: new Date(start).toISOString(),
      endTime: new Date(end).toISOString(),
      location: $("#cal-location").value.trim() || undefined,
      isOnline: $("#cal-online").checked,
      attendees: [],
      agenda: [],
    });
    $("#cal-title").value = ""; $("#cal-location").value = ""; $("#cal-online").checked = false;
    $("#cal-error").classList.add("hidden");
    renderCalendar();
    toast(t("Reunión creada"), "ok");
  } catch (e) {
    const box = $("#cal-error");
    box.textContent = String(e).replace("Error: ", ""); box.classList.remove("hidden");
  }
}

// ------------------------------------------------------------
// VISTA · DOCUMENTOS
// ------------------------------------------------------------
async function renderDocuments() {
  try {
    const r = await api("GET", "/api/documents", null, "docs");
    const docs = r?.data || [];
    $("#doc-list").innerHTML = docs.length
      ? docs.map((d) => `<div class="list-item">
          <div class="li-main">
            <div class="li-title">${esc(d.title)} <span class="tag ${d.status === "published" ? "tag-ok" : d.status === "archived" ? "tag-warn" : "tag-info"}">${esc(d.status)}</span></div>
            <div class="li-sub">${esc(d.type)} · ${esc(d.author?.name || "—")} · ${when(d.updatedAt)}</div>
            <div class="li-sub muted">${esc((d.content || "").slice(0, 140))}</div>
          </div>
          <button class="btn btn-ghost btn-sm" data-doc-del="${esc(d.id)}">${t("Eliminar")}</button>
        </div>`).join("")
      : `<p class="muted pad">${t("No hay documentos todavía.")}</p>`;
    $$("[data-doc-del]").forEach((b) => {
      b.onclick = async () => {
        if (!confirm(t("¿Eliminar este documento?"))) return;
        try { await api("DELETE", `/api/documents?id=${b.dataset.docDel}`); renderDocuments(); toast(t("Documento eliminado"), "ok"); }
        catch { toast(t("No se pudo eliminar el documento"), "error"); }
      };
    });
  } catch {
    $("#doc-list").innerHTML = `<p class="muted pad">${t("Sin conexión con los documentos.")}</p>`;
  }
}

async function documentCreate() {
  const title = $("#doc-title").value.trim();
  if (!title) return toast(t("Escribe un título"), "warn");
  try {
    await api("POST", "/api/documents", {
      title,
      content: $("#doc-content").value.trim(),
      type: $("#doc-type").value,
      status: $("#doc-status").value,
      tags: [],
    });
    $("#doc-title").value = ""; $("#doc-content").value = "";
    $("#doc-error").classList.add("hidden");
    renderDocuments();
    toast(t("Documento guardado"), "ok");
  } catch (e) {
    const box = $("#doc-error");
    box.textContent = String(e).replace("Error: ", ""); box.classList.remove("hidden");
  }
}

// ------------------------------------------------------------
// VISTA · NÓMINAS (solo personal de finanzas y administración)
// ------------------------------------------------------------
async function renderPayrolls() {
  const fmt = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
  try {
    const r = await api("GET", "/api/payrolls", null, "payrolls");
    const list = r?.data || [];
    const totalNet = list.reduce((s, p) => s + (Number(p.netAmount) || 0), 0);
    const totalGross = list.reduce((s, p) => s + (Number(p.totalAmount) || 0), 0);
    $("#pay-stats").innerHTML = [
      card(t("Periodos"), list.length, t("meses calculados")),
      card(t("Bruto acumulado"), fmt(totalGross), t("todos los periodos")),
      card(t("Neto acumulado"), fmt(totalNet), t("después de impuestos")),
      card(t("Empleados en nómina"), (list[0]?.employees || []).length, t("último periodo")),
    ].join("");

    $("#pay-list").innerHTML = list.map((p) => `
      <details class="payroll-period">
        <summary class="list-item clickable">
          <div class="li-main">
            <div class="li-title">${esc(p.period)} <span class="tag ${p.status === "paid" ? "tag-ok" : "tag-warn"}">${esc(p.status)}</span></div>
            <div class="li-sub">${p.employees?.length || 0} ${t("empleados")} · ${t("bruto")} ${fmt(p.totalAmount)} · ${t("neto")} ${fmt(p.netAmount)}</div>
          </div>
        </summary>
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>${t("Empleado")}</th><th>${t("Puesto")}</th><th>${t("Salario base")}</th><th>${t("Extras")}</th>
              <th>${t("Impuestos")}</th><th>${t("Neto")}</th><th>${t("Estado")}</th>
            </tr></thead>
            <tbody>
              ${(p.employees || []).map((e) => `<tr>
                <td><strong>${esc(e.name)}</strong></td>
                <td>${esc(e.position)}</td>
                <td>${fmt(e.baseSalary)}</td>
                <td>${fmt(Number(e.overtime || 0) + Number(e.bonuses || 0))}</td>
                <td>${fmt(Number(e.deductions || 0))}</td>
                <td><strong>${fmt(e.netSalary)}</strong></td>
                <td><span class="tag ${e.paymentStatus === "paid" ? "tag-ok" : "tag-warn"}">${esc(e.paymentStatus)}</span></td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>
      </details>`).join("")
      || `<p class="muted pad">${t("No hay períodos de nómina. Genera el primero con el formulario.")}</p>`;
  } catch (e) {
    $("#pay-list").innerHTML = `<p class="muted pad">${t("No puedes consultar nóminas o el servicio no responde. Rol requerido: Finanzas/Administración.")}</p>`;
    $("#pay-error").textContent = String(e).replace("Error: ", "");
    $("#pay-error").classList.remove("hidden");
  }
}

async function payrollGenerate() {
  const month = Number($("#pay-month").value);
  const year = Number($("#pay-year").value);
  if (!year || year < 2000 || year > 2100) return toast(t("Indica un año válido"), "warn");
  const btn = $("#pay-gen");
  btn.disabled = true;
  try {
    const r = await api("POST", "/api/payrolls", { month, year });
    $("#pay-error").classList.add("hidden");
    toast(`${t("Nómina de")} ${r?.data?.period || `${month}/${year}`} ${t("generada con")} ${r?.data?.employees ?? 0} ${t("empleado(s)")}`, "ok");
    renderPayrolls();
  } catch (e) {
    const box = $("#pay-error");
    box.textContent = String(e).replace("Error: ", ""); box.classList.remove("hidden");
  } finally {
    btn.disabled = false;
  }
}

// ------------------------------------------------------------
// VISTA · FACTURACIÓN / TARJETAS
// ------------------------------------------------------------
const MXN_FMT = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

async function renderBilling() {
  await loadCards();
  await loadBillingWallet();
  await loadBillingOrders();
}

async function loadCards() {
  try {
    const r = await api("GET", "/api/store/cards", null, "cards");
    const cards = r?.data || [];
    $("#card-list").innerHTML = cards.length
      ? cards.map((c) => `<div class="list-item">
          <div class="li-main">
            <div class="li-title">${esc(c.brand)} ···· ${esc(c.last4)} ${c.isDefault ? `<span class="tag tag-ok">${t("por defecto")}</span>` : ""}</div>
            <div class="li-sub">${esc(c.holderName || "")} · ${t("caduca")} ${esc(c.expiryMonth || "—")}/${esc(c.expiryYear || "—")}</div>
          </div>
          <button class="btn btn-ghost btn-sm" data-card-del="${esc(c.id)}">${t("Quitar")}</button>
        </div>`).join("")
      : `<p class="muted pad">${t("No tienes métodos de pago registrados.")}</p>`;
    $$("[data-card-del]").forEach((b) => {
      b.onclick = async () => {
        try { await api("DELETE", `/api/store/cards?id=${b.dataset.cardDel}`); loadCards(); toast(t("Método de pago eliminado"), "ok"); }
        catch { toast(t("No se pudo eliminar"), "error"); }
      };
    });
  } catch {
    $("#card-list").innerHTML = `<p class="muted pad">${t("Sin conexión con los métodos de pago.")}</p>`;
  }
}

async function cardAdd() {
  const number = $("#card-number").value.replace(/[\s-]/g, "");
  const holder = $("#card-holder").value.trim();
  const mon = Number($("#card-mon").value);
  const year = Number($("#card-year").value);
  if (number.length < 12) return toast(t("Introduce un número de tarjeta válido (solo se guardan los últimos 4)"), "warn");
  if (!holder) return toast(t("Indica el titular de la tarjeta"), "warn");
  try {
    await api("POST", "/api/store/cards", {
      number, holderName: holder,
      expiryMonth: mon ? String(mon).padStart(2, "0") : "",
      expiryYear: String(year),
      isDefault: false,
    });
    $("#card-number").value = ""; $("#card-holder").value = ""; $("#card-mon").value = "";
    $("#card-link-error").classList.add("hidden");
    loadCards();
    toast(t("Método de pago añadido"), "ok");
  } catch (e) {
    const box = $("#card-link-error");
    box.textContent = String(e).replace("Error: ", ""); box.classList.remove("hidden");
  }
}

async function loadBillingWallet() {
  try {
    const r = await api("GET", "/api/store/wallet", null, "billing-wallet");
    const wallet = r?.data?.wallet;
    const tx = r?.data?.transactions || [];
    const balance = wallet ? Number(wallet.balance || 0) : 0;
    $("#bill-wallet").innerHTML = kv({
      [t("Saldo actual")]: MXN_FMT.format(balance),
      [t("Movimientos")]: tx.length,
      [t("Último movimiento")]: tx[0] ? `${tx[0].type || "—"} ${MXN_FMT.format(Number(tx[0].amount || 0))} · ${when(tx[0].createdAt)}` : "—",
    });
    $("#bill-tx").innerHTML = tx.length
      ? tx.map((txn) => `<div class="list-item">
          <div class="li-main">
            <div class="li-title">${esc(txn.description || txn.type || t("Movimiento"))}</div>
            <div class="li-sub">${when(txn.createdAt)} · ${esc(txn.reference || "")}</div>
          </div>
          <strong class="${txn.type === "credit" ? "text-ok" : "text-danger"}">${txn.type === "credit" ? "+" : "−"}${MXN_FMT.format(Number(txn.amount || 0))}</strong>
        </div>`).join("")
      : `<p class="muted pad">${t("Sin movimientos de saldo.")}</p>`;
  } catch {
    $("#bill-wallet").innerHTML = `<p class="muted pad">${t("Sin conexión con el saldo.")}</p>`;
    $("#bill-tx").innerHTML = "";
  }
}

async function loadBillingOrders() {
  try {
    const r = await api("GET", "/api/store/orders", null, "billing-orders");
    const orders = r?.data || [];
    $("#bill-orders").innerHTML = orders.length
      ? orders.map((o) => `<div class="list-item">
          <div class="li-main">
            <div class="li-title">${esc(o.number || t("Pedido"))} · ${MXN_FMT.format(Number(o.total || 0))}</div>
            <div class="li-sub">${when(o.createdAt)} · ${esc(o.paymentProvider || "")} · ${esc(o.paymentReference || "")}</div>
          </div>
          <span class="tag ${o.status === "paid" ? "tag-ok" : o.status === "pending" ? "tag-warn" : "tag-danger"}">${esc(o.status)}</span>
        </div>`).join("")
      : `<p class="muted pad">${t("Aún no has hecho pedidos.")}</p>`;
  } catch {
    $("#bill-orders").innerHTML = `<p class="muted pad">${t("Sin conexión con los pedidos.")}</p>`;
  }
}

// ------------------------------------------------------------
// VISTA · ADMINISTRACIÓN (usuarios + clientes, con acciones reales)
// ------------------------------------------------------------
async function renderAdmin() {
  const role = App.session?.role;
  const canWrite = role === "super_admin" || role === "admin";

  try {
    const s = await api("GET", "/api/admin?section=stats", null, "admin-stats");
    const d = s?.data || {};
    $("#admin-stats").innerHTML = [
      card(t("Usuarios"), d.totalUsers ?? "—", `${d.activeUsers ?? 0} ${t("activos")}`),
      card(t("Proyectos"), d.totalProjects ?? "—", t("en la plataforma")),
      card(t("Tareas"), d.totalTasks ?? "—", `${d.completedTasks ?? 0} ${t("completadas")}`),
      card(t("Ingresos"), d.revenue ? `€${d.revenue}` : "—", `${d.paidOrders ?? 0} ${t("pedidos pagados")}`),
    ].join("");
  } catch { /* sin conexión */ }

  await paintAdminUsers();
  await paintClientList();

  if (!canWrite) {
    $("#au-submit").disabled = true;
    $("#au-submit").title = t("Solo administradores pueden crear usuarios");
  }
}

async function paintAdminUsers() {
  try {
    const q = ($("#admin-search").value || "").trim();
    const u = await api("GET", `/api/admin?section=users&q=${encodeURIComponent(q)}`, null, "admin-users");
    const users = u?.data || [];
    const canDelete = App.session?.role === "super_admin";
    const canWrite = App.session?.role === "super_admin" || App.session?.role === "admin";
    const selfId = App.session?.id;

    $("#admin-users").innerHTML = `<table><thead><tr>
        <th>${t("Usuario")}</th><th>${t("Correo")}</th><th>${t("Rol")}</th><th>${t("Puesto")}</th><th>${t("Estado")}</th><th>${t("Acciones")}</th>
      </tr></thead><tbody>
      ${users.map((x) => `<tr>
        <td><strong>${esc(x.firstName)} ${esc(x.lastName)}</strong></td>
        <td class="mono">${esc(x.email)}</td>
        <td>
          ${canWrite
            ? `<select data-role-change="${esc(x.id)}" class="input input-xs">
                ${["super_admin","admin","manager","hr","finance","support","employee","client"]
                  .map((r) => `<option value="${r}" ${x.role === r ? "selected" : ""}>${esc(roleLabel(r))}</option>`).join("")}
              </select>`
            : `<span class="tag tag-info">${esc(roleLabel(x.role))}</span>`}
        </td>
        <td>${esc(x.position || "—")}</td>
        <td>
          <button class="btn btn-ghost btn-sm" data-toggle-active="${esc(x.id)}" data-active="${x.isActive ? 1 : 0}" ${canWrite && x.id !== selfId ? "" : "disabled"} title="${x.id === selfId ? t("No puedes desactivar tu propia cuenta") : ""}">
            <span class="dot ${x.isActive ? "dot-ok" : "dot-off"}"></span> ${x.isActive ? t("activo") : t("inactivo")}
          </button>
        </td>
        <td style="white-space:nowrap">
          <input id="credit-${esc(x.id)}" class="input input-xs" type="number" min="1" placeholder="${t("crédito")}" style="width:84px" />
          <button class="btn btn-outline btn-sm" data-add-credit="${esc(x.id)}" ${canWrite ? "" : "disabled"} title="${t("Añadir saldo de crédito")}">+ ${t("crédito")}</button>
          ${canDelete && x.id !== selfId ? `<button class="btn btn-danger btn-sm" data-delete-user="${esc(x.id)}" title="${t("Eliminar definitivamente")}">${t("Eliminar")}</button>` : ""}
        </td>
      </tr>`).join("")}
    </tbody></table>`;

    wireAdminUsersActions();
  } catch {
    $("#admin-users").innerHTML = `<p class="muted pad">${t("Sin conexión con el panel de administración.")}</p>`;
  }
}

async function paintClientList() {
  try {
    const u = await api("GET", "/api/admin?section=users&role=client", null, "admin-clients");
    const all = u?.data || [];
    const rows = all.filter((x) => x.role === "client");

    $("#client-list").innerHTML = rows.length
      ? `<table><thead><tr><th>${t("Cliente")}</th><th>${t("Correo")}</th><th>${t("Puesto")}</th><th>${t("Último acceso")}</th><th>${t("Estado")}</th></tr></thead><tbody>
          ${rows.map((x) => `<tr>
            <td><strong>${esc(x.firstName)} ${esc(x.lastName)}</strong></td>
            <td class="mono">${esc(x.email)}</td>
            <td>${esc(x.position || "—")}</td>
            <td>${when(x.lastLogin)}</td>
            <td><span class="tag ${x.isActive ? "tag-ok" : "tag-danger"}">${x.isActive ? t("activo") : t("inactivo")}</span></td>
          </tr>`).join("")}
        </tbody></table>`
      : `<p class="muted pad">${t("No hay clientes registrados.")}</p>`;
  } catch {
    $("#client-list").innerHTML = `<p class="muted pad">${t("Sin conexión.")}</p>`;
  }
}

function wireAdminUsersActions() {
  $$("[data-role-change]").forEach((sel) => {
    sel.onchange = async () => {
      try {
        const body = { id: sel.dataset.roleChange, role: sel.value };
        await api("PATCH", "/api/admin", body);
        toast(t("Rol actualizado"), "ok");
        paintAdminUsers();
      } catch { toast(t("No se pudo cambiar el rol"), "error"); }
    };
  });

  $$("[data-toggle-active]").forEach((b) => {
    b.onclick = async () => {
      const next = b.dataset.active === "1" ? false : true;
      try {
        await api("PATCH", "/api/admin", { id: b.dataset.toggleActive, isActive: next });
        toast(next ? t("Usuario activado") : t("Usuario dado de baja (inactivo)"), next ? "ok" : "warn");
        paintAdminUsers();
        paintClientList();
      } catch { toast(t("No se pudo actualizar el estado"), "error"); }
    };
  });

  $$("[data-delete-user]").forEach((b) => {
    b.onclick = async () => {
      if (!confirm(t("¿Eliminar definitivamente a este usuario? Esta acción no se puede deshacer."))) return;
      try {
        await api("DELETE", `/api/admin?id=${b.dataset.deleteUser}`);
        toast(t("Usuario eliminado"), "ok");
        paintAdminUsers();
        paintClientList();
      } catch { toast(t("No se pudo eliminar el usuario"), "error"); }
    };
  });

  $$("[data-add-credit]").forEach((b) => {
    b.onclick = async () => {
      const amount = Number($(`#credit-${b.dataset.addCredit}`).value);
      if (!amount || amount <= 0) return toast(t("Indica una cantidad"), "warn");
      try {
        const r = await api("POST", "/api/admin", { action: "add_credit", userId: b.dataset.addCredit, amount });
        toast(`${t("Crédito añadido. Saldo:")} ${r?.data?.wallet?.balance ?? "OK"}`, "ok");
      } catch { toast(t("No se pudo añadir crédito"), "error"); }
    };
  });
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
  $("#db-pass").placeholder = hasPass ? t("•••••••• (guardada en el llavero)") : t("Se guarda en el llavero del sistema");

  invoke("read_audit_log").then((t) => { $("#audit-log").textContent = t; }).catch(() => {});
}

async function dbConnectAndList() {
  try {
    const r = await invoke("db_test");
    $("#db-badge").className = "tag tag-ok";
    $("#db-badge").textContent = t("conectado");
    toast(t("Conexión con PostgreSQL establecida"), "ok");

    const stats = await invoke("db_stats").catch(() => null);
    if (stats) {
      $("#db-stats").innerHTML = kv({
        [t("Base de datos")]: stats.database,
        [t("Tamaño")]: stats.size,
        [t("Tablas")]: stats.tables,
        [t("Conexiones")]: stats.connections,
        [t("En marcha desde")]: stats.uptime,
        [t("Versión")]: (r.version || "").split(",")[0],
      });
    }

    const tables = await invoke("db_tables");
    $("#db-tables").innerHTML = tables.map((tbl) => `
      <div class="list-item clickable" data-table="${esc(tbl.name)}">
        <div class="li-main">
          <div class="li-title mono">${esc(tbl.name)}</div>
          <div class="li-sub">${tbl.estimated_rows} ${t("filas aprox.")} · ${esc(tbl.total_size)}</div>
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
    $("#db-badge").textContent = t("sin conexión");
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
  $("#sql-meta").textContent = `${result.row_count} ${t("fila(s)")} · ${result.elapsed_ms} ms${result.truncated ? " · " + t("resultado recortado") : ""}`;
  $("#sql-result").innerHTML = result.columns.length
    ? `<table><thead><tr>${result.columns.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>
        ${result.rows.map((row) => `<tr>${row.map((v) =>
          v === null ? `<td class="null">NULL</td>` : `<td class="mono">${esc(v.length > 120 ? v.slice(0, 120) + "…" : v)}</td>`
        ).join("")}</tr>`).join("")}
      </tbody></table>`
    : `<p class="muted pad">${t("La consulta no devolvió columnas.")}</p>`;
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
  $("#set-vpnip").textContent = App.conn?.vpn_ip || t("no asignada");
}

async function runDiagnostics() {
  $("#diag").innerHTML = `<div><span>${t("Estado")}</span><strong>${t("Comprobando…")}</strong></div>`;
  const c = App.config;
  const targets = [
    [t("API web"), c.host, c.port],
    [t("Puerta VPN"), c.vpn_gateway, c.port],
    ["PostgreSQL", c.db_host, c.db_port],
    [t("Almacenamiento"), c.storage_host, c.storage_port],
  ];

  const results = {};
  for (const [name, host, port] of targets) {
    try {
      const r = await invoke("probe_host", { host, port });
      results[t(name)] = r.reachable ? `OK · ${r.latencyMs} ms` : t("sin respuesta");
    } catch { results[name] = t("error"); }
  }

  const ips = await invoke("local_addresses").catch(() => []);
  results[t("IPs locales")] = ips.join(", ") || "—";
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
      toast(`${t("Sesión reanudada ·")} ${session.firstName}`, "ok");
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
    btn.textContent = t("Conectando…");

    try {
      const session = await invoke("login", {
        email: $("#login-email").value.trim(),
        password: $("#login-password").value,
        remember: $("#login-remember").checked,
      });
      $("#login-password").value = "";
      App.config = await invoke("get_config");
      await showApp(session);
      toast(`${t("Bienvenido/a,")} ${session.firstName}`, "ok");
    } catch (err) {
      errBox.textContent = String(err).replace("Error: ", "");
      errBox.classList.remove("hidden");
    } finally {
      btn.disabled = false;
      btn.textContent = t("Entrar a la plataforma");
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
      $("#terms-error").textContent = t("Debes marcar la casilla para aceptar los términos.");
      $("#terms-error").classList.remove("hidden");
      return;
    }
    const btn = $("#terms-submit");
    btn.disabled = true;
    btn.textContent = t("Guardando…");
    try {
      await api("POST", "/api/auth/terms", {});
      if (App.pendingSession) {
        const session = App.pendingSession;
        App.pendingSession = null;
        await enterApp(session);
        toast(t("Términos aceptados. ¡Bienvenido/a!"), "ok");
      } else {
        showLogin();
      }
    } catch {
      $("#terms-error").textContent = t("No se pudo guardar la aceptación. Verifica tu conexión.");
      $("#terms-error").classList.remove("hidden");
      btn.disabled = false;
      btn.textContent = t("Aceptar y continuar");
    }
  };
  $("#cfg-test").onclick = async () => {
    const r = await invoke("probe_host", { host: $("#cfg-host").value, port: Number($("#cfg-port").value) })
      .catch(() => ({ reachable: false }));
    toast(r.reachable ? `${t("Servidor accesible")} (${r.latencyMs} ms)` : t("El servidor no responde"), r.reachable ? "ok" : "error");
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
    toast(t("Configuración guardada"), "ok");
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
    toast(t("Sesión cerrada"));
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
      toast(t("Tarea creada"), "ok");
    } catch { toast(t("No se pudo crear la tarea"), "error"); }
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
    toast(t("Carpeta de sincronización actualizada"), "ok");
  };
  $("#btn-sync-now").onclick = async () => {
    try {
      const s = await invoke("sync_now");
      toast(`${t("Sincronización:")} ${s.uploaded} ${t("subidos,")} ${s.failed} ${t("con error")}`, s.failed ? "warn" : "ok");
      renderFiles();
    } catch (e) { toast(String(e), "error"); }
  };
  $("#btn-sync-reset").onclick = async () => {
    await invoke("reset_sync_index");
    toast(t("Índice reiniciado: la próxima sincronización subirá todo"));
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
    if (!payload.startDate || !payload.endDate) return toast(t("Indica las fechas"), "warn");
    try {
      await api("POST", "/api/hr/timeoff", payload);
      $("#hr-reason").value = "";
      renderHR();
      toast(t("Solicitud enviada"), "ok");
    } catch { toast(t("No se pudo enviar la solicitud"), "error"); }
  };

  // --- Dispositivos ---
  $("#btn-register-device").onclick = async () => {
    try {
      await invoke("register_device");
      toast(t("Equipo registrado en el inventario"), "ok");
      renderDevices();
    } catch (e) { toast(String(e), "error"); }
  };

  // --- Trabajos ---
  $("#job-add").onclick = async () => {
    const queueId = $("#job-queue").value;
    const name = $("#job-name").value.trim();
    if (!queueId || !name) return toast(t("Elige una cola y escribe el nombre"), "warn");
    try {
      await api("POST", "/api/jobs", { queueId, name, jobType: $("#job-type").value, payload: {} });
      $("#job-name").value = "";
      renderJobs();
      toast(t("Trabajo encolado"), "ok");
    } catch { toast(t("No se pudo encolar el trabajo"), "error"); }
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
    toast(t("Datos de conexión guardados"), "ok");
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
      showSqlAlert(`${t("Ejecutado:")} ${r.rows_affected} ${t("fila(s)")} en ${r.elapsed_ms} ms`, "alert-ok");
      invoke("read_audit_log").then((t) => { $("#audit-log").textContent = t; });
    } catch (e) {
      const msg = String(e);
      if (msg.includes("CONFIRMACION_REQUERIDA")) {
        const reason = msg.split("CONFIRMACION_REQUERIDA:")[1] || "";
        if (confirm(`${t("Atención:")}${reason}\n\n${t("¿Confirmas que quieres ejecutarla?")}`)) {
          try {
            const r = await invoke("db_execute", { sql, confirmed: true });
            showSqlAlert(`${t("Ejecutado:")} ${r.rows_affected} ${t("fila(s)")} en ${r.elapsed_ms} ms`, "alert-warn");
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
    toast(t("Configuración guardada"), "ok");
    refreshConnection();
  };
  $("#set-reset").onclick = async () => {
    App.config = await invoke("reset_config");
    renderSettings();
    toast(t("Valores restaurados"));
  };
  $("#btn-test-notif").onclick = () =>
    invoke("send_notification", { title: "TerLux Coop", body: t("Las notificaciones funcionan correctamente.") });
  $("#btn-check-update").onclick = async () => {
    try {
      const r = await invoke("check_updates");
      const box = $("#update-alert");
      box.className = `alert ${r.updateAvailable ? "alert-warn" : "alert-ok"}`;
      box.textContent = r.updateAvailable
        ? `${t("Hay una versión nueva disponible:")} ${r.latest} (${t("tienes la")} ${r.current})`
        : `${t("Estás en la última versión")} (${r.current})`;
      box.classList.remove("hidden");
    } catch (e) { toast(String(e), "error"); }
  };
  $("#btn-diag").onclick = runDiagnostics;

  // --- Admin: pestañas Usuarios / Clientes ---
  $$(".tab[data-atab]").forEach((t) => {
    t.onclick = () => {
      $$(".tab[data-atab]").forEach((x) => x.classList.toggle("active", x === t));
      const tab = t.dataset.atab;
      $("#admin-tab-users").classList.toggle("hidden", tab !== "users");
      $("#admin-tab-clients").classList.toggle("hidden", tab !== "clients");
      if (tab === "clients") paintClientList();
    };
  });

  $("#admin-search").addEventListener("input", () => paintAdminUsers());

  // --- Admin: alta de usuario ---
  $("#au-submit").onclick = async () => {
    const email = $("#au-email").value.trim();
    const pass = $("#au-pass").value;
    const firstName = $("#au-first").value.trim();
    const lastName = $("#au-last").value.trim();
    if (!email || !pass || !firstName || !lastName) return toast(t("Completa nombre, apellidos, correo y contraseña"), "warn");
    if (pass.length < 8) return toast(t("La contraseña debe tener al menos 8 caracteres"), "warn");
    const btn = $("#au-submit");
    btn.disabled = true;
    try {
      await api("POST", "/api/admin", {
        action: "create_user",
        email, password: pass, firstName, lastName,
        role: $("#au-role").value,
        position: $("#au-position").value.trim() || undefined,
      });
      $("#au-email").value = ""; $("#au-pass").value = ""; $("#au-first").value = ""; $("#au-last").value = ""; $("#au-position").value = "";
      $("#au-error").classList.add("hidden");
      toast(t("Usuario creado correctamente"), "ok");
      paintAdminUsers();
      paintClientList();
    } catch (e) {
      const box = $("#au-error");
      box.textContent = String(e).replace("Error: ", ""); box.classList.remove("hidden");
    } finally {
      btn.disabled = false;
    }
  };

  // --- Proyectos ---
  $("#pr-submit").onclick = projectCreate;

  // --- Tienda / Pagos ---
  $("#wallet-recharge").onclick = walletRecharge;
  $("#co-pay-credit").onclick = () => storeCheckout(true);

  // --- Calendario ---
  $("#cal-save").onclick = calendarCreate;

  // --- Documentos ---
  $("#doc-save").onclick = documentCreate;

  // --- Nóminas ---
  $("#pay-gen").onclick = payrollGenerate;

  // --- Facturación / Tarjetas ---
  $("#card-add").onclick = cardAdd;
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
      box.textContent = `${t("Analizados")} ${s.scanned} ${t("archivo(s)")} · ${s.pending} ${t("pendiente(s) de subir")}`;
    } else if (s.phase === "done") {
      box.className = "alert alert-ok";
      box.textContent = `${t("Sincronización completada")} · ${s.uploaded} ${t("subidos,")} ${s.failed} ${t("con error")}`;
    }
    box.classList.remove("hidden");
  });

  listen("realtime-event", (e) => {
    const evt = e.payload || {};
    if (evt.event === "message" || evt.event === "chat") {
      const from = evt.data?.sender?.name || evt.data?.from || t("Equipo");
      const text = evt.data?.body || evt.data?.preview || t("Nuevo mensaje");
      pushNotification(from, text);
      if (App.view === "messages") renderMessages();
    } else if (evt.event === "reply") {
      pushNotification(t("Soporte"), evt.data?.body || t("Respuesta recibida"));
    }
  });

  listen("realtime-status", (e) => {
    if (e.payload === "connected") console.info("[realtime] canal abierto");
  });

  listen("tray-sync-requested", async () => {
    try {
      const s = await invoke("sync_now");
      toast(`${t("Sincronización:")} ${s.uploaded} ${t("archivo(s) subidos")}`, "ok");
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
