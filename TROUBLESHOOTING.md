# Troubleshooting Guide

## Common Issues and Solutions

### 1. Services Not Starting

#### Issue: `docker-compose up` fails with Kong image error
**Error Message**: `Error manifest for kong:3.4-alpine not found`

**Solution**: Fixed! The Kong image version has been updated to `kong:3.4` in `docker-compose.yml`.

#### Issue: Version warning in docker-compose
**Error Message**: `the attribute 'version' is obsolete`

**Solution**: Fixed! The `version: '3.8'` line has been removed from `docker-compose.yml`.

### 2. Slow Startup

#### Issue: First-time startup is very slow
**Reason**: Docker needs to download ~5GB of images (Elasticsearch alone is 740MB).

**Solution**:
1. Be patient - first run takes 5-10 minutes depending on your internet connection
2. Use the phased startup script: `./quick-start.sh`
3. Once images are downloaded, subsequent starts are much faster

#### Issue: Services show "Unhealthy" status
**Reason**: Microservices need time to build and initialize.

**Solution**:
1. Wait 2-3 minutes after `docker-compose up`
2. Check container logs: `docker-compose logs -f [service-name]`
3. Verify dependencies are running: `docker-compose ps`

### 3. Port Conflicts

#### Issue: Port already in use
**Error Message**: `Error starting userland proxy: listen tcp 0.0.0.0:XXXX: bind: address already in use`

**Ports Used**:
- 2181 (Zookeeper)
- 9092, 9093 (Kafka)
- 5432 (PostgreSQL)
- 27017 (MongoDB)
- 6379 (Redis)
- 9200 (Elasticsearch)
- 8000, 8001 (Kong API Gateway)
- 9090 (Prometheus)
- 3000 (Grafana)
- 16686 (Jaeger)
- 8081-8085 (Microservices)

**Solution**:
1. Stop conflicting services: `sudo systemctl stop postgresql` (example)
2. Or modify ports in `docker-compose.yml`
3. Check what's using a port: `sudo lsof -i :PORT_NUMBER`

### 4. Build Errors

#### Issue: Go build fails
**Error Message**: `go: package not found` or `cannot find module`

**Solution**:
```bash
# Rebuild with no cache
docker-compose build --no-cache order-service
```

#### Issue: Node.js/TypeScript build fails
**Error Message**: `Module not found` or `Cannot find package`

**Solution**:
```bash
# Rebuild catalog service
docker-compose build --no-cache catalog-service
```

#### Issue: Rust build fails
**Error Message**: `error: could not compile`

**Solution**:
```bash
# Rebuild payment service
docker-compose build --no-cache payment-service
```

### 5. Service Communication Issues

#### Issue: Services can't connect to Kafka
**Symptom**: Logs show `Connection refused` or `Failed to produce message`

**Solution**:
1. Ensure Kafka is running: `docker-compose ps kafka`
2. Check Kafka logs: `docker-compose logs kafka`
3. Wait 30 seconds after starting Kafka before starting app services
4. Verify network: `docker network ls` and `docker network inspect kafka_ecommerce-network`

#### Issue: Database connection errors
**Symptom**: `Connection timeout` or `Authentication failed`

**Solution**:
1. Check database is running: `docker-compose ps postgres mongodb`
2. Verify credentials in `.env` file match `docker-compose.yml`
3. Check logs: `docker-compose logs postgres`

### 6. Health Check Failures

#### Issue: Health endpoint returns 404
**Solution**:
- Services are still starting. Wait 1-2 minutes.
- Check if service compiled successfully: `docker-compose logs [service-name]`

#### Issue: All health checks fail
**Solution**:
```bash
# Restart all services
docker-compose down
docker-compose up -d
```

### 7. Memory/Performance Issues

#### Issue: System runs slow or services crash
**Reason**: Insufficient Docker resources.

**Solution**:
1. Increase Docker memory limit (minimum 8GB recommended)
   - Docker Desktop → Settings → Resources → Memory → 8GB
