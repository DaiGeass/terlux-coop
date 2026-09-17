#!/usr/bin/env bash
# ============================================================
# TERLUX COOP - CONTROL DE SERVICIOS (no persistentes)
#   Uso:  ./activar.sh [comando] [servicio]
#
#   Comandos:  menu | start | stop | restart | status | logs | update |
#              tunnel:on | tunnel:off | tailscale:up | tailscale:down
#   Servicios: web | minio | pg | tailscale | nginx | dnsmasq
#   (Sin comando => abre el MENÚ INTERACTIVO)
#
#   Servicios gestionados:
#     - PostgreSQL  (puerto 5432, datos en ./data/pg)
#     - MinIO S3    (puerto 9000, consola 9001, datos en ./storage/minio-data)
#     - App web     (puerto 8443, Next.js en modo producción)
#     - nginx       (proxy inverso intranet, 80/443 → 127.0.0.1:8443)
#     - dnsmasq     (DNS interno, resuelve intranet.terluxcoop.internal)
#     - Tailscale   (opcional, si está instalado)
#
#   nginx y dnsmasq se arrancan preferentemente con systemd (sudo). Si el
#   sistema no tiene systemd o faltan permisos, se usa un MODO DIRECTO de
#   respaldo: se generan configs locales en data/ y se ejecutan los binarios
#   en segundo plano con su propio PID.
#
#   PERSISTENCIA AL BOOT (OPCIONAL, comentada a propósito): solo para hosts
#   dedicados exclusivamente al sitio. Actívala quitando el '#':
#     sudo systemctl enable --now nginx dnsmasq
#
#   IMPORTANTE: todo se ejecuta en PRIMER PLANO. Cerrar la terminal,
#   pulsar Ctrl+C o matar el script detiene TODOS los servicios.
#   Nada queda corriendo de forma persistente.
# ============================================================

set -euo pipefail

BASE="$(cd "$(dirname "$0")" && pwd)"
DATA="$BASE/data"
LOGS="$DATA/logs"
mkdir -p "$LOGS"

PGDATA="$BASE/data/pg"
PGUSER="postgres"
PROJ_DIR="$BASE"
WEB_LOG="$LOGS/web.log"
MINIO_LOG="$LOGS/minio.log"
PG_LOG="$PGDATA/pg.log"

WEB_PORT=8443
MINIO_PORT=9000
PG_PORT=5432
MINIO_CONSOLE_PORT=9001

# IP del nodo en la red Tailscale (CGNAT 100.64.0.0/10).
# Los servicios que los equipos conectados consumen (API, PostgreSQL
# y MinIO) deben escuchar (o ser alcanzables) en esta dirección.
TS_IP="100.106.108.98"
TS_SUBNET="100.64.0.0/10"

TUNNEL_MODE=0   # 1 => PostgreSQL/MinIO escuchan en la IP Tailscale

port_in_use() { ss -ltn 2>/dev/null | grep -q ":$1 "; }

dns_port_in_use() { ss -lun 2>/dev/null | grep -q ":53 "; }

# systemd disponible y con permisos (sudo sin contraseña) para un servicio.
service_active() { systemctl is-active --quiet "$1" 2>/dev/null; }

systemctl_start() {
  service_active "$1" && return 0
  if [ "$(id -u)" = "0" ]; then
    systemctl start "$1" >/dev/null 2>&1 || return 1
  elif command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
    sudo systemctl start "$1" >/dev/null 2>&1 || return 1
  else
    return 1
  fi
  service_active "$1"
}

systemctl_stop() {
  service_active "$1" || return 0
  if [ "$(id -u)" = "0" ]; then
    systemctl stop "$1" >/dev/null 2>&1 || true
  elif command -v sudo >/dev/null 2>&1; then
    sudo systemctl stop "$1" >/dev/null 2>&1 || true
  fi
}

minio_pid() { [ -f "$DATA/minio.pid" ] && kill -0 "$(cat "$DATA/minio.pid")" 2>/dev/null && cat "$DATA/minio.pid" || echo ""; }

tailscale_pid() { local p; p="$(pgrep -f 'tailscaled' 2>/dev/null | head -1 || true)"; [ -n "$p" ] && echo "$p" || echo ""; }

