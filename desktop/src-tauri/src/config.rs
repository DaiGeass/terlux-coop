//! ============================================================
//! TerLux Coop Desktop — Configuración persistente
//!
//! Se guarda en el directorio de configuración del sistema:
//!   Windows : %APPDATA%\TerLuxCoop\config.json
//!   macOS   : ~/Library/Application Support/TerLuxCoop/config.json
//! ============================================================

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    // --- Servidor de la suite web (a través de la VPN) ---
    pub host: String,
    pub port: u16,
    pub use_tls: bool,
    /// Aceptar certificados autofirmados (habitual en redes internas)
    pub accept_invalid_certs: bool,

    // --- Red privada ---
    pub vpn_network: String,
    pub vpn_gateway: String,

    // --- Base de datos (panel de técnicos, conexión directa) ---
    pub db_host: String,
    pub db_port: u16,
    pub db_name: String,
    pub db_user: String,
    /// La contraseña NO se guarda aquí: va al llavero del sistema.
    #[serde(skip_serializing, default)]
    pub db_password: Option<String>,

    // --- Almacenamiento de archivos ---
    pub storage_host: String,
    pub storage_port: u16,

    // --- Preferencias de la aplicación ---
    pub theme: String, // dark | light | system
    pub notifications_enabled: bool,
    pub start_minimized: bool,
    pub close_to_tray: bool,
    pub auto_sync: bool,
    pub sync_folder: Option<String>,
    pub heartbeat_seconds: u64,
    pub remember_email: Option<String>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            // Servidor de la plataforma accedido por Tailscale (100.106.108.98).
            host: "100.106.108.98".into(),
            port: 8443,
            use_tls: false,
            accept_invalid_certs: true,

            // Red Tailscale 100.64.0.0/10 (CGNAT); puerta = nodo del servidor.
            vpn_network: "100.64.0.0/10".into(),
            vpn_gateway: "100.106.108.98".into(),

            db_host: "100.106.108.98".into(),
            db_port: 5432,
            db_name: "app_db".into(),
            db_user: "postgres".into(),
            db_password: None,

            storage_host: "100.106.108.98".into(),
            storage_port: 9000,

            theme: "dark".into(),
            notifications_enabled: true,
            start_minimized: false,
            close_to_tray: true,
            auto_sync: false,
            sync_folder: None,
            heartbeat_seconds: 30,
            remember_email: None,
        }
    }
}

impl AppConfig {
    /// URL base de la API, p. ej. `https://10.8.0.1:8443`
    pub fn base_url(&self) -> String {
        let scheme = if self.use_tls { "https" } else { "http" };
        format!("{}://{}:{}", scheme, self.host, self.port)
    }

    pub fn endpoint(&self, path: &str) -> String {
        format!("{}{}", self.base_url(), path)
    }

    /// Cadena de conexión de PostgreSQL para el panel de técnicos.
    pub fn pg_connection_string(&self) -> String {
        let pass = self.db_password.clone().unwrap_or_default();
        format!(
            "host={} port={} dbname={} user={} password={} connect_timeout=8",
            self.db_host, self.db_port, self.db_name, self.db_user, pass
        )
    }

    /// Prefijo de red de la VPN (`10.8.0.` a partir de `10.8.0.0/24`)
    /// usado para detectar si el equipo tiene una IP dentro del túnel.
    pub fn vpn_prefix(&self) -> String {
        let base = self
            .vpn_network
            .split('/')
            .next()
            .unwrap_or("10.8.0.0")
            .to_string();
        let parts: Vec<&str> = base.split('.').collect();
        let mask: u8 = self
            .vpn_network
            .split('/')
            .nth(1)
            .and_then(|m| m.parse().ok())
            .unwrap_or(24);

        if parts.len() < 4 {
            return base;
        }
        match mask {
            0..=8 => format!("{}.", parts[0]),
            9..=16 => format!("{}.{}.", parts[0], parts[1]),
            _ => format!("{}.{}.{}.", parts[0], parts[1], parts[2]),
        }
    }
}

// ------------------------------------------------------------
// Persistencia en disco
// ------------------------------------------------------------

pub fn config_dir() -> PathBuf {
    let base = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    base.join("TerLuxCoop")
}

pub fn config_path() -> PathBuf {
    config_dir().join("config.json")
}

pub fn cache_path(name: &str) -> PathBuf {
    config_dir().join("cache").join(name)
}

pub fn load() -> AppConfig {
    let path = config_path();
    match std::fs::read_to_string(&path) {
        Ok(text) => serde_json::from_str(&text).unwrap_or_else(|err| {
            eprintln!("[config] JSON inválido ({err}); se usan valores por defecto");
            AppConfig::default()
        }),
        Err(_) => AppConfig::default(),
    }
}

pub fn save(cfg: &AppConfig) -> anyhow::Result<()> {
    let dir = config_dir();
    std::fs::create_dir_all(&dir)?;
    let text = serde_json::to_string_pretty(cfg)?;
    std::fs::write(config_path(), text)?;
    Ok(())
}

/// Guarda una respuesta de la API en caché para poder mostrarla sin conexión.
pub fn cache_write(name: &str, value: &serde_json::Value) {
    let path = cache_path(name);
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(text) = serde_json::to_string(value) {
        let _ = std::fs::write(path, text);
    }
}

/// Recupera la última respuesta cacheada (modo sin conexión).
pub fn cache_read(name: &str) -> Option<serde_json::Value> {
    let text = std::fs::read_to_string(cache_path(name)).ok()?;
    serde_json::from_str(&text).ok()
}
