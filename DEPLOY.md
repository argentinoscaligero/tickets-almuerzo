# Comandos para corregir nginx y activar SSL

## En el servidor Linux (/opt/tickets-almuerzo)

### 1. Bajar los cambios
```bash
cd /opt/tickets-almuerzo
git pull   # o copiar los archivos actualizados
```

### 2. Reiniciar con la nueva config (HTTP solamente por ahora)
```bash
docker compose down nginx
docker compose up -d nginx
docker ps   # nginx debe aparecer como "Up"
```

### 3. Verificar que nginx responde
```bash
curl http://tickets.admifarmgroup.com/nginx-health
# Debe responder: ok
```

### 4. Obtener certificado SSL (Let's Encrypt)
```bash
bash scripts/setup-ssl.sh
```
Esto:
- Obtiene el cert para tickets.admifarmgroup.com
- Activa nginx-ssl.conf automáticamente
- Reinicia nginx con HTTPS
- Configura renovación automática

### 5. Verificar HTTPS
```bash
curl https://tickets.admifarmgroup.com/nginx-health
```

---
## Nota: el .env del servidor debe tener
```
NEXTAUTH_URL=https://tickets.admifarmgroup.com
NEXT_PUBLIC_APP_URL=https://tickets.admifarmgroup.com
```
Después de actualizar el .env: `docker compose up -d --force-recreate app`