# ------------------------------------------------------------
# PostgreSQL
# ------------------------------------------------------------
# Asegura (idempotente) que pg_hba.conf acepte a la subred Tailscale.
ensure_pg_hba_tailnet() {
  [ -f "$PGDATA/pg_hba.conf" ] || return 0
  if ! grep -q "host    app_db    postgres    $TS_SUBNET    md5" "$PGDATA/pg_hba.conf"; then
    { echo "# TerLux túnel Tailscale";
      echo "host    app_db    postgres    $TS_SUBNET    md5";
      echo "host    all       all         $TS_SUBNET    md5"; } >> "$PGDATA/pg_hba.conf"
    [ "$(id -un)" = "$PGUSER" ] || chown "$PGUSER:$PGUSER" "$PGDATA/pg_hba.conf"
    echo "       regla Tailscale añadida a pg_hba.conf"
  fi
}

start_postgres() {
  if port_in_use $PG_PORT; then
    echo "  [PostgreSQL] ya está en el puerto $PG_PORT"
    return
  fi
  if [ ! -d "$PGDATA" ]; then
    echo "  [PostgreSQL] ERROR: falta el directorio de datos $PGDATA (ejecuta el seed con data/pg)"
    return 1
  fi
  ensure_pg_hba_tailnet
  echo "  [PostgreSQL] arrancando en $PG_PORT (escucha: $PG_LISTEN) ..."
  local CMD
  CMD="pg_ctl -D '$PGDATA' -l '$PG_LOG' -o '-p $PG_PORT -k /tmp -c listen_addresses=\"$PG_LISTEN\"' start"
  if [ "$(id -un)" = "$PGUSER" ]; then
    eval "$CMD"
  elif [ -x "$(command -v su)" ]; then
    su "$PGUSER" -s /bin/sh -c "$CMD"
  else
    echo "       Advertencia: ejecuta este script en un host con permisos para el usuario postgres."
    return 1
  fi
  for _ in $(seq 1 15); do
    PGPASSWORD=postgres psql -h 127.0.0.1 -p $PG_PORT -U postgres -d postgres -c "SELECT 1" >/dev/null 2>&1 && break
    sleep 1
  done
  echo "       OK (socket /tmp, bd app_db)"
}

stop_postgres() {
  echo "  [PostgreSQL] parando ..."
  if [ "$(id -un)" = "$PGUSER" ]; then
    pg_ctl -D "$PGDATA" stop -m fast 2>/dev/null || true
  else
    su "$PGUSER" -s /bin/sh -c "pg_ctl -D '$PGDATA' stop -m fast" 2>/dev/null || true
  fi
}

# ------------------------------------------------------------
# MinIO
# ------------------------------------------------------------
start_minio() {
  if port_in_use $MINIO_PORT; then
    echo "  [MinIO]      ya está en el puerto $MINIO_PORT"
    return
  fi
  if [ ! -x "$BASE/tools/minio" ]; then
    echo "  [MinIO]      binario no encontrado en tools/minio; descárgalo de https://dl.min.io"
    echo "               curl -Lo tools/minio https://dl.min.io/server/minio/release/linux-amd64/minio && chmod +x tools/minio"
    return 1
  fi
  echo "  [MinIO]      arrancando en $MINIO_PORT (consola $MINIO_CONSOLE_PORT) en primer plano ..."
  orig="$(grep '^MINIO_ROOT_USER=' "$BASE/.env" 2>/dev/null | head -1 | cut -d= -f2- | sed 's/["'"'"']//g; s/^[[:space:]]*//; s/[[:space:]]*$//')"
  pass="$(grep '^MINIO_ROOT_PASSWORD=' "$BASE/.env" 2>/dev/null | head -1 | cut -d= -f2- | sed 's/["'"'"']//g; s/^[[:space:]]*//; s/[[:space:]]*$//')"
  [ -z "$orig" ] && orig="terlux_storage"
  [ -z "$pass" ] && pass="terlux_storage"
  MINIO_ROOT_USER="$orig" MINIO_ROOT_PASSWORD="$pass" \
    "$BASE/tools/minio" server "$BASE/storage/minio-data" \
    --address "$MINIO_BIND:$MINIO_PORT" --console-address "${MINIO_CONSOLE_BIND:-127.0.0.1}:$MINIO_CONSOLE_PORT" > "$MINIO_LOG" 2>&1 &
  MINIO_PID=$!
  echo "$MINIO_PID" > "$DATA/minio.pid"
  echo "       OK (user $orig, bind $MINIO_BIND)"
}

stop_minio() {
  local p; p="$(minio_pid)"
  [ -n "$p" ] && kill "$p" 2>/dev/null && echo "  [MinIO]      parado"
  rm -f "$DATA/minio.pid"
  [ -n "${MINIO_PID:-}" ] && kill "$MINIO_PID" 2>/dev/null || true
}

