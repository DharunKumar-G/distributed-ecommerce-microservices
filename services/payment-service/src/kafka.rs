use rdkafka::config::ClientConfig;
use rdkafka::consumer::{Consumer, StreamConsumer};
use rdkafka::message::Message;
use rdkafka::producer::{FutureProducer, FutureRecord};
use std::sync::Arc;
use std::time::Duration;
use tracing::{error, info};

use crate::models::SagaEvent;
use crate::payment::PaymentService;

pub struct KafkaProducer {
    producer: FutureProducer,
}

impl std::fmt::Debug for KafkaProducer {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("KafkaProducer").finish()
    }
}

impl KafkaProducer {
    pub fn new(brokers: &str) -> Result<Self, rdkafka::error::KafkaError> {
        let producer: FutureProducer = ClientConfig::new()
            .set("bootstrap.servers", brokers)
            .set("message.timeout.ms", "5000")
            .create()?;

        Ok(Self { producer })
    }

    pub async fn send_message(
        &self,
        topic: &str,
        key: &str,
        payload: &str,
    ) -> Result<(), anyhow::Error> {
        let record = FutureRecord::to(topic).key(key).payload(payload);

        match self.producer.send(record, Duration::from_secs(5)).await {
            Ok(_) => {
                info!("Message sent to topic: {}", topic);
                Ok(())
            }
            Err((e, _)) => {
                error!("Failed to send message: {:?}", e);
                Err(anyhow::anyhow!("Kafka error: {:?}", e))
            }
        }
    }
}

pub struct KafkaConsumer {
    consumer: StreamConsumer,
}

impl KafkaConsumer {
    pub fn new(brokers: &str, group_id: &str) -> Result<Self, rdkafka::error::KafkaError> {
        let consumer: StreamConsumer = ClientConfig::new()
            .set("bootstrap.servers", brokers)
            .set("group.id", group_id)
            .set("enable.auto.commit", "true")
            .set("auto.offset.reset", "latest")
            .create()?;

        Ok(Self { consumer })
    }

    pub async fn consume_payment_requests(&self, payment_service: Arc<PaymentService>) {
        self.consumer
            .subscribe(&["payment-process"])
            .expect("Failed to subscribe to topic");

        info!("Kafka consumer started, listening to payment-process topic");

        loop {
            match self.consumer.recv().await {
                Ok(message) => {
                    if let Some(payload) = message.payload() {
                        match serde_json::from_slice::<SagaEvent>(payload) {
                            Ok(event) => {
                                info!(
                                    "Received payment request for saga_id: {}",
                                    event.saga_id
                                );
                                
                                // Process payment
                                let result = payment_service
                                    .process_saga_payment(event.clone())
                                    .await;

                                match result {
                                    Ok(_) => info!("Payment processed successfully"),
                                    Err(e) => error!("Payment processing failed: {}", e),
                                }
                            }
                            Err(e) => error!("Failed to parse saga event: {}", e),
                        }
                    }
                }
                Err(e) => error!("Error receiving message: {}", e),
            }
        }
    }
}
