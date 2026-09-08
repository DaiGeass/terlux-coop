#!/usr/bin/env bash
# ============================================================
# TERLUX COOP - CONTROL DE SERVICIOS (bajo demanda)
#   Uso:  ./activar.sh {start|stop|restart|status}
#
#   Levanta/para:
#     - PostgreSQL  (puerto 5432, datos en ./data/pg)
#     - MinIO S3    (puerto 9000, consola 9001, datos en ./storage/minio-data)
#     - App web     (puerto 8443, Next.js en modo producción)
#   No deja nada corriendo en segundo plano si no se arranca.
# ============================================================

set -euo pipefail

BASE="$(cd "$(dirname "$0")" && pwd)"
DATA="$BASE/data"
LOGS="$DATA/logs"
mkdir -p "$LOGS"

PGDATA="$BASE/data/pg"
PGUSER="postgres"
PGBIN="$(command -v pg_ctl >/dev/null 2>&1 && dirname "$(command -v pg_ctl)")"
PROJ_DIR="$BASE"
WEB_LOG="$LOGS/web.log"
MINIO_LOG="$LOGS/minio.log"
PG_LOG="$PGDATA/pg.log"

WEB_PORT=8443
MINIO_PORT=9000
PG_PORT=5432

port_in_use() { ss -ltn 2>/dev/null | grep -q ":$1 "; }

# ------------------------------------------------------------
# Auxiliares de proceso (PID por fichero)
# ------------------------------------------------------------
web_pid() { [ -f "$DATA/web.pid" ] && kill -0 "$(cat "$DATA/web.pid")" 2>/dev/null && cat "$DATA/web.pid" || echo ""; }
minio_pid() { [ -f "$DATA/minio.pid" ] && kill -0 "$(cat "$DATA/minio.pid")" 2>/dev/null && cat "$DATA/minio.pid" || echo ""; }

start_postgres() {
  if port_in_use $PG_PORT; then
    echo "  [PostgreSQL] ya está en el puerto $PG_PORT"
    return
  fi
  echo "  [PostgreSQL] arrancando en $PG_PORT ..."
  # initdb se ejecutó como postgres; pg_ctl debe correr con ese usuario
  if [ "$(id -un)" = "$PGUSER" ]; then
    pg_ctl -D "$PGDATA" -l "$PG_LOG" -o "-p $PG_PORT -k /tmp -c listen_addresses='127.0.0.1'" start
  elif [ -x "$(command -v su)" ]; then
    su "$PGUSER" -s /bin/sh -c "pg_ctl -D '$PGDATA' -l '$PG_LOG' -o '-p $PG_PORT -k /tmp -c listen_addresses=\"127.0.0.1\"' start"
  else
    echo "       Advertencia: ejecuta este script en un host con permisos para el usuario postgres."
    return
  fi
  # Esperar a que acepte conexiones
  for _ in $(seq 1 15); do
    PGPASSWORD=postgres psql -h 127.0.0.1 -p $PG_PORT -U postgres -d postgres -c "SELECT 1" >/dev/null 2>&1 && break
    sleep 1
  done
  echo "       OK (socket /tmp, bd app_db)"
}

start_minio() {
  if port_in_use $MINIO_PORT; then
    echo "  [MinIO]      ya está en el puerto $MINIO_PORT"
    return
  fi
  if [ ! -x "$BASE/tools/minio" ]; then
    echo "  [MinIO]      binario no encontrado en tools/minio; descárgalo de https://dl.min.io"
    return
  fi
  echo "  [MinIO]      arrancando en 9000 (consola 9001) ..."
  (setsid "$BASE/tools/minio" server "$BASE/storage/minio-data" --address "127.0.0.1:$MINIO_PORT" --console-address "127.0.0.1:9001" > "$MINIO_LOG" 2>&1 & echo $! > "$DATA/minio.pid")
  sleep 2
  echo "       OK (bucket terlux-files)"
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
  echo "  [App web]    arrancando en $WEB_PORT (http://localhost:$WEB_PORT) ..."
  (cd "$PROJ_DIR" && setsid npm start > "$WEB_LOG" 2>&1 & echo $! > "$DATA/web.pid")
  for _ in $(seq 1 30); do
    curl -fsS "http://127.0.0.1:$WEB_PORT/api/health" >/dev/null 2>&1 && break
    sleep 1
  done
  echo "       OK (https a través de Tailscale: https://100.106.108.98:$WEB_PORT)"
}

stop_postgres()  { echo "  [PostgreSQL] parando ...";  su "$PGUSER" -s /bin/sh -c "pg_ctl -D '$PGDATA' stop -m fast" 2>/dev/null || true; }
stop_minio()     { local p; p="$(minio_pid)"; [ -n "$p" ] && kill "$p" 2>/dev/null && echo "  [MinIO]      parado"; rm -f "$DATA/minio.pid"; }
stop_web() {
  local p; p="$(web_pid)"
  if [ -n "$p" ]; then kill "$p" 2>/dev/null || true; sleep 1; fi
  # El servidor real de Next puede ser hijo de npm; matarlo por puerto
  local lp
  lp="$(ss -ltnp 2>/dev/null | grep ":$WEB_PORT " | grep -oP 'pid=\K[0-9]+' | head -1 || true)"
  [ -n "$lp" ] && kill "$lp" 2>/dev/null && echo "  [App web]    parado" || echo "  [App web]    parado"
  rm -f "$DATA/web.pid"
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
  start)
    echo "Arrancando servicios ..."
    start_postgres
    start_minio
    start_web
    echo "Listo."
    ;;
  stop)
    echo "Parando servicios ..."
    stop_web
    stop_minio
    stop_postgres
    echo "Detenido."
    ;;
  restart)
    "$0" stop; echo; "$0" start
    ;;
  status)
    status
    ;;
  *)
    echo "Uso: $0 {start|stop|restart|status}"
    exit 1
    ;;
esac