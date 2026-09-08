<#
================================================================================
 TerLux Coop Desktop — Compilación para Windows
 Genera el instalador NSIS (.exe) y el paquete MSI.

 Uso:   powershell -ExecutionPolicy Bypass -File build-windows.ps1
================================================================================
#>

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

Write-Host ""
Write-Host "=== TerLux Coop Desktop · compilación para Windows ===" -ForegroundColor Cyan
Write-Host ""

# --- 1. Requisitos -----------------------------------------------------------
function Test-Command($name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

if (-not (Test-Command "cargo")) {
    Write-Host "[X] Rust no está instalado." -ForegroundColor Red
    Write-Host "    Instálalo desde https://rustup.rs y vuelve a ejecutar este script."
    exit 1
}
if (-not (Test-Command "node")) {
    Write-Host "[X] Node.js no está instalado (necesario para la CLI de Tauri)." -ForegroundColor Red
    Write-Host "    Descárgalo desde https://nodejs.org"
    exit 1
}

Write-Host "[1/5] Requisitos verificados" -ForegroundColor Green
Write-Host "      rustc  : $(rustc --version)"
Write-Host "      node   : $(node --version)"

# WebView2 viene con Windows 11 y con Windows 10 actualizado.
$webview = Get-ItemProperty -Path "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" -ErrorAction SilentlyContinue
if (-not $webview) {
    Write-Host "[!] No se detecta WebView2. El instalador lo descargará automáticamente." -ForegroundColor Yellow
}

# --- 2. Dependencias de la CLI ----------------------------------------------
Write-Host "[2/5] Instalando la CLI de Tauri..." -ForegroundColor Cyan
npm install --silent

# --- 3. Iconos ---------------------------------------------------------------
Write-Host "[3/5] Generando iconos de la aplicación..." -ForegroundColor Cyan
if (Test-Path "app-icon.png") {
    npx tauri icon app-icon.png
} else {
    Write-Host "[!] No se encontró app-icon.png; se usarán los iconos existentes." -ForegroundColor Yellow
}

# --- 4. Compilación ----------------------------------------------------------
Write-Host "[4/5] Compilando en modo release (puede tardar varios minutos)..." -ForegroundColor Cyan
npx tauri build --bundles nsis,msi

# --- 5. Resultado ------------------------------------------------------------
Write-Host ""
Write-Host "[5/5] Compilación finalizada" -ForegroundColor Green
$bundle = "src-tauri\target\release\bundle"
if (Test-Path $bundle) {
    Get-ChildItem -Path $bundle -Recurse -Include *.exe, *.msi | ForEach-Object {
        $sizeMb = [math]::Round($_.Length / 1MB, 1)
        Write-Host "      -> $($_.FullName)  ($sizeMb MB)" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "Instala el .exe generado y configura el servidor en la pantalla de acceso." -ForegroundColor Cyan
Write-Host "Servidor por defecto: http://100.106.108.98:8443 (Tailscale)"
Write-Host ""
