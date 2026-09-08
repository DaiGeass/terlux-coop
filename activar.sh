#!/usr/bin/env bash
# ============================================================
# TERLUX COOP - CONTROL DE SERVICIOS (no persistentes)
#   Uso:  ./activar.sh {start|stop|restart|status}
#
#   Levanta/para:
#     - PostgreSQL  (puerto 5432, datos en ./data/pg)
#     - MinIO S3    (puerto 9000, consola 9001, datos en ./storage/minio-data)
#     - App web     (puerto 8443, Next.js en modo producción)
#
#   IMPORTANTE: el modo "start" ejecuta los servicios en PRIMER PLANO.
#   Al cerrar la terminal o pulsar Ctrl+C (o matar el proceso del script),
#   TODOS los servicios se detienen automáticamente. Nada queda corriendo
#   en segundo plano de forma persistente.
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

port_in_use() { ss -ltn 2>/dev/null | grep -q ":$1 "; }

# PID por fichero (sólo para MinIO; la web y PG se detienen por puerto/comando)
minio_pid() { [ -f "$DATA/minio.pid" ] && kill -0 "$(cat "$DATA/minio.pid")" 2>/dev/null && cat "$DATA/minio.pid" || echo ""; }

start_postgres() {
  if port_in_use $PG_PORT; then
    echo "  [PostgreSQL] ya está en el puerto $PG_PORT"
    return
  fi
  echo "  [PostgreSQL] arrancando en $PG_PORT ..."
  if [ "$(id -un)" = "$PGUSER" ]; then
    pg_ctl -D "$PGDATA" -l "$PG_LOG" -o "-p $PG_PORT -k /tmp -c listen_addresses='127.0.0.1'" start
  elif [ -x "$(command -v su)" ]; then
    su "$PGUSER" -s /bin/sh -c "pg_ctl -D '$PGDATA' -l '$PG_LOG' -o '-p $PG_PORT -k /tmp -c listen_addresses=\"127.0.0.1\"' start"
  else
    echo "       Advertencia: ejecuta este script en un host con permisos para el usuario postgres."
    return
  fi
  for _ in $(seq 1 15); do
    PGPASSWORD=postgres psql -h 127.0.0.1 -p $PG_PORT -U postgres -d postgres -c "SELECT 1" >/dev/null 2>&1 && break
    sleep 1
  done
  echo "       OK (socket /tmp, bd app_db)"
}

MINIO_PID=""
WEB_PID=""

start_minio() {
  if port_in_use $MINIO_PORT; then
    echo "  [MinIO]      ya está en el puerto $MINIO_PORT"
    return
  fi
  if [ ! -x "$BASE/tools/minio" ]; then
    echo "  [MinIO]      binario no encontrado en tools/minio; descárgalo de https://dl.min.io"
    return
  fi
  echo "  [MinIO]      arrancando en 9000 (consola 9001) en primer plano ..."
  MINIO_ROOT_USER="$(grep '^MINIO_ROOT_USER=' "$BASE/.env" 2>/dev/null | head -1 | cut -d= -f2- | sed 's/["'"'"']//g; s/^[[:space:]]*//; s/[[:space:]]*$//')"
  MINIO_ROOT_PASSWORD="$(grep '^MINIO_ROOT_PASSWORD=' "$BASE/.env" 2>/dev/null | head -1 | cut -d= -f2- | sed 's/["'"'"']//g; s/^[[:space:]]*//; s/[[:space:]]*$//')"
  [ -z "$MINIO_ROOT_USER" ] && MINIO_ROOT_USER="terlux_storage"
  [ -z "$MINIO_ROOT_PASSWORD" ] && MINIO_ROOT_PASSWORD="terlux_storage"
  MINIO_ROOT_USER="$MINIO_ROOT_USER" MINIO_ROOT_PASSWORD="$MINIO_ROOT_PASSWORD" \
    "$BASE/tools/minio" server "$BASE/storage/minio-data" --address "127.0.0.1:$MINIO_PORT" --console-address "127.0.0.1:9001" > "$MINIO_LOG" 2>&1 &
  MINIO_PID=$!
  echo "       OK (user $MINIO_ROOT_USER)"
}

