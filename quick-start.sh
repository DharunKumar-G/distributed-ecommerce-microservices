#!/bin/bash

# Quick Start Script for E-Commerce Microservices
# This script starts services in phases to ensure proper initialization

set -e

echo "🚀 E-Commerce Microservices - Quick Start"
echo "=========================================="
echo ""

# Phase 1: Pull images (if needed)
echo "📥 Phase 1: Pulling Docker images..."
docker-compose pull

# Phase 2: Start core infrastructure
echo ""
echo "📦 Phase 2: Starting core infrastructure (Kafka, Zookeeper)..."
docker-compose up -d zookeeper kafka
echo "⏳ Waiting 30 seconds for Kafka to initialize..."
sleep 30

# Phase 3: Start databases
echo ""
echo "💾 Phase 3: Starting databases..."
docker-compose up -d postgres mongodb redis elasticsearch
echo "⏳ Waiting 30 seconds for databases to initialize..."
sleep 30

# Phase 4: Start monitoring
echo ""
echo "📊 Phase 4: Starting monitoring stack..."
docker-compose up -d prometheus grafana jaeger
echo "⏳ Waiting 15 seconds..."
sleep 15

# Phase 5: Start API Gateway
echo ""
echo "🚪 Phase 5: Starting API Gateway..."
docker-compose up -d kong
echo "⏳ Waiting 10 seconds..."
sleep 10

# Phase 6: Build and start microservices
echo ""
echo "🔨 Phase 6: Building and starting microservices..."
docker-compose up -d --build order-service inventory-service catalog-service payment-service notification-service
echo "⏳ Waiting 45 seconds for services to build and start..."
sleep 45

# Health checks
echo ""
echo "🏥 Running health checks..."
echo ""

check_service() {
    local port=$1
    local name=$2
    if curl -f -s http://localhost:$port/health > /dev/null 2>&1; then
        echo "✅ $name Service - Healthy"
        return 0
    else
        echo "⚠️  $name Service - Not ready yet (this is normal, may need more time)"
        return 1
    fi
}

check_service 8081 "Order"
check_service 8082 "Inventory"
check_service 8083 "Catalog"
check_service 8084 "Payment"
check_service 8085 "Notification"

echo ""
echo "🎉 Startup complete!"
echo ""
echo "📊 Access URLs:"
echo "   API Gateway:     http://localhost:8000"
echo "   Order Service:   http://localhost:8081"
echo "   Inventory:       http://localhost:8082"
echo "   Catalog:         http://localhost:8083"
echo "   Payment:         http://localhost:8084"
echo "   Notification:    http://localhost:8085"
echo "   Grafana:         http://localhost:3000 (admin/admin123)"
echo "   Prometheus:      http://localhost:9090"
echo "   Jaeger:          http://localhost:16686"
echo ""
echo "💡 Tips:"
echo "   - If services show 'Not ready', wait 1-2 minutes and check again"
echo "   - View logs: docker-compose logs -f [service-name]"
echo "   - Check all: docker-compose ps"
echo "   - Stop all: docker-compose down"
echo ""
echo "📖 See API_EXAMPLES.md for API usage examples"
echo ""
