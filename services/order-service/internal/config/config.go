package config

import (
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port             int
	DBHost           string
	DBPort           int
	DBUser           string
	DBPassword       string
	DBName           string
	KafkaBrokers     []string
	RedisHost        string
	JaegerAgentHost  string
	JaegerAgentPort  int
}

func Load() *Config {
	dbPort, _ := strconv.Atoi(getEnv("DB_PORT", "5432"))
	port, _ := strconv.Atoi(getEnv("PORT", "8081"))
	jaegerPort, _ := strconv.Atoi(getEnv("JAEGER_AGENT_PORT", "6831"))

	return &Config{
		Port:             port,
		DBHost:           getEnv("DB_HOST", "localhost"),
		DBPort:           dbPort,
		DBUser:           getEnv("DB_USER", "ecommerce"),
		DBPassword:       getEnv("DB_PASSWORD", "ecommerce123"),
		DBName:           getEnv("DB_NAME", "orders_db"),
		KafkaBrokers:     strings.Split(getEnv("KAFKA_BROKERS", "localhost:9092"), ","),
		RedisHost:        getEnv("REDIS_HOST", "localhost:6379"),
		JaegerAgentHost:  getEnv("JAEGER_AGENT_HOST", "localhost"),
		JaegerAgentPort:  jaegerPort,
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
