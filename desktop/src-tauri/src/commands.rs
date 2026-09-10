//! ============================================================
//! TerLux Coop Desktop — Comandos expuestos a la interfaz
//!
//! Todo lo que la UI puede pedir al backend Rust pasa por aquí.
//! ============================================================

use crate::config::{self, AppConfig};
use crate::models::{Capabilities, ConnectionStatus, DeviceInfo, ExecResult, QueryResult, Session, TableInfo, UploadResult};
use crate::state::AppState;
use crate::{dbadmin, notify, realtime, secrets, uploader, vpn};
use serde_json::{json, Value};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;

type Cmd<T> = Result<T, String>;

fn err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

// ============================================================
// CONFIGURACIÓN
// ============================================================

#[tauri::command]
pub async fn get_config(state: State<'_, AppState>) -> Cmd<AppConfig> {
    Ok(state.config_snapshot().await)
}

#[tauri::command]
pub async fn save_config(mut new_config: AppConfig, state: State<'_, AppState>) -> Cmd<AppConfig> {
    // La contraseña de base de datos nunca se guarda en el JSON.
    if let Some(pass) = new_config.db_password.take() {
        if !pass.is_empty() {
            secrets::save_db_password(&pass).map_err(err)?;
        }
    }

    config::save(&new_config).map_err(err)?;
    state.rebuild_api(&new_config).await.map_err(err)?;
    *state.config.write().await = new_config.clone();
    Ok(new_config)
}

#[tauri::command]
pub async fn reset_config(state: State<'_, AppState>) -> Cmd<AppConfig> {
    let defaults = AppConfig::default();
    config::save(&defaults).map_err(err)?;
    state.rebuild_api(&defaults).await.map_err(err)?;
    *state.config.write().await = defaults.clone();
    Ok(defaults)
}

// ============================================================
// RED / VPN
// ============================================================

#[tauri::command]
pub async fn check_connection(state: State<'_, AppState>) -> Cmd<ConnectionStatus> {
    let cfg = state.config_snapshot().await;
    let status = vpn::check(&cfg).await;
    *state.status.write().await = status.clone();
    Ok(status)
}

#[tauri::command]
pub async fn connection_status(state: State<'_, AppState>) -> Cmd<ConnectionStatus> {
    Ok(state.status.read().await.clone())
}

#[tauri::command]
pub async fn probe_host(host: String, port: u16) -> Cmd<Value> {
    let latency = vpn::tcp_probe(&host, port, 3000).await;
    Ok(json!({
        "reachable": latency.is_some(),
        "latencyMs": latency,
        "host": host,
        "port": port,
    }))
}

#[tauri::command]
pub async fn local_addresses() -> Cmd<Vec<String>> {
    Ok(vpn::local_ipv4_addresses())
}

// ============================================================
// SESIÓN
// ============================================================

#[tauri::command]
pub async fn login(
    app: AppHandle,
    email: String,
    password: String,
    remember: bool,
    state: State<'_, AppState>,
) -> Cmd<Session> {
    let api = state.api_client().await;
    let session = api.login(&email, &password).await.map_err(err)?;

    // Persistencia de la sesión en el llavero del sistema.
    if let Some(token) = api.token().await {
        let _ = secrets::save_session_token(&token);
    }

    let mut cfg = state.config_snapshot().await;
    cfg.remember_email = if remember { Some(email.clone()) } else { None };
    let _ = config::save(&cfg);
    *state.config.write().await = cfg.clone();

    *state.session.write().await = Some(session.clone());

    // Alta en el inventario de dispositivos (MDM) y canal en vivo.
    let info = vpn::device_info(&cfg);
    let _ = api.register_device(&info).await;
    realtime::spawn(app.clone(), api.clone(), "global".into(), state.realtime.clone());

    if cfg.notifications_enabled {
        notify::show(
            &app,
            "Sesión iniciada",
            &format!("Bienvenido/a, {}", session.first_name),
        );
    }

    Ok(session)
}

