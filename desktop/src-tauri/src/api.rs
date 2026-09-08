//! ============================================================
//! TerLux Coop Desktop — Cliente de la API REST
//!
//! Habla con la suite web a través de la VPN. Reutiliza la misma
//! cookie de sesión JWT (`terlux_session`) que usa el navegador, de
//! modo que los usuarios de la base de datos funcionan sin cambios.
//! ============================================================

use crate::config::AppConfig;
use crate::models::{ApiEnvelope, Session, UploadProgress};
use anyhow::{anyhow, Result};
use futures_util::StreamExt;
use reqwest::{Client, Method, Response};
use serde_json::{json, Value};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;

pub const SESSION_COOKIE: &str = "terlux_session";

#[derive(Clone)]
pub struct ApiClient {
    http: Client,
    base: String,
    token: Arc<RwLock<Option<String>>>,
}

impl ApiClient {
    pub fn new(cfg: &AppConfig) -> Result<Self> {
        let http = Client::builder()
            .danger_accept_invalid_certs(cfg.accept_invalid_certs)
            .cookie_store(true)
            .connect_timeout(Duration::from_secs(8))
            .timeout(Duration::from_secs(60))
            .user_agent(format!(
                "TerLuxDesktop/{} ({})",
                env!("CARGO_PKG_VERSION"),
                std::env::consts::OS
            ))
            .build()?;

        Ok(Self {
            http,
            base: cfg.base_url(),
            token: Arc::new(RwLock::new(None)),
        })
    }

    pub fn base_url(&self) -> String {
        self.base.clone()
    }

    pub fn raw_client(&self) -> Client {
        self.http.clone()
    }

    pub async fn set_token(&self, token: Option<String>) {
        *self.token.write().await = token;
    }

    pub async fn token(&self) -> Option<String> {
        self.token.read().await.clone()
    }

    pub async fn has_session(&self) -> bool {
        self.token.read().await.is_some()
    }

    // --------------------------------------------------------
    // Primitivas HTTP
    // --------------------------------------------------------

    async fn send(&self, method: Method, path: &str, body: Option<Value>) -> Result<Response> {
        let url = format!("{}{}", self.base, path);
        let mut req = self.http.request(method.clone(), &url);

        if let Some(tok) = self.token.read().await.clone() {
            req = req.header("Cookie", format!("{}={}", SESSION_COOKIE, tok));
        }
        if let Some(payload) = body.as_ref() {
            req = req.json(payload);
        }

        match req.send().await {
            Ok(resp) => Ok(resp),
            Err(primary_err) => {
                // Reintenta con el otro esquema (https <-> http): tolera una
                // configuración persistente con TLS que el servidor no ofrece.
                let fallback = if self.base.starts_with("https://") {
                    Some(self.base.replacen("https://", "http://", 1))
                } else if self.base.starts_with("http://") {
                    Some(self.base.replacen("http://", "https://", 1))
                } else {
                    None
                };
                if let Some(alt_base) = fallback {
                    let alt_url = format!("{}{}", alt_base, path);
                    let mut alt_req = self.http.request(method.clone(), &alt_url);
                    if let Some(tok) = self.token.read().await.clone() {
                        alt_req = alt_req.header("Cookie", format!("{}={}", SESSION_COOKIE, tok));
                    }
                    if let Some(payload) = body.as_ref() {
                        alt_req = alt_req.json(payload);
                    }
                    if let Ok(resp) = alt_req.send().await {
                        return Ok(resp);
                    }
                }
                Err(anyhow!("No se pudo contactar con {url}: {primary_err}"))
            }
        }
    }

    /// Extrae la cookie de sesión de una respuesta de login.
    fn extract_cookie(resp: &Response) -> Option<String> {
        for value in resp.headers().get_all(reqwest::header::SET_COOKIE).iter() {
            let raw = value.to_str().ok()?;
            for part in raw.split(';') {
                let part = part.trim();
                if let Some(rest) = part.strip_prefix(&format!("{}=", SESSION_COOKIE)) {
                    if !rest.is_empty() {
                        return Some(rest.to_string());
                    }
                }
            }
        }
        None
    }

