use crate::circuit_breaker::{CircuitBreaker, CircuitBreakerError};
use crate::kafka::KafkaProducer;
use crate::metrics::PAYMENT_METRICS;
use crate::models::{PaymentRequest, PaymentResponse, PaymentStatus, SagaEvent};
use crate::redis_client::RedisClient;
use chrono::Utc;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;
use tracing::info;
use uuid::Uuid;

#[derive(Clone, Debug)]
pub struct PaymentService {
    redis_client: Arc<Mutex<RedisClient>>,
    kafka_producer: Arc<KafkaProducer>,
    circuit_breaker: Arc<CircuitBreaker>,
}

impl PaymentService {
    pub fn new(redis_client: RedisClient, kafka_producer: KafkaProducer) -> Self {
        Self {
            redis_client: Arc::new(Mutex::new(redis_client)),
            kafka_producer: Arc::new(kafka_producer),
            // Circuit breaker: 5 failures within 30 seconds opens circuit for 60 seconds
            circuit_breaker: Arc::new(CircuitBreaker::new(5, Duration::from_secs(60))),
        }
    }

    pub async fn process_payment(
        &self,
        request: PaymentRequest,
    ) -> Result<PaymentResponse, anyhow::Error> {
        let payment_id = Uuid::new_v4().to_string();

        info!(
            "Processing payment {} for user {} amount {}",
            payment_id, request.user_id, request.total_amount
        );

        // Create payment status
        let mut status = PaymentStatus::new(payment_id.clone(), request.total_amount);

        // Use circuit breaker for external payment gateway call
        match self
            .circuit_breaker
            .call(self.call_payment_gateway(&request))
            .await
        {
            Ok(transaction_id) => {
                status.complete(transaction_id.clone());
                
                // Store in Redis
                self.store_payment_status(&status).await?;

                PAYMENT_METRICS.payments_processed.inc();
                PAYMENT_METRICS
                    .payment_amounts
                    .observe(request.total_amount);

                Ok(PaymentResponse {
                    payment_id,
                    status: "COMPLETED".to_string(),
                    transaction_id: Some(transaction_id),
                    message: "Payment processed successfully".to_string(),
                    timestamp: Utc::now(),
                })
            }
            Err(e) => {
                let error_msg = match &e {
                    CircuitBreakerError::CircuitOpen => {
                        status.fail("Payment service temporarily unavailable");
                        "Circuit breaker open".to_string()
                    }
                    CircuitBreakerError::ExecutionFailed(ref msg) => {
                        status.fail(msg);
                        msg.clone()
                    }
                };

                self.store_payment_status(&status).await?;

                PAYMENT_METRICS.payments_failed.inc();

                Err(anyhow::anyhow!("Payment failed: {}", error_msg))
            }
        }
    }

    pub async fn process_saga_payment(
        &self,
        event: SagaEvent,
    ) -> Result<(), anyhow::Error> {
        info!("Processing saga payment for order: {}", event.order_id);

        // Extract payment details from event data
        let user_id = event.data["user_id"].as_str().unwrap_or("unknown");
        let total_amount = event.data["total_amount"].as_f64().unwrap_or(0.0);

        let request = PaymentRequest {
            user_id: user_id.to_string(),
            total_amount,
            payment_method: "credit_card".to_string(),
            order_id: Some(event.order_id.clone()),
        };

        let result = self.process_payment(request).await;

        // Send saga response
        let response_event = match result {
            Ok(payment_response) => SagaEvent {
                saga_id: event.saga_id.clone(),
                order_id: event.order_id.clone(),
                step: "PAYMENT_PROCESSED".to_string(),
                success: true,
                message: "Payment processed successfully".to_string(),
                data: serde_json::json!({
                    "payment_id": payment_response.payment_id,
                    "transaction_id": payment_response.transaction_id
                }),
                timestamp: Utc::now(),
            },
            Err(e) => SagaEvent {
                saga_id: event.saga_id.clone(),
                order_id: event.order_id.clone(),
                step: "PAYMENT_PROCESSED".to_string(),
                success: false,
                message: format!("Payment failed: {}", e),
                data: serde_json::json!({}),
                timestamp: Utc::now(),
            },
        };

        let payload = serde_json::to_string(&response_event)?;
        self.kafka_producer
            .send_message("saga-response", &event.saga_id, &payload)
            .await?;

        Ok(())
    }

    async fn call_payment_gateway(
        &self,
        _request: &PaymentRequest,
    ) -> Result<String, anyhow::Error> {
        // Simulate external payment gateway call
        // In production, this would call a real payment processor
        
        tokio::time::sleep(Duration::from_millis(100)).await;

        // Always succeed in this simulation
        // In production, add proper error handling
        let transaction_id = format!("TXN-{}", Uuid::new_v4());
        info!("Payment gateway returned transaction: {}", transaction_id);

        Ok(transaction_id)
    }

    async fn store_payment_status(
        &self,
        status: &PaymentStatus,
    ) -> Result<(), anyhow::Error> {
        let key = format!("payment:{}", status.payment_id);
        let value = serde_json::to_string(status)?;

        self.redis_client
            .lock()
            .await
            .set(&key, &value, Duration::from_secs(3600))
            .await?;

        Ok(())
    }

    pub async fn get_payment_status(
        &self,
        payment_id: &str,
    ) -> Result<Option<PaymentStatus>, anyhow::Error> {
        let key = format!("payment:{}", payment_id);

        match self.redis_client.lock().await.get(&key).await? {
            Some(value) => {
                let status: PaymentStatus = serde_json::from_str(&value)?;
                Ok(Some(status))
            }
            None => Ok(None),
        }
    }
}
