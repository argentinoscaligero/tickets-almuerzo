#!/bin/sh
set -e

echo "================================================"
echo "  Tickets de Almuerzo - AG Servicios Farmaceuticos"
echo "================================================"
echo ""

# Extraer host y puerto de DATABASE_URL
# Formato: postgresql://user:pass@host:port/db
DB_HOST=$(echo "$DATABASE_URL" | sed 's|.*@||' | sed 's|:.*||' | sed 's|/.*||')
DB_PORT=$(echo "$DATABASE_URL" | sed 's|.*@||' | sed 's|.*:||' | sed 's|/.*||')
DB_PORT=${DB_PORT:-5432}

echo "==> Verificando conexion a base de datos ($DB_HOST:$DB_PORT)..."
RETRIES=20
until nc -z "$DB_HOST" "$DB_PORT" > /dev/null 2>&1 || [ "$RETRIES" -eq 0 ]; do
  echo "    Esperando DB... ($RETRIES intentos restantes)"
  RETRIES=$((RETRIES - 1))
  sleep 3
done

if [ "$RETRIES" -eq 0 ]; then
  echo "ERROR: No se pudo conectar a la base de datos ($DB_HOST:$DB_PORT)"
  exit 1
fi
echo "    OK - base de datos disponible"

echo ""
echo "==> Sincronizando schema de base de datos..."
node_modules/prisma/build/index.js db push --accept-data-loss
echo "    OK - schema sincronizado"

echo ""
echo "==> Iniciando aplicacion Next.js..."
exec "$@"