    /// Petición genérica que devuelve el JSON tal cual para la interfaz.
    pub async fn request_json(&self, method: &str, path: &str, body: Option<Value>) -> Result<Value> {
        let m = Method::from_bytes(method.to_uppercase().as_bytes())
            .map_err(|_| anyhow!("Método HTTP no válido: {method}"))?;
        let resp = self.send(m, path, body).await?;
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();

        if text.is_empty() {
            return Ok(json!({ "success": status.is_success() }));
        }

        let value: Value = serde_json::from_str(&text).unwrap_or_else(|_| {
            json!({ "success": status.is_success(), "raw": text })
        });

        if status == reqwest::StatusCode::UNAUTHORIZED {
            return Err(anyhow!("SESSION_EXPIRED"));
        }
        Ok(value)
    }

    pub async fn get(&self, path: &str) -> Result<Value> {
        self.request_json("GET", path, None).await
    }

    pub async fn post(&self, path: &str, body: Value) -> Result<Value> {
        self.request_json("POST", path, Some(body)).await
    }

    pub async fn patch(&self, path: &str, body: Value) -> Result<Value> {
        self.request_json("PATCH", path, Some(body)).await
    }

    pub async fn delete(&self, path: &str) -> Result<Value> {
        self.request_json("DELETE", path, None).await
    }

    // --------------------------------------------------------
    // Autenticación
    // --------------------------------------------------------

    pub async fn login(&self, email: &str, password: &str) -> Result<Session> {
        let resp = self
            .send(
                Method::POST,
                "/api/auth/login",
                Some(json!({ "email": email, "password": password })),
            )
            .await?;

        let cookie = Self::extract_cookie(&resp);
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        let parsed: Value = serde_json::from_str(&text).unwrap_or(json!({}));

        if !status.is_success() {
            let msg = parsed
                .pointer("/error/message")
                .and_then(|v| v.as_str())
                .unwrap_or("Credenciales incorrectas")
                .to_string();
            return Err(anyhow!(msg));
        }

        if let Some(c) = cookie {
            self.set_token(Some(c)).await;
        }

        // El login devuelve datos básicos; /api/auth/me trae la sesión completa.
        self.me().await
    }

    pub async fn me(&self) -> Result<Session> {
        let value = self.get("/api/auth/me").await?;
        let env: ApiEnvelope<Session> = serde_json::from_value(value)
            .map_err(|e| anyhow!("Respuesta de sesión inesperada: {e}"))?;
        env.data
            .ok_or_else(|| anyhow!("La sesión no es válida o ha caducado"))
    }

    pub async fn logout(&self) -> Result<()> {
        let _ = self.post("/api/auth/logout", json!({})).await;
        self.set_token(None).await;
        Ok(())
    }

    // --------------------------------------------------------
    // Salud del servicio
    // --------------------------------------------------------

    pub async fn health(&self) -> Result<Value> {
        let resp = self.send(Method::GET, "/api/health", None).await?;
        let value: Value = resp.json().await.unwrap_or(json!({ "status": "unknown" }));
        Ok(value)
    }

    // --------------------------------------------------------
    // Registro del equipo en el inventario (MDM) y latido
    // --------------------------------------------------------

    pub async fn register_device(&self, info: &crate::models::DeviceInfo) -> Result<Value> {
        self.post(
            "/api/integrations",
            json!({
                "action": "register_client",
                "clientId": info.client_id,
                "deviceName": info.device_name,
                "platform": info.platform,
                "appVersion": info.app_version,
                "vpnIp": info.vpn_ip,
                "metadata": {
                    "arch": info.arch,
                    "cpu": info.cpu,
                    "cores": info.cpu_cores,
                    "memoryMb": info.total_memory_mb,
                    "osVersion": info.os_version,
                }
            }),
        )
        .await
    }

    pub async fn heartbeat(&self, client_id: &str) -> Result<Value> {
        self.post(
            "/api/integrations",
            json!({ "action": "heartbeat", "clientId": client_id }),
        )
        .await
    }

    // --------------------------------------------------------
    // Subida de archivos con progreso
    // --------------------------------------------------------

