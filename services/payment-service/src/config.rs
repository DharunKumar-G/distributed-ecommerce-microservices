use std::env;

pub struct Config {
    pub port: u16,
    pub kafka_brokers: String,
    pub redis_host: String,
    pub jaeger_agent_host: String,
    pub jaeger_agent_port: u16,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            port: env::var("PORT")
                .unwrap_or_else(|_| "8084".to_string())
                .parse()
                .expect("PORT must be a number"),
            kafka_brokers: env::var("KAFKA_BROKERS")
                .unwrap_or_else(|_| "localhost:9092".to_string()),
            redis_host: env::var("REDIS_HOST")
                .unwrap_or_else(|_| "localhost".to_string())
                + ":"
                + &env::var("REDIS_PORT").unwrap_or_else(|_| "6379".to_string()),
            jaeger_agent_host: env::var("JAEGER_AGENT_HOST")
                .unwrap_or_else(|_| "localhost".to_string()),
            jaeger_agent_port: env::var("JAEGER_AGENT_PORT")
                .unwrap_or_else(|_| "6831".to_string())
                .parse()
                .expect("JAEGER_AGENT_PORT must be a number"),
        }
    }
}