# ------------------------------------------------------------
# App web (Next.js)
# ------------------------------------------------------------
web_port_pid() {
  ss -ltnp 2>/dev/null | grep ":$WEB_PORT " | grep -oP 'pid=\K[0-9]+' | head -1 || true
}

# True si en disco hay una build más nueva que el proceso que sirve hoy.
web_has_newer_build() {
  local lp build_ts start_ts
  lp="$(web_port_pid)"
  [ -z "$lp" ] && return 1
  build_ts="$(stat -c '%Y' "$PROJ_DIR/.next/BUILD_ID" 2>/dev/null || stat -c '%Y' "$PROJ_DIR/.next" 2>/dev/null || echo 0)"
  start_ts="$(stat -c '%Y' "/proc/$lp" 2>/dev/null || echo 0)"
  [ "$build_ts" -gt "$start_ts" ]
}

start_web() {
  local lp
  if [ ! -d "$PROJ_DIR/.next" ]; then
    echo "  [App web]    compilando (primera vez, puede tardar)..."
    (cd "$PROJ_DIR" && npm run build >> "$WEB_LOG" 2>&1)
  fi
  if port_in_use $WEB_PORT; then
    if web_has_newer_build; then
      echo "  [App web]    build nueva detectada, reiniciando ..."
      lp="$(web_port_pid)"
      if [ -n "$lp" ]; then
        local ppid
        # Mata next-server y su padre 'npm start' para no dejar huérfanos.
        ppid="$(sed -n 's/.*) //p' "/proc/$lp/stat" 2>/dev/null | awk '{print $2}' || true)"
        [ -n "$ppid" ] && [ "$ppid" != "1" ] && kill "$ppid" 2>/dev/null || true
        kill "$lp" 2>/dev/null || true
      fi
      for _ in $(seq 1 20); do
        if [ -z "$(web_port_pid)" ]; then break; fi
        sleep 0.5
      done
    else
      echo "  [App web]    ya está en el puerto $WEB_PORT"
      return
    fi
  fi
  echo "  [App web]    arrancando en $WEB_PORT en primer plano ..."
  (cd "$PROJ_DIR" && exec npm start) > "$WEB_LOG" 2>&1 &
  WEB_PID=$!
}

stop_web() {
  local lp
  lp="$(web_port_pid)"
  [ -n "$lp" ] && kill "$lp" 2>/dev/null || true
  [ -n "${WEB_PID:-}" ] && kill "$WEB_PID" 2>/dev/null
  echo "  [App web]    parado"
}

# ------------------------------------------------------------
# Tailscale (opcional)
# ------------------------------------------------------------
tailscale_status() {
  if ! command -v tailscale >/dev/null 2>&1; then
    echo "  [Tailscale]  no instalado (opcional)."
    return
  fi
  local ip ips
  ips="$(tailscale ip -4 2>/dev/null | tr '\n' ' ' || true)"
  echo "  [Tailscale]  activo: ${ips:-sin IP}"
}

start_tailscale() {
  if ! command -v tailscale >/dev/null 2>&1; then
    echo "  [Tailscale]  no instalado; instálalo y ejecuta 'tailscale up' manualmente."
    return 1
  fi
  if tailscale ip -4 >/dev/null 2>&1; then
    echo "  [Tailscale]  ya está activo."
    tailscale_status
    return
  fi
  echo "  [Tailscale]  ejecutando 'tailscale up' (interactivo) ..."
  tailscale up
  tailscale_status
}

stop_tailscale() {
  ! command -v tailscale >/dev/null 2>&1 && { echo "  [Tailscale]  no instalado."; return; }
  echo "  [Tailscale]  parando ('tailscale down') ..."
  tailscale down 2>/dev/null || true
}

# ------------------------------------------------------------
# Túnel Tailscale hacia esta máquina
#   Abre la escucha de PostgreSQL y MinIO a la subred 100.64.0.0/10
#   para que los equipos de la VPN puedan conectar de forma directa
#   (panel de técnicos del escritorio, backups, etc.). No añade
#   persistencia: solo configura la escucha actual del proceso.
# ------------------------------------------------------------
tunnel_on() {
  if ! command -v tailscale >/dev/null 2>&1 || ! tailscale ip -4 >/dev/null 2>&1; then
    echo "  [Túnel]      ADVERTENCIA: Tailscale parece inactivo. Aún así se configura la escucha en $TS_IP."
  fi
  echo "  [Túnel]      PostgreSQL escuchará en 127.0.0.1,$TS_IP y MinIO en 0.0.0.0"
  ensure_pg_hba_tailnet
  if port_in_use $PG_PORT || port_in_use $MINIO_PORT; then
    echo "  [Túnel]      aplica cambios reiniciando servicios (stop -> start)."
    stop_web
    stop_minio
    stop_postgres
    TUNNEL_MODE=1
    resolve_listen
    start_postgres; start_minio; start_web
  else
    TUNNEL_MODE=1
    resolve_listen
    echo "  [Túnel]      activado (se aplicará en el próximo arranque)."
  fi
}

