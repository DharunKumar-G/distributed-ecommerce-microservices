# Sample API Requests

## Create Product

```bash
curl -X POST http://localhost:8000/api/catalog \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Premium Wireless Headphones",
    "description": "High-quality wireless headphones with active noise cancellation",
    "price": 299.99,
    "category": "Electronics",
    "brand": "AudioTech",
    "stock": 50,
    "images": ["https://example.com/image1.jpg"],
    "tags": ["audio", "wireless", "premium", "noise-cancelling"],
    "attributes": {
      "color": "Black",
      "bluetooth": "5.0",
      "battery": "30 hours"
    }
  }'
```

## Search Products

```bash
curl "http://localhost:8000/api/catalog/search/headphones?category=Electronics&minPrice=100&maxPrice=500"
```

## List Products by Category

```bash
curl "http://localhost:8000/api/catalog?category=Electronics&page=1&limit=20"
```

## Create Order (Triggers Full Saga)

```bash
curl -X POST http://localhost:8000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "items": [
      {
        "product_id": "PROD-001",
        "quantity": 2,
        "price": 299.99
      },
      {
        "product_id": "PROD-002",
        "quantity": 1,
        "price": 149.99
      }
    ]
  }'
```

## Get Order Status (with Saga State)

```bash
curl http://localhost:8000/api/orders/{order_id}/status
```

## Check Inventory

```bash
curl http://localhost:8000/api/inventory/PROD-001
```

## Process Payment Directly

```bash
curl -X POST http://localhost:8000/api/payments \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "total_amount": 749.97,
    "payment_method": "credit_card",
    "order_id": "order123"
  }'
```

## Send Manual Notification

```bash
curl -X POST http://localhost:8000/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email",
    "to": "user@example.com",
    "subject": "Test Notification",
    "body": "This is a test email notification"
  }'
```

## Get Notification History

```bash
curl "http://localhost:8000/api/notifications/history?type=email"
```

## Update Product

```bash
curl -X PUT http://localhost:8000/api/catalog/PROD-001 \
  -H "Content-Type: application/json" \
  -d '{
    "price": 279.99,
    "stock": 45
  }'
```

## Featured Products

```bash
curl "http://localhost:8000/api/catalog/featured/list?limit=10"
```

## Get Categories

```bash
curl http://localhost:8000/api/catalog/meta/categories
```

## Monitor Circuit Breaker State

```bash
# Check metrics endpoint
curl http://localhost:8084/metrics | grep circuit_breaker_state
```

## View All Metrics

```bash
# Order Service
curl http://localhost:8081/metrics

# Inventory Service
curl http://localhost:8082/metrics

# Catalog Service
curl http://localhost:8083/metrics

# Payment Service
curl http://localhost:8084/metrics

# Notification Service
curl http://localhost:8085/metrics
```
