use axum::{
    extract::{Json, Path},
    http::{StatusCode, HeaderMap},
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use std::sync::Arc;
use once_cell::sync::OnceCell;
use tokio::signal;
use tower_http::{trace::TraceLayer, cors::CorsLayer};
use tracing::{info, Level};
use tracing_subscriber;
use sqlx::PgPool;

mod circuit_breaker;
mod config;
mod kafka;
mod metrics;
mod models;
mod payment;
mod redis_client;
mod paypal_handler;

use config::Config;
use kafka::{KafkaConsumer, KafkaProducer};
use metrics::{init_metrics, metrics_handler};
use payment::PaymentService;
use redis_client::RedisClient;
use paypal_handler::{PayPalHandler, CreatePaymentRequest, init_db};


static PAYMENT_SERVICE: OnceCell<Arc<payment::PaymentService>> = OnceCell::new();
static PAYPAL_HANDLER: OnceCell<Arc<PayPalHandler>> = OnceCell::new();

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_max_level(Level::INFO)
        .init();

    info!("Starting Payment Service");

    // Load configuration
    let config = Config::from_env();

    // Initialize metrics
    init_metrics();

    // Initialize database connection pool
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://ecommerce:ecommerce123@postgres:5432/orders_db".to_string());
    
    let pool = PgPool::connect(&database_url)
        .await
        .expect("Failed to connect to database");
    
    // Run migrations
    info!("Initializing database schema");
    init_db(&pool).await.expect("Failed to initialize database");

    // Initialize PayPal handler
    let paypal_client_id = std::env::var("PAYPAL_CLIENT_ID")
        .unwrap_or_else(|_| "dummy_client_id".to_string());
    let paypal_client_secret = std::env::var("PAYPAL_CLIENT_SECRET")
        .unwrap_or_else(|_| "dummy_client_secret".to_string());
    let paypal_sandbox = std::env::var("PAYPAL_SANDBOX")
        .unwrap_or_else(|_| "true".to_string())
        .parse::<bool>()
        .unwrap_or(true);
    
    let paypal_handler = Arc::new(PayPalHandler::new(
        paypal_client_id,
        paypal_client_secret,
        paypal_sandbox,
        pool.clone(),
    ));
    
    PAYPAL_HANDLER.set(Arc::clone(&paypal_handler))
        .expect("Failed to set global PayPal handler");

    // Initialize Redis
    let redis_client = RedisClient::new(&config.redis_host)
        .await
        .expect("Failed to connect to Redis");

    // Initialize Kafka
    let kafka_producer = KafkaProducer::new(&config.kafka_brokers)
        .expect("Failed to create Kafka producer");

    // Initialize payment service and wrap in Arc for sharing
    let payment_service = std::sync::Arc::new(PaymentService::new(redis_client, kafka_producer));

    // Start Kafka consumer: pass an Arc<PaymentService> directly
    let consumer_service = Arc::clone(&payment_service);
    tokio::spawn(async move {
        let consumer = KafkaConsumer::new(&config.kafka_brokers, "payment-service-group")
            .expect("Failed to create Kafka consumer");
        consumer.consume_payment_requests(consumer_service).await;
    });

    // Store the payment service in a global OnceCell so handlers can access it
    PAYMENT_SERVICE.set(Arc::clone(&payment_service)).expect("Failed to set global payment service");

    // Build application
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/metrics", get(metrics_handler))
        .route("/api/payments", post(|Json(payload): Json<models::PaymentRequest>| async move {
            let svc = PAYMENT_SERVICE.get().expect("payment service not initialized");
            match svc.process_payment(payload).await {
                Ok(response) => (StatusCode::OK, Json(response)).into_response(),
                Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
            }
        }))
        .route("/api/payments/:id", get(|Path(id): Path<String>| async move {
            let svc = PAYMENT_SERVICE.get().expect("payment service not initialized");
            match svc.get_payment_status(&id).await {
                Ok(Some(status)) => (StatusCode::OK, Json(status)).into_response(),
                Ok(None) => (StatusCode::NOT_FOUND, "Payment not found").into_response(),
                Err(e) => {
                    tracing::error!("Error getting payment status: {}", e);
                    (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error").into_response()
                }
            }
        }))
        // PayPal endpoints
        .route("/api/payments/paypal/create-order", post(create_paypal_order))
        .route("/api/payments/paypal/capture/:order_id", post(capture_paypal_order))
        .route("/api/payments/paypal/webhook", post(paypal_webhook))
        .route("/api/payments/paypal/:payment_id", get(get_paypal_payment))
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http());    // Start server
    let addr = format!("0.0.0.0:{}", config.port);
    info!("Payment Service listening on {}", addr);

    axum::Server::bind(&addr.parse().unwrap())
        .serve(app.into_make_service())
        .with_graceful_shutdown(shutdown_signal())
        .await
        .expect("Server error");
}

