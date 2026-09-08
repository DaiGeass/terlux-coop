//! ============================================================
//! TerLux Coop Desktop — Modelos de datos
//! Espejo de las entidades expuestas por la API web.
//! ============================================================

use serde::{Deserialize, Serialize};

// ------------------------------------------------------------
// SESIÓN Y ROLES
// ------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub email: String,
    #[serde(rename = "firstName")]
    pub first_name: String,
    #[serde(rename = "lastName")]
    pub last_name: String,
    pub role: String,
    #[serde(default)]
    pub position: Option<String>,
    #[serde(default)]
    pub avatar: Option<String>,
    #[serde(default, rename = "departmentId")]
    pub department_id: Option<String>,
}

impl Default for Session {
    fn default() -> Self {
        Session {
            id: String::new(),
            email: String::new(),
            first_name: String::new(),
            last_name: String::new(),
            role: String::from("guest"),
            position: None,
            avatar: None,
            department_id: None,
        }
    }
}

impl Session {
    pub fn full_name(&self) -> String {
        format!("{} {}", self.first_name, self.last_name)
    }

    pub fn initials(&self) -> String {
        let a = self.first_name.chars().next().unwrap_or('?');
        let b = self.last_name.chars().next().unwrap_or('?');
        format!("{}{}", a, b).to_uppercase()
    }

    pub fn level(&self) -> u8 {
        role_level(&self.role)
    }

    /// Permisos derivados del rol, evaluados en local para poder
    /// pintar la interfaz incluso sin conexión con el servidor.
    pub fn capabilities(&self) -> Capabilities {
        let lvl = self.level();
        Capabilities {
            dashboard: true,
            tasks: lvl >= 30,
            files: lvl >= 30,
            messages: lvl >= 30,
            directory: lvl >= 30,
            store: true,
            billing: true,
            calendar: lvl >= 30,
            documents: lvl >= 30,
            hr_self: lvl >= 30,
            hr_manage: lvl >= 50,
            payroll: lvl >= 50,
            devices_view: lvl >= 30,
            devices_manage: lvl >= 60,
            jobs: lvl >= 50,
            admin_users: lvl >= 60,
            admin_database: lvl >= 60,
            technician_sql: lvl >= 60,
            technician_write: lvl >= 90,
            settings_vpn: lvl >= 60,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Capabilities {
    pub dashboard: bool,
    pub tasks: bool,
    pub files: bool,
    pub messages: bool,
    pub directory: bool,
    pub store: bool,
    pub billing: bool,
    pub calendar: bool,
    pub documents: bool,
    pub hr_self: bool,
    pub hr_manage: bool,
    pub payroll: bool,
    pub devices_view: bool,
    pub devices_manage: bool,
    pub jobs: bool,
    pub admin_users: bool,
    pub admin_database: bool,
    pub technician_sql: bool,
    pub technician_write: bool,
    pub settings_vpn: bool,
}

/// Jerarquía de privilegios idéntica a la de la plataforma web
/// (`src/lib/auth.ts` → ROLE_LEVELS).
pub fn role_level(role: &str) -> u8 {
    match role {
        "super_admin" => 100,
        "admin" => 90,
        "manager" => 60,
        "hr" => 55,
        "finance" => 50,
        "support" => 40,
        "employee" => 30,
        "client" => 10,
        _ => 0,
    }
}

pub fn role_label(role: &str) -> &'static str {
    match role {
        "super_admin" => "Super administrador",
        "admin" => "Administrador",
        "manager" => "Gestor",
        "hr" => "Recursos Humanos",
        "finance" => "Finanzas",
        "support" => "Soporte",
        "employee" => "Empleado",
        "client" => "Cliente",
        _ => "Invitado",
    }
}

// ------------------------------------------------------------
// RESPUESTA GENÉRICA DE LA API
// ------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiEnvelope<T> {
    #[serde(default)]
    pub success: bool,
    #[serde(default)]
    pub data: Option<T>,
    #[serde(default)]
    pub error: Option<ApiError>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiError {
    #[serde(default)]
    pub code: String,
    #[serde(default)]
    pub message: String,
}

// ------------------------------------------------------------
// ESTADO DE CONEXIÓN / VPN
// ------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ConnectionStatus {
    /// Se ha detectado una IP local dentro del rango de la VPN
    pub vpn_interface: bool,
    /// IP asignada dentro de la VPN (si existe)
    pub vpn_ip: Option<String>,
    /// La puerta de enlace responde a nivel TCP
    pub gateway_reachable: bool,
    /// La API responde a /api/health
    pub api_reachable: bool,
    /// Latencia de la última comprobación de la API
    pub latency_ms: Option<u64>,
    /// Base de datos alcanzable (puerto TCP abierto)
    pub database_reachable: bool,
    /// Almacenamiento alcanzable (puerto TCP abierto)
    pub storage_reachable: bool,
    /// Marca de tiempo ISO-8601 de la comprobación
    pub checked_at: String,
    /// Mensaje legible del estado global
    pub summary: String,
}

// ------------------------------------------------------------
// INFORMACIÓN DEL EQUIPO (para el inventario MDM)
// ------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInfo {
    pub client_id: String,
    pub device_name: String,
    pub platform: String,
    pub os_version: String,
    pub arch: String,
    pub cpu: String,
    pub cpu_cores: usize,
    pub total_memory_mb: u64,
    pub app_version: String,
    pub vpn_ip: Option<String>,
}

// ------------------------------------------------------------
// SUBIDA DE ARCHIVOS
// ------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadProgress {
    pub id: String,
    pub file_name: String,
    pub uploaded: u64,
    pub total: u64,
    pub percent: u8,
    pub status: String, // pending | uploading | done | error
    #[serde(default)]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadResult {
    pub file_name: String,
    pub size: u64,
    pub ok: bool,
    #[serde(default)]
    pub error: Option<String>,
}

// ------------------------------------------------------------
// PANEL DE TÉCNICOS: CONSULTAS SQL
// ------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableInfo {
    pub name: String,
    pub schema: String,
    pub estimated_rows: i64,
    pub total_size: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<Option<String>>>,
    pub row_count: usize,
    pub elapsed_ms: u64,
    pub truncated: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecResult {
    pub rows_affected: u64,
    pub elapsed_ms: u64,
    pub statement: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnInfo {
    pub name: String,
    pub data_type: String,
    pub nullable: bool,
    pub default_value: Option<String>,
}

// ------------------------------------------------------------
// EVENTOS EN TIEMPO REAL
// ------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RealtimeEvent {
    #[serde(default)]
    pub channel: String,
    #[serde(default)]
    pub event: String,
    #[serde(default)]
    pub data: serde_json::Value,
    #[serde(default)]
    pub at: String,
}
