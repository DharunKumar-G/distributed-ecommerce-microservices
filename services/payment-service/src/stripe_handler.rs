use anyhow::{Context, Result};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;
use hmac::{Hmac, Mac};
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct PaymentRecord {
    pub id: Uuid,
    pub order_id: String,
    pub amount: f64,
    pub currency: String,
    pub stripe_session_id: Option<String>,
    pub stripe_payment_intent: Option<String>,
    pub status: String,
    pub created_at: chrono::DateTime<Utc>,
    pub updated_at: chrono::DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePaymentRequest {
    pub order_id: String,
    pub amount: f64,
    pub currency: String,
    pub success_url: String,
    pub cancel_url: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaymentResponse {
    pub payment_id: String,
    pub checkout_url: Option<String>,
    pub status: String,
}

#[derive(Debug, Deserialize)]
struct StripeCheckoutSession {
    id: String,
    url: Option<String>,
}

#[derive(Debug)]
pub struct StripeHandler {
    api_key: String,
    webhook_secret: String,
    pool: PgPool,
    client: reqwest::Client,
}

impl StripeHandler {
    pub fn new(api_key: String, webhook_secret: String, pool: PgPool) -> Self {
        Self {
            api_key,
            webhook_secret,
            pool,
            client: reqwest::Client::new(),
        }
    }

    pub async fn create_checkout_session(
        &self,
        req: CreatePaymentRequest,
    ) -> Result<PaymentResponse> {
        // Create payment record
        let payment_id = Uuid::new_v4();
        let now = Utc::now();

        sqlx::query(
            r#"
            INSERT INTO payments (id, order_id, amount, currency, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
        )
        .bind(&payment_id)
        .bind(&req.order_id)
        .bind(req.amount)
        .bind(&req.currency)
        .bind("pending")
        .bind(now)
        .bind(now)
        .execute(&self.pool)
        .await
        .context("Failed to insert payment record")?;

        // Convert amount to cents
        let amount_cents = (req.amount * 100.0) as i64;

        // Create Stripe checkout session via API
        let params = vec![
            ("mode", "payment".to_string()),
            ("success_url", req.success_url.clone()),
            ("cancel_url", req.cancel_url.clone()),
            ("client_reference_id", req.order_id.clone()),
            ("line_items[0][price_data][currency]", req.currency.clone()),
            ("line_items[0][price_data][product_data][name]", format!("Order {}", req.order_id)),
            ("line_items[0][price_data][unit_amount]", amount_cents.to_string()),
            ("line_items[0][quantity]", "1".to_string()),
        ];

        let response = self.client
            .post("https://api.stripe.com/v1/checkout/sessions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .form(&params)
            .send()
            .await
            .context("Failed to create Stripe checkout session")?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            tracing::error!("Stripe API error: {}", error_text);
            anyhow::bail!("Stripe API error: {}", error_text);
        }

        let session: StripeCheckoutSession = response.json().await
            .context("Failed to parse Stripe response")?;

        // Update payment with session ID
        sqlx::query(
            r#"
            UPDATE payments 
            SET stripe_session_id = $1, updated_at = $2
            WHERE id = $3
            "#,
        )
        .bind(&session.id)
        .bind(Utc::now())
        .bind(&payment_id)
        .execute(&self.pool)
        .await?;

        Ok(PaymentResponse {
            payment_id: payment_id.to_string(),
            checkout_url: session.url,
            status: "pending".to_string(),
        })
    }

    pub async fn handle_webhook(&self, payload: &str, signature: &str) -> Result<()> {
        // Verify webhook signature
        self.verify_signature(payload, signature)?;

        // Parse webhook event
        let event: serde_json::Value = serde_json::from_str(payload)?;
        
        let event_type = event["type"].as_str().unwrap_or("");
        tracing::info!("Received Stripe webhook: {}", event_type);

        match event_type {
            "checkout.session.completed" => {
                if let Some(session_id) = event["data"]["object"]["id"].as_str() {
                    self.handle_payment_success(session_id).await?;
                }
            }
            "checkout.session.expired" => {
                if let Some(session_id) = event["data"]["object"]["id"].as_str() {
                    self.handle_payment_expired(session_id).await?;
                }
            }
            _ => {
                tracing::info!("Unhandled event type: {}", event_type);
            }
        }

        Ok(())
    }

    fn verify_signature(&self, payload: &str, signature: &str) -> Result<()> {
        // Parse signature header
        let parts: Vec<&str> = signature.split(',').collect();
        let mut timestamp = "";
        let mut sig = "";

        for part in parts {
            let kv: Vec<&str> = part.split('=').collect();
            if kv.len() == 2 {
                match kv[0] {
                    "t" => timestamp = kv[1],
                    "v1" => sig = kv[1],
                    _ => {}
                }
            }
        }

        // Construct signed payload
        let signed_payload = format!("{}.{}", timestamp, payload);

        // Compute HMAC
        let mut mac = HmacSha256::new_from_slice(self.webhook_secret.as_bytes())
            .map_err(|e| anyhow::anyhow!("Invalid webhook secret: {}", e))?;
        mac.update(signed_payload.as_bytes());
        let result = mac.finalize();
        let computed_sig = hex::encode(result.into_bytes());

        if computed_sig != sig {
            anyhow::bail!("Invalid webhook signature");
        }

        Ok(())
    }

    async fn handle_payment_success(&self, session_id: &str) -> Result<()> {
        sqlx::query(
            r#"
            UPDATE payments 
            SET status = 'completed', updated_at = $1
            WHERE stripe_session_id = $2
            "#,
        )
        .bind(Utc::now())
        .bind(session_id)
        .execute(&self.pool)
        .await?;

        tracing::info!("Payment completed for session: {}", session_id);
        Ok(())
    }

    async fn handle_payment_expired(&self, session_id: &str) -> Result<()> {
        sqlx::query(
            r#"
            UPDATE payments 
            SET status = 'expired', updated_at = $1
            WHERE stripe_session_id = $2
            "#,
        )
        .bind(Utc::now())
        .bind(session_id)
        .execute(&self.pool)
        .await?;

        tracing::info!("Payment expired for session: {}", session_id);
        Ok(())
    }

    pub async fn get_payment(&self, payment_id: Uuid) -> Result<Option<PaymentRecord>> {
        let record = sqlx::query_as::<_, PaymentRecord>(
            r#"
            SELECT * FROM payments WHERE id = $1
            "#,
        )
        .bind(payment_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(record)
    }

    pub async fn get_payment_by_order(&self, order_id: &str) -> Result<Option<PaymentRecord>> {
        let record = sqlx::query_as::<_, PaymentRecord>(
            r#"
            SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1
            "#,
        )
        .bind(order_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(record)
    }
}

// Database initialization
pub async fn init_db(pool: &PgPool) -> Result<()> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS payments (
            id UUID PRIMARY KEY,
            order_id VARCHAR(255) NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            currency VARCHAR(3) NOT NULL,
            stripe_session_id VARCHAR(255),
            stripe_payment_intent VARCHAR(255),
            status VARCHAR(50) NOT NULL,
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL
        )
        "#,
    )
    .execute(pool)
    .await
    .context("Failed to create payments table")?;

    Ok(())
}
