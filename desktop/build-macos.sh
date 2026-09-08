#!/usr/bin/env bash
# ==============================================================================
#  TerLux Coop Desktop — Compilación para macOS
#  Genera el .app y el instalador .dmg (Apple Silicon e Intel).
#
#  Uso:   chmod +x build-macos.sh && ./build-macos.sh [universal]
# ==============================================================================

set -euo pipefail
cd "$(dirname "$0")"

CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

echo ""
echo -e "${CYAN}=== TerLux Coop Desktop · compilación para macOS ===${NC}"
echo ""

# --- 1. Requisitos ------------------------------------------------------------
if ! command -v cargo >/dev/null 2>&1; then
  echo -e "${RED}[X] Rust no está instalado.${NC}"
  echo "    Instálalo con: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
  exit 1
fi
if ! command -v node >/dev/null 2>&1; then
  echo -e "${RED}[X] Node.js no está instalado (necesario para la CLI de Tauri).${NC}"
  echo "    Instálalo con: brew install node"
  exit 1
fi
if ! xcode-select -p >/dev/null 2>&1; then
  echo -e "${YELLOW}[!] Faltan las herramientas de línea de comandos de Xcode.${NC}"
  echo "    Ejecuta: xcode-select --install"
  exit 1
fi

echo -e "${GREEN}[1/5] Requisitos verificados${NC}"
echo "      rustc : $(rustc --version)"
echo "      node  : $(node --version)"

# --- 2. Dependencias ----------------------------------------------------------
echo -e "${CYAN}[2/5] Instalando la CLI de Tauri...${NC}"
npm install --silent

# --- 3. Iconos ----------------------------------------------------------------
echo -e "${CYAN}[3/5] Generando iconos de la aplicación...${NC}"
if [ -f app-icon.png ]; then
  npx tauri icon app-icon.png
else
  echo -e "${YELLOW}[!] No se encontró app-icon.png; se usarán los iconos existentes.${NC}"
fi

# --- 4. Compilación -----------------------------------------------------------
MODE="${1:-native}"
echo -e "${CYAN}[4/5] Compilando en modo release (puede tardar varios minutos)...${NC}"

if [ "$MODE" = "universal" ]; then
  echo "      Objetivo: binario universal (Apple Silicon + Intel)"
  rustup target add aarch64-apple-darwin x86_64-apple-darwin
  npx tauri build --target universal-apple-darwin --bundles dmg,app
else
  echo "      Objetivo: arquitectura nativa de este equipo"
  npx tauri build --bundles dmg,app
fi

# --- 5. Resultado -------------------------------------------------------------
echo ""
echo -e "${GREEN}[5/5] Compilación finalizada${NC}"
find src-tauri/target -name "*.dmg" -o -name "TerLux Coop.app" 2>/dev/null | while read -r f; do
  echo "      -> $f"
done

echo ""
echo -e "${CYAN}Abre el .dmg y arrastra la aplicación a /Applications.${NC}"
echo "Servidor por defecto: http://100.106.108.98:8443 (Tailscale)"
echo ""
echo -e "${YELLOW}Nota:${NC} sin firma de Apple, la primera apertura requiere"
echo "      clic derecho > Abrir, o: xattr -cr '/Applications/TerLux Coop.app'"
echo ""
