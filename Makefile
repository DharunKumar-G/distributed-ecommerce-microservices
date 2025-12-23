# Makefile for E-Commerce Microservices

.PHONY: help build up down logs clean test

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

build: ## Build all services
	docker-compose build

up: ## Start all services
	@chmod +x start.sh
	@./start.sh

down: ## Stop all services
	docker-compose down

down-clean: ## Stop all services and remove volumes
	docker-compose down -v

logs: ## View logs from all services
	docker-compose logs -f

logs-service: ## View logs from specific service (usage: make logs-service SERVICE=order-service)
	docker-compose logs -f $(SERVICE)

ps: ## Show running services
	docker-compose ps

restart: ## Restart all services
	docker-compose restart

restart-service: ## Restart specific service (usage: make restart-service SERVICE=order-service)
	docker-compose restart $(SERVICE)

scale: ## Scale a service (usage: make scale SERVICE=order-service REPLICAS=3)
	docker-compose up -d --scale $(SERVICE)=$(REPLICAS)

health: ## Check health of all services
	@echo "Checking service health..."
	@curl -s http://localhost:8081/health || echo "Order Service: DOWN"
	@curl -s http://localhost:8082/health || echo "Inventory Service: DOWN"
	@curl -s http://localhost:8083/health || echo "Catalog Service: DOWN"
	@curl -s http://localhost:8084/health || echo "Payment Service: DOWN"
	@curl -s http://localhost:8085/health || echo "Notification Service: DOWN"

load-test: ## Run load tests
	@chmod +x load-test.sh
	@./load-test.sh

metrics: ## Show current metrics
	@echo "Order Service Metrics:"
	@curl -s http://localhost:8081/metrics | grep -E "orders_created|order_processing"
	@echo "\nInventory Service Metrics:"
	@curl -s http://localhost:8082/metrics | grep -E "inventory_operations|inventory_level"
	@echo "\nPayment Service Metrics:"
	@curl -s http://localhost:8084/metrics | grep -E "payments_|circuit_breaker"

clean: ## Clean up everything
	docker-compose down -v --rmi all --remove-orphans
	rm -rf data/

init: ## Initialize the project (first time setup)
	@echo "Initializing project..."
	@mkdir -p data/postgres data/mongodb data/redis data/elasticsearch
	@chmod +x start.sh load-test.sh
	@echo "Project initialized!"

dev-order: ## Develop order service
	cd services/order-service && go run cmd/main.go

dev-inventory: ## Develop inventory service  
	cd services/inventory-service && go run cmd/main.go

dev-catalog: ## Develop catalog service
	cd services/catalog-service && npm install && npm run dev

dev-payment: ## Develop payment service
	cd services/payment-service && cargo run

dev-notification: ## Develop notification service
	cd services/notification-service && pip install -r requirements.txt && python app.py

grafana: ## Open Grafana dashboard
	@echo "Opening Grafana at http://localhost:3000"
	@echo "Login: admin / admin123"

jaeger: ## Open Jaeger UI
	@echo "Opening Jaeger at http://localhost:16686"

prometheus: ## Open Prometheus
	@echo "Opening Prometheus at http://localhost:9090"