tunnel_off() {
  # Ya no existe modo "solo local": los servicios se exponen por Tailscale
  # por defecto. tunnel:off solo reinicia con la configuración por defecto
  # (que sigue siendo alcanzable por la red Tailscale).
  TUNNEL_MODE=0
  resolve_listen
  ensure_pg_hba_tailnet
  if port_in_use $PG_PORT || port_in_use $MINIO_PORT; then
    echo "  [Túnel]      reiniciando con la configuración por defecto (Tailscale) ..."
    stop_web; stop_minio; stop_postgres
    start_postgres; start_minio; start_web
  else
    echo "  [Túnel]      configuración por defecto."
  fi
}

# ------------------------------------------------------------
# nginx (proxy inverso intranet: 80/443 → 127.0.0.1:8443)
#   - Preferencia: systemd (sudo systemctl start nginx)
#   - Respaldo: modo directo con config local en data/ (sin systemd)
# ------------------------------------------------------------
nginx_pid() {
  [ -f "$DATA/nginx.pid" ] && kill -0 "$(cat "$DATA/nginx.pid")" 2>/dev/null && cat "$DATA/nginx.pid" || echo ""
}

nginx_conf_local() {
  local conf="$DATA/nginx-intra.conf"
  local mime="/etc/nginx/mime.types"
  [ -f "$mime" ] || mime=""
  {
    echo "worker_processes 1;"
    echo "pid $DATA/nginx.pid;"
    echo "error_log $LOGS/nginx.log warn;"
    echo "events { worker_connections 1024; }"
    echo "http {"
    echo "  access_log $LOGS/nginx-access.log;"
    [ -n "$mime" ] && echo "  include $mime;"
    echo "  types_hash_max_size 4096;"
    echo "  default_type application/octet-stream;"
    echo "  sendfile on;"
    echo "  upstream terlux_web { server 127.0.0.1:$WEB_PORT; keepalive 16; }"
    echo "  server {"
    echo "    listen $TS_IP:80;"
    echo "    server_name intranet.terluxcoop.internal terluxcoop.internal;"
    echo "    location / { proxy_pass http://terlux_web; proxy_set_header Host \$host; proxy_set_header X-Forwarded-Proto http; }"
    echo "  }"
    if [ -r /etc/terlux-tls/live/intranet.pem ] && [ -r /etc/terlux-tls/live/intranet.key ]; then
      echo "  server {"
      echo "    listen $TS_IP:443 ssl;"
      echo "    server_name intranet.terluxcoop.internal terluxcoop.internal;"
      echo "    ssl_certificate /etc/terlux-tls/live/intranet.pem;"
      echo "    ssl_certificate_key /etc/terlux-tls/live/intranet.key;"
      echo "    location / { proxy_pass http://terlux_web; proxy_http_version 1.1; proxy_set_header Upgrade \$http_upgrade; proxy_set_header Connection \"upgrade\"; proxy_set_header Host \$host; proxy_set_header X-Forwarded-Proto https; proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; proxy_read_timeout 86400; }"
      echo "  }"
    fi
    echo "}"
  } > "$conf"
  echo "$conf"
}

start_nginx() {
  if ! command -v nginx >/dev/null 2>&1; then
    echo "  [nginx]       no instalado; instálalo con: pacman -S nginx"
    return 1
  fi
  if systemctl_start nginx; then
    echo "  [nginx]       OK (proxy 80/443 → 127.0.0.1:$WEB_PORT)"
    return 0
  fi
  echo "  [nginx]       systemd no disponible o sin permisos; usando modo directo ..."
  start_nginx_fallback
  # Persistencia opcional al boot (solo hosts dedicados); actívala quitando el '#':
  #   sudo systemctl enable --now nginx
}

