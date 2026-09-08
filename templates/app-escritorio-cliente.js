/* ============================================================================
 * TERLUX COOP — PLANTILLA DE CONEXIÓN PARA LA APLICACIÓN DE ESCRITORIO
 * ----------------------------------------------------------------------------
 * Cliente de referencia (Node.js 18+, SIN dependencias externas) que muestra
 * cómo conectar una app de escritorio a la suite web TerLux a través de la VPN
 * (red 10.8.0.0/24, puerta de enlace 10.8.0.1, API en el puerto 8443).
 *
 * Realiza:
 *   1) Login (correo + contraseña) y guarda la cookie de sesión JWT
 *   2) Registro del dispositivo (queda visible en Ajustes > Clientes VPN)
 *   3) Heartbeat periódico
 *   4) Conexión permanente al socket SSE /api/realtime/stream
 *      (chat en directo, tickets, notificaciones globales)
 *   5) Ejemplos de llamadas REST: tareas, archivos, envío de chat
 *
 * En una app real (Electron/Tauri/.NET…) se traduce este flujo al lenguaje
 * correspondiente; el contrato HTTP/SSE es exactamente el mismo.
 *
 * Ejecutar:  node templates/app-escritorio-cliente.js
 * ==========================================================================*/

"use strict";

const https = require("https");
const http = require("http");
const os = require("os");
const crypto = require("crypto");

// --------------------------- CONFIGURACIÓN ---------------------------------
const CONFIG = {
  // IP de la puerta de enlace VPN (editar si se despliega en otra máquina).
  // El rango recomendado es 10.8.0.0/24 (privado RFC1918, WireGuard).
  host: process.env.TERLUX_HOST || "10.8.0.1",
  port: Number(process.env.TERLUX_PORT || 8443),
  useTls: true, // poner false si la API responde por http plano en pruebas
  basePath: "",
  // Credenciales (las reales se piden al usuario en la pantalla de acceso;
  // ver CREDENCIALES.txt para las cuentas iniciales).
  email: process.env.TERLUX_EMAIL || "empleado@terluxcoop.com",
  password: process.env.TERLUX_PASSWORD || "Empleado2024$",
  heartbeatMs: 30000,
};

// Identificador estable del equipo (se conserva entre arranques en la app real)
const CLIENT_ID = crypto.createHash("sha256").update(os.hostname() + "-terlux").digest("hex").slice(0, 32);

let sessionCookie = null;

// ----------------------------- HTTP GENÉRICO -------------------------------
function request(method, path, { body, formData, isStream = false } = {}) {
  return new Promise((resolve, reject) => {
    const headers = { "User-Agent": `TerLuxDesktop/1.0 (${process.platform})` };
    if (sessionCookie) headers.Cookie = sessionCookie;
    let payload = null;

    if (body) {
      payload = JSON.stringify(body);
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(payload);
    } else if (formData) {
      payload = formData.buffer;
      headers["Content-Type"] = `multipart/form-data; boundary=${formData.boundary}`;
      headers["Content-Length"] = payload.length;
    }

    const options = {
      hostname: CONFIG.host,
      port: CONFIG.port,
      path: CONFIG.basePath + path,
      method,
      headers,
      rejectUnauthorized: false, // la VPN interna suele usar certificado autofirmado
    };

    const lib = CONFIG.useTls ? https : http;
    const req = lib.request(options, (res) => {
      if (res.headers["set-cookie"]) {
        sessionCookie = res.headers["set-cookie"].map((c) => c.split(";")[0]).join("; ");
      }
      if (isStream) return resolve(res); // se gestiona el stream SSE aparte
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(data || "{}") }); }
        catch { resolve({ status: res.statusCode, json: { raw: data } }); }
      });
    });
    req.on("error", reject);
    req.setTimeout(15000, () => req.destroy(new Error("Tiempo de espera agotado (¿VPN conectada?)")));
    if (payload) req.write(payload);
    req.end();
  });
}

// ----------------------- AYUDA MULTIPART (SUBIDA) --------------------------
function buildMultipart(fields = {}, file = null) {
  const boundary = "----TerLux" + crypto.randomBytes(8).toString("hex");
  const chunks = [];
  for (const [k, v] of Object.entries(fields)) {
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`));
  }
  if (file) {
    chunks.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="${file.name}"\r\nContent-Type: ${file.mime}\r\n\r\n`
    ));
    chunks.push(file.buffer);
    chunks.push(Buffer.from("\r\n"));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return { boundary, buffer: Buffer.concat(chunks) };
}

