#!/bin/bash
# ============================================
# TEAHAVEN - DATABASE BACKUP SCRIPT
# ============================================
# Usage: ./scripts/backup-db.sh [staging|production]

set -e

ENV=${1:-staging}
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/teahaven_${ENV}_${TIMESTAMP}.sql"

# Create backup directory if not exists
mkdir -p $BACKUP_DIR

# Load environment variables
if [ -f ".env.${ENV}" ]; then
    export $(cat .env.${ENV} | grep -v '^#' | xargs)
fi

# Container name based on environment
CONTAINER="teahaven-mysql-${ENV}"
if [ "$ENV" == "staging" ]; then
    CONTAINER="teahaven-mysql-staging"
elif [ "$ENV" == "production" ]; then
    CONTAINER="teahaven-mysql-prod"
else
    CONTAINER="teahaven-mysql"
fi

echo "Creating backup of ${ENV} database..."
echo "Container: ${CONTAINER}"
echo "Output: ${BACKUP_FILE}"

# Create backup
docker exec $CONTAINER mysqldump \
    -u${DB_USER:-root} \
    -p${DB_PASSWORD} \
    ${DB_NAME:-teahaven} \
    --single-transaction \
    --routines \
    --triggers \
    > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE
echo "Backup created: ${BACKUP_FILE}.gz"

# Keep only last 7 backups
echo "Cleaning old backups (keeping last 7)..."
ls -t ${BACKUP_DIR}/teahaven_${ENV}_*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm

echo "Backup complete!"
ls -lh ${BACKUP_DIR}/teahaven_${ENV}_*.sql.gz 2>/dev/null | tail -5
