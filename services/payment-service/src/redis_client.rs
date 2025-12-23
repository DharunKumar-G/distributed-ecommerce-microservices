use redis::aio::ConnectionManager;
use redis::{AsyncCommands, RedisError};
use std::time::Duration;

#[derive(Clone)]
pub struct RedisClient {
    conn: ConnectionManager,
}

impl std::fmt::Debug for RedisClient {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("RedisClient").finish()
    }
}

impl RedisClient {
    pub async fn new(host: &str) -> Result<Self, RedisError> {
        let client = redis::Client::open(format!("redis://{}", host))?;
        let conn = ConnectionManager::new(client).await?;
        Ok(Self { conn })
    }

    pub async fn set(&mut self, key: &str, value: &str, ttl: Duration) -> Result<(), RedisError> {
        self.conn
            .set_ex(key, value, ttl.as_secs())
            .await
    }

    pub async fn get(&mut self, key: &str) -> Result<Option<String>, RedisError> {
        self.conn.get(key).await
    }

    pub async fn del(&mut self, key: &str) -> Result<(), RedisError> {
        self.conn.del(key).await
    }

    pub async fn exists(&mut self, key: &str) -> Result<bool, RedisError> {
        self.conn.exists(key).await
    }
}