    /// Sube un archivo local al almacenamiento corporativo.
    /// `on_progress` recibe actualizaciones para que la interfaz
    /// pueda mostrar la barra de avance en tiempo real.
    pub async fn upload_file<F>(
        &self,
        path: &std::path::Path,
        folder_id: Option<String>,
        category: Option<String>,
        on_progress: F,
    ) -> Result<Value>
    where
        F: Fn(UploadProgress) + Send + Sync + 'static,
    {
        let file_name = path
            .file_name()
            .map(|s| s.to_string_lossy().to_string())
            .ok_or_else(|| anyhow!("Ruta de archivo no válida"))?;

        let file = tokio::fs::File::open(path)
            .await
            .map_err(|e| anyhow!("No se pudo abrir {}: {e}", path.display()))?;
        let total = file.metadata().await?.len();

        let upload_id = uuid::Uuid::new_v4().to_string();
        let mime = mime_guess::from_path(path)
            .first_or_octet_stream()
            .to_string();

        // Stream que va informando del progreso mientras se envía.
        let progress_cb = Arc::new(on_progress);
        let cb = progress_cb.clone();
        let id_for_stream = upload_id.clone();
        let name_for_stream = file_name.clone();
        let mut sent: u64 = 0;

        let reader = tokio_util::io::ReaderStream::with_capacity(file, 64 * 1024);
        let stream = reader.map(move |chunk| {
            if let Ok(ref bytes) = chunk {
                sent += bytes.len() as u64;
                let percent = if total > 0 {
                    ((sent as f64 / total as f64) * 100.0).min(100.0) as u8
                } else {
                    100
                };
                cb(UploadProgress {
                    id: id_for_stream.clone(),
                    file_name: name_for_stream.clone(),
                    uploaded: sent,
                    total,
                    percent,
                    status: "uploading".into(),
                    error: None,
                });
            }
            chunk
        });

        let part = reqwest::multipart::Part::stream_with_length(
            reqwest::Body::wrap_stream(stream),
            total,
        )
        .file_name(file_name.clone())
        .mime_str(&mime)?;

        let mut form = reqwest::multipart::Form::new().part("files", part);
        if let Some(f) = folder_id {
            if !f.is_empty() {
                form = form.text("folderId", f);
            }
        }
        form = form.text("category", category.unwrap_or_else(|| "general".into()));

        let url = format!("{}/api/files", self.base);
        let mut req = self.http.post(&url).multipart(form);
        if let Some(tok) = self.token.read().await.clone() {
            req = req.header("Cookie", format!("{}={}", SESSION_COOKIE, tok));
        }

        let resp = req.send().await.map_err(|e| {
            progress_cb(UploadProgress {
                id: upload_id.clone(),
                file_name: file_name.clone(),
                uploaded: 0,
                total,
                percent: 0,
                status: "error".into(),
                error: Some(e.to_string()),
            });
            anyhow!("Error subiendo {file_name}: {e}")
        })?;

        let status = resp.status();
        let value: Value = resp.json().await.unwrap_or(json!({}));

        progress_cb(UploadProgress {
            id: upload_id,
            file_name: file_name.clone(),
            uploaded: total,
            total,
            percent: 100,
            status: if status.is_success() { "done".into() } else { "error".into() },
            error: if status.is_success() {
                None
            } else {
                Some(format!("El servidor respondió {}", status.as_u16()))
            },
        });

        if !status.is_success() {
            return Err(anyhow!("El servidor rechazó el archivo ({})", status.as_u16()));
        }
        Ok(value)
    }

    /// Descarga un archivo del servidor al disco local.
    pub async fn download_file(&self, url_path: &str, dest: &std::path::Path) -> Result<u64> {
        let url = if url_path.starts_with("http") {
            url_path.to_string()
        } else {
            format!("{}{}", self.base, url_path)
        };

        let mut req = self.http.get(&url);
        if let Some(tok) = self.token.read().await.clone() {
            req = req.header("Cookie", format!("{}={}", SESSION_COOKIE, tok));
        }

        let resp = req.send().await?;
        if !resp.status().is_success() {
            return Err(anyhow!("Descarga fallida ({})", resp.status().as_u16()));
        }

        if let Some(parent) = dest.parent() {
            tokio::fs::create_dir_all(parent).await.ok();
        }

        let bytes = resp.bytes().await?;
        tokio::fs::write(dest, &bytes).await?;
        Ok(bytes.len() as u64)
    }
}
