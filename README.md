# 🏢 TerLux Coop

**Plataforma de gestión, administración y organización para cooperativas, con suite empresarial y aplicación de escritorio.**

> **Estado del proyecto:** en desarrollo (v1.0.8)

---

## Qué incluye

* 📊 **Panel de administración** (dashboard, reportes)
* 👥 **Usuarios y membresías** con roles (super_admin / manager / employee / client)
* 🏢 **Gestión de cooperativa**: proyectos, tareas, gantt, calendario, RRHH, nóminas, gastos
* 🛒 **Tienda y facturación**: planes, pedidos, CFDI, cartera y crédito
* 📥 **Sección de descargas** con los instaladores de escritorio
* 🖥️ **Aplicación de escritorio** (Tauri): Windows, Linux y macOS
* 🗄️ **PostgreSQL** con **Drizzle ORM**
* ☁️ **MinIO S3** como almacenamiento de archivos
* 🔐 **Autenticación con JWT** y control de acceso por rol
* 🌐 **Acceso por intranet** (nginx + dnsmasq) sobre **Tailscale VPN**

---

## Arquitectura de servicios

| Servicio      | Puerto        | Descripción                                  |
| ------------- | ------------- | -------------------------------------------- |
| App web        | `8443`        | Next.js (producción, `0.0.0.0`)              |
| PostgreSQL    | `5432`        | Base de datos `app_db` (datos en `data/pg`)  |
| MinIO S3      | `9000`/`9001` | Almacenamiento / consola (datos en `storage/`) |
| nginx         | `80`/`443`    | Proxy inverso de la intranet                 |
| dnsmasq       | `53`          | DNS interno `*.terluxcoop.internal`          |
| Tailscale VPN | —             | Red privada `100.64.0.0/10` (nodo `100.106.108.98`) |

**Accesos:**
* Local: `http://127.0.0.1:8443`
* Intranet: `https://intranet.terluxcoop.internal`
* Consola MinIO: `http://127.0.0.1:9001`

---

## Instalación (elige una vía)

| Opción | Para qué sirve | Requiere |
| ------ | -------------- | -------- |
| **A — Solo Docker** | Correr la plataforma en cualquier equipo de forma rápida y aislada | Git + Docker |
| **B — Completa (nativa)** | Instalación Linux/macOS con `activar.sh`, intranet por dominio y VPN | Node.js 22+, PostgreSQL, MinIO, Tailscale, nginx/dnsmasq |

> ⚠️ El archivo `.gitignore` vive solo en local (no se publica) para ignorar
> `node_modules`, `.next`, `.env`, `data/`, `storage/` y `tools/`.
> **Nunca subas secretos al repositorio.**

### Opción A — Solo Docker (rápida)

Levanta **PostgreSQL + MinIO + web** en contenedores, sin instalar nada más
(las tablas se crean solas con `web-migrate` y la app siembra usuarios, roles
y planes en el primer arranque).

```bash
# 1) Clona y configura el secreto de sesión
git clone https://github.com/DaiGeass/terlux-coop.git
cd terlux-coop
echo 'AUTH_SECRET="cambia-este-secreto"' > .env

# 2) Arranca todo (postgres + minio + web)
docker compose up -d --build

# 3) (Opcional) intranet por dominio en el puerto 80
docker compose --profile intranet up -d
```

**Ya está accesible:** web `http://127.0.0.1:8443` · consola MinIO `http://127.0.0.1:9001`

**Otras utilidades:**
```bash
docker compose ps                # estado
docker compose logs -f web       # logs de la app
docker compose down              # detener (conserva los datos)
```

**Variables opcionales en `.env`:**

```env
AUTH_SECRET="cambia-este-secreto"
MINIO_ROOT_USER="terlux_storage"
MINIO_ROOT_PASSWORD="terlux_storage"
MINIO_IMAGE="quay.io/minio/minio:latest"   # si docker.io/minio/minio está bloqueado
DOCKER_DATABASE_URL="postgresql://postgres:postgres@postgres:5432/app_db"  # override opcional
```

