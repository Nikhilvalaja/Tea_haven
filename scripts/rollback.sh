#!/bin/bash
# ============================================
# TEAHAVEN - ROLLBACK SCRIPT
# ============================================
# Rolls back to the previous deploy commit.
# Usage: sudo bash scripts/rollback.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cd /opt/teahaven

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  TEAHAVEN ROLLBACK${NC}"
echo -e "${YELLOW}========================================${NC}"

# Get rollback target
if [ -f .prev-deploy-commit ]; then
    ROLLBACK_COMMIT=$(cat .prev-deploy-commit)
    echo "Rolling back to commit: $ROLLBACK_COMMIT"
else
    echo -e "${RED}No rollback point found (.prev-deploy-commit missing)${NC}"
    echo "Trying git: rolling back 1 commit..."
    ROLLBACK_COMMIT=$(git log --format="%H" -n 2 | tail -1)
fi

CURRENT_COMMIT=$(git rev-parse HEAD)
echo "Current commit: $CURRENT_COMMIT"
echo "Target commit:  $ROLLBACK_COMMIT"

if [ "$CURRENT_COMMIT" = "$ROLLBACK_COMMIT" ]; then
    echo -e "${YELLOW}Already at rollback target. Nothing to do.${NC}"
    exit 0
fi

echo -e "\n${YELLOW}[1/4] Checking out previous commit...${NC}"
git checkout "$ROLLBACK_COMMIT"

echo -e "\n${YELLOW}[2/4] Rebuilding containers...${NC}"
docker compose --env-file .env.production build --no-cache backend frontend

echo -e "\n${YELLOW}[3/4] Restarting services...${NC}"
docker compose --env-file .env.production up -d

echo -e "\n${YELLOW}[4/4] Health check...${NC}"
sleep 20

HEALTHY=false
for i in $(seq 1 6); do
    if curl -sf --max-time 10 http://127.0.0.1:5000/api/health > /dev/null 2>&1; then
        HEALTHY=true
        break
    fi
    echo "Waiting... attempt $i/6"
    sleep 5
done

if [ "$HEALTHY" = true ]; then
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}  ROLLBACK SUCCESSFUL${NC}"
    echo -e "${GREEN}========================================${NC}"
    docker compose --env-file .env.production ps
else
    echo -e "\n${RED}========================================${NC}"
    echo -e "${RED}  ROLLBACK HEALTH CHECK FAILED${NC}"
    echo -e "${RED}========================================${NC}"
    echo "Check logs: docker compose --env-file .env.production logs --tail 50"
    exit 1
fi
