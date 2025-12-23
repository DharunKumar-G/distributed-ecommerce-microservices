use anyhow::{Context, Result};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;
use base64::{Engine as _, engine::general_purpose};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct PaymentRecord {
    pub id: Uuid,
    pub order_id: String,
    pub amount: f64,
    pub currency: String,
    pub paypal_order_id: Option<String>,
    pub paypal_capture_id: Option<String>,
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
    pub approval_url: Option<String>,
    pub status: String,
}

#[derive(Debug, Deserialize)]
struct PayPalOrderResponse {
    id: String,
    status: String,
    links: Vec<PayPalLink>,
}

#[derive(Debug, Deserialize)]
struct PayPalLink {
    rel: String,
    href: String,
}

#[derive(Debug, Deserialize)]
struct PayPalAccessToken {
    access_token: String,
}

#[derive(Debug)]
pub struct PayPalHandler {
    client_id: String,
    client_secret: String,
    api_base: String,
    pool: PgPool,
    client: reqwest::Client,
}

impl PayPalHandler {
    pub fn new(client_id: String, client_secret: String, sandbox: bool, pool: PgPool) -> Self {
        let api_base = if sandbox {
            "https://api-m.sandbox.paypal.com".to_string()
        } else {
            "https://api-m.paypal.com".to_string()
        };

        Self {
            client_id,
            client_secret,
            api_base,
            pool,
            client: reqwest::Client::new(),
        }
    }

    async fn get_access_token(&self) -> Result<String> {
        let auth = format!("{}:{}", self.client_id, self.client_secret);
        let encoded = general_purpose::STANDARD.encode(auth.as_bytes());

        let response = self.client
            .post(format!("{}/v1/oauth2/token", self.api_base))
            .header("Authorization", format!("Basic {}", encoded))
            .header("Content-Type", "application/x-www-form-urlencoded")
            .body("grant_type=client_credentials")
            .send()
            .await
            .context("Failed to get PayPal access token")?;

        if !response.status().is_success() {
            let error = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            anyhow::bail!("PayPal auth error: {}", error);
        }

        let token: PayPalAccessToken = response.json().await?;
        Ok(token.access_token)
    }

    pub async fn create_order(
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

        // Get access token
        let access_token = self.get_access_token().await?;

        // Create PayPal order
        let order_body = serde_json::json!({
            "intent": "CAPTURE",
            "purchase_units": [{
                "reference_id": req.order_id,
                "amount": {
                    "currency_code": req.currency.to_uppercase(),
                    "value": format!("{:.2}", req.amount)
                }
            }],
            "application_context": {
                "return_url": req.success_url,
                "cancel_url": req.cancel_url
            }
        });

        let response = self.client
            .post(format!("{}/v2/checkout/orders", self.api_base))
            .header("Authorization", format!("Bearer {}", access_token))
            .header("Content-Type", "application/json")
            .json(&order_body)
            .send()
            .await
            .context("Failed to create PayPal order")?;

        if !response.status().is_success() {
            let error = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            tracing::error!("PayPal API error: {}", error);
            anyhow::bail!("PayPal API error: {}", error);
        }

        let paypal_order: PayPalOrderResponse = response.json().await
            .context("Failed to parse PayPal response")?;

        // Find approval URL
        let approval_url = paypal_order.links.iter()
            .find(|link| link.rel == "approve")
            .map(|link| link.href.clone());

        // Update payment with PayPal order ID
        sqlx::query(
            r#"
            UPDATE payments 
            SET paypal_order_id = $1, updated_at = $2
            WHERE id = $3
            "#,
        )
        .bind(&paypal_order.id)
        .bind(Utc::now())
        .bind(&payment_id)
        .execute(&self.pool)
        .await?;

        Ok(PaymentResponse {
            payment_id: payment_id.to_string(),
            approval_url,
            status: paypal_order.status.to_lowercase(),
        })
    }

    pub async fn capture_order(&self, paypal_order_id: &str) -> Result<()> {
        let access_token = self.get_access_token().await?;

        let response = self.client
            .post(format!("{}/v2/checkout/orders/{}/capture", self.api_base, paypal_order_id))
            .header("Authorization", format!("Bearer {}", access_token))
            .header("Content-Type", "application/json")
            .send()
            .await
            .context("Failed to capture PayPal order")?;

        if !response.status().is_success() {
            let error = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            anyhow::bail!("PayPal capture error: {}", error);
        }

        // Update payment status
        sqlx::query(
            r#"
            UPDATE payments 
            SET status = 'completed', updated_at = $1
            WHERE paypal_order_id = $2
            "#,
        )
        .bind(Utc::now())
        .bind(paypal_order_id)
        .execute(&self.pool)
        .await?;

        tracing::info!("Payment captured for PayPal order: {}", paypal_order_id);
        Ok(())
    }

    pub async fn handle_webhook(&self, payload: &str) -> Result<()> {
        // Parse webhook event
        let event: serde_json::Value = serde_json::from_str(payload)?;
        
        let event_type = event["event_type"].as_str().unwrap_or("");
        tracing::info!("Received PayPal webhook: {}", event_type);

        match event_type {
            "CHECKOUT.ORDER.APPROVED" => {
                if let Some(order_id) = event["resource"]["id"].as_str() {
                    // Capture the order when approved
                    self.capture_order(order_id).await?;
                }
            }
            "PAYMENT.CAPTURE.COMPLETED" => {
                if let Some(order_id) = event["resource"]["supplementary_data"]["related_ids"]["order_id"].as_str() {
                    self.handle_payment_completed(order_id).await?;
                }
            }
            "PAYMENT.CAPTURE.DENIED" | "CHECKOUT.ORDER.VOIDED" => {
                if let Some(order_id) = event["resource"]["id"].as_str() {
                    self.handle_payment_failed(order_id).await?;
                }
            }
            _ => {
                tracing::info!("Unhandled event type: {}", event_type);
            }
        }

        Ok(())
    }

    async fn handle_payment_completed(&self, paypal_order_id: &str) -> Result<()> {
        sqlx::query(
            r#"
            UPDATE payments 
            SET status = 'completed', updated_at = $1
            WHERE paypal_order_id = $2
            "#,
        )
        .bind(Utc::now())
        .bind(paypal_order_id)
        .execute(&self.pool)
        .await?;

        tracing::info!("Payment completed for PayPal order: {}", paypal_order_id);
        Ok(())
    }

    async fn handle_payment_failed(&self, paypal_order_id: &str) -> Result<()> {
        sqlx::query(
            r#"
            UPDATE payments 
            SET status = 'failed', updated_at = $1
            WHERE paypal_order_id = $2
            "#,
        )
        .bind(Utc::now())
        .bind(paypal_order_id)
        .execute(&self.pool)
        .await?;

        tracing::info!("Payment failed for PayPal order: {}", paypal_order_id);
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
            paypal_order_id VARCHAR(255),
            paypal_capture_id VARCHAR(255),
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