/// Reanuda la sesión guardada al abrir la aplicación.
#[tauri::command]
pub async fn restore_session(app: AppHandle, state: State<'_, AppState>) -> Cmd<Option<Session>> {
    let Some(token) = secrets::load_session_token() else {
        return Ok(None);
    };

    let api = state.api_client().await;
    api.set_token(Some(token)).await;

    match api.me().await {
        Ok(session) => {
            *state.session.write().await = Some(session.clone());
            let cfg = state.config_snapshot().await;
            let info = vpn::device_info(&cfg);
            let _ = api.register_device(&info).await;
            realtime::spawn(app, api.clone(), "global".into(), state.realtime.clone());
            Ok(Some(session))
        }
        Err(_) => {
            // El token ya no sirve: se descarta silenciosamente.
            let _ = secrets::clear_session_token();
            api.set_token(None).await;
            Ok(None)
        }
    }
}

#[tauri::command]
pub async fn current_session(state: State<'_, AppState>) -> Cmd<Option<Session>> {
    Ok(state.session_snapshot().await)
}

#[tauri::command]
pub async fn capabilities(state: State<'_, AppState>) -> Cmd<Option<Capabilities>> {
    Ok(state.session_snapshot().await.map(|s| s.capabilities()))
}

#[tauri::command]
pub async fn logout(state: State<'_, AppState>) -> Cmd<()> {
    let api = state.api_client().await;
    let _ = api.logout().await;
    let _ = secrets::clear_session_token();
    state.realtime.stop();
    *state.session.write().await = None;
    Ok(())
}

// ============================================================
// PUENTE GENÉRICO CON LA API WEB (con caché sin conexión)
// ============================================================

#[tauri::command]
pub async fn api_request(
    method: String,
    path: String,
    body: Option<Value>,
    cache_key: Option<String>,
    state: State<'_, AppState>,
) -> Cmd<Value> {
    let api = state.api_client().await;

    match api.request_json(&method, &path, body).await {
        Ok(value) => {
            if let Some(key) = cache_key {
                if method.eq_ignore_ascii_case("GET") {
                    config::cache_write(&key, &value);
                }
            }
            Ok(value)
        }
        Err(e) => {
            let message = e.to_string();
            if message.contains("SESSION_EXPIRED") {
                *state.session.write().await = None;
                let _ = secrets::clear_session_token();
                return Err("SESSION_EXPIRED".into());
            }
            // Sin conexión: se devuelve lo último conocido.
            if let Some(key) = cache_key {
                if let Some(mut cached) = config::cache_read(&key) {
                    if let Some(obj) = cached.as_object_mut() {
                        obj.insert("_offline".into(), json!(true));
                    }
                    return Ok(cached);
                }
            }
            Err(message)
        }
    }
}

#[tauri::command]
pub async fn api_health(state: State<'_, AppState>) -> Cmd<Value> {
    let api = state.api_client().await;
    api.health().await.map_err(err)
}

// ============================================================
// INVENTARIO DEL EQUIPO (MDM)
// ============================================================

#[tauri::command]
pub async fn device_info(state: State<'_, AppState>) -> Cmd<DeviceInfo> {
    let cfg = state.config_snapshot().await;
    Ok(vpn::device_info(&cfg))
}

#[tauri::command]
pub async fn register_device(state: State<'_, AppState>) -> Cmd<Value> {
    let cfg = state.config_snapshot().await;
    let api = state.api_client().await;
    let info = vpn::device_info(&cfg);
    api.register_device(&info).await.map_err(err)
}

// ============================================================
// ARCHIVOS: SELECCIÓN, SUBIDA Y SINCRONIZACIÓN
// ============================================================

#[tauri::command]
pub async fn pick_files(app: AppHandle) -> Cmd<Vec<String>> {
    let (tx, rx) = tokio::sync::oneshot::channel();

    app.dialog()
        .file()
        .set_title("Selecciona archivos para subir a TerLux")
        .pick_files(move |paths| {
            let _ = tx.send(paths);
        });

    let picked = rx.await.map_err(err)?;
    Ok(picked
        .unwrap_or_default()
        .into_iter()
        .map(|p| p.to_string())
        .collect())
}

