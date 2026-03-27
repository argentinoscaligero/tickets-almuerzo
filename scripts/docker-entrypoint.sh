#!/bin/sh
set -e

echo "================================================"
echo "  Tickets de Almuerzo - AG Servicios Farmaceuticos"
echo "================================================"
echo ""

echo "==> Verificando conexion a base de datos..."
RETRIES=15
until npx prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1 || [ $RETRIES -eq 0 ]; do
  echo "    Esperando DB... ($RETRIES intentos restantes)"
  RETRIES=$((RETRIES - 1))
  sleep 3
done

if [ $RETRIES -eq 0 ]; then
  echo "ERROR: No se pudo conectar a la base de datos"
  exit 1
fi
echo "    OK - base de datos disponible"

echo ""
echo "==> Sincronizando schema de base de datos..."
npx prisma db push --accept-data-loss
echo "    OK - schema sincronizado"

echo ""
echo "==> Iniciando aplicacion Next.js..."
exec "$@"
