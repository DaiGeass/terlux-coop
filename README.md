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

## Requisitos

* **Node.js** 22+ y **npm**
* **PostgreSQL** (cliente o servidor)
* **Git**
* **Tailscale** (para acceder por VPN; opcional si solo usas local)
* **nginx** y **dnsmasq** (para la intranet por dominio; opcional)
* Binario de **MinIO** en `tools/minio` (ver guía de montaje)

```bash
node --version
npm --version
git --version
```

---

## Instalación rápida

```bash
git clone https://github.com/DaiGeass/terlux-coop.git
cd terlux-coop
npm install
```

Crea el archivo `.env` a partir de las variables que usa la app
(`DATABASE_URL`, `AUTH_SECRET`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`,
`MINIO_ENDPOINT`, `NEXT_PUBLIC_APP_URL`, etc.). **Nunca subas secretos al repositorio.**

> ⚠️ El archivo `.gitignore` vive solo en local (no se publica) para ignorar
> `node_modules`, `.next`, `.env`, `data/`, `storage/` y `tools/`.

---

## Gestión de servicios (`activar.sh`)

Control de PostgreSQL, MinIO, app web, nginx, dnsmasq y Tailscale.

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

### IP de VPN configurable

Cada nodo puede tener su propia IP de Tailscale. La resolución tiene prioridad:

1. Variable de entorno: `VPN_IP=100.x.x.x ./activar.sh start`
2. Archivo guardado `data/vpn-ip` (se crea en el primer arranque)
3. Prompt interactivo con la por defecto (`100.106.108.98`)

La IP se usa en nginx, dnsmasq, el túnel y los checks de estado.

> Sin persistencia: los servicios corren en primer plano y se detienen al
> cerrar la terminal o con `Ctrl+C`. Para segundo plano: `nohup setsid ./activar.sh start > /dev/null 2>&1 &`.

> ✅ Instalación completa paso a paso en **Linux/macOS**, requisitos del
> escritorio y VPN: ver **`MONTAR_LINUX_MAC.txt`**.

---

## Docker (PostgreSQL + MinIO + web)

Levanta la plataforma completa en contenedores (sin depender del script local):

```bash
# 1) Configura AUTH_SECRET y demás en tu .env (ver abajo)
cp .env .env 2>/dev/null   # o crea tu .env con: AUTH_SECRET, DATABASE_URL, MINIO_*

# 2) Arranca postgres + minio + web
docker compose up -d

# 3) (Opcional) intranet por dominio en el puerto 80
docker compose --profile intranet up -d

# Logs / estado
docker compose ps
docker compose logs -f web
```

* Web: `http://127.0.0.1:8443` · Consola MinIO: `http://127.0.0.1:9001`
* La base se auto-inicializa en el primer arranque (usuarios, roles, planes).
* Volúmenes persistentes: `pgdata`, `miniodata`, `uploads`.
* Para compilar la app a mano: `docker compose build web`.

Variables mínimas en `.env`:

```env
AUTH_SECRET="cambia-este-secreto"
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/app_db"
MINIO_ROOT_USER="terlux_storage"
MINIO_ROOT_PASSWORD="terlux_storage"
```

> Alternativa nativa (Linux/macOS) con `activar.sh`: ver **`MONTAR_LINUX_MAC.txt`**.
> Los contenedores conviven o sustituyen a los servicios locales; para usar
> Docker no arranques el PostgreSQL/MinIO locales (puertos en conflicto: 5432/9000).

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