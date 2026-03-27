#!/bin/bash
# renew-ssl.sh — Renovación automática con Cloudflare DNS challenge
# Llamado por cron: 0 3 * * * bash /opt/tickets-almuerzo/scripts/renew-ssl.sh

CLOUDFLARE_INI="/root/.cloudflare.ini"
VOL_LETSENCRYPT="tickets-almuerzo_letsencrypt_data"
COMPOSE_DIR="/opt/tickets-almuerzo"

echo "[$(date '+%Y-%m-%d %H:%M')] Iniciando renovación de certificado SSL..."

chmod 600 "$CLOUDFLARE_INI" 2>/dev/null || true

# certbot renew solo actúa si quedan menos de 30 días para vencer
docker run --rm \
  -v "${VOL_LETSENCRYPT}:/etc/letsencrypt" \
  -v "${CLOUDFLARE_INI}:/root/.cloudflare.ini:ro" \
  certbot/dns-cloudflare renew \
    --quiet \
    --non-interactive

# Recargar nginx para que use el nuevo cert (sin downtime)
docker compose -f "$COMPOSE_DIR/docker-compose.yml" exec -T nginx nginx -s reload 2>/dev/null \
  || docker compose -f "$COMPOSE_DIR/docker-compose.yml" restart nginx

echo "[$(date '+%Y-%m-%d %H:%M')] Renovación completada OK"
