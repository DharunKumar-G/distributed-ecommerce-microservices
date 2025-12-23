use axum::{http::StatusCode, response::IntoResponse};
use lazy_static::lazy_static;
use prometheus::{
    register_counter, register_histogram, register_int_gauge, Counter, Histogram, IntGauge,
    TextEncoder, Encoder,
};

lazy_static! {
    pub static ref PAYMENT_METRICS: PaymentMetrics = PaymentMetrics::new();
}

pub struct PaymentMetrics {
    pub payments_processed: Counter,
    pub payments_failed: Counter,
    pub payment_amounts: Histogram,
    pub active_payments: IntGauge,
    pub circuit_breaker_state: IntGauge,
}

impl PaymentMetrics {
    fn new() -> Self {
        Self {
            payments_processed: register_counter!(
                "payments_processed_total",
                "Total number of successful payments"
            )
            .unwrap(),
            payments_failed: register_counter!(
                "payments_failed_total",
                "Total number of failed payments"
            )
            .unwrap(),
            payment_amounts: register_histogram!(
                "payment_amounts",
                "Distribution of payment amounts",
                vec![10.0, 50.0, 100.0, 500.0, 1000.0, 5000.0, 10000.0]
            )
            .unwrap(),
            active_payments: register_int_gauge!(
                "active_payments",
                "Number of active payment processes"
            )
            .unwrap(),
            circuit_breaker_state: register_int_gauge!(
                "circuit_breaker_state",
                "Circuit breaker state (0=Closed, 1=Open, 2=HalfOpen)"
            )
            .unwrap(),
        }
    }
}

pub fn init_metrics() {
    lazy_static::initialize(&PAYMENT_METRICS);
}

pub async fn metrics_handler() -> impl IntoResponse {
    let encoder = TextEncoder::new();
    let metric_families = prometheus::gather();
    let mut buffer = Vec::new();

    encoder.encode(&metric_families, &mut buffer).unwrap();

    (StatusCode::OK, buffer)
}
