#!/bin/bash
# ============================================
# TEAHAVEN - ROLLBACK SCRIPT
# ============================================
# Usage: ./scripts/rollback.sh [staging|production] [version]

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ENV=${1:-staging}
VERSION=${2:-previous}

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  TEAHAVEN ROLLBACK - ${ENV^^}${NC}"
echo -e "${YELLOW}========================================${NC}"

# Load environment
if [ -f ".env.${ENV}" ]; then
    export $(cat .env.${ENV} | grep -v '^#' | xargs)
fi

COMPOSE_FILE="docker-compose.${ENV}.yml"

# Get previous version
if [ "$VERSION" == "previous" ]; then
    VERSION=$(docker images ${DOCKER_REGISTRY}/teahaven-backend --format "{{.Tag}}" | head -2 | tail -1)
    echo -e "Rolling back to version: ${VERSION}"
fi

# Stop current containers
echo -e "\n${YELLOW}Stopping current containers...${NC}"
docker-compose -f $COMPOSE_FILE down

# Update version and restart
echo -e "\n${YELLOW}Starting previous version...${NC}"
export VERSION=$VERSION
docker-compose -f $COMPOSE_FILE up -d

# Wait for health
echo -e "\n${YELLOW}Waiting for services...${NC}"
sleep 15

# Verify
if docker-compose -f $COMPOSE_FILE ps | grep -q "Up"; then
    echo -e "\n${GREEN}✓ Rollback complete!${NC}"
    docker-compose -f $COMPOSE_FILE ps
else
    echo -e "\n${RED}✗ Rollback failed!${NC}"
    exit 1
fi
