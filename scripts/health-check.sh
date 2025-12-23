#!/bin/bash

# Health Check Script for All Microservices
# Checks if all services are running and responsive

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo ""
echo -e "${BOLD}🏥 Microservices Health Check${NC}"
echo "================================"
echo ""

declare -A SERVICES=(
  ["Order Service"]=8081
  ["Inventory Service"]=8082
  ["Catalog Service"]=8083
  ["Payment Service"]=8084
  ["Notification Service"]=8085
  ["User Service"]=8086
  ["Web3 Service"]=8087
)

declare -A INFRA=(
  ["Kong API Gateway"]=8000
  ["Kong Admin"]=8001
  ["Prometheus"]=9090
  ["Grafana"]=3000
  ["Jaeger"]=16686
)

healthy=0
unhealthy=0

check_service() {
  local name=$1
  local port=$2
  local endpoint=${3:-/health}
  
  start_time=$(date +%s%N)
  
  if response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://localhost:${port}${endpoint}" 2>/dev/null); then
    end_time=$(date +%s%N)
    latency=$(( (end_time - start_time) / 1000000 ))
    
    if [ "$response" = "200" ]; then
      echo -e "  ${GREEN}✓${NC} ${name}: ${GREEN}Healthy${NC} (${latency}ms)"
      ((healthy++))
      return 0
    else
      echo -e "  ${RED}✗${NC} ${name}: ${RED}HTTP ${response}${NC}"
      ((unhealthy++))
      return 1
    fi
  else
    echo -e "  ${RED}✗${NC} ${name}: ${RED}Not responding${NC}"
    ((unhealthy++))
    return 1
  fi
}

echo -e "${BOLD}📦 Microservices:${NC}"
for service in "${!SERVICES[@]}"; do
  check_service "$service" "${SERVICES[$service]}"
done

echo ""
echo -e "${BOLD}🔧 Infrastructure:${NC}"
for infra in "${!INFRA[@]}"; do
  if [[ "$infra" == "Grafana" ]]; then
    check_service "$infra" "${INFRA[$infra]}" "/api/health"
  elif [[ "$infra" == "Prometheus" ]]; then
    check_service "$infra" "${INFRA[$infra]}" "/-/healthy"
  elif [[ "$infra" == "Jaeger" ]]; then
    check_service "$infra" "${INFRA[$infra]}" "/"
  else
    check_service "$infra" "${INFRA[$infra]}" "/"
  fi
done

echo ""
echo "================================"
echo -e "${BOLD}Summary:${NC}"
echo -e "  ${GREEN}Healthy:${NC} $healthy"
echo -e "  ${RED}Unhealthy:${NC} $unhealthy"
echo ""

if [ $unhealthy -eq 0 ]; then
  echo -e "${GREEN}${BOLD}✅ All systems operational!${NC}"
  exit 0
else
  echo -e "${YELLOW}${BOLD}⚠️  Some services are down. Run 'docker-compose logs' for details.${NC}"
  exit 1
fi