**VPN (opcional):** si otros equipos o la app de escritorio deben entrar por
Tailscale, loguéate en tu tailnet y escribe tu IP (`100.x.x.x`) en el `.env`
como `TAILSCALE_IP="100.x.x.x"`. Sin eso, se usa `100.106.108.98` por defecto
y todo sigue funcionando en local.

> Para usar Docker no arranques los servicios locales (puertos en conflicto:
> 5432/9000). Los datos de Docker se guardan en los volúmenes `pgdata`,
> `miniodata` y `uploads`.

### Opción B — Instalación completa (nativa Linux/macOS)

Instalación con `activar.sh`: PostgreSQL, MinIO, app web, nginx, dnsmasq y
Tailscale como servicios del sistema.

```bash
# 1) Dependencias del sistema: Node.js 22+, npm, git,
#    PostgreSQL (con initdb), MinIO (binario en tools/minio),
#    Tailscale, y para la intranet nginx + dnsmasq.

# 2) Clona e instala
git clone https://github.com/DaiGeass/terlux-coop.git
cd terlux-coop
npm install

# 3) Configura el .env (DATABASE_URL, AUTH_SECRET, MINIO_ROOT_USER,
#    MINIO_ROOT_PASSWORD, MINIO_ENDPOINT, NEXT_PUBLIC_APP_URL, ...)

# 4) Inicializa la base de datos local y entra a tu tailnet (VPN)

# 5) Arranca los servicios (piden la IP de VPN la primera vez)
./activar.sh start
```

**Control de servicios:**
```bash
./activar.sh start                 # Arranca todos los servicios
./activar.sh stop                  # Detiene todos
./activar.sh status                # Estado de cada servicio
./activar.sh logs [web|minio|pg|nginx|dnsmasq]
./activar.sh menu                  # Menú interactivo
./activar.sh update                # git pull + rebuild + reinicio
./activar.sh tunnel:on             # Expone PG+MinIO en la IP Tailscale
./activar.sh vpn:ip                # Cambiar la IP de VPN del nodo
```

**IP de VPN configurable** (prioridad):
1. Variable de entorno: `VPN_IP=100.x.x.x ./activar.sh start`
2. Archivo guardado `data/vpn-ip` (se crea en el primer arranque)
3. Prompt interactivo con la por defecto (`100.106.108.98`)

La IP se usa en nginx, dnsmasq, el túnel y los checks de estado.

**Accesos:** local `http://127.0.0.1:8443` · intranet
`https://intranet.terluxcoop.internal` · MinIO `http://127.0.0.1:9001`

> Sin persistencia, los servicios corren en primer plano y se detienen con
> `Ctrl+C`. Para segundo plano:
> `nohup setsid ./activar.sh start > /dev/null 2>&1 &`.

> ✅ Instalación completa paso a paso en **Linux/macOS**, requisitos del
> escritorio y VPN: ver **`MONTAR_LINUX_MAC.txt`**.

---

## Demo de login "turlux" (opcional)

El script `levantar-turlux.sh` levanta un entorno de demostración separado
(login demo en `:8081`, nginx con `turluxcoop.internal` y un DNS alterno):

```bash
./levantar-turlux.sh
```

---

## Base de datos

Drizzle ORM con `drizzle.config.json` (PostgreSQL en `app_db`).

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

En el **primer arranque** la plataforma auto-inicializa roles, permisos,
departamentos, planes de tienda, plantillas VPN y cuentas iniciales
(ver `CREDENCIALES.txt` y `CUENTAS_PRUEBA.txt`).

---

## Aplicación de escritorio

Cliente **Tauri** con panel técnico (conexión directa a web, PostgreSQL y
MinIO) en `desktop/`. Configuración por defecto:

