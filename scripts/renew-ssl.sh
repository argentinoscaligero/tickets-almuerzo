#!/bin/bash
# renew-ssl.sh — Renovación automática del certificado Let's Encrypt
# Llamado por cron: 0 3 * * * bash /opt/tickets-almuerzo/scripts/renew-ssl.sh

COMPOSE_DIR="/opt/tickets-almuerzo"
VOL_CERTBOT_WWW="tickets-almuerzo_certbot_www"
VOL_LETSENCRYPT="tickets-almuerzo_letsencrypt_data"

echo "[$(date)] Iniciando renovación de certificado SSL..."

cd "$COMPOSE_DIR"

# Intentar renovar (certbot solo renueva si quedan menos de 30 días)
docker run --rm \
  -v "${VOL_LETSENCRYPT}:/etc/letsencrypt" \
  -v "${VOL_CERTBOT_WWW}:/var/www/certbot" \
  certbot/certbot renew --quiet --non-interactive

# Recargar nginx para que use el nuevo cert (sin downtime)
docker compose exec -T nginx nginx -s reload 2>/dev/null || \
  docker compose restart nginx

echo "[$(date)] Renovación completada OK"