#[tauri::command]
pub async fn pick_folder(app: AppHandle) -> Cmd<Option<String>> {
    let (tx, rx) = tokio::sync::oneshot::channel();

    app.dialog()
        .file()
        .set_title("Elige la carpeta que quieres sincronizar")
        .pick_folder(move |path| {
            let _ = tx.send(path);
        });

    let picked = rx.await.map_err(err)?;
    Ok(picked.map(|p| p.to_string()))
}

#[tauri::command]
pub async fn upload_files(
    app: AppHandle,
    paths: Vec<String>,
    folder_id: Option<String>,
    category: Option<String>,
    state: State<'_, AppState>,
) -> Cmd<Vec<UploadResult>> {
    let api = state.api_client().await;
    let cfg = state.config_snapshot().await;
    let results = uploader::upload_many(app.clone(), api, paths, folder_id, category).await;

    if cfg.notifications_enabled {
        let ok = results.iter().filter(|r| r.ok).count();
        let failed = results.len() - ok;
        notify::show(
            &app,
            "Subida finalizada",
            &format!("{ok} archivo(s) subidos · {failed} con error"),
        );
    }
    Ok(results)
}

#[tauri::command]
pub async fn sync_now(app: AppHandle, state: State<'_, AppState>) -> Cmd<Value> {
    let cfg = state.config_snapshot().await;
    let folder = cfg
        .sync_folder
        .clone()
        .ok_or_else(|| "No hay ninguna carpeta de sincronización configurada".to_string())?;

    let api = state.api_client().await;
    let summary = uploader::sync_folder(app.clone(), api, folder, Some("general".into()))
        .await
        .map_err(err)?;

    if cfg.notifications_enabled {
        let uploaded = summary.get("uploaded").and_then(|v| v.as_u64()).unwrap_or(0);
        notify::show(
            &app,
            "Sincronización completada",
            &format!("{uploaded} archivo(s) enviados al almacenamiento"),
        );
    }
    Ok(summary)
}

#[tauri::command]
pub async fn preview_sync(state: State<'_, AppState>) -> Cmd<Value> {
    let cfg = state.config_snapshot().await;
    let folder = cfg
        .sync_folder
        .clone()
        .ok_or_else(|| "No hay ninguna carpeta de sincronización configurada".to_string())?;
    uploader::preview_sync(&folder).map_err(err)
}

#[tauri::command]
pub async fn reset_sync_index() -> Cmd<()> {
    uploader::reset_index();
    Ok(())
}

#[tauri::command]
pub async fn download_file(
    app: AppHandle,
    url_path: String,
    suggested_name: String,
    state: State<'_, AppState>,
) -> Cmd<Value> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .set_file_name(&suggested_name)
        .set_title("Guardar archivo")
        .save_file(move |path| {
            let _ = tx.send(path);
        });

    let Some(target) = rx.await.map_err(err)? else {
        return Ok(json!({ "cancelled": true }));
    };

    let dest = target
        .into_path()
        .map_err(|e| format!("Ruta no válida: {e}"))?;

    let api = state.api_client().await;
    let bytes = api.download_file(&url_path, &dest).await.map_err(err)?;

    Ok(json!({
        "cancelled": false,
        "path": dest.to_string_lossy(),
        "bytes": bytes,
    }))
}

// ============================================================
// CORREO: SUBIDA DE ADJUNTOS A /api/uploads
// ============================================================

