use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentRequest {
    pub user_id: String,
    pub total_amount: f64,
    pub payment_method: String,
    pub order_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentResponse {
    pub payment_id: String,
    pub status: String,
    pub transaction_id: Option<String>,
    pub message: String,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentStatus {
    pub payment_id: String,
    pub status: String,
    pub amount: f64,
    pub transaction_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SagaEvent {
    pub saga_id: String,
    pub order_id: String,
    pub step: String,
    pub success: bool,
    pub message: String,
    pub data: serde_json::Value,
    pub timestamp: DateTime<Utc>,
}

impl PaymentStatus {
    pub fn new(payment_id: String, amount: f64) -> Self {
        let now = Utc::now();
        Self {
            payment_id,
            status: "PENDING".to_string(),
            amount,
            transaction_id: None,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn complete(&mut self, transaction_id: String) {
        self.status = "COMPLETED".to_string();
        self.transaction_id = Some(transaction_id);
        self.updated_at = Utc::now();
    }

    pub fn fail(&mut self, reason: &str) {
        self.status = format!("FAILED: {}", reason);
        self.updated_at = Utc::now();
    }
}