async fn health_check() -> (StatusCode, &'static str) {
    (StatusCode::OK, "healthy")
}

async fn process_payment(
    Json(payload): Json<models::PaymentRequest>,
) -> impl IntoResponse {
    let svc = PAYMENT_SERVICE.get().expect("payment service not initialized");
    match svc.process_payment(payload).await {
        Ok(response) => (StatusCode::OK, Json(response)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn get_payment_status(
    axum::extract::Path(id): axum::extract::Path<String>,
) -> impl IntoResponse {
    let svc = PAYMENT_SERVICE.get().expect("payment service not initialized");
    match svc.get_payment_status(&id).await {
        Ok(Some(status)) => (StatusCode::OK, Json(status)).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, "Payment not found").into_response(),
        Err(e) => {
            tracing::error!("Error getting payment status: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error").into_response()
        }
    }
}

async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("Failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    info!("Shutdown signal received");
}

// PayPal handler functions
async fn create_paypal_order(
    Json(payload): Json<CreatePaymentRequest>,
) -> impl IntoResponse {
    let handler = PAYPAL_HANDLER.get().expect("PayPal handler not initialized");
    
    match handler.create_order(payload).await {
        Ok(response) => (StatusCode::OK, Json(response)).into_response(),
        Err(e) => {
            tracing::error!("Failed to create PayPal order: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Error: {}", e)).into_response()
        }
    }
}

async fn capture_paypal_order(
    Path(order_id): Path<String>,
) -> impl IntoResponse {
    let handler = PAYPAL_HANDLER.get().expect("PayPal handler not initialized");
    
    match handler.capture_order(&order_id).await {
        Ok(_) => (StatusCode::OK, "Order captured").into_response(),
        Err(e) => {
            tracing::error!("Failed to capture PayPal order: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Error: {}", e)).into_response()
        }
    }
}

async fn paypal_webhook(
    body: String,
) -> impl IntoResponse {
    let handler = PAYPAL_HANDLER.get().expect("PayPal handler not initialized");
    
    match handler.handle_webhook(&body).await {
        Ok(_) => (StatusCode::OK, "Webhook processed").into_response(),
        Err(e) => {
            tracing::error!("Webhook processing failed: {}", e);
            (StatusCode::BAD_REQUEST, format!("Error: {}", e)).into_response()
        }
    }
}

async fn get_paypal_payment(
    Path(payment_id): Path<String>,
) -> impl IntoResponse {
    let handler = PAYPAL_HANDLER.get().expect("PayPal handler not initialized");
    
    let payment_uuid = match uuid::Uuid::parse_str(&payment_id) {
        Ok(uuid) => uuid,
        Err(_) => return (StatusCode::BAD_REQUEST, "Invalid payment ID").into_response(),
    };
    
    match handler.get_payment(payment_uuid).await {
        Ok(Some(payment)) => (StatusCode::OK, Json(payment)).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, "Payment not found").into_response(),
        Err(e) => {
            tracing::error!("Failed to get payment: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error").into_response()
        }
    }
}