start_nginx_fallback() {
  local conf npid
  npid="$(nginx_pid)"
  if [ -n "$npid" ]; then
    echo "  [nginx]       ya activo (modo directo, pid $npid)"
    return 0
  fi
  if port_in_use 80 || port_in_use 443; then
    echo "  [nginx]       puertos 80/443 ya en uso (¿activo por systemd?). Revisa: systemctl status nginx"
    return 1
  fi
  conf="$(nginx_conf_local)"
  echo "  [nginx]       iniciando con configuración local ($conf) ..."
  if [ "$(id -u)" = "0" ]; then
    nginx -c "$conf" > "$LOGS/nginx.log" 2>&1 || { echo "       ERROR: ver $LOGS/nginx.log"; return 1; }
  elif command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
    sudo nginx -c "$conf" > "$LOGS/nginx.log" 2>&1 || { echo "       ERROR: ver $LOGS/nginx.log"; return 1; }
  else
    echo "       Advertencia: los puertos 80/443 necesitan permisos de root."
    nginx -c "$conf" > "$LOGS/nginx.log" 2>&1 || { echo "       ERROR: ver $LOGS/nginx.log"; return 1; }
  fi
  sleep 1
  if port_in_use 80 || port_in_use 443; then
    echo "  [nginx]       OK (proxy ${TS_IP}:80/443 → 127.0.0.1:$WEB_PORT)"
    return 0
  fi
  echo "  [nginx]       ERROR: no escucha en 80/443; ver $LOGS/nginx.log"
  return 1
}

stop_nginx() {
  local npid
  npid="$(nginx_pid)"
  if [ -n "$npid" ]; then
    if [ "$(id -u)" = "0" ]; then
      kill "$npid" 2>/dev/null || true
    elif command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
      sudo kill "$npid" 2>/dev/null || true
    fi
    sleep 1; rm -f "$DATA/nginx.pid"
    echo "  [nginx]       detenido (modo directo)"
  elif service_active nginx 2>/dev/null; then
    systemctl_stop nginx
    echo "  [nginx]       detenido (systemd)"
  else
    echo "  [nginx]       ya estaba detenido"
  fi
}

status_nginx() {
  if service_active nginx 2>/dev/null || [ -n "$(nginx_pid)" ] || port_in_use 80 || port_in_use 443; then
    echo "  [nginx]       #4 RUNNING (${TS_IP}:80/443 → 127.0.0.1:$WEB_PORT)"
  else
    echo "  [nginx]       detenido"
  fi
}

# ------------------------------------------------------------
# dnsmasq (DNS interno: intranet.terluxcoop.internal → 100.106.108.98)
#   - Preferencia: systemd (sudo systemctl start dnsmasq)
#   - Respaldo: modo directo con config local en data/ (sin systemd)
# ------------------------------------------------------------
dnsmasq_pid() {
  [ -f "$DATA/dnsmasq.pid" ] && kill -0 "$(cat "$DATA/dnsmasq.pid")" 2>/dev/null && cat "$DATA/dnsmasq.pid" || echo ""
}

dnsmasq_conf_local() {
  local conf="$DATA/dnsmasq-intra.conf"
  {
    echo "# TerLux Coop intranet (modo directo, sin systemd)"
    echo "listen-address=127.0.0.1,$TS_IP"
    echo "server=1.1.1.1"
    echo "server=8.8.8.8"
    echo "address=/.terluxcoop.internal/$TS_IP"
    echo "local=/terluxcoop.internal/"
    echo "no-resolv"
    echo "bogus-priv"
    echo "pid-file=$DATA/dnsmasq.pid"
    echo "log-facility=$LOGS/dnsmasq.log"
  } > "$conf"
  echo "$conf"
}

start_dnsmasq() {
  if ! command -v dnsmasq >/dev/null 2>&1; then
    echo "  [dnsmasq]     no instalado; instálalo con: pacman -S dnsmasq"
    return 1
  fi
  if systemctl_start dnsmasq; then
    echo "  [dnsmasq]     OK (DNS intranet.terluxcoop.internal → $TS_IP)"
    return 0
  fi
  echo "  [dnsmasq]     systemd no disponible o sin permisos; usando modo directo ..."
  start_dnsmasq_fallback
  # Persistencia opcional al boot (solo hosts dedicados); actívala quitando el '#':
  #   sudo systemctl enable --now dnsmasq
}

