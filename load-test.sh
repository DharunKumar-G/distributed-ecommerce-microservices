#!/bin/bash

# Load Test Script for E-Commerce Platform

echo "🔥 Starting load test for E-Commerce Platform..."

# Create sample product
echo "Creating sample product..."
PRODUCT_ID=$(curl -s -X POST http://localhost:8000/api/catalog \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "description": "Load test product",
    "price": 99.99,
    "category": "Electronics",
    "brand": "TestBrand",
    "stock": 1000,
    "tags": ["test"]
  }' | jq -r '.productId')

echo "Product created with ID: $PRODUCT_ID"

# Create order payload
cat > /tmp/order-payload.json <<EOF
{
  "user_id": "testuser",
  "items": [
    {
      "product_id": "$PRODUCT_ID",
      "quantity": 1,
      "price": 99.99
    }
  ]
}
EOF

echo ""
echo "📈 Running load tests..."
echo ""

# Test 1: Order creation
echo "Test 1: Order Creation (100 requests, 10 concurrent)"
ab -n 100 -c 10 -p /tmp/order-payload.json \
   -T application/json \
   -H "Content-Type: application/json" \
   http://localhost:8000/api/orders/ \
   2>&1 | grep -E "(Requests per second|Time per request|Failed requests)"

echo ""

# Test 2: Product search
echo "Test 2: Product Search (1000 requests, 50 concurrent)"
ab -n 1000 -c 50 \
   http://localhost:8000/api/catalog?category=Electronics \
   2>&1 | grep -E "(Requests per second|Time per request|Failed requests)"

echo ""

# Test 3: Inventory check
echo "Test 3: Inventory Check (500 requests, 25 concurrent)"
ab -n 500 -c 25 \
   http://localhost:8000/api/inventory \
   2>&1 | grep -E "(Requests per second|Time per request|Failed requests)"

echo ""
echo "✅ Load tests complete!"
echo "📊 Check Grafana dashboard at http://localhost:3000 for metrics"
