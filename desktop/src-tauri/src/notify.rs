//! ============================================================
//! TerLux Coop Desktop — Notificaciones nativas
//!
//! Windows: centro de notificaciones · macOS: Notification Center
//! ============================================================

use crate::models::RealtimeEvent;
use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

/// Muestra una notificación del sistema operativo.
pub fn show(app: &AppHandle, title: &str, body: &str) {
    let _ = app
        .notification()
        .builder()
        .title(title)
        .body(body)
        .show();
}

/// Traduce un evento del canal en tiempo real a una notificación
/// legible para la persona usuaria.
pub fn handle_realtime(app: &AppHandle, evt: &RealtimeEvent) {
    let (title, body) = match evt.event.as_str() {
        "message" => {
            let author = evt
                .data
                .pointer("/sender/name")
                .and_then(|v| v.as_str())
                .unwrap_or("Equipo TerLux");
            let text = evt
                .data
                .get("body")
                .and_then(|v| v.as_str())
                .unwrap_or("Nuevo mensaje");
            (format!("💬 {author}"), truncate(text, 140))
        }
        "chat" => {
            let from = evt
                .data
                .get("from")
                .and_then(|v| v.as_str())
                .unwrap_or("Equipo TerLux");
            let preview = evt
                .data
                .get("preview")
                .and_then(|v| v.as_str())
                .unwrap_or("Nuevo mensaje en el chat");
            (format!("💬 {from}"), truncate(preview, 140))
        }
        "reply" => {
            let from = evt
                .data
                .get("from")
                .and_then(|v| v.as_str())
                .unwrap_or("Soporte");
            let text = evt
                .data
                .get("body")
                .and_then(|v| v.as_str())
                .unwrap_or("Respuesta de soporte");
            (format!("🛟 {from}"), truncate(text, 140))
        }
        "task_assigned" => (
            "📋 Nueva tarea asignada".to_string(),
            evt.data
                .get("title")
                .and_then(|v| v.as_str())
                .unwrap_or("Tienes una tarea nueva")
                .to_string(),
        ),
        "job_completed" => (
            "⚙️ Trabajo finalizado".to_string(),
            evt.data
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("Un trabajo de la cola ha terminado")
                .to_string(),
        ),
        "desktop_heartbeat" => return, // ruido interno, no se notifica
        _ => return,
    };

    show(app, &title, &body);
}

fn truncate(text: &str, max: usize) -> String {
    if text.chars().count() <= max {
        return text.to_string();
    }
    let cut: String = text.chars().take(max).collect();
    format!("{cut}…")
}