2. Close unnecessary applications
3. Start services in phases using `quick-start.sh`

#### Issue: Elasticsearch won't start
**Symptom**: `max virtual memory areas vm.max_map_count [65530] is too low`

**Solution** (Linux):
```bash
sudo sysctl -w vm.max_map_count=262144
# Make it permanent
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
```

### 8. Monitoring/Observability Issues

#### Issue: Grafana dashboards are empty
**Solution**:
1. Wait 2-3 minutes for metrics to accumulate
2. Verify Prometheus is scraping: http://localhost:9090/targets
3. Check Grafana datasource: Grafana → Configuration → Data Sources

#### Issue: Jaeger shows no traces
**Solution**:
1. Services need to make API calls first to generate traces
2. Create an order using API_EXAMPLES.md examples
3. Refresh Jaeger UI

### 9. API Gateway Issues

#### Issue: Kong returns 404 for all requests
**Solution**:
1. Verify Kong configuration: `docker-compose logs kong`
2. Check `kong/kong.yml` file exists and is valid
3. Restart Kong: `docker-compose restart kong`

### 10. Clean Start

#### Issue: Nothing works, need to start fresh
**Solution**:
```bash
# Stop and remove everything
docker-compose down -v

# Remove all images (optional, will require re-download)
docker-compose down --rmi all -v

# Start fresh
./quick-start.sh
```

## Verification Steps

### 1. Check All Services Running
```bash
docker-compose ps
# All services should show "Up" status
```

### 2. Check Service Logs
```bash
# View logs for a specific service
docker-compose logs -f order-service

# View last 100 lines for all services
docker-compose logs --tail=100
```

### 3. Test Individual Services
```bash
# Health checks
curl http://localhost:8081/health  # Order
curl http://localhost:8082/health  # Inventory
curl http://localhost:8083/health  # Catalog
curl http://localhost:8084/health  # Payment
curl http://localhost:8085/health  # Notification
```

### 4. Test End-to-End Flow
```bash
# Create an order (triggers Saga across all services)
curl -X POST http://localhost:8081/orders \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "items": [{
      "product_id": "PROD-001",
      "quantity": 2,
      "price": 99.99
    }]
  }'
```

### 5. Verify Monitoring
- **Grafana**: http://localhost:3000 (admin/admin123)
- **Prometheus**: http://localhost:9090
- **Jaeger**: http://localhost:16686

## Getting Help

### Useful Commands
```bash
# View resource usage
docker stats

# Inspect a container
docker inspect [container-name]

# Enter a running container
docker exec -it [container-name] /bin/sh

# View Docker networks
docker network ls

# Clean up stopped containers
docker container prune

# Clean up unused images
docker image prune

# Clean up everything (DANGER!)
docker system prune -a --volumes
```

### Log Locations
- Container logs: `docker-compose logs [service-name]`
- Build logs: During `docker-compose build` or `docker-compose up --build`

### What to Check When Debugging
1. ✅ Docker daemon is running
2. ✅ Sufficient memory allocated (8GB+)
3. ✅ No port conflicts
4. ✅ All images pulled successfully
5. ✅ Network connectivity between containers
6. ✅ Environment variables set correctly
7. ✅ Configuration files present (kong.yml, prometheus.yml, etc.)

## Still Having Issues?

1. Check project files are complete:
   ```bash
   find . -name "*.go" -o -name "*.ts" -o -name "*.rs" -o -name "*.py" | wc -l
   # Should show 50+ files
   ```

2. Verify Docker Compose version:
   ```bash
   docker-compose version
   # Should be v2.x or higher
   ```

3. Check system resources:
   ```bash
   free -h        # Available memory
   df -h          # Available disk space
   ```

## Quick Reference

**Start Everything**: `./quick-start.sh` or `docker-compose up -d`
**Stop Everything**: `docker-compose down`
**View Logs**: `docker-compose logs -f`
**Rebuild**: `docker-compose up -d --build`
**Clean Start**: `docker-compose down -v && docker-compose up -d --build`
