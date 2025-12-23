# 🆓 Deploy This Project for FREE

This guide shows how to deploy the entire platform using **100% free tiers** - perfect for portfolio demos, learning, and interviews!

---

## 📊 Free Tier Stack

| Component | Free Provider | Limits |
|-----------|---------------|--------|
| **Microservices** | Railway / Render | 500 hrs/month |
| **PostgreSQL** | Supabase / Neon | 500MB |
| **MongoDB** | MongoDB Atlas | 512MB |
| **Redis** | Upstash | 10K commands/day |
| **Kafka** | Upstash Kafka | 10K messages/day |
| **Elasticsearch** | Bonsai.io | 125MB / 10K docs |
| **Monitoring** | Grafana Cloud | 10K metrics free |

**Total Cost: $0/month** ✅

---

## 🚀 Quick Deploy (One-Click Options)

### Option 1: Railway (Easiest)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template)

1. Click the button above
2. Connect your GitHub
3. Railway auto-detects docker-compose
4. Set environment variables (see below)
5. Deploy!

### Option 2: Render

1. Go to [render.com](https://render.com)
2. New → Blueprint
3. Connect your GitHub repo
4. Uses `render.yaml` (included below)

---

## 📝 Step-by-Step Free Deployment

### Step 1: Set Up Free Databases

#### MongoDB Atlas (Free 512MB)
1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create free cluster (M0 Sandbox)
3. Get connection string:
   ```
   mongodb+srv://user:pass@cluster.xxxxx.mongodb.net/catalog_db
   ```

#### Supabase PostgreSQL (Free 500MB)
1. Go to [supabase.com](https://supabase.com)
2. New Project → Choose free tier
3. Get connection string from Settings → Database:
   ```
   postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
   ```

#### Upstash Redis (Free 10K/day)
1. Go to [upstash.com](https://upstash.com)
2. Create Redis database
3. Get credentials:
   ```
   REDIS_URL=rediss://default:xxxxx@us1-xxxxx.upstash.io:6379
   ```

#### Upstash Kafka (Free 10K messages/day)
1. Go to [upstash.com/kafka](https://upstash.com/kafka)
2. Create Kafka cluster
3. Get credentials:
   ```
   KAFKA_BROKERS=xxxxx.upstash.io:9092
   KAFKA_USERNAME=xxxxx
   KAFKA_PASSWORD=xxxxx
   ```

#### Bonsai Elasticsearch (Free 125MB)
1. Go to [bonsai.io](https://bonsai.io)
2. Create free cluster
3. Get URL:
   ```
   ELASTICSEARCH_URL=https://user:pass@xxxxx.bonsai.io:443
   ```

---

### Step 2: Deploy Services to Railway

#### Create `railway.json` in your repo:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE"
  },
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

#### Deploy each service:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create project
railway init

# Deploy Order Service
cd services/order-service
railway up

# Deploy Inventory Service  
cd ../inventory-service
railway up

# Deploy Catalog Service
cd ../catalog-service
railway up

# Deploy Payment Service
cd ../payment-service
railway up

# Deploy Notification Service
cd ../notification-service
railway up

# Deploy Web3 Service
cd ../web3-service
railway up

# Deploy User Service
cd ../user-service
railway up
```

---

### Step 3: Deploy Frontend to Vercel (Free)

```bash
cd ui
npm install -g vercel
vercel
```

Or connect GitHub repo to [vercel.com](https://vercel.com) for auto-deploys.

---

## 🔧 Environment Variables Template

Create these in your deployment platform:

```env
# Database URLs (from free providers above)
DATABASE_URL=postgresql://user:pass@db.xxx.supabase.co:5432/postgres
MONGODB_URI=mongodb+srv://user:pass@cluster.xxx.mongodb.net/catalog_db

# Redis (Upstash)
REDIS_URL=rediss://default:xxx@us1-xxx.upstash.io:6379

# Kafka (Upstash)  
KAFKA_BROKERS=xxx.upstash.io:9092
KAFKA_SASL_USERNAME=xxx
KAFKA_SASL_PASSWORD=xxx
KAFKA_SASL_MECHANISM=SCRAM-SHA-256
KAFKA_SECURITY_PROTOCOL=SASL_SSL

# Elasticsearch (Bonsai)
ELASTICSEARCH_URL=https://user:pass@xxx.bonsai.io:443

# Service URLs (after deployment, update these)
ORDER_SERVICE_URL=https://order-service-xxx.railway.app
INVENTORY_SERVICE_URL=https://inventory-service-xxx.railway.app
CATALOG_SERVICE_URL=https://catalog-service-xxx.railway.app
PAYMENT_SERVICE_URL=https://payment-service-xxx.railway.app
NOTIFICATION_SERVICE_URL=https://notification-service-xxx.railway.app

# Optional: Stripe (use test keys)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

---

## 🐳 Alternative: Free Docker Hosting

### Fly.io (Free Tier)

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Deploy each service
cd services/order-service
fly launch --now

cd ../catalog-service
fly launch --now

# ... repeat for each service
```

Fly.io free tier includes:
- 3 shared VMs
- 160GB outbound data
- 3GB persistent storage

---

## 📊 Free Monitoring with Grafana Cloud

1. Sign up at [grafana.com](https://grafana.com/products/cloud/)
2. Get free tier (10K metrics, 50GB logs)
3. Update Prometheus to remote_write:

```yaml
# prometheus.yml addition
remote_write:
  - url: https://prometheus-xxx.grafana.net/api/prom/push
    basic_auth:
      username: YOUR_GRAFANA_USER
      password: YOUR_GRAFANA_API_KEY
```

---

## 🌐 Free Domain & SSL

### Freenom + Cloudflare (100% Free)
1. Get free domain: [freenom.com](https://freenom.com) (.tk, .ml, .ga)
2. Add to Cloudflare (free SSL, CDN)
3. Point to your Railway/Render URLs

### Or use free subdomains:
- `your-app.railway.app`
- `your-app.onrender.com`
- `your-app.fly.dev`
- `your-app.vercel.app`

---

## 📁 Render Blueprint

Create `render.yaml` in repo root:

```yaml
services:
  # Order Service (Go)
  - type: web
    name: order-service
    env: docker
    dockerfilePath: ./services/order-service/Dockerfile
    dockerContext: ./services/order-service
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: KAFKA_BROKERS
        sync: false
      - key: REDIS_URL
        sync: false

  # Inventory Service (Go)
  - type: web
    name: inventory-service
    env: docker
    dockerfilePath: ./services/inventory-service/Dockerfile
    dockerContext: ./services/inventory-service
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: KAFKA_BROKERS
        sync: false

  # Catalog Service (Node.js)
  - type: web
    name: catalog-service
    env: docker
    dockerfilePath: ./services/catalog-service/Dockerfile
    dockerContext: ./services/catalog-service
    envVars:
      - key: MONGODB_URI
        sync: false
      - key: ELASTICSEARCH_URL
        sync: false
      - key: REDIS_URL
        sync: false

  # Payment Service (Rust)
  - type: web
    name: payment-service
    env: docker
    dockerfilePath: ./services/payment-service/Dockerfile
    dockerContext: ./services/payment-service
    envVars:
      - key: REDIS_URL
        sync: false
      - key: KAFKA_BROKERS
        sync: false

  # Notification Service (Python)
  - type: web
    name: notification-service
    env: docker
    dockerfilePath: ./services/notification-service/Dockerfile
    dockerContext: ./services/notification-service
    envVars:
      - key: KAFKA_BROKERS
        sync: false
      - key: REDIS_URL
        sync: false

  # User Service (Node.js)
  - type: web
    name: user-service
    env: docker
    dockerfilePath: ./services/user-service/Dockerfile
    dockerContext: ./services/user-service
    envVars:
      - key: DATABASE_URL
        sync: false

  # Web3 Service (Node.js)
  - type: web
    name: web3-service
    env: docker
    dockerfilePath: ./services/web3-service/Dockerfile
    dockerContext: ./services/web3-service

  # Frontend
  - type: web
    name: ui
    env: static
    buildCommand: cd ui && npm install && npm run build
    staticPublishPath: ./ui/dist
```

---

## ⚡ Quick Start Summary

| Step | Action | Time |
|------|--------|------|
| 1 | Sign up for free services (MongoDB, Supabase, Upstash) | 10 min |
| 2 | Fork this repo to your GitHub | 1 min |
| 3 | Connect to Railway/Render | 5 min |
| 4 | Add environment variables | 5 min |
| 5 | Deploy! | 5-10 min |

**Total: ~30 minutes to a fully deployed microservices platform!**

---

## 🔗 Live Demo URLs (After Deployment)

Once deployed, your services will be available at:

```
Frontend:        https://your-app.vercel.app
Order Service:   https://order-service.railway.app/health
Catalog Service: https://catalog-service.railway.app/health
API Gateway:     https://your-app.railway.app/api
```

---

## 💡 Tips for Free Tier

1. **Sleep when not in use**: Free tiers often sleep after 15 min inactivity
2. **Use health checks**: Keep services warm with periodic pings
3. **Monitor usage**: Stay within free limits
4. **Scale down**: Run minimum replicas (1 each)
5. **Optimize Docker images**: Smaller = faster deploys

---

## 🆘 Troubleshooting

### Services won't connect to Kafka
- Upstash requires SASL authentication
- Update Kafka config to use SASL_SSL

### Database connection timeouts
- Free tiers may have connection limits
- Use connection pooling

### Services sleeping
- Free tiers sleep after inactivity
- Use [cron-job.org](https://cron-job.org) for free health check pings

---

**Happy Deploying! 🚀**

*Questions? Open an issue on GitHub!*
