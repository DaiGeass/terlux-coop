//! ============================================================
//! TerLux Coop Desktop — Panel de técnicos (PostgreSQL directo)
//!
//! Permite al personal técnico inspeccionar y modificar la base
//! de datos corporativa conectándose por la VPN al host
//! configurado (por defecto 100.106.108.98:5432), sin pasar por la
//! API web. Incluye salvaguardas contra sentencias destructivas.
//! ============================================================

use crate::config::AppConfig;
use crate::models::{ColumnInfo, ExecResult, QueryResult, TableInfo};
use anyhow::{anyhow, Result};
use std::time::Instant;
use tokio_postgres::{Client, NoTls};

/// Número máximo de filas devueltas a la interfaz.
const MAX_ROWS: usize = 500;

/// Abre una conexión nueva. La conexión se cierra al soltar el cliente.
async fn connect(cfg: &AppConfig) -> Result<Client> {
    let conn_str = cfg.pg_connection_string();
    let (client, connection) = tokio_postgres::connect(&conn_str, NoTls)
        .await
        .map_err(|e| anyhow!("No se pudo conectar a PostgreSQL en {}:{} — {e}", cfg.db_host, cfg.db_port))?;

    // La tarea de E/S debe ejecutarse en segundo plano.
    tauri::async_runtime::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("[postgres] conexión finalizada: {e}");
        }
    });

    Ok(client)
}

/// Verifica credenciales y devuelve la versión del servidor.
pub async fn test_connection(cfg: &AppConfig) -> Result<String> {
    let client = connect(cfg).await?;
    let row = client.query_one("SELECT version()", &[]).await?;
    let version: String = row.get(0);
    Ok(version)
}

/// Lista las tablas del esquema público con su tamaño estimado.
pub async fn list_tables(cfg: &AppConfig) -> Result<Vec<TableInfo>> {
    let client = connect(cfg).await?;
    let sql = r#"
        SELECT
            c.relname                                   AS name,
            n.nspname                                   AS schema,
            GREATEST(c.reltuples, 0)::bigint            AS estimated_rows,
            pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r'
          AND n.nspname NOT IN ('pg_catalog', 'information_schema')
        ORDER BY c.relname
    "#;

    let rows = client.query(sql, &[]).await?;
    Ok(rows
        .iter()
        .map(|r| TableInfo {
            name: r.get("name"),
            schema: r.get("schema"),
            estimated_rows: r.get("estimated_rows"),
            total_size: r.get("total_size"),
        })
        .collect())
}

/// Describe las columnas de una tabla.
pub async fn table_columns(cfg: &AppConfig, table: &str) -> Result<Vec<ColumnInfo>> {
    validate_identifier(table)?;
    let client = connect(cfg).await?;
    let sql = r#"
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
    "#;
    let rows = client.query(sql, &[&table]).await?;
    Ok(rows
        .iter()
        .map(|r| ColumnInfo {
            name: r.get("column_name"),
            data_type: r.get("data_type"),
            nullable: r.get::<_, String>("is_nullable") == "YES",
            default_value: r.get("column_default"),
        })
        .collect())
}

/// Ejecuta una consulta de solo lectura y devuelve filas como texto.
///
/// Se envuelve la consulta del usuario en `to_jsonb(...)` para poder
/// convertir cualquier tipo de PostgreSQL (uuid, numeric, jsonb,
/// timestamptz, arrays…) sin necesidad de mapearlos uno a uno.
pub async fn run_query(cfg: &AppConfig, sql: &str, limit: usize) -> Result<QueryResult> {
    let trimmed = sql.trim().trim_end_matches(';').trim();
    if trimmed.is_empty() {
        return Err(anyhow!("La consulta está vacía"));
    }
    if !is_read_only(trimmed) {
        return Err(anyhow!(
            "Esta pestaña solo admite consultas de lectura (SELECT / WITH / SHOW / EXPLAIN). Usa «Ejecutar sentencia» para modificar datos."
        ));
    }

    let client = connect(cfg).await?;
    let capped = limit.clamp(1, MAX_ROWS);
    let started = Instant::now();

    // 1) Nombres de columna en su orden original.
    let probe = format!("SELECT * FROM ({trimmed}) AS _terlux_q LIMIT 0");
    let stmt = client
        .prepare(&probe)
        .await
        .map_err(|e| anyhow!("Consulta no válida: {e}"))?;
    let columns: Vec<String> = stmt
        .columns()
        .iter()
        .map(|c| c.name().to_string())
        .collect();

    // 2) Filas serializadas a JSON por el propio motor.
    let wrapped = format!(
        "SELECT to_jsonb(_terlux_q.*) AS row FROM ({trimmed}) AS _terlux_q LIMIT {}",
        capped + 1
    );
    let raw_rows = client
        .query(&wrapped, &[])
        .await
        .map_err(|e| anyhow!("Error ejecutando la consulta: {e}"))?;

    let truncated = raw_rows.len() > capped;
    let mut rows: Vec<Vec<Option<String>>> = Vec::with_capacity(raw_rows.len().min(capped));

    for raw in raw_rows.iter().take(capped) {
        let value: serde_json::Value = raw.try_get("row").unwrap_or(serde_json::Value::Null);
        let mut record = Vec::with_capacity(columns.len());
        for col in &columns {
            record.push(json_to_cell(value.get(col)));
        }
        rows.push(record);
    }

    Ok(QueryResult {
        row_count: rows.len(),
        columns,
        rows,
        elapsed_ms: started.elapsed().as_millis() as u64,
        truncated,
    })
}

