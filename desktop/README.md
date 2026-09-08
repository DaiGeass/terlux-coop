# TerLux Coop · Aplicación de escritorio

Cliente nativo para **Windows y macOS** de la suite empresarial TerLux Coop,
escrito en **Rust con Tauri 2**. Se conecta a la plataforma web a través de la
VPN privada y añade capacidades que el navegador no puede ofrecer: subida de
archivos locales, sincronización de carpetas, notificaciones del sistema,
acceso directo a la base de datos para el personal técnico y funcionamiento
parcial sin conexión.

---

## 1. Requisitos

| Herramienta | Windows | macOS |
|---|---|---|
| Rust (rustup) | https://rustup.rs | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Node.js 18+ | https://nodejs.org | `brew install node` |
| Compilador C | Build Tools de Visual Studio (C++) | `xcode-select --install` |
| WebView | WebView2 (incluido en Win 11 / instalable) | WKWebView (del sistema) |

---

## 2. Compilar

### Windows

```powershell
cd desktop
powershell -ExecutionPolicy Bypass -File build-windows.ps1
```

Genera en `src-tauri/target/release/bundle/`:
- `nsis/TerLuxCoop_1.0.0_x64-setup.exe` — instalador recomendado
- `msi/TerLuxCoop_1.0.0_x64_es-ES.msi` — despliegue por directiva de grupo

### macOS

```bash
cd desktop
chmod +x build-macos.sh
./build-macos.sh            # arquitectura del equipo
./build-macos.sh universal  # binario universal (Intel + Apple Silicon)
```

Genera `src-tauri/target/release/bundle/dmg/TerLux Coop_1.0.0_*.dmg`.

### Desarrollo (recarga en caliente)

```bash
cd desktop
npm install
npm run icons     # solo la primera vez: genera .ico/.icns desde app-icon.png
npm run dev
```

---

## 3. Primer arranque

1. En la pantalla de acceso, pulsa **«Configurar servidor y VPN»**.
2. Introduce la dirección de la plataforma (por defecto `100.106.108.98:8443`).
3. Pulsa **Probar** para verificar el túnel y luego **Guardar**.
4. Inicia sesión con las credenciales **de la base de datos de la plataforma**
   (las mismas que en la web; ver `CREDENCIALES.txt` en la raíz del proyecto).

La sesión queda guardada en el **llavero del sistema** (Credential Manager en
Windows, Keychain en macOS) y se reanuda automáticamente al abrir la app.

---

## 4. Funcionalidades

### Para todo el personal
- **Panel** con métricas, estado de la infraestructura y ficha del equipo.
- **Tareas**: tablero Kanban con arrastrar y soltar, sincronizado con la web.
- **Archivos**: subida con barra de progreso, arrastrar y soltar desde el
  explorador, descarga y **carpeta sincronizada** tipo Drive (sube solo lo que
  cambia gracias a un índice local de huellas).
- **Mensajería**: chat del equipo en tiempo real (SSE) y bandeja de correo.
- **Directorio** de la organización con buscador.
- **RR. HH.**: solicitud y seguimiento de días libres.
- **Notificaciones nativas** de mensajes, trabajos y cortes de conexión.
- **Icono en la bandeja** con sincronización rápida y comprobación de VPN.

### Para gestores y administración
- **Dispositivos (MDM)**: el equipo se da de alta solo en el inventario
  (nombre, sistema, CPU, memoria, IP de la VPN) y envía latidos periódicos.
- **Trabajos**: encolar y vigilar procesos en segundo plano.
- **Administración**: métricas globales y listado de usuarios.

### Para el personal técnico
- **Panel técnico** con conexión **directa a PostgreSQL** por la VPN
  (sin pasar por la API web):
  - Listado de tablas con tamaño y filas estimadas.
  - Vista previa de cualquier tabla.
  - Consola SQL de lectura (`SELECT`, `WITH`, `EXPLAIN`…).
  - Ejecución de sentencias de escritura **solo para administradores**,
    con confirmación obligatoria en `DROP`, `TRUNCATE`, `ALTER`, y en
    `DELETE`/`UPDATE` sin `WHERE`.
  - Registro local de auditoría de todo lo ejecutado.

---

## 5. Permisos por rol

La interfaz se construye a partir del rol devuelto por la plataforma, y el
backend Rust vuelve a comprobarlo antes de cada operación sensible.

| Rol | Nivel | Alcance |
|---|---|---|
| `super_admin` | 100 | Todo, incluida la escritura en la base de datos |
| `admin` | 90 | Todo, incluida la escritura en la base de datos |
| `manager` | 60 | Administración, inventario, consola SQL de lectura |
| `hr` | 55 | RR. HH. y gestión de solicitudes |
| `finance` | 50 | Nóminas y trabajos |
| `support` | 40 | Mensajería y soporte |
| `employee` | 30 | Tareas, archivos, mensajes, directorio, su ficha |
| `client` | 10 | Acceso mínimo |

