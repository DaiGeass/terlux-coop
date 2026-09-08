//! ============================================================
//! TerLux Coop Desktop — Estado compartido de la aplicación
//! ============================================================

use crate::api::ApiClient;
use crate::config::AppConfig;
use crate::models::{ConnectionStatus, Session};
use crate::realtime::RealtimeHandle;
use tokio::sync::RwLock;

pub struct AppState {
    pub config: RwLock<AppConfig>,
    pub api: RwLock<ApiClient>,
    pub session: RwLock<Option<Session>>,
    pub status: RwLock<ConnectionStatus>,
    pub realtime: RealtimeHandle,
}

impl AppState {
    pub fn new(config: AppConfig, api: ApiClient) -> Self {
        Self {
            config: RwLock::new(config),
            api: RwLock::new(api),
            session: RwLock::new(None),
            status: RwLock::new(ConnectionStatus::default()),
            realtime: RealtimeHandle::new(),
        }
    }

    pub async fn config_snapshot(&self) -> AppConfig {
        self.config.read().await.clone()
    }

    pub async fn api_client(&self) -> ApiClient {
        self.api.read().await.clone()
    }

    pub async fn session_snapshot(&self) -> Option<Session> {
        self.session.read().await.clone()
    }

    /// Reconstruye el cliente HTTP cuando cambian host/puerto/TLS.
    pub async fn rebuild_api(&self, cfg: &AppConfig) -> anyhow::Result<()> {
        let previous_token = self.api.read().await.token().await;
        let client = ApiClient::new(cfg)?;
        client.set_token(previous_token).await;
        *self.api.write().await = client;
        Ok(())
    }
}
