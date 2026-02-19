#!/bin/bash
# ============================================
# TEAHAVEN - HEALTH WATCHDOG
# ============================================
# Checks if the website is responding and restarts containers if not.
# Run via systemd timer every 2 minutes.
#
# Usage: sudo bash scripts/health-watchdog.sh

LOGFILE="/var/log/teahaven-watchdog.log"
COMPOSE_DIR="/opt/teahaven"
MAX_LOG_LINES=500

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOGFILE"
}

# Trim log to prevent disk fill
if [ -f "$LOGFILE" ] && [ "$(wc -l < "$LOGFILE")" -gt "$MAX_LOG_LINES" ]; then
  tail -n 300 "$LOGFILE" > "$LOGFILE.tmp" && mv "$LOGFILE.tmp" "$LOGFILE"
fi

# Check 1: Is Docker running?
if ! systemctl is-active --quiet docker; then
  log "CRITICAL: Docker is not running. Starting Docker..."
  systemctl start docker
  sleep 10
fi

# Check 2: Are containers running?
cd "$COMPOSE_DIR" || { log "ERROR: Cannot cd to $COMPOSE_DIR"; exit 1; }

RUNNING=$(docker compose --env-file .env.production ps --status running -q 2>/dev/null | wc -l)
EXPECTED=5  # mysql, redis, backend, frontend, alloy (certbot may sleep)

if [ "$RUNNING" -lt 3 ]; then
  log "WARNING: Only $RUNNING/$EXPECTED containers running. Restarting..."
  docker compose --env-file .env.production up -d >> "$LOGFILE" 2>&1
  sleep 20
fi

# Check 3: Can we reach the backend health endpoint?
HEALTH_OK=false
for i in 1 2 3; do
  if curl -sf --max-time 10 http://127.0.0.1:8080/api/health > /dev/null 2>&1; then
    HEALTH_OK=true
    break
  fi
  sleep 5
done

if [ "$HEALTH_OK" = false ]; then
  log "WARNING: Backend health check failed. Restarting backend..."
  docker compose --env-file .env.production restart backend >> "$LOGFILE" 2>&1
  sleep 40

  # Recheck after restart (give it time for DB/Redis deps)
  RECOVERED=false
  for i in 1 2 3; do
    if curl -sf --max-time 10 http://127.0.0.1:8080/api/health > /dev/null 2>&1; then
      RECOVERED=true
      log "OK: Backend recovered after restart."
      break
    fi
    sleep 10
  done

  if [ "$RECOVERED" = false ]; then
    log "CRITICAL: Backend still failing after restart. Full restart..."
    docker compose --env-file .env.production down >> "$LOGFILE" 2>&1
    sleep 5
    docker compose --env-file .env.production up -d >> "$LOGFILE" 2>&1
    sleep 30
  fi
fi

# Check 4: Can we reach the frontend (Nginx)?
FRONTEND_OK=false
for i in 1 2 3; do
  if curl -sf --max-time 10 -o /dev/null -w "%{http_code}" http://127.0.0.1:8080 2>/dev/null | grep -qE "200|301"; then
    FRONTEND_OK=true
    break
  fi
  sleep 3
done

if [ "$FRONTEND_OK" = false ]; then
  log "WARNING: Frontend not responding. Restarting frontend..."
  docker compose --env-file .env.production restart frontend >> "$LOGFILE" 2>&1
fi

# All good - silent success (only log failures to keep log small)
