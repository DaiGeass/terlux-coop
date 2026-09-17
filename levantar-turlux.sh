#!/usr/bin/env bash
# ============================================================
# Levantar de nuevo el entorno temporal "turlux" (login demo)
#   - Servidor estatico en :8081 (data/static-preview/index.html)
#   - nginx con turluxcoop.internal / terlux.terluxcoop.internal
#   - dnsmasq (DNS interno: *.terluxcoop.internal + turluxcoop.internal)
# Uso: ./levantar-turlux.sh
# ============================================================
set -u
DIR="$(cd "$(dirname "$0")" && pwd)"
DATA="$DIR/data"
LOGS="$DATA/logs"
PORT=8081

say() { echo "  [turlux] $*"; }

start_nginx() {
  [ -x "$(command -v nginx)" ] || { say "nginx no instalado"; return 1; }
  if ! nginx -t >/dev/null 2>&1; then say "config nginx invalida (nginx -t)"; return 1; fi
  local master
  master="$(pgrep -f 'nginx: master' | head -1)"
  if [ -n "$master" ]; then
    kill -HUP "$master" 2>/dev/null
    say "nginx recargado (master $master)"
  else
    nginx >/dev/null 2>&1 || { say "ERROR al iniciar nginx"; return 1; }
    say "nginx iniciado"
  fi
  sleep 1
}

start_dnsmasq() {
  [ -x "$(command -v dnsmasq)" ] || { say "dnsmasq no instalado"; return 1; }
  local pid
  pid="$(cat "$DATA/dnsmasq.pid" 2>/dev/null || true)"
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    say "dnsmasq ya activo (pid $pid)"
    return 0
  fi
  getent hosts turluxcoop.internal >/dev/null 2>&1 || true
  pgrep -x dnsmasq | xargs -r kill 2>/dev/null
  sleep 1
  mkdir -p "$LOGS"
  dnsmasq --conf-file="$DATA/dnsmasq-intra.conf" > "$LOGS/dnsmasq.log" 2>&1 &
  echo $! > "$DATA/dnsmasq.pid"
  sleep 1
  ps -p "$(cat "$DATA/dnsmasq.pid")" >/dev/null 2>&1 && say "dnsmasq iniciado (pid $(cat "$DATA/dnsmasq.pid"))" \
    || { say "ERROR iniciando dnsmasq (ver $LOGS/dnsmasq.log)"; return 1; }
}

start_static() {
  if curl -s -o /dev/null --max-time 2 "http://127.0.0.1:$PORT/"; then
    say "servidor :$PORT ya responde (login demo)"
    return 0
  fi
  [ -x "$(command -v python3)" ] || { say "python3 no instalado"; return 1; }
  mkdir -p "$LOGS"
  (cd "$DATA/static-preview" && nohup python3 -m http.server "$PORT" --bind 0.0.0.0 > "$LOGS/static-http.log" 2>&1 & echo $! > "$DATA/static-http.pid")
  sleep 1
  curl -s -o /dev/null --max-time 2 "http://127.0.0.1:$PORT/" \
    && say "servidor :$PORT iniciado (pid $(cat "$DATA/static-http.pid"))" \
    || { say "ERROR: :$PORT no responde"; return 1; }
}

verify() {
  echo
  echo "  Verificacion:"
  printf "    %-32s " "turluxcoop.internal"; curl -s --max-time 6 -H "Host: turluxcoop.internal" "http://100.106.108.98/" 2>/dev/null | grep -oiE '<title>[^<]*</title>' | head -1 || echo "sin respuesta"
  printf "    %-32s " "terlux.terluxcoop.internal"; curl -s --max-time 6 -H "Host: terlux.terluxcoop.internal" "http://100.106.108.98/" 2>/dev/null | grep -oiE '<title>[^<]*</title>' | head -1 || echo "sin respuesta"
  printf "    %-32s " "127.0.0.1:$PORT"; curl -s --max-time 6 "http://127.0.0.1:$PORT/" 2>/dev/null | grep -oiE '<title>[^<]*</title>' | head -1 || echo "sin respuesta"
  printf "    %-32s " "intranet.terluxcoop.internal (app)"; curl -s --max-time 6 -H "Host: intranet.terluxcoop.internal" "http://100.106.108.98/" 2>/dev/null | grep -oiE '<title>[^<]*</title>' | head -1 || echo "sin respuesta"
  echo
  echo "  Accesos:"
  echo "    http://turluxcoop.internal       (login demo)"
  echo "    http://terlux.terluxcoop.internal (login demo, alias)"
  echo "    http://127.0.0.1:$PORT            (login demo, local)"
}

echo "Levantando entorno turlux ..."
start_nginx
start_dnsmasq
start_static
verify