/// Ejecuta una sentencia de escritura (INSERT / UPDATE / DELETE / DDL).
///
/// `confirmed` debe ser `true` cuando la sentencia se considera
/// peligrosa; la interfaz pide confirmación explícita al técnico.
pub async fn execute_statement(cfg: &AppConfig, sql: &str, confirmed: bool) -> Result<ExecResult> {
    let trimmed = sql.trim().trim_end_matches(';').trim();
    if trimmed.is_empty() {
        return Err(anyhow!("La sentencia está vacía"));
    }

    if let Some(reason) = dangerous_reason(trimmed) {
        if !confirmed {
            return Err(anyhow!("CONFIRMACION_REQUERIDA: {reason}"));
        }
    }

    let client = connect(cfg).await?;
    let started = Instant::now();
    let affected = client
        .execute(trimmed, &[])
        .await
        .map_err(|e| anyhow!("Error ejecutando la sentencia: {e}"))?;

    Ok(ExecResult {
        rows_affected: affected,
        elapsed_ms: started.elapsed().as_millis() as u64,
        statement: trimmed.chars().take(200).collect(),
    })
}

/// Devuelve las primeras filas de una tabla (atajo del explorador).
pub async fn preview_table(cfg: &AppConfig, table: &str, limit: usize) -> Result<QueryResult> {
    validate_identifier(table)?;
    run_query(cfg, &format!("SELECT * FROM \"{table}\""), limit).await
}

/// Estadísticas rápidas de la base de datos para el panel técnico.
pub async fn database_stats(cfg: &AppConfig) -> Result<serde_json::Value> {
    let client = connect(cfg).await?;

    let size_row = client
        .query_one(
            "SELECT pg_size_pretty(pg_database_size(current_database())) AS size, current_database() AS name",
            &[],
        )
        .await?;
    let conn_row = client
        .query_one(
            "SELECT count(*)::bigint AS total FROM pg_stat_activity WHERE datname = current_database()",
            &[],
        )
        .await?;
    let table_row = client
        .query_one(
            "SELECT count(*)::bigint AS total FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname='public'",
            &[],
        )
        .await?;
    let uptime_row = client
        .query_one(
            "SELECT date_trunc('second', now() - pg_postmaster_start_time())::text AS uptime",
            &[],
        )
        .await?;

    Ok(serde_json::json!({
        "database": size_row.get::<_, String>("name"),
        "size": size_row.get::<_, String>("size"),
        "connections": conn_row.get::<_, i64>("total"),
        "tables": table_row.get::<_, i64>("total"),
        "uptime": uptime_row.get::<_, String>("uptime"),
    }))
}

// ------------------------------------------------------------
// Utilidades internas
// ------------------------------------------------------------

fn json_to_cell(value: Option<&serde_json::Value>) -> Option<String> {
    match value {
        None | Some(serde_json::Value::Null) => None,
        Some(serde_json::Value::String(s)) => Some(s.clone()),
        Some(other) => Some(other.to_string()),
    }
}

fn first_keyword(sql: &str) -> String {
    sql.split_whitespace()
        .next()
        .unwrap_or("")
        .to_ascii_uppercase()
}

fn is_read_only(sql: &str) -> bool {
    matches!(
        first_keyword(sql).as_str(),
        "SELECT" | "WITH" | "SHOW" | "EXPLAIN" | "TABLE" | "VALUES"
    )
}

/// Devuelve el motivo si la sentencia se considera destructiva.
fn dangerous_reason(sql: &str) -> Option<String> {
    let upper = sql.to_ascii_uppercase();
    let keyword = first_keyword(sql);

    match keyword.as_str() {
        "DROP" => Some("la sentencia elimina objetos de la base de datos (DROP)".into()),
        "TRUNCATE" => Some("la sentencia vacía tablas por completo (TRUNCATE)".into()),
        "ALTER" => Some("la sentencia modifica la estructura de la base de datos (ALTER)".into()),
        "DELETE" if !upper.contains(" WHERE ") => {
            Some("un DELETE sin cláusula WHERE borra todas las filas".into())
        }
        "UPDATE" if !upper.contains(" WHERE ") => {
            Some("un UPDATE sin cláusula WHERE modifica todas las filas".into())
        }
        "GRANT" | "REVOKE" => Some("la sentencia cambia permisos del servidor".into()),
        _ => None,
    }
}

/// Evita inyección al interpolar nombres de tabla.
fn validate_identifier(name: &str) -> Result<()> {
    let ok = !name.is_empty()
        && name.len() <= 63
        && name
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '$');
    if ok {
        Ok(())
    } else {
        Err(anyhow!("Nombre de tabla no válido: {name}"))
    }
}