Los menús se ocultan si el rol no llega al nivel requerido, **incluso sin
conexión**, porque las capacidades se calculan también en local
(`models.rs → Session::capabilities`).

---

## 6. Red y VPN

```
[ App de escritorio ] --WireGuard UDP 51820--> [ 100.106.108.98 ]
                                                   |
        +------------------------+-----------------+------------------+
        v                        v                                    v
  API web 100.106.108.98:8443   PostgreSQL 100.106.108.98:5432      Almacén 100.106.108.98:9000
```

Configuración WireGuard del cliente:

```ini
[Interface]
PrivateKey = <clave-privada-del-equipo>
Address    = 100.106.108.99/32
DNS        = 100.106.108.98

[Peer]
PublicKey           = <clave-publica-del-servidor>
Endpoint            = vpn.terluxcoop.com:51820
AllowedIPs          = 100.64.0.0/10
PersistentKeepalive = 25
```

> No se usa el rango `67.7.0.0/16` porque es espacio **público** asignado al
> Departamento de Defensa de EE. UU. Se emplea `100.64.0.0/10` (RFC 1918).
> Si hiciera falta una `/16` privada: `100.64.0.0/16`.

La app detecta automáticamente si el equipo tiene una IP dentro del rango,
mide la latencia y avisa cuando el túnel se cae o se restablece.

---

## 7. Estructura del código

```
desktop/
├── app-icon.png              Icono base (genera .ico/.icns con "npm run icons")
├── package.json              CLI de Tauri y scripts
├── build-windows.ps1         Compilación asistida en Windows
├── build-macos.sh            Compilación asistida en macOS
├── ui/                       Interfaz (HTML + CSS + JS, sin framework)
│   ├── index.html
│   ├── styles.css
│   └── app.js
└── src-tauri/
    ├── Cargo.toml
    ├── tauri.conf.json
    ├── build.rs
    └── src/
        ├── main.rs           Punto de entrada
        ├── lib.rs            Arranque, bandeja y tareas en segundo plano
        ├── commands.rs       Comandos disponibles para la interfaz
        ├── api.rs            Cliente HTTP de la API web
        ├── realtime.rs       Canal de eventos en vivo (SSE) y reconexión
        ├── uploader.rs       Subidas con progreso y sincronización
        ├── dbadmin.rs        Panel técnico de PostgreSQL
        ├── vpn.rs            Diagnóstico de red e inventario del equipo
        ├── notify.rs         Notificaciones nativas
        ├── secrets.rs        Llavero del sistema
        ├── config.rs         Configuración persistente y caché
        ├── models.rs         Modelos y permisos
        └── state.rs          Estado compartido
```

---

## 8. Dónde guarda sus datos

| Contenido | Windows | macOS |
|---|---|---|
| Configuración | `%APPDATA%\TerLuxCoop\config.json` | `~/Library/Application Support/TerLuxCoop/config.json` |
| Caché sin conexión | `…\TerLuxCoop\cache\` | `…/TerLuxCoop/cache/` |
| Índice de sincronización | `…\TerLuxCoop\sync-index.json` | `…/TerLuxCoop/sync-index.json` |
| Auditoría técnica | `…\TerLuxCoop\auditoria-tecnica.log` | `…/TerLuxCoop/auditoria-tecnica.log` |
| Sesión y contraseñas | Credential Manager | Keychain |

Las contraseñas **nunca** se escriben en el JSON de configuración.

---

## 9. Modo sin conexión

Las respuestas `GET` se guardan en caché. Si el servidor no responde, la app
muestra los últimos datos conocidos con un aviso en la parte superior, y los
menús siguen respetando el rol de la última sesión válida. Las acciones de
escritura se rechazan con un mensaje claro hasta que vuelve el enlace.

---

## 10. Firma y distribución

- **Windows**: firma el `.exe`/`.msi` con `signtool` y tu certificado EV para
  evitar los avisos de SmartScreen.
- **macOS**: se necesita una cuenta de Apple Developer para firmar y notarizar:
  ```bash
  codesign --deep --force --sign "Developer ID Application: TU EMPRESA" \
    "src-tauri/target/release/bundle/macos/TerLux Coop.app"
  xcrun notarytool submit "TerLux Coop_1.0.0_aarch64.dmg" \
    --apple-id correo@empresa.com --team-id XXXXXXXXXX --wait
  ```
- Publica los instaladores en `public/descargas/` de la plataforma web y
  actualiza `src/app/api/desktop/version/route.ts` con la versión nueva:
  la app avisará sola de la actualización.
