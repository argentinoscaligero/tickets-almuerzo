#!/bin/bash
# setup-ssl.sh — Let's Encrypt con certbot Docker (ARM64 compatible)
# Ejecutar desde /opt/tickets-almuerzo como root
# Uso: bash scripts/setup-ssl.sh

set -e

DOMAIN="tickets.admifarmgroup.com"
EMAIL="it@admifarmgroup.com"
COMPOSE_DIR="/opt/tickets-almuerzo"

# Volúmenes Docker Compose (prefijo = nombre del directorio del proyecto)
VOL_CERTBOT_WWW="tickets-almuerzo_certbot_www"
VOL_LETSENCRYPT="tickets-almuerzo_letsencrypt_data"

cd "$COMPOSE_DIR"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   Setup SSL — Let's Encrypt — $DOMAIN   ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# 1. Verificar nginx responde en HTTP
echo "→ Verificando nginx en http://$DOMAIN/nginx-health ..."
sleep 2
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN/nginx-health" || echo "000")
if [ "$HTTP_STATUS" != "200" ]; then
  echo "  ERROR: nginx no responde (HTTP $HTTP_STATUS)."
  echo "  Asegurate que el dominio apunta a este server y que docker compose está up."
  exit 1
fi
echo "  ✓ nginx OK"
echo ""

# 2. Verificar volúmenes existen
echo "→ Verificando volúmenes Docker..."
docker volume inspect "$VOL_CERTBOT_WWW" > /dev/null 2>&1 || {
  echo "  ERROR: Volumen $VOL_CERTBOT_WWW no existe."
  echo "  Ejecutá primero: docker compose up -d"
  exit 1
}
echo "  ✓ Volúmenes OK"
echo ""

# 3. Obtener certificado con certbot Docker (multi-arch: AMD64 + ARM64)
echo "→ Ejecutando certbot (imagen Docker multi-arch)..."
docker run --rm \
  -v "${VOL_LETSENCRYPT}:/etc/letsencrypt" \
  -v "${VOL_CERTBOT_WWW}:/var/www/certbot" \
  certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --domain "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    --force-renewal

echo "  ✓ Certificado obtenido"
echo ""

# 4. Activar nginx SSL
echo "→ Activando nginx con SSL..."
cp nginx/nginx-ssl.conf nginx/nginx.conf
docker compose restart nginx
sleep 3
echo "  ✓ nginx reiniciado con SSL"
echo ""

# 5. Actualizar NEXTAUTH_URL a https en .env
echo "→ Actualizando NEXTAUTH_URL a https..."
sed -i 's|NEXTAUTH_URL="http://|NEXTAUTH_URL="https://|g' .env
sed -i 's|NEXTAUTH_URL=http://|NEXTAUTH_URL=https://|g' .env
grep NEXTAUTH_URL .env
docker compose restart app
sleep 5
echo "  ✓ App reiniciada"
echo ""

# 6. Instalar cron de renovación automática
echo "→ Configurando renovación automática (cron — todos los días a las 3am)..."
CRON_JOB="0 3 * * * bash $COMPOSE_DIR/scripts/renew-ssl.sh >> /var/log/certbot-renew.log 2>&1"
(crontab -l 2>/dev/null | grep -v "renew-ssl.sh"; echo "$CRON_JOB") | crontab -
echo "  ✓ Cron instalado"
echo ""

echo "╔══════════════════════════════════════════════════╗"
echo "║   ✅  SSL activo en https://$DOMAIN   ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "Próximo paso — cargar empleados:"
echo "  docker exec tickets_app node_modules/.bin/tsx prisma/seed.ts"
echo ""
