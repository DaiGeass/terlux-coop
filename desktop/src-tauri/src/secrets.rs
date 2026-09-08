//! ============================================================
//! TerLux Coop Desktop — Almacén seguro de credenciales
//!
//! Windows -> Credential Manager   (keyring / windows-native)
//! macOS   -> Llavero de iCloud    (keyring / apple-native)
//! Otros   -> archivo local con permisos restringidos (respaldo)
//! ============================================================

const SERVICE: &str = "com.terluxcoop.desktop";

// ------------------------------------------------------------
// Implementación nativa (Windows / macOS)
// ------------------------------------------------------------
#[cfg(any(target_os = "windows", target_os = "macos"))]
mod backend {
    use super::SERVICE;

    pub fn set(key: &str, value: &str) -> anyhow::Result<()> {
        let entry = keyring::Entry::new(SERVICE, key)?;
        entry.set_password(value)?;
        Ok(())
    }

    pub fn get(key: &str) -> Option<String> {
        let entry = keyring::Entry::new(SERVICE, key).ok()?;
        entry.get_password().ok()
    }

    pub fn delete(key: &str) -> anyhow::Result<()> {
        if let Ok(entry) = keyring::Entry::new(SERVICE, key) {
            // Si no existía, no es un error para el usuario.
            let _ = entry.delete_credential();
        }
        Ok(())
    }
}

// ------------------------------------------------------------
// Respaldo en disco (Linux u otros sistemas de desarrollo)
// ------------------------------------------------------------
#[cfg(not(any(target_os = "windows", target_os = "macos")))]
mod backend {
    use std::path::PathBuf;

    fn path(key: &str) -> PathBuf {
        crate::config::config_dir()
            .join("secrets")
            .join(format!("{key}.key"))
    }

    pub fn set(key: &str, value: &str) -> anyhow::Result<()> {
        let p = path(key);
        if let Some(dir) = p.parent() {
            std::fs::create_dir_all(dir)?;
        }
        std::fs::write(&p, value)?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let _ = std::fs::set_permissions(&p, std::fs::Permissions::from_mode(0o600));
        }
        Ok(())
    }

    pub fn get(key: &str) -> Option<String> {
        std::fs::read_to_string(path(key)).ok()
    }

    pub fn delete(key: &str) -> anyhow::Result<()> {
        let _ = std::fs::remove_file(path(key));
        Ok(())
    }
}

// ------------------------------------------------------------
// API pública del módulo
// ------------------------------------------------------------

/// Cookie de sesión JWT emitida por la suite web.
pub fn save_session_token(token: &str) -> anyhow::Result<()> {
    backend::set("session_token", token)
}

pub fn load_session_token() -> Option<String> {
    backend::get("session_token")
}

pub fn clear_session_token() -> anyhow::Result<()> {
    backend::delete("session_token")
}

/// Contraseña de PostgreSQL usada por el panel de técnicos.
pub fn save_db_password(password: &str) -> anyhow::Result<()> {
    backend::set("db_password", password)
}

pub fn load_db_password() -> Option<String> {
    backend::get("db_password")
}

pub fn clear_db_password() -> anyhow::Result<()> {
    backend::delete("db_password")
}
