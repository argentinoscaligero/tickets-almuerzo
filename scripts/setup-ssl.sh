#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# setup-ssl.sh — Obtener certificado SSL con Let's Encrypt para
#                tickets.admifarmgroup.com
#
# Uso: bash scripts/setup-ssl.sh
# Requisitos:
#   - El dominio tickets.admifarmgroup.com debe apuntar a este servidor
#   - Docker y docker compose deben estar corriendo
#   - Puertos 80 y 443 abiertos en el firewall
# ──────────────────────────────────────────────────────────────────────────────

set -e

DOMAIN="tickets.admifarmgroup.com"
EMAIL="it@admifarmgroup.com"   # <-- cambiar por el email real de IT
COMPOSE_FILE="/opt/tickets-almuerzo/docker-compose.yml"

echo ""
echo "╔════════════════════════════════════════════════════╗"
echo "║   Setup SSL — Let's Encrypt — $DOMAIN   ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# Verificar que nginx esté corriendo en HTTP
echo "▶ Verificando que nginx esté activo en puerto 80..."
if ! docker ps --filter "name=tickets_nginx" --filter "status=running" | grep -q tickets_nginx; then
  echo "  ✗ nginx no está corriendo. Levantá los servicios primero:"
  echo "    docker compose up -d"
  exit 1
fi
echo "  ✓ nginx corriendo"

# Instalar certbot si no está
if ! command -v certbot &> /dev/null; then
  echo ""
  echo "▶ Instalando certbot..."
  apt-get update -qq
  apt-get install -y -qq certbot
  echo "  ✓ certbot instalado"
fi

# Obtener el volumen de certbot
CERTBOT_WWW=$(docker volume inspect tickets-almuerzo_certbot_www \
  --format '{{.Mountpoint}}' 2>/dev/null || echo "")

if [ -z "$CERTBOT_WWW" ]; then
  echo "  ✗ No se encontró el volumen certbot_www. Asegurate de haber hecho 'docker compose up -d' primero."
  exit 1
fi

echo ""
echo "▶ Obteniendo certificado para $DOMAIN..."
certbot certonly \
  --webroot \
  --webroot-path="$CERTBOT_WWW" \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  --domain "$DOMAIN" \
  --non-interactive

echo ""
echo "▶ Certificado obtenido. Copiando certs al volumen Docker..."
LETSENCRYPT_VOL=$(docker volume inspect tickets-almuerzo_letsencrypt_data \
  --format '{{.Mountpoint}}')
cp -rL /etc/letsencrypt/. "$LETSENCRYPT_VOL/"

echo ""
echo "▶ Activando configuración HTTPS de nginx..."
cp "$(dirname "$0")/../nginx/nginx-ssl.conf" \
   "$(dirname "$0")/../nginx/nginx.conf"

echo ""
echo "▶ Reiniciando nginx con SSL..."
docker compose -f "$COMPOSE_FILE" restart nginx

echo ""
echo "▶ Configurando renovación automática del certificado (cron)..."
# Renovar cada 60 días a las 3:00 AM
CRON_JOB="0 3 */60 * * certbot renew --quiet && cp -rL /etc/letsencrypt/. $LETSENCRYPT_VOL/ && docker compose -f $COMPOSE_FILE restart nginx"
(crontab -l 2>/dev/null | grep -v "certbot renew"; echo "$CRON_JOB") | crontab -
echo "  ✓ Renovación automática configurada"

echo ""
echo "══════════════════════════════════════════════════════"
echo "  ✅  SSL activo en https://$DOMAIN"
echo "══════════════════════════════════════════════════════"
echo ""