/// Sube archivos desde el disco local a /api/uploads para adjuntarlos a un correo.
/// Devuelve una lista de { name, url, size, mimeType } lista para enviar.
#[tauri::command]
pub async fn upload_mail_attachments(
    _app: AppHandle,
    paths: Vec<String>,
    state: State<'_, AppState>,
) -> Cmd<Vec<Value>> {
    let api = state.api_client().await;
    let mut attachments = vec![];

    for p in &paths {
        let path = std::path::Path::new(p);
        let file_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
        let file_bytes = tokio::fs::read(path).await.map_err(|e| {
            format!("No se pudo leer {}: {e}", path.display())
        })?;
        let mime = mime_guess::from_path(path)
            .first_or_octet_stream()
            .to_string();

        let file_part = reqwest::multipart::Part::bytes(file_bytes)
            .file_name(file_name.clone())
            .mime_str(&mime)
            .map_err(|e| format!("MIME inválido: {e}"))?;
        let form = reqwest::multipart::Form::new().part("file", file_part);

        // POST multipart a /api/uploads (mismo endpoint que la web).
        let url = format!("{}/api/uploads", api.base_url());
        let mut req = api.raw_client().post(&url).multipart(form);
        if let Some(tok) = api.token().await {
            req = req.header("Cookie", format!("{}={}", crate::api::SESSION_COOKIE, tok));
        }

        match req.send().await {
            Ok(resp) => {
                let status = resp.status();
                let body = resp.text().await.unwrap_or_default();
                if status.is_success() {
                    if let Ok(val) = serde_json::from_str::<Value>(&body) {
                        if let Some(d) = val.get("data") {
                            attachments.push(json!({
                                "name": d.get("name").and_then(|v| v.as_str()).unwrap_or(&file_name),
                                "url": d.get("url").and_then(|v| v.as_str()).unwrap_or(""),
                                "size": d.get("size").unwrap_or(&json!(0)),
                                "mimeType": d.get("mimeType").and_then(|v| v.as_str()).unwrap_or(&mime),
                            }));
                        }
                    }
                } else {
                    eprintln!("[mail-upload] {file_name}: HTTP {status}");
                }
            }
            Err(e) => {
                eprintln!("[mail-upload] {file_name}: {e}");
            }
        }
    }

    Ok(attachments)
}

// ============================================================
// PANEL DE TÉCNICOS (PostgreSQL directo por VPN)
// ============================================================

/// Comprueba que quien llama tiene privilegios suficientes.
async fn require_level(state: &State<'_, AppState>, min: u8) -> Result<Session, String> {
    let session = state
        .session_snapshot()
        .await
        .ok_or_else(|| "Debes iniciar sesión".to_string())?;
    if session.level() < min {
        return Err("Tu rol no tiene permisos para esta operación".into());
    }
    Ok(session)
}

/// Carga la configuración de BD añadiendo la contraseña del llavero.
async fn db_config(state: &State<'_, AppState>) -> AppConfig {
    let mut cfg = state.config_snapshot().await;
    if cfg.db_password.is_none() {
        cfg.db_password = secrets::load_db_password();
    }
    cfg
}

#[tauri::command]
pub async fn db_save_password(password: String) -> Cmd<()> {
    secrets::save_db_password(&password).map_err(err)
}

#[tauri::command]
pub async fn db_has_password() -> Cmd<bool> {
    Ok(secrets::load_db_password().is_some())
}

#[tauri::command]
pub async fn db_test(state: State<'_, AppState>) -> Cmd<Value> {
    require_level(&state, 60).await?;
    let cfg = db_config(&state).await;
    let version = dbadmin::test_connection(&cfg).await.map_err(err)?;
    Ok(json!({ "connected": true, "version": version }))
}

#[tauri::command]
pub async fn db_stats(state: State<'_, AppState>) -> Cmd<Value> {
    require_level(&state, 60).await?;
    let cfg = db_config(&state).await;
    dbadmin::database_stats(&cfg).await.map_err(err)
}

#[tauri::command]
pub async fn db_tables(state: State<'_, AppState>) -> Cmd<Vec<TableInfo>> {
    require_level(&state, 60).await?;
    let cfg = db_config(&state).await;
    dbadmin::list_tables(&cfg).await.map_err(err)
}

#[tauri::command]
pub async fn db_columns(table: String, state: State<'_, AppState>) -> Cmd<Value> {
    require_level(&state, 60).await?;
    let cfg = db_config(&state).await;
    let cols = dbadmin::table_columns(&cfg, &table).await.map_err(err)?;
    Ok(json!(cols))
}