start_dnsmasq_fallback() {
  local conf dpid
  dpid="$(dnsmasq_pid)"
  if [ -n "$dpid" ]; then
    echo "  [dnsmasq]     ya activo (modo directo, pid $dpid)"
    return 0
  fi
  if dns_port_in_use || port_in_use 53; then
    echo "  [dnsmasq]     puerto 53 ya en uso (¿activo por systemd?). Revisa: systemctl status dnsmasq"
    return 1
  fi
  conf="$(dnsmasq_conf_local)"
  echo "  [dnsmasq]     iniciando con configuración local ($conf) ..."
  if [ "$(id -u)" = "0" ]; then
    dnsmasq --conf-file="$conf" > "$LOGS/dnsmasq.log" 2>&1 || { echo "       ERROR: ver $LOGS/dnsmasq.log"; return 1; }
  elif command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
    sudo dnsmasq --conf-file="$conf" > "$LOGS/dnsmasq.log" 2>&1 || { echo "       ERROR: ver $LOGS/dnsmasq.log"; return 1; }
  else
    echo "       Advertencia: el puerto 53 necesita permisos de root."
    dnsmasq --conf-file="$conf" > "$LOGS/dnsmasq.log" 2>&1 || { echo "       ERROR: ver $LOGS/dnsmasq.log"; return 1; }
  fi
  sleep 1
  if dns_port_in_use; then
    echo "  [dnsmasq]     OK (DNS intranet.terluxcoop.internal → $TS_IP)"
    return 0
  fi
  echo "  [dnsmasq]     ERROR: no escucha en :53; ver $LOGS/dnsmasq.log"
  return 1
}

stop_dnsmasq() {
  local dpid
  dpid="$(dnsmasq_pid)"
  if [ -n "$dpid" ]; then
    if [ "$(id -u)" = "0" ]; then
      kill "$dpid" 2>/dev/null || true
    elif command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
      sudo kill "$dpid" 2>/dev/null || true
    fi
    sleep 1; rm -f "$DATA/dnsmasq.pid"
    echo "  [dnsmasq]     detenido (modo directo)"
  elif service_active dnsmasq 2>/dev/null; then
    systemctl_stop dnsmasq
    echo "  [dnsmasq]     detenido (systemd)"
  else
    echo "  [dnsmasq]     ya estaba detenido"
  fi
}

status_dnsmasq() {
  if service_active dnsmasq 2>/dev/null || [ -n "$(dnsmasq_pid)" ] || dns_port_in_use; then
    echo "  [dnsmasq]     #5 RUNNING (DNS intranet.terluxcoop.internal → $TS_IP)"
  else
    echo "  [dnsmasq]     detenido"
  fi
}

# ------------------------------------------------------------
# Orchestrador maestro
# ------------------------------------------------------------
MINIO_PID=""
WEB_PID=""

resolve_listen() {
  if [ "${TUNNEL_MODE:-0}" = "1" ]; then
    PG_LISTEN="127.0.0.1,$TS_IP"
    MINIO_BIND="0.0.0.0"
    MINIO_CONSOLE_BIND="0.0.0.0"
  else
    # Por defecto los servicios se exponen por la red Tailscale (no solo local):
    # la app de escritorio y los equipos conectados resuelven PG/MinIO/API en $TS_IP.
    PG_LISTEN="127.0.0.1,$TS_IP"
    MINIO_BIND="0.0.0.0"
    MINIO_CONSOLE_BIND="0.0.0.0"
  fi
}

start_all() {
  resolve_listen
  echo "Arrancando servicios (primer plano, Ctrl+C para detenerlos todos) ..."
  start_postgres
  start_minio
  start_web
  start_nginx || true
  start_dnsmasq || true
  start_tailscale || true
  if [ -n "${MINIO_PID:-}" ] || [ -n "${WEB_PID:-}" ]; then
    STARTED=1
    trap cleanup INT TERM EXIT
    trap ':' CHLD 2>/dev/null || true
    echo ""
    echo "  Todos los servicios activos. Cierra la terminal o pulsa Ctrl+C."
    echo "  Acceso: http://127.0.0.1:$WEB_PORT  ·  Intranet: https://intranet.terluxcoop.internal"
    echo "  Consola MinIO: http://127.0.0.1:$MINIO_CONSOLE_PORT"
    [ -n "${WEB_PID:-}" ] && wait "$WEB_PID" 2>/dev/null
    [ -n "${MINIO_PID:-}" ] && wait "$MINIO_PID" 2>/dev/null
  else
    echo "Los servicios ya estaban activos (usa ./activar.sh stop para detenerlos)."
  fi
}

stop_all() { echo "Parando servicios ..."; stop_web; stop_nginx; stop_minio; stop_postgres; stop_dnsmasq; stop_tailscale || true; echo "Detenido."; }

