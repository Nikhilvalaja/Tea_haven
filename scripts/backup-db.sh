#!/bin/bash
# ============================================
# TEAHAVEN - DATABASE BACKUP SCRIPT
# ============================================
# Usage: sudo bash scripts/backup-db.sh
# Cron: 0 2 * * * cd /opt/teahaven && bash scripts/backup-db.sh >> /var/log/teahaven-backup.log 2>&1

set -e

BACKUP_DIR="/opt/teahaven/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/teahaven_${TIMESTAMP}.sql"
CONTAINER="teahaven-mysql"
KEEP_DAYS=7

echo "=== TeaHaven DB Backup - $(date) ==="

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Check if MySQL container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    echo "ERROR: MySQL container ($CONTAINER) is not running!"
    exit 1
fi

# Create backup using root credentials
echo "Creating backup..."
docker exec "$CONTAINER" mysqldump \
    -uroot \
    -p"$(docker exec "$CONTAINER" printenv MYSQL_ROOT_PASSWORD)" \
    --all-databases \
    --single-transaction \
    --routines \
    --triggers \
    > "$BACKUP_FILE"

# Compress
gzip "$BACKUP_FILE"
FINAL_FILE="${BACKUP_FILE}.gz"
SIZE=$(du -h "$FINAL_FILE" | cut -f1)
echo "Backup created: $FINAL_FILE ($SIZE)"

# Clean old backups (keep last 7 days)
echo "Cleaning backups older than ${KEEP_DAYS} days..."
find "$BACKUP_DIR" -name "teahaven_*.sql.gz" -mtime +${KEEP_DAYS} -delete

# Show current backups
echo "Current backups:"
ls -lh "$BACKUP_DIR"/teahaven_*.sql.gz 2>/dev/null | tail -10

echo "=== Backup complete ==="
