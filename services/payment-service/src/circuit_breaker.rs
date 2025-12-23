use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::Mutex;
use tracing::warn;

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum CircuitState {
    Closed,
    Open,
    HalfOpen,
}

#[derive(Debug)]
pub struct CircuitBreaker {
    state: Arc<Mutex<CircuitState>>,
    failure_count: Arc<AtomicU64>,
    success_count: Arc<AtomicU64>,
    last_failure_time: Arc<Mutex<Option<Instant>>>,
    failure_threshold: u64,
    timeout: Duration,
    half_open_max_requests: u64,
}

impl CircuitBreaker {
    pub fn new(failure_threshold: u64, timeout: Duration) -> Self {
        Self {
            state: Arc::new(Mutex::new(CircuitState::Closed)),
            failure_count: Arc::new(AtomicU64::new(0)),
            success_count: Arc::new(AtomicU64::new(0)),
            last_failure_time: Arc::new(Mutex::new(None)),
            failure_threshold,
            timeout,
            half_open_max_requests: 3,
        }
    }

    pub async fn call<F, T, E>(&self, f: F) -> Result<T, CircuitBreakerError>
    where
        F: std::future::Future<Output = Result<T, E>>,
        E: std::fmt::Display,
    {
        // Check circuit state
        let state = *self.state.lock().await;

        match state {
            CircuitState::Open => {
                // Check if timeout has passed
                let last_failure = self.last_failure_time.lock().await;
                if let Some(time) = *last_failure {
                    if time.elapsed() > self.timeout {
                        // Transition to half-open
                        drop(last_failure);
                        *self.state.lock().await = CircuitState::HalfOpen;
                        warn!("Circuit breaker transitioning to HALF-OPEN");
                    } else {
                        return Err(CircuitBreakerError::CircuitOpen);
                    }
                }
            }
            CircuitState::HalfOpen => {
                // Allow limited requests in half-open state
                let success = self.success_count.load(Ordering::Relaxed);
                if success >= self.half_open_max_requests {
                    // Close the circuit
                    *self.state.lock().await = CircuitState::Closed;
                    self.failure_count.store(0, Ordering::Relaxed);
                    self.success_count.store(0, Ordering::Relaxed);
                    warn!("Circuit breaker transitioning to CLOSED");
                }
            }
            CircuitState::Closed => {}
        }

        // Execute the function
        match f.await {
            Ok(result) => {
                self.on_success().await;
                Ok(result)
            }
            Err(e) => {
                self.on_failure().await;
                Err(CircuitBreakerError::ExecutionFailed(e.to_string()))
            }
        }
    }

    async fn on_success(&self) {
        let state = *self.state.lock().await;
        if state == CircuitState::HalfOpen {
            self.success_count.fetch_add(1, Ordering::Relaxed);
        }

        // Reset failure count on success in closed state
        if state == CircuitState::Closed {
            self.failure_count.store(0, Ordering::Relaxed);
        }
    }

    async fn on_failure(&self) {
        let failures = self.failure_count.fetch_add(1, Ordering::Relaxed) + 1;

        if failures >= self.failure_threshold {
            *self.state.lock().await = CircuitState::Open;
            *self.last_failure_time.lock().await = Some(Instant::now());
            warn!(
                "Circuit breaker OPENED after {} failures",
                failures
            );
        }
    }

    pub async fn get_state(&self) -> CircuitState {
        *self.state.lock().await
    }
}

#[derive(Debug, thiserror::Error)]
pub enum CircuitBreakerError {
    #[error("Circuit breaker is open")]
    CircuitOpen,
    #[error("Execution failed: {0}")]
    ExecutionFailed(String),
}
