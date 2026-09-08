//! ============================================================
//! TerLux Coop Desktop — Canal en tiempo real (SSE)
//!
//! Se suscribe a /api/realtime/stream de la suite web y reemite
//! los eventos hacia la interfaz mediante el bus de Tauri.
//! Reconecta automáticamente si el túnel se cae.
//! ============================================================

use crate::api::{ApiClient, SESSION_COOKIE};
use crate::models::RealtimeEvent;
use futures_util::StreamExt;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

/// Bandera compartida para poder detener el bucle al cerrar sesión.
#[derive(Clone, Default)]
pub struct RealtimeHandle {
    running: Arc<AtomicBool>,
}

impl RealtimeHandle {
    pub fn new() -> Self {
        Self {
            running: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn is_running(&self) -> bool {
        self.running.load(Ordering::SeqCst)
    }

    pub fn stop(&self) {
        self.running.store(false, Ordering::SeqCst);
    }

    fn start_flag(&self) {
        self.running.store(true, Ordering::SeqCst);
    }
}

/// Abre el stream de eventos del canal indicado (p. ej. `global`).
pub fn spawn(app: AppHandle, api: ApiClient, channel: String, handle: RealtimeHandle) {
    if handle.is_running() {
        return;
    }
    handle.start_flag();

    tauri::async_runtime::spawn(async move {
        let base = api.base_url();
        let stream_path = "/api/realtime/stream";
        let url = format!(
            "{}{}?channel={}",
            base,
            stream_path,
            urlencoding::encode(&channel)
        );
        let client = api.raw_client();
        let mut backoff = 3u64;
        let mut active_url = url;
        let mut tried_alt = false;
        let alt_url = if base.starts_with("https://") {
            Some(format!("{}{}?channel={}", base.replacen("https://", "http://", 1), stream_path, urlencoding::encode(&channel)))
        } else if base.starts_with("http://") {
            Some(format!("{}{}?channel={}", base.replacen("http://", "https://", 1), stream_path, urlencoding::encode(&channel)))
        } else {
            None
        };

        while handle.is_running() {
            let token = api.token().await;
            let mut request = client.get(&active_url).timeout(Duration::from_secs(3600));
            if let Some(tok) = token {
                request = request.header("Cookie", format!("{}={}", SESSION_COOKIE, tok));
            }

            match request.send().await {
                Ok(resp) if resp.status().is_success() => {
                    backoff = 3;
                    let _ = app.emit("realtime-status", "connected");
                    let mut stream = resp.bytes_stream();
                    let mut buffer = String::new();

                    while let Some(chunk) = stream.next().await {
                        if !handle.is_running() {
                            break;
                        }
                        let Ok(bytes) = chunk else { break };
                        buffer.push_str(&String::from_utf8_lossy(&bytes));

                        // Los eventos SSE se separan por línea en blanco.
                        while let Some(idx) = buffer.find("\n\n") {
                            let raw = buffer[..idx].to_string();
                            drain_prefix(&mut buffer, idx + 2);

                            for line in raw.lines() {
                                let line = line.trim();
                                // Las líneas que empiezan por ':' son latidos.
                                if line.is_empty() || line.starts_with(':') {
                                    continue;
                                }
                                if let Some(payload) = line.strip_prefix("data: ") {
                                    if let Ok(evt) =
                                        serde_json::from_str::<RealtimeEvent>(payload)
                                    {
                                        let _ = app.emit("realtime-event", evt.clone());
                                        crate::notify::handle_realtime(&app, &evt);
                                    }
                                }
                            }
                        }
                    }
                    let _ = app.emit("realtime-status", "disconnected");
                }
                Ok(resp) => {
                    let _ = app.emit(
                        "realtime-status",
                        format!("error:{}", resp.status().as_u16()),
                    );
                }
                Err(_) => {
                    if let Some(ref alt) = alt_url {
                        if !tried_alt && active_url != *alt {
                            active_url = alt.clone();
                            tried_alt = true;
                            backoff = 3;
                            let _ = app.emit("realtime-status", "retrying-alternate");
                            continue;
                        }
                    }
                    let _ = app.emit("realtime-status", "offline");
                }
            }

            if !handle.is_running() {
                break;
            }
            tokio::time::sleep(Duration::from_secs(backoff)).await;
            backoff = (backoff * 2).min(30);
        }
    });
}

/// Elimina el prefijo ya procesado del búfer sin reasignar de más.
fn drain_prefix(buffer: &mut String, upto: usize) {
    let rest = buffer[upto..].to_string();
    *buffer = rest;
}

/// Publica un evento en el bus compartido con la web.
pub async fn publish(api: &ApiClient, channel: &str, event: &str, data: serde_json::Value) -> anyhow::Result<()> {
    api.post(
        "/api/realtime/stream",
        serde_json::json!({ "channel": channel, "event": event, "data": data }),
    )
    .await?;
    Ok(())
}