status() {
  echo "Estado de los servicios TerLux Coop:"
  port_in_use $PG_PORT    && echo "  [PostgreSQL] #1 RUNNING (${PG_LISTEN:-127.0.0.1}:$PG_PORT)" || echo "  [PostgreSQL] detenido"
  port_in_use $MINIO_PORT && echo "  [MinIO]      #2 RUNNING (${MINIO_BIND:-127.0.0.1}:$MINIO_PORT, consola $MINIO_CONSOLE_PORT)" || echo "  [MinIO]      detenido"
  port_in_use $WEB_PORT   && echo "  [App web]    #3 RUNNING (0.0.0.0:$WEB_PORT)" || echo "  [App web]    detenido"
  status_nginx
  status_dnsmasq
  tailscale_status
  echo ""
  echo "  Acceso rápido: http://127.0.0.1:$WEB_PORT  |  Intranet: https://intranet.terluxcoop.internal"
  echo "  Consola MinIO: http://127.0.0.1:$MINIO_CONSOLE_PORT"
}

logs() {
  local log="${1:-all}"
  case "$log" in
    web)   echo "== web.log (últimas 40 líneas) =="; tail -n 40 "$WEB_LOG" 2>/dev/null || echo "(sín contenido)";;
    minio) echo "== minio.log (últimas 40 líneas) =="; tail -n 40 "$MINIO_LOG" 2>/dev/null || echo "(sin contenido)";;
    pg)    echo "== pg.log (últimas 40 líneas) =="; tail -n 40 "$PG_LOG" 2>/dev/null || echo "(sin contenido)";;
    nginx) echo "== nginx.log (últimas 40 líneas) =="; tail -n 40 "$LOGS/nginx.log" "$LOGS/nginx-access.log" 2>/dev/null || echo "(sin contenido)";;
    dnsmasq) echo "== dnsmasq.log (últimas 40 líneas) =="; tail -n 40 "$LOGS/dnsmasq.log" 2>/dev/null || echo "(sin contenido)";;
    *)
      echo "== web.log ==";      tail -n 40 "$WEB_LOG"  2>/dev/null || true
      echo ""; echo "== minio.log =="; tail -n 40 "$MINIO_LOG" 2>/dev/null || true
      echo ""; echo "== pg.log ==";    tail -n 40 "$PG_LOG"   2>/dev/null || true
      echo ""; echo "== nginx.log =="; tail -n 40 "$LOGS/nginx.log" "$LOGS/nginx-access.log" 2>/dev/null || true
      echo ""; echo "== dnsmasq.log =="; tail -n 40 "$LOGS/dnsmasq.log" 2>/dev/null || true
      ;;
  esac
}

# ------------------------------------------------------------
# Actualización de la plataforma (git + recompila + reinicia)
# ------------------------------------------------------------
update_platform() {
  local had_web=0
  port_in_use $WEB_PORT && had_web=1
  echo "  [Actualizar]  trayendo la última versión desde git (main)..."
  if ! git -C "$BASE" pull --rebase --autostash 2>&1 | sed 's/^/    /'; then
    echo "  [Actualizar]  ERROR: git pull falló (¿conflictos?). Resuélvelo y reintenta."
    return 1
  fi
  echo "  [Actualizar]  compilando el sitio web (npm run build)..."
  if ! (cd "$PROJ_DIR" && npm run build) >> "$WEB_LOG" 2>&1; then
    echo "  [Actualizar]  ERROR: el build falló. Detalle en: ./activar.sh logs web"
    return 1
  fi
  # start_web detecta una build más nueva que el proceso y reinicia solo la web.
  start_web
  if [ "$had_web" = "0" ]; then
    echo "  [Actualizar]  la web estaba detenida; arrancada en primer plano."
  fi
  echo "  [Actualizar]  plataforma actualizada."
  status
}

# Detener todo sin importar cómo termine el script
STARTED=0
cleanup() {
  if [ "${STARTED:-0}" = "1" ]; then
    echo ""
    echo "Deteniendo servicios TerLux Coop ..."
    stop_web; stop_minio; stop_postgres
    echo "Todo detenido. No quedan servicios persistentes."
  fi
}

# ------------------------------------------------------------
# Selección de servicio concreto
# ------------------------------------------------------------
start_one() {
  local rc=0
  resolve_listen
  case "$1" in
    web)
      # La web es la puerta de entrada del sitio: levanta también la
      # intranet completa (nginx + dnsmasq) para acceso por dominio.
      start_web
      start_nginx || rc=1
      start_dnsmasq || rc=1
      return $rc
      ;;
    minio) start_minio;;
    pg|postgres) start_postgres;;
    nginx) start_nginx;;
    dnsmasq|dns) start_dnsmasq;;
    tailscale) start_tailscale;;
    *) echo "Servicio desconocido: $1 (web|minio|pg|nginx|dnsmasq|tailscale)"; return 1;;
  esac
}

