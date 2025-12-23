#!/bin/bash

# E-Commerce Microservices Startup Script

echo "🚀 Starting E-Commerce Microservices Platform..."
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Pull images first
echo "📥 Pulling required Docker images (this may take a few minutes on first run)..."
docker-compose pull

# Start infrastructure services first
echo ""
echo "📦 Starting infrastructure services (Kafka, Databases, Monitoring)..."
docker-compose up -d zookeeper kafka postgres mongodb redis elasticsearch prometheus grafana jaeger kong

echo "⏳ Waiting for infrastructure to be ready (60 seconds)..."
sleep 60

# Build and start application services
echo ""
echo "🔨 Building and starting application services..."
docker-compose up -d --build order-service inventory-service catalog-service payment-service notification-service

echo "⏳ Waiting for services to be healthy (45 seconds)..."
sleep 45

# Health checks
echo ""
echo "🏥 Running health checks..."
echo ""

services=("8081:Order" "8082:Inventory" "8083:Catalog" "8084:Payment" "8085:Notification")

for service in "${services[@]}"; do
    IFS=':' read -r port name <<< "$service"
    if curl -f -s http://localhost:$port/health > /dev/null; then
        echo "✅ $name Service - Healthy"
    else
        echo "❌ $name Service - Unhealthy"
    fi
done

echo ""
echo "🎉 E-Commerce Platform is ready!"
echo ""
echo "📊 Access URLs:"
echo "   API Gateway:     http://localhost:8000"
echo "   Grafana:         http://localhost:3000 (admin/admin123)"
echo "   Prometheus:      http://localhost:9090"
echo "   Jaeger:          http://localhost:16686"
echo "   Elasticsearch:   http://localhost:9200"
echo ""
echo "📖 See README.md for API documentation and usage examples"
echo ""
