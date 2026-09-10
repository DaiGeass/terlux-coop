//! ============================================================
//! TerLux Coop Desktop — Arranque de la aplicación
//!
//! Cliente de escritorio (Windows / macOS) de la suite empresarial.
//! Se conecta a la plataforma web a través de la VPN privada.
//! ============================================================

mod api;
mod commands;
mod config;
mod dbadmin;
mod models;
mod notify;
mod realtime;
mod secrets;
mod state;
mod uploader;
mod vpn;

use state::AppState;
use std::time::Duration;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager, WindowEvent,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // --- Configuración persistida y cliente HTTP ---
    let cfg = config::load();
    let client = api::ApiClient::new(&cfg).unwrap_or_else(|e| {
        eprintln!("[terlux] no se pudo crear el cliente HTTP: {e}");
        // Reintento con la configuración por defecto para no impedir el arranque.
        api::ApiClient::new(&config::AppConfig::default())
            .expect("cliente HTTP de reserva")
    });
    let app_state = AppState::new(cfg, client);

    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_os::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            // Configuración
            commands::get_config,
            commands::save_config,
            commands::reset_config,
            // Red / VPN
            commands::check_connection,
            commands::connection_status,
            commands::probe_host,
            commands::local_addresses,
            // Sesión
            commands::login,
            commands::restore_session,
            commands::current_session,
            commands::capabilities,
            commands::logout,
            // Puente con la API web
            commands::api_request,
            commands::api_health,
            // Inventario del equipo
            commands::device_info,
            commands::register_device,
            // Archivos
            commands::pick_files,
            commands::pick_folder,
            commands::upload_files,
            commands::sync_now,
            commands::preview_sync,
            commands::reset_sync_index,
            commands::download_file,
            commands::upload_mail_attachments,
            // Panel de técnicos
            commands::db_save_password,
            commands::db_has_password,
            commands::db_test,
            commands::db_stats,
            commands::db_tables,
            commands::db_columns,
            commands::db_preview,
            commands::db_query,
            commands::db_execute,
            commands::read_audit_log,
            // Sistema
            commands::send_notification,
            commands::publish_event,
            commands::app_version,
            commands::check_updates,
            commands::open_in_browser,
            commands::show_main_window,
        ])
        .setup(|app| {
            build_tray(app.handle())?;
            spawn_background_tasks(app.handle().clone());
            Ok(())
        })
        .on_window_event(|window, event| {
            // Al cerrar, la aplicación se esconde en la bandeja
            // para seguir recibiendo notificaciones.
            if let WindowEvent::CloseRequested { api, .. } = event {
                // Lectura no bloqueante: nunca se detiene el hilo de la interfaz.
                let should_hide = window
                    .app_handle()
                    .try_state::<AppState>()
                    .and_then(|state| state.config.try_read().ok().map(|c| c.close_to_tray))
                    .unwrap_or(true);

                if should_hide {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error al iniciar TerLux Coop Desktop");
}

// ------------------------------------------------------------
// Icono de bandeja
// ------------------------------------------------------------

fn build_tray(app: &tauri::AppHandle) -> tauri::Result<()> {
    let open_item = MenuItem::with_id(app, "open", "Abrir TerLux Coop", true, None::<&str>)?;
    let sync_item = MenuItem::with_id(app, "sync", "Sincronizar ahora", true, None::<&str>)?;
    let status_item = MenuItem::with_id(app, "status", "Comprobar conexión VPN", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItem::with_id(app, "quit", "Salir", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[&open_item, &sync_item, &status_item, &separator, &quit_item],
    )?;

    let mut builder = TrayIconBuilder::with_id("terlux-tray")
        .tooltip("TerLux Coop · Suite Empresarial")
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => show_window(app),
            "sync" => {
                let handle = app.clone();
                tauri::async_runtime::spawn(async move {
                    let _ = handle.emit("tray-sync-requested", ());
                });
            }
            "status" => {
                let handle = app.clone();
                tauri::async_runtime::spawn(async move {
                    if let Some(state) = handle.try_state::<AppState>() {
                        let cfg = state.config_snapshot().await;
                        let status = vpn::check(&cfg).await;
                        *state.status.write().await = status.clone();
                        let _ = handle.emit("connection-status", status.clone());
                        notify::show(&handle, "Estado de la conexión", &status.summary);
                    }
                });
            }
            "quit" => app.exit(0),
            _ => {}
        });

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    builder.build(app)?;
    Ok(())
}

fn show_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

// ------------------------------------------------------------
// Tareas en segundo plano
// ------------------------------------------------------------

fn spawn_background_tasks(app: tauri::AppHandle) {
    // 1) Vigilancia de la conexión y de la VPN
    {
        let handle = app.clone();
        tauri::async_runtime::spawn(async move {
            loop {
                if let Some(state) = handle.try_state::<AppState>() {
                    let cfg = state.config_snapshot().await;
                    let status = vpn::check(&cfg).await;
                    let previous = state.status.read().await.api_reachable;
                    *state.status.write().await = status.clone();
                    let _ = handle.emit("connection-status", status.clone());

                    // Aviso solo cuando cambia el estado, para no ser pesados.
                    if previous && !status.api_reachable && cfg.notifications_enabled {
                        notify::show(
                            &handle,
                            "Conexión perdida",
                            "Se ha perdido el enlace con el servidor de TerLux Coop",
                        );
                    } else if !previous && status.api_reachable && cfg.notifications_enabled {
                        notify::show(&handle, "Conexión restablecida", &status.summary);
                    }
                }
                tokio::time::sleep(Duration::from_secs(20)).await;
            }
        });
    }

    // 2) Latido para el inventario de dispositivos
    {
        let handle = app.clone();
        tauri::async_runtime::spawn(async move {
            loop {
                let mut wait = 30u64;
                if let Some(state) = handle.try_state::<AppState>() {
                    let cfg = state.config_snapshot().await;
                    wait = cfg.heartbeat_seconds.max(15);

                    if state.session.read().await.is_some() {
                        let api = state.api_client().await;
                        let client_id = vpn::stable_client_id();
                        let _ = api.heartbeat(&client_id).await;
                    }
                }
                tokio::time::sleep(Duration::from_secs(wait)).await;
            }
        });
    }

    // 3) Sincronización automática de la carpeta vigilada
    {
        let handle = app.clone();
        tauri::async_runtime::spawn(async move {
            // Espera inicial para no competir con el arranque.
            tokio::time::sleep(Duration::from_secs(45)).await;
            loop {
                if let Some(state) = handle.try_state::<AppState>() {
                    let cfg = state.config_snapshot().await;
                    let logged_in = state.session.read().await.is_some();

                    if cfg.auto_sync && logged_in {
                        if let Some(folder) = cfg.sync_folder.clone() {
                            let api = state.api_client().await;
                            let _ = uploader::sync_folder(
                                handle.clone(),
                                api,
                                folder,
                                Some("general".into()),
                            )
                            .await;
                        }
                    }
                }
                tokio::time::sleep(Duration::from_secs(300)).await;
            }
        });
    }
}
