//! ============================================================
//! TerLux Coop Desktop — Subida y sincronización de archivos
//!
//! Envía archivos locales al almacenamiento corporativo a través
//! de la API web. Mantiene un índice local para no volver a subir
//! archivos que no han cambiado (sincronización tipo Drive).
//! ============================================================

use crate::api::ApiClient;
use crate::models::{UploadProgress, UploadResult};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter};
use walkdir::WalkDir;

/// Tamaño máximo admitido por archivo (500 MB).
pub const MAX_FILE_BYTES: u64 = 500 * 1024 * 1024;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SyncIndex {
    /// ruta local -> huella (tamaño + fecha de modificación)
    pub entries: HashMap<String, String>,
    pub last_sync: Option<String>,
}

fn index_path() -> PathBuf {
    crate::config::config_dir().join("sync-index.json")
}

pub fn load_index() -> SyncIndex {
    std::fs::read_to_string(index_path())
        .ok()
        .and_then(|t| serde_json::from_str(&t).ok())
        .unwrap_or_default()
}

pub fn save_index(index: &SyncIndex) {
    if let Some(dir) = index_path().parent() {
        let _ = std::fs::create_dir_all(dir);
    }
    if let Ok(text) = serde_json::to_string_pretty(index) {
        let _ = std::fs::write(index_path(), text);
    }
}

/// Huella barata de un archivo: tamaño + marca de modificación.
fn fingerprint(path: &Path) -> Option<String> {
    let meta = std::fs::metadata(path).ok()?;
    let modified = meta
        .modified()
        .ok()
        .and_then(|m| m.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0);
    Some(format!("{}:{}", meta.len(), modified))
}

/// Sube una lista de archivos, emitiendo el progreso a la interfaz.
pub async fn upload_many(
    app: AppHandle,
    api: ApiClient,
    paths: Vec<String>,
    folder_id: Option<String>,
    category: Option<String>,
) -> Vec<UploadResult> {
    let mut results = Vec::new();

    for raw in paths {
        let path = PathBuf::from(&raw);
        let name = path
            .file_name()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| raw.clone());

        // Validaciones previas
        let size = std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
        if !path.is_file() {
            results.push(UploadResult {
                file_name: name.clone(),
                size,
                ok: false,
                error: Some("No es un archivo válido".into()),
            });
            continue;
        }
        if size > MAX_FILE_BYTES {
            results.push(UploadResult {
                file_name: name.clone(),
                size,
                ok: false,
                error: Some(format!(
                    "Supera el límite de {} MB",
                    MAX_FILE_BYTES / 1024 / 1024
                )),
            });
            continue;
        }

        let emitter = app.clone();
        let outcome = api
            .upload_file(
                &path,
                folder_id.clone(),
                category.clone(),
                move |progress: UploadProgress| {
                    let _ = emitter.emit("upload-progress", progress);
                },
            )
            .await;

        match outcome {
            Ok(_) => results.push(UploadResult {
                file_name: name,
                size,
                ok: true,
                error: None,
            }),
            Err(e) => results.push(UploadResult {
                file_name: name,
                size,
                ok: false,
                error: Some(e.to_string()),
            }),
        }
    }

    let _ = app.emit("upload-finished", results.clone());
    results
}

/// Recorre la carpeta sincronizada y sube lo que sea nuevo o haya cambiado.
pub async fn sync_folder(
    app: AppHandle,
    api: ApiClient,
    folder: String,
    category: Option<String>,
) -> Result<serde_json::Value> {
    let root = PathBuf::from(&folder);
    if !root.is_dir() {
        return Err(anyhow::anyhow!("La carpeta '{folder}' no existe"));
    }

    let mut index = load_index();
    let mut pending: Vec<String> = Vec::new();
    let mut scanned = 0usize;

    for entry in WalkDir::new(&root)
        .max_depth(8)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
    {
        let path = entry.path();

        // Se omiten archivos ocultos y temporales del sistema.
        let name = path
            .file_name()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_default();
        if name.starts_with('.') || name.starts_with('~') || name.ends_with(".tmp") {
            continue;
        }
        let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
        if size == 0 || size > MAX_FILE_BYTES {
            continue;
        }

        scanned += 1;
        let key = path.to_string_lossy().to_string();
        let fp = fingerprint(path).unwrap_or_default();

        if index.entries.get(&key) != Some(&fp) {
            pending.push(key);
        }
    }

    let _ = app.emit(
        "sync-status",
        serde_json::json!({ "phase": "scanned", "scanned": scanned, "pending": pending.len() }),
    );

    let results = upload_many(app.clone(), api, pending.clone(), None, category).await;
    let uploaded = results.iter().filter(|r| r.ok).count();
    let failed = results.len() - uploaded;

    // Solo se marcan como sincronizados los que subieron bien.
    for (path, result) in pending.iter().zip(results.iter()) {
        if result.ok {
            if let Some(fp) = fingerprint(Path::new(path)) {
                index.entries.insert(path.clone(), fp);
            }
        }
    }
    index.last_sync = Some(chrono::Local::now().to_rfc3339());
    save_index(&index);

    let summary = serde_json::json!({
        "phase": "done",
        "scanned": scanned,
        "uploaded": uploaded,
        "failed": failed,
        "lastSync": index.last_sync,
    });
    let _ = app.emit("sync-status", summary.clone());
    Ok(summary)
}

/// Analiza la carpeta sin subir nada (vista previa de la sincronización).
pub fn preview_sync(folder: &str) -> Result<serde_json::Value> {
    let root = PathBuf::from(folder);
    if !root.is_dir() {
        return Err(anyhow::anyhow!("La carpeta no existe"));
    }
    let index = load_index();
    let mut total = 0usize;
    let mut pending = 0usize;
    let mut bytes = 0u64;

    for entry in WalkDir::new(&root)
        .max_depth(8)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
    {
        let path = entry.path();
        let name = path.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
        if name.starts_with('.') || name.starts_with('~') {
            continue;
        }
        total += 1;
        let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
        let key = path.to_string_lossy().to_string();
        let fp = fingerprint(path).unwrap_or_default();
        if index.entries.get(&key) != Some(&fp) {
            pending += 1;
            bytes += size;
        }
    }

    Ok(serde_json::json!({
        "totalFiles": total,
        "pendingFiles": pending,
        "pendingBytes": bytes,
        "lastSync": index.last_sync,
    }))
}

/// Olvida el índice para forzar una subida completa.
pub fn reset_index() {
    save_index(&SyncIndex::default());
}
