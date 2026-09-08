//! ============================================================
//! TerLux Coop Desktop — Diagnóstico de VPN y red
//!
//! Comprueba que el equipo está dentro del túnel privado
//! (por defecto 10.8.0.0/24) y que los servicios internos
//! responden: API web, PostgreSQL y almacenamiento.
//! ============================================================

use crate::config::AppConfig;
use crate::models::ConnectionStatus;
use std::net::ToSocketAddrs;
use std::time::{Duration, Instant};
use tokio::net::TcpStream;

/// Sonda TCP con tiempo límite. Devuelve la latencia en milisegundos.
pub async fn tcp_probe(host: &str, port: u16, timeout_ms: u64) -> Option<u64> {
    let addr = format!("{host}:{port}");
    let started = Instant::now();

    // La resolución DNS puede bloquear: se hace en un hilo aparte.
    let resolved = tokio::task::spawn_blocking(move || {
        addr.to_socket_addrs()
            .ok()
            .and_then(|mut it| it.next())
    })
    .await
    .ok()??;

    match tokio::time::timeout(Duration::from_millis(timeout_ms), TcpStream::connect(resolved)).await {
        Ok(Ok(_stream)) => Some(started.elapsed().as_millis() as u64),
        _ => None,
    }
}

/// Devuelve todas las direcciones IPv4 locales del equipo.
pub fn local_ipv4_addresses() -> Vec<String> {
    let mut out = Vec::new();
    if let Ok(list) = local_ip_address::list_afinet_netifas() {
        for (_name, ip) in list {
            if ip.is_ipv4() && !ip.is_loopback() {
                out.push(ip.to_string());
            }
        }
    }
    out
}

/// Busca una IP local que pertenezca al rango de la VPN configurada.
pub fn detect_vpn_ip(cfg: &AppConfig) -> Option<String> {
    let prefix = cfg.vpn_prefix();
    local_ipv4_addresses()
        .into_iter()
        .find(|ip| ip.starts_with(&prefix))
}

/// Comprobación completa del estado de conexión.
pub async fn check(cfg: &AppConfig) -> ConnectionStatus {
    let vpn_ip = detect_vpn_ip(cfg);
    let vpn_interface = vpn_ip.is_some();

    let gateway = tcp_probe(&cfg.vpn_gateway, cfg.port, 2500).await;
    let api = tcp_probe(&cfg.host, cfg.port, 2500).await;
    let database = tcp_probe(&cfg.db_host, cfg.db_port, 2000).await;
    let storage = tcp_probe(&cfg.storage_host, cfg.storage_port, 2000).await;

    let api_reachable = api.is_some();
    let summary = if !vpn_interface && !api_reachable {
        "Sin conexión: la VPN no está activa y el servidor no responde".to_string()
    } else if !vpn_interface && api_reachable {
        "Conectado al servidor fuera del túnel VPN".to_string()
    } else if vpn_interface && !api_reachable {
        "VPN activa pero el servidor no responde".to_string()
    } else {
        format!(
            "Conectado por VPN ({}) · {} ms",
            vpn_ip.clone().unwrap_or_default(),
            api.unwrap_or(0)
        )
    };

    ConnectionStatus {
        vpn_interface,
        vpn_ip,
        gateway_reachable: gateway.is_some(),
        api_reachable,
        latency_ms: api,
        database_reachable: database.is_some(),
        storage_reachable: storage.is_some(),
        checked_at: chrono::Local::now().to_rfc3339(),
        summary,
    }
}

/// Identificador estable del equipo, derivado del nombre de host.
/// Se mantiene entre reinicios para no duplicar entradas en el
/// inventario de dispositivos del panel de administración.
pub fn stable_client_id() -> String {
    use sha2::{Digest, Sha256};

    let host = hostname_string();
    let user = std::env::var("USERNAME")
        .or_else(|_| std::env::var("USER"))
        .unwrap_or_else(|_| "desconocido".into());

    let mut hasher = Sha256::new();
    hasher.update(format!("{host}|{user}|terlux"));
    hex::encode(hasher.finalize())[..32].to_string()
}

pub fn hostname_string() -> String {
    // sysinfo expone el nombre del equipo de forma portable.
    sysinfo::System::host_name().unwrap_or_else(|| "equipo-terlux".into())
}

/// Recolecta la ficha técnica del equipo para el módulo MDM.
pub fn device_info(cfg: &AppConfig) -> crate::models::DeviceInfo {
    use sysinfo::System;

    let mut sys = System::new();
    sys.refresh_memory();
    sys.refresh_cpu_all();

    let cpu = sys
        .cpus()
        .first()
        .map(|c| c.brand().trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "CPU desconocida".into());

    let platform = match std::env::consts::OS {
        "windows" => "windows",
        "macos" => "macos",
        "linux" => "linux",
        other => other,
    }
    .to_string();

    crate::models::DeviceInfo {
        client_id: stable_client_id(),
        device_name: hostname_string(),
        platform,
        os_version: System::long_os_version().unwrap_or_else(|| "desconocida".into()),
        arch: std::env::consts::ARCH.to_string(),
        cpu,
        cpu_cores: sys.cpus().len(),
        total_memory_mb: sys.total_memory() / 1024 / 1024,
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        vpn_ip: detect_vpn_ip(cfg),
    }
}