| Campo          | Valor              |
| -------------- | ------------------ |
| host           | `100.106.108.98`   |
| puerto web     | `8443`             |
| red VPN        | `100.64.0.0/10`    |
| puerta VPN     | IP del nodo servidor |
| PostgreSQL     | `5432` / `app_db` / `postgres` |
| MinIO storage  | `9000`             |

**Instaladores** en la sección [Releases](https://github.com/DaiGeass/terlux-coop/releases)
y en `public/descargas/`:
* Windows: `TerLux.Coop_x64-setup.exe` / `.msi`
* Linux: `.deb` / `.AppImage`
* macOS: `.dmg`

Se publican automáticamente con el workflow **build-desktop.yml**
(GitHub Actions) al hacer push a `main` con un tag `v*`.

---

## Scripts disponibles

| Archivo                | Uso                                                       |
| ---------------------- | --------------------------------------------------------- |
| `activar.sh`           | Gestor de servicios + intranet + VPN                      |
| `levantar-turlux.sh`   | Demo de login turlux (estático + DNS alterno)             |
| `Dockerfile`           | Imagen de la app web (Next.js)                            |
| `docker-compose.yml`   | PostgreSQL + MinIO + web (+ intranet opcional)            |
| `docker/nginx-intranet.conf` | Proxy de la intranet para Docker                    |
| `drizzle.config.json`  | Configuración de Drizzle                                  |
| `next.config.ts`       | Configuración de Next.js                                  |

Estructura:

```text
terlux-coop/
├── .github/workflows/    # build-desktop.yml (instaladores + release)
├── desktop/              # Aplicación de escritorio (Tauri)
├── public/descargas/     # Instaladores publicados por el workflow
├── src/                  # Código de la aplicación web
├── data/                 # Datos locales (pg, logs, configs) — ignorados
├── storage/              # Datos de MinIO — ignorados
├── tools/                # Binarios descargados (minio) — ignorados
├── activar.sh            # Gestor de servicios
└── levantar-turlux.sh    # Demo de login
    Dockerfile            # Imagen de la app web (Next.js)
    docker-compose.yml    # PostgreSQL + MinIO + web (+ intranet)
    docker/               # Configs auxiliares de Docker
```

---

## Calidad de código

```bash
npm run lint
npm run typecheck
npm run build
```

---

## Cuentas iniciales

| Rol          | Correo                  | Contraseña    |
| ------------ | ----------------------- | ------------- |
| super_admin  | `admin@terluxcoop.com`  | `AdminTerLux#24` |
| manager      | `gerente@terluxcoop.com`| `TerLux2024!` |
| employee     | `empleado@terluxcoop.com`| `Empleado2024$` |
| client       | `tester@terluxcoop.com` | `Cliente2024$`|

> ⚠️ Credenciales de demo; cámbialas desde Administración antes de producción.
> Lista completa en `CREDENCIALES.txt` y `CUENTAS_PRUEBA.txt`.

---

## Seguridad

* Contraseñas con hash **bcrypt**, JWT firmado, 2FA configurable.
* Control de acceso por **rol y nivel** (menu por rol desde Administración).
* `pg_hba.conf` acepta la subred Tailscale (`100.64.0.0/10`) para la intranet.
* Los secretos nunca van en el repositorio (`.env` ignorado).

---

## Roadmap

* [x] Autenticación y control de acceso por rol
* [x] Dashboard, proyectos, tareas y calendario
* [x] Nóminas, RRHH y reportes
* [x] Tienda, pedidos y facturas CFDI
* [x] Aplicación de escritorio (Tauri) y VPN Tailscale
* [ ] Automatización de pruebas
* [ ] Copias de seguridad programadas
* [ ] Expansión de documentación técnica

---

## Colaboradores

### ZZERO
GitHub: **https://github.com/RENEUWU777**

### DaiGeass
GitHub: **https://github.com/DaiGeass**

---

## Repositorio

**https://github.com/DaiGeass/terlux-coop**

---

<div align="center">

### TerLux Coop

**Gestión · Organización · Cooperación · Tecnología**

**Desarrollado por ZZERO & DaiGeass**

</div>