#[tauri::command]
pub async fn db_preview(table: String, limit: Option<usize>, state: State<'_, AppState>) -> Cmd<QueryResult> {
    require_level(&state, 60).await?;
    let cfg = db_config(&state).await;
    dbadmin::preview_table(&cfg, &table, limit.unwrap_or(100))
        .await
        .map_err(err)
}

#[tauri::command]
pub async fn db_query(sql: String, limit: Option<usize>, state: State<'_, AppState>) -> Cmd<QueryResult> {
    require_level(&state, 60).await?;
    let cfg = db_config(&state).await;
    dbadmin::run_query(&cfg, &sql, limit.unwrap_or(200))
        .await
        .map_err(err)
}

/// Escritura en la base de datos: reservada a administradores.
#[tauri::command]
pub async fn db_execute(
    app: AppHandle,
    sql: String,
    confirmed: bool,
    state: State<'_, AppState>,
) -> Cmd<ExecResult> {
    let session = require_level(&state, 90).await?;
    let cfg = db_config(&state).await;

    let result = dbadmin::execute_statement(&cfg, &sql, confirmed)
        .await
        .map_err(err)?;

    // Registro local de la operación para trazabilidad.
    audit_log(&format!(
        "{} ({}) ejecutó: {} → {} fila(s)",
        session.full_name(),
        session.role,
        result.statement,
        result.rows_affected
    ));

    if cfg.notifications_enabled {
        notify::show(
            &app,
            "Sentencia ejecutada",
            &format!("{} fila(s) afectadas", result.rows_affected),
        );
    }
    Ok(result)
}

fn audit_log(line: &str) {
    let path = config::config_dir().join("auditoria-tecnica.log");
    if let Some(dir) = path.parent() {
        let _ = std::fs::create_dir_all(dir);
    }
    let stamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S");
    let entry = format!("[{stamp}] {line}\n");
    use std::io::Write;
    if let Ok(mut file) = std::fs::OpenOptions::new().create(true).append(true).open(path) {
        let _ = file.write_all(entry.as_bytes());
    }
}

#[tauri::command]
pub async fn read_audit_log() -> Cmd<String> {
    let path = config::config_dir().join("auditoria-tecnica.log");
    Ok(std::fs::read_to_string(path).unwrap_or_else(|_| "Sin operaciones registradas.".into()))
}

// ============================================================
// SISTEMA
// ============================================================

#[tauri::command]
pub async fn send_notification(app: AppHandle, title: String, body: String) -> Cmd<()> {
    notify::show(&app, &title, &body);
    Ok(())
}

#[tauri::command]
pub async fn publish_event(channel: String, event: String, data: Value, state: State<'_, AppState>) -> Cmd<()> {
    let api = state.api_client().await;
    realtime::publish(&api, &channel, &event, data).await.map_err(err)
}

#[tauri::command]
pub async fn app_version() -> Cmd<Value> {
    Ok(json!({
        "version": env!("CARGO_PKG_VERSION"),
        "os": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
    }))
}

#[tauri::command]
pub async fn check_updates(state: State<'_, AppState>) -> Cmd<Value> {
    let api = state.api_client().await;
    let remote = api.get("/api/desktop/version").await.map_err(err)?;
    let current = env!("CARGO_PKG_VERSION");
    let latest = remote
        .pointer("/data/version")
        .and_then(|v| v.as_str())
        .unwrap_or(current)
        .to_string();

    Ok(json!({
        "current": current,
        "latest": latest,
        "updateAvailable": latest != current,
        "details": remote.pointer("/data").cloned().unwrap_or(json!({})),
    }))
}

#[tauri::command]
pub async fn open_in_browser(app: AppHandle, path: String, state: State<'_, AppState>) -> Cmd<()> {
    use tauri_plugin_shell::ShellExt;
    let cfg = state.config_snapshot().await;
    let url = if path.starts_with("http") {
        path
    } else {
        cfg.endpoint(&path)
    };
    app.shell().open(url, None).map_err(err)
}

#[tauri::command]
pub async fn show_main_window(app: AppHandle) -> Cmd<()> {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
    Ok(())
}