stop_one() {
  case "$1" in
    web) stop_web;;
    minio) stop_minio;;
    pg|postgres) stop_postgres;;
    nginx) stop_nginx;;
    dnsmasq|dns) stop_dnsmasq;;
    tailscale) stop_tailscale;;
    *) echo "Servicio desconocido: $1 (web|minio|pg|nginx|dnsmasq|tailscale)"; return 1;;
  esac
}

# ------------------------------------------------------------
# Menú interactivo
# ------------------------------------------------------------
menu() {
  local opt
  while true; do
    echo ""
    echo "=== TERLUX COOP · MENÚ DE SERVICIOS ==="
    status
    echo ""
    echo "  1) Arrancar TODOS los servicios (primer plano)"
    echo "  2) Detener TODOS los servicios"
    echo "  3) Estado de los servicios"
    echo "  4) Arrancar uno (web / minio / pg / nginx / dnsmasq / tailscale)"
    echo "  5) Detener uno (web / minio / pg / nginx / dnsmasq / tailscale)"
    echo "  6) Ver logs (web / minio / pg — o todos)"
    echo "  7) Activar túnel Tailscale (PG+MinIO visibles en $TS_IP)"
    echo "  8) Desactivar túnel Tailscale"
    echo "  9) Tailscale: conectar"
    echo " 10) Tailscale: desconectar"
    echo " 11) Actualizar plataforma (git pull + rebuild web + reiniciar)"
    echo "  0) Salir"
    printf "  Opción: "
    read -r opt
    case "${opt:-}" in
      1) "$0" start;;
      2) "$0" stop;;
      3) "$0" status;;
      4) printf "  ¿Qué servicio? (web/minio/pg/nginx/dnsmasq/tailscale): "; read -r s; "$0" start "$s";;
      5) printf "  ¿Qué servicio? (web/minio/pg/nginx/dnsmasq/tailscale): "; read -r s; "$0" stop "$s";;
      6) printf "  ¿Qué log? (todo/web/minio/pg): "; read -r s; "$0" logs "$s";;
      7) "$0" tunnel:on;;
      8) "$0" tunnel:off;;
      9) "$0" tailscale:up;;
     10) "$0" tailscale:down;;
     11) "$0" update;;
      0) echo "Adiós."; break;;
      *) echo "Opción no válida.";;
    esac
  done
}

# ------------------------------------------------------------
CMD="${1:-}"
SVC="${2:-}"

case "$CMD" in
  start)
    if [ -n "$SVC" ]; then start_one "$SVC"; else start_all; fi
    ;;
  stop)
    if [ -n "$SVC" ]; then stop_one "$SVC"; else stop_all; fi
    ;;
  restart)
    if [ -n "$SVC" ]; then "$0" stop "$SVC"; sleep 1; "$0" start "$SVC"; else "$0" stop; sleep 1; "$0" start; fi
    ;;
  update)
    update_platform
    ;;
  status) status;;
  logs)   logs "$SVC";;
  tunnel:on)  tunnel_on;;
  tunnel:off) tunnel_off;;
  tailscale:up)   start_tailscale;;
  tailscale:down) stop_tailscale;;
  menu) menu;;
  -h|--help|help)
    cat <<'EOF'
Uso: ./activar.sh [comando] [servicio]

  Comandos:
    start [web|minio|pg|nginx|dnsmasq|tailscale]   Arranca todos o uno solo
    stop  [web|minio|pg|nginx|dnsmasq|tailscale]   Detiene todos o uno solo
    restart [servicio]               Reinicia todos o uno solo
    update                           Actualiza desde git, recompila la web y reinicia
    status                           Estado de cada servicio
    logs [todo|web|minio|pg|nginx|dnsmasq]  Muestra los logs
    tunnel:on                        Habilita escucha de PG+MinIO en la IP Tailscale
    tunnel:off                       Restaura escucha local (127.0.0.1)
    tailscale:up / tailscale:down    Conecta/desconecta Tailscale
    menu                             Menú interactivo (por defecto si no se pone nada)

  Intranet completa: "start" (todos) y "start web" levantan también nginx y
  dnsmasq. Preferencia systemd (sudo); sin systemd/sudo usan modo directo con
  config local en data/ (nginx-intra.conf, dnsmasq-intra.conf, propios .pid).

  Sin persistencia: los servicios corren en primer plano y se detienen
  al cerrar la terminal o con Ctrl+C. La persistencia al boot queda
  comentada en el script (sudo systemctl enable --now nginx dnsmasq).
EOF
    ;;
  *)
    if [ -t 0 ]; then
      menu
    else
      echo "Uso: $0 {menu|start|stop|restart|status|logs|tunnel:on|tunnel:off|tailscale:up|tailscale:down}" >&2
      exit 1
    fi
    ;;
esac