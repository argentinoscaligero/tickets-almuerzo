#!/bin/sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/backups/tickets_almuerzo_${DATE}.sql.gz"

echo "==> Backup iniciado: $DATE"
PGPASSWORD=$POSTGRES_PASSWORD pg_dump \
  -h postgres -U tickets_user tickets_almuerzo \
  | gzip > "$BACKUP_FILE"

# Borrar backups de más de 30 días
find /backups -name "*.sql.gz" -mtime +30 -delete

echo "==> Backup completado: $BACKUP_FILE"