start_web() {
  if port_in_use $WEB_PORT; then
    echo "  [App web]    ya está en el puerto $WEB_PORT"
    return
  fi
  if [ ! -d "$PROJ_DIR/.next" ]; then
    echo "  [App web]    compilando (primera vez, puede tardar)..."
    (cd "$PROJ_DIR" && npm run build >> "$WEB_LOG" 2>&1)
  fi
  echo "  [App web]    arrancando en $WEB_PORT en primer plano ..."
  (cd "$PROJ_DIR" && exec npm start) > "$WEB_LOG" 2>&1 &
  WEB_PID=$!
}

stop_postgres() { echo "  [PostgreSQL] parando ..."; su "$PGUSER" -s /bin/sh -c "pg_ctl -D '$PGDATA' stop -m fast" 2>/dev/null || true; }
stop_minio()    { local p; p="$(minio_pid)"; [ -n "$p" ] && kill "$p" 2>/dev/null && echo "  [MinIO]      parado"; rm -f "$DATA/minio.pid"; [ -n "$MINIO_PID" ] && kill "$MINIO_PID" 2>/dev/null; }
stop_web() {
  local lp
  lp="$(ss -ltnp 2>/dev/null | grep ":$WEB_PORT " | grep -oP 'pid=\K[0-9]+' | head -1 || true)"
  [ -n "$lp" ] && kill "$lp" 2>/dev/null || true
  [ -n "$WEB_PID" ] && kill "$WEB_PID" 2>/dev/null
  echo "  [App web]    parado"
}

# Detener todo sin importar cómo termine el script (Ctrl+C, cierre de terminal, kill)
STARTED=0
cleanup() {
  if [ "${STARTED:-0}" = "1" ]; then
    echo ""
    echo "Deteniendo servicios TerLux Coop ..."
    stop_web
    stop_minio
    stop_postgres
    echo "Todo detenido. No quedan servicios persistentes."
  fi
}

status() {
  echo "Estado de los servicios TerLux Coop:"
  port_in_use $PG_PORT      && echo "  [PostgreSQL] #1 RUNNING (127.0.0.1:$PG_PORT)" || echo "  [PostgreSQL] detenido"
  port_in_use $MINIO_PORT   && echo "  [MinIO]      #2 RUNNING (127.0.0.1:$MINIO_PORT, consola 9001)" || echo "  [MinIO]      detenido"
  port_in_use $WEB_PORT     && echo "  [App web]    #3 RUNNING (0.0.0.0:$WEB_PORT)" || echo "  [App web]    detenido"
  echo ""
  echo "  Acceso rápido: http://127.0.0.1:$WEB_PORT  |  Consola MinIO: http://127.0.0.1:9001"
}

case "${1:-}" in
  stop)
    echo "Parando servicios ..."
    stop_web
    stop_minio
    stop_postgres
    rm -f "$DATA/web.pid"
    echo "Detenido."
    ;;
  restart)
    "$0" stop; echo; "$0" start
    ;;
  status)
    status
    ;;
  start)
    echo "Arrancando servicios (primer plano, Ctrl+C para detenerlos) ..."
    start_postgres
    start_minio
    start_web
    if [ -n "$MINIO_PID" ] || [ -n "$WEB_PID" ]; then
      STARTED=1
      trap cleanup INT TERM EXIT
      echo "Servicios activos. Cierra la terminal o pulsa Ctrl+C para detenerlos todos."
      echo ""
      # Esperar en primer plano a los procesos hijos
      [ -n "$WEB_PID" ] && wait "$WEB_PID" 2>/dev/null
      [ -n "$MINIO_PID" ] && wait "$MINIO_PID" 2>/dev/null
    else
      echo "Los servicios ya estaban activos (usa ./activar.sh stop para detenerlos)."
    fi
    ;;
  *)
    echo "Uso: $0 {start|stop|restart|status}"
    exit 1
    ;;
esac