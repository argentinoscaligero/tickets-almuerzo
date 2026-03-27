#!/bin/bash
# setup-ssl.sh — Let's Encrypt con Cloudflare DNS challenge (ARM64 compatible)
# No requiere que el puerto 80 sea accesible desde internet.
# Uso: bash scripts/setup-ssl.sh
# Requisito: /root/.cloudflare.ini con dns_cloudflare_api_token = TOKEN

set -e

DOMAIN="tickets.admifarmgroup.com"
EMAIL="it@admifarmgroup.com"
CLOUDFLARE_INI="/root/.cloudflare.ini"
COMPOSE_DIR="/opt/tickets-almuerzo"

VOL_LETSENCRYPT="tickets-almuerzo_letsencrypt_data"

cd "$COMPOSE_DIR"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   Setup SSL — Cloudflare DNS — $DOMAIN  ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# 1. Verificar .cloudflare.ini
echo "→ Verificando credenciales Cloudflare..."
if [ ! -f "$CLOUDFLARE_INI" ]; then
  echo "  ERROR: No se encontró $CLOUDFLARE_INI"
  echo "  Crealo con:"
  echo "    echo 'dns_cloudflare_api_token = TU_TOKEN' > /root/.cloudflare.ini"
  echo "    chmod 600 /root/.cloudflare.ini"
  exit 1
fi
# Asegurar permisos correctos (certbot los exige)
chmod 600 "$CLOUDFLARE_INI"
echo "  ✓ $CLOUDFLARE_INI OK (chmod 600)"
echo ""

# 2. Verificar que el volumen de letsencrypt exista
echo "→ Verificando volumen Docker..."
docker volume inspect "$VOL_LETSENCRYPT" > /dev/null 2>&1 || {
  echo "  ERROR: Volumen $VOL_LETSENCRYPT no existe."
  echo "  Ejecutá primero: docker compose up -d"
  exit 1
}
echo "  ✓ Volumen OK"
echo ""

# 3. Obtener certificado con certbot DNS Cloudflare (imagen multi-arch ARM64/AMD64)
echo "→ Ejecutando certbot con Cloudflare DNS challenge..."
echo "  (certbot/dns-cloudflare — esperar ~30 segundos de propagación DNS)"
docker run --rm \
  -v "${VOL_LETSENCRYPT}:/etc/letsencrypt" \
  -v "${CLOUDFLARE_INI}:/root/.cloudflare.ini:ro" \
  certbot/dns-cloudflare certonly \
    --dns-cloudflare \
    --dns-cloudflare-credentials /root/.cloudflare.ini \
    --dns-cloudflare-propagation-seconds 30 \
    --domain "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    --force-renewal

echo "  ✓ Certificado obtenido y guardado en volumen $VOL_LETSENCRYPT"
echo ""

# 4. Activar nginx SSL
echo "→ Activando nginx con SSL..."
cp nginx/nginx-ssl.conf nginx/nginx.conf
docker compose restart nginx
sleep 3

# Verificar que nginx levantó
if docker ps --filter "name=tickets_nginx" --filter "status=running" | grep -q tickets_nginx; then
  echo "  ✓ nginx corriendo con SSL"
else
  echo "  ERROR: nginx no levantó. Revisá: docker logs tickets_nginx"
  exit 1
fi
echo ""

# 5. Actualizar NEXTAUTH_URL a https en .env
echo "→ Actualizando NEXTAUTH_URL a https..."
sed -i 's|NEXTAUTH_URL="http://|NEXTAUTH_URL="https://|g' .env
sed -i 's|NEXTAUTH_URL=http://|NEXTAUTH_URL=https://|g' .env
grep NEXTAUTH_URL .env
docker compose restart app
sleep 5
echo "  ✓ App reiniciada con NEXTAUTH_URL https"
echo ""

# 6. Instalar cron de renovación automática (diaria a las 3am)
echo "→ Configurando renovación automática..."
CRON_JOB="0 3 * * * bash $COMPOSE_DIR/scripts/renew-ssl.sh >> /var/log/certbot-renew.log 2>&1"
(crontab -l 2>/dev/null | grep -v "renew-ssl.sh"; echo "$CRON_JOB") | crontab -
echo "  ✓ Cron instalado (todos los días 3:00 AM)"
crontab -l | grep renew-ssl
echo ""

echo "╔══════════════════════════════════════════════════╗"
echo "║   ✅  SSL activo en https://$DOMAIN  ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "Siguiente paso — cargar los 135 empleados:"
echo "  docker exec tickets_app node_modules/.bin/tsx prisma/seed.ts"
echo ""