// ----------------------------- SOCKET EN VIVO ------------------------------
function connectSocket(channel) {
  request("GET", `/api/realtime/stream?channel=${encodeURIComponent(channel)}`, { isStream: true })
    .then((res) => {
      if (res.statusCode !== 200) throw new Error("Socket no autorizado");
      console.log(`[socket] conectado al canal ${channel}`);
      let buffer = "";
      res.on("data", (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue; // ignora ping ": ..."
          try {
            const evt = JSON.parse(line.slice(6));
            console.log(`[socket:${evt.event || channel}]`, JSON.stringify(evt.data ?? evt).slice(0, 300));
          } catch { /* parcial */ }
        }
      });
      res.on("close", () => {
        console.warn("[socket] conexión cerrada, reintentando en 5s…");
        setTimeout(() => connectSocket(channel), 5000);
      });
      res.on("error", (e) => console.error("[socket] error:", e.message));
    })
    .catch((e) => {
      console.error("[socket] no disponible:", e.message, "— reintento en 10s");
      setTimeout(() => connectSocket(channel), 10000);
    });
}

async function emit(channel, event, data) {
  return request("POST", "/api/realtime/stream", { body: { channel, event, data } });
}

// ------------------------------- FLUJO --------------------------------------
async function main() {
  console.log("=== TerLux Coop · cliente de escritorio ===");
  console.log(`Servidor: ${CONFIG.useTls ? "https" : "http"}://${CONFIG.host}:${CONFIG.port} (VPN 10.8.0.0/24)`);

  // 1) LOGIN
  const login = await request("POST", "/api/auth/login", {
    body: { email: CONFIG.email, password: CONFIG.password },
  });
  if (login.status !== 200 || !login.json.success) {
    throw new Error("Login fallido: " + JSON.stringify(login.json));
  }
  console.log("[auth] sesión iniciada como", login.json.data.email, "· rol", login.json.data.role);

  // 2) REGISTRO DEL DISPOSITIVO (visible en Ajustes > Clientes VPN)
  await request("POST", "/api/integrations", {
    body: {
      action: "register_client",
      clientId: CLIENT_ID,
      deviceName: os.hostname(),
      platform: process.platform,
      appVersion: "1.0.0",
      vpnIp: "10.8.0.101", // IP asignada por WireGuard a este equipo
      metadata: { arch: process.arch, node: process.version },
    },
  });
  console.log("[vpn] dispositivo registrado:", CLIENT_ID);

  // 3) HEARTBEAT PERIÓDICO
  setInterval(async () => {
    await request("POST", "/api/integrations", {
      body: { action: "heartbeat", clientId: CLIENT_ID },
    });
  }, CONFIG.heartbeatMs);

  // 4) SOCKET: notificaciones globales + canal general de chat
  connectSocket("global");
  connectSocket("chat:<conversationId>"); // sustituir por el id real (GET /api/messages/chat)

  // 5) EJEMPLOS REST (descomentar para probar)
  // const tasks = await request("GET", "/api/tasks");
  // console.log("tareas:", tasks.json.data?.length);
  //
  // const chat = await request("GET", "/api/messages/chat");
  // const convId = chat.json.data.conversation.id;
  // await request("POST", "/api/messages/chat", { body: { conversationId: convId, body: "Hola desde la app de escritorio 👋" } });
  //
  // Subir un archivo al Drive (almacén 10.8.0.20):
  // const fs = require("fs");
  // const file = { name: "informe.pdf", mime: "application/pdf", buffer: fs.readFileSync("./informe.pdf") };
  // const form = buildMultipart({ folderId: "", category: "report" }, file);
  // const up = await request("POST", "/api/files", { formData: form });
  // console.log("subido:", up.json);
  //
  // Crear una tarea:
  // await request("POST", "/api/tasks", { body: { title: "Tarea creada desde escritorio", priority: "high" } });

  // Demo: difundir un evento de estado por el socket
  setTimeout(() => emit("global", "desktop_heartbeat", { clientId: CLIENT_ID, status: "ok" }), 4000);
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
