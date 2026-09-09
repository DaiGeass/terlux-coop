#!/usr/bin/env bash
# ============================================================
# TERLUX COOP - CONTROL DE SERVICIOS (no persistentes)
#   Uso:  ./activar.sh [comando] [servicio]
#
#   Comandos:  menu | start | stop | restart | status | logs | update |
#              tunnel:on | tunnel:off | tailscale:up | tailscale:down
#   Servicios: web | minio | pg | tailscale
#   (Sin comando => abre el MENÚ INTERACTIVO)
#
#   Servicios gestionados:
#     - PostgreSQL  (puerto 5432, datos en ./data/pg)
#     - MinIO S3    (puerto 9000, consola 9001, datos en ./storage/minio-data)
#     - App web     (puerto 8443, Next.js en modo producción)
#     - Tailscale   (opcional, si está instalado)
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

minio_pid() { [ -f "$DATA/minio.pid" ] && kill -0 "$(cat "$DATA/minio.pid")" 2>/dev/null && cat "$DATA/minio.pid" || echo ""; }

tailscale_pid() { local p; p="$(pgrep -f 'tailscaled' 2>/dev/null | head -1 || true)"; [ -n "$p" ] && echo "$p" || echo ""; }

# ------------------------------------------------------------
# PostgreSQL
# ------------------------------------------------------------
start_postgres() {
  if port_in_use $PG_PORT; then
    echo "  [PostgreSQL] ya está en el puerto $PG_PORT"
    return
  fi
  if [ ! -d "$PGDATA" ]; then
    echo "  [PostgreSQL] ERROR: falta el directorio de datos $PGDATA (ejecuta el seed con data/pg)"
    return 1
  fi
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
    --address "$MINIO_BIND:$MINIO_PORT" --console-address "127.0.0.1:$MINIO_CONSOLE_PORT" > "$MINIO_LOG" 2>&1 &
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
  sed -i.bak "/^host.*$TS_SUBNET.*md5/d" "$PGDATA/pg_hba.conf" 2>/dev/null || true
  { echo "# TerLux túnel Tailscale (activado on-demand)";
    echo "host    app_db    postgres    $TS_SUBNET    md5";
    echo "host    all       all         $TS_SUBNET    md5"; } >> "$PGDATA/pg_hba.conf"
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
  TUNNEL_MODE=0
  resolve_listen
  sed -i.bak "/# TerLux túnel Tailscale/d;/^host.*$TS_SUBNET.*md5/d" "$PGDATA/pg_hba.conf" 2>/dev/null || true
  if port_in_use $PG_PORT || port_in_use $MINIO_PORT; then
    echo "  [Túnel]      reiniciando con escucha local ..."
    stop_web; stop_minio; stop_postgres
    start_postgres; start_minio; start_web
  else
    echo "  [Túnel]      desactivado."
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
  else
    PG_LISTEN="127.0.0.1"
    MINIO_BIND="127.0.0.1"
  fi
}

start_all() {
  resolve_listen
  echo "Arrancando servicios (primer plano, Ctrl+C para detenerlos todos) ..."
  start_postgres
  start_minio
  start_web
  start_tailscale || true
  if [ -n "${MINIO_PID:-}" ] || [ -n "${WEB_PID:-}" ]; then
    STARTED=1
    trap cleanup INT TERM EXIT
    trap ':' CHLD 2>/dev/null || true
    echo ""
    echo "  Todos los servicios activos. Cierra la terminal o pulsa Ctrl+C."
    echo "  Acceso: http://127.0.0.1:$WEB_PORT  ·  Consola MinIO: http://127.0.0.1:$MINIO_CONSOLE_PORT"
    [ -n "${WEB_PID:-}" ] && wait "$WEB_PID" 2>/dev/null
    [ -n "${MINIO_PID:-}" ] && wait "$MINIO_PID" 2>/dev/null
  else
    echo "Los servicios ya estaban activos (usa ./activar.sh stop para detenerlos)."
  fi
}

stop_all() { echo "Parando servicios ..."; stop_web; stop_minio; stop_postgres; stop_tailscale || true; echo "Detenido."; }

status() {
  echo "Estado de los servicios TerLux Coop:"
  port_in_use $PG_PORT    && echo "  [PostgreSQL] #1 RUNNING (${PG_LISTEN:-127.0.0.1}:$PG_PORT)" || echo "  [PostgreSQL] detenido"
  port_in_use $MINIO_PORT && echo "  [MinIO]      #2 RUNNING (${MINIO_BIND:-127.0.0.1}:$MINIO_PORT, consola $MINIO_CONSOLE_PORT)" || echo "  [MinIO]      detenido"
  port_in_use $WEB_PORT   && echo "  [App web]    #3 RUNNING (0.0.0.0:$WEB_PORT)" || echo "  [App web]    detenido"
  tailscale_status
  echo ""
  echo "  Acceso rápido: http://127.0.0.1:$WEB_PORT  |  Consola MinIO: http://127.0.0.1:$MINIO_CONSOLE_PORT"
}

logs() {
  local log="${1:-all}"
  case "$log" in
    web)   echo "== web.log (últimas 40 líneas) =="; tail -n 40 "$WEB_LOG" 2>/dev/null || echo "(sín contenido)";;
    minio) echo "== minio.log (últimas 40 líneas) =="; tail -n 40 "$MINIO_LOG" 2>/dev/null || echo "(sin contenido)";;
    pg)    echo "== pg.log (últimas 40 líneas) =="; tail -n 40 "$PG_LOG" 2>/dev/null || echo "(sin contenido)";;
    *)
      echo "== web.log ==";      tail -n 40 "$WEB_LOG"  2>/dev/null || true
      echo ""; echo "== minio.log =="; tail -n 40 "$MINIO_LOG" 2>/dev/null || true
      echo ""; echo "== pg.log ==";    tail -n 40 "$PG_LOG"   2>/dev/null || true
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
  resolve_listen
  case "$1" in
    web) start_web;;
    minio) start_minio;;
    pg|postgres) start_postgres;;
    tailscale) start_tailscale;;
    *) echo "Servicio desconocido: $1 (web|minio|pg|tailscale)"; return 1;;
  esac
}

stop_one() {
  case "$1" in
    web) stop_web;;
    minio) stop_minio;;
    pg|postgres) stop_postgres;;
    tailscale) stop_tailscale;;
    *) echo "Servicio desconocido: $1 (web|minio|pg|tailscale)"; return 1;;
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
    echo "  4) Arrancar uno (web / minio / pg / tailscale)"
    echo "  5) Detener uno (web / minio / pg / tailscale)"
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
      4) printf "  ¿Qué servicio? (web/minio/pg/tailscale): "; read -r s; "$0" start "$s";;
      5) printf "  ¿Qué servicio? (web/minio/pg/tailscale): "; read -r s; "$0" stop "$s";;
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
    start [web|minio|pg|tailscale]   Arranca todos o uno solo
    stop  [web|minio|pg|tailscale]   Detiene todos o uno solo
    restart [servicio]               Reinicia todos o uno solo
    update                           Actualiza desde git, recompila la web y reinicia
    status                           Estado de cada servicio
    logs [todo|web|minio|pg]         Muestra los logs
    tunnel:on                        Habilita escucha de PG+MinIO en la IP Tailscale
    tunnel:off                       Restaura escucha local (127.0.0.1)
    tailscale:up / tailscale:down    Conecta/desconecta Tailscale
    menu                             Menú interactivo (por defecto si no se pone nada)

  Sin persistencia: los servicios corren en primer plano y se detienen
  al cerrar la terminal o con Ctrl+C.
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