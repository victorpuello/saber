# Runbook de Operación — Simulador Saber 11

## 1. Arquitectura de servicios

| Servicio | Puerto | BD | Descripción |
|---|---|---|---|
| Gateway (Node.js) | 3000 | — | Proxy, auth, rate limiting, auditoría |
| Question Bank | 3001 | saber11_questions | Banco de preguntas + taxonomía DCE |
| AI Generator | 3002 | — | Generación de preguntas con IA (Anthropic) |
| Exam Engine | 3003 | saber11_exams | Simulacros, sesiones, scoring |
| Diagnostic | 3004 | saber11_profiles | Motor CAT/TRI adaptativo |
| Study Planner | 3005 | saber11_profiles | Planes de estudio personalizados |
| Analytics | 3006 | saber11_analytics | Reportes y KPIs |
| Notifications | 3007 | saber11_notifications | Notificaciones, sync Kampus, auditoría |
| Frontend | 5174 | — | React SPA |

## 2. Prerequisitos de producción

### Variables de entorno obligatorias (.env)

```env
# Secretos (CAMBIAR EN PRODUCCIÓN)
JWT_SECRET=<generar con: openssl rand -hex 32>
DB_PASSWORD=<contraseña segura para PostgreSQL>

# Kampus
KAMPUS_BASE_URL=https://kampus.ieplayasdelviento.edu.co
KAMPUS_AUTH_ENDPOINT=/api/token/
KAMPUS_API_TOKEN=<token de servicio para sync>

# CORS
CORS_ORIGINS=https://saber11.ieplayasdelviento.edu.co

# IA (opcional)
ANTHROPIC_API_KEY=<key if using AI generation>

# Sync
SYNC_INTERVAL_MINUTES=60
```

### DNS requerido

```
saber11.ieplayasdelviento.edu.co      → IP del servidor
saber11-api.ieplayasdelviento.edu.co  → IP del servidor
```

## 3. Despliegue inicial

### 3.1 Preparar servidor

```bash
# Instalar Docker + Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Clonar repositorio
git clone <repo-url> /opt/saber11
cd /opt/saber11

# Crear .env con variables de producción
cp .env.example .env
nano .env  # Editar con valores reales
```

### 3.2 Obtener certificados SSL

```bash
# Primera vez: obtener certificados con certbot standalone
docker run -it --rm \
  -v certbot_certs:/etc/letsencrypt \
  -v certbot_www:/var/www/certbot \
  -p 80:80 \
  certbot/certbot certonly --standalone \
  -d saber11.ieplayasdelviento.edu.co \
  -d saber11-api.ieplayasdelviento.edu.co \
  --email admin@ieplayasdelviento.edu.co \
  --agree-tos --no-eff-email
```

### 3.3 Levantar stack

```bash
docker compose -f docker-compose.prod.yml up -d
```

### 3.4 Verificar servicios

```bash
# Health check
curl -s https://saber11-api.ieplayasdelviento.edu.co/health | jq

# Verificar que todos los contenedores corren
docker compose -f docker-compose.prod.yml ps

# Ver logs
docker compose -f docker-compose.prod.yml logs -f --tail=50
```

### 3.5 Seed de datos iniciales

```bash
# Poblar taxonomía Saber 11 (áreas, competencias, afirmaciones, evidencias)
docker compose -f docker-compose.prod.yml exec question-bank \
  python -m app.seed
```

## 4. Operaciones diarias

### 4.1 Ver logs de un servicio

```bash
docker compose -f docker-compose.prod.yml logs -f gateway
docker compose -f docker-compose.prod.yml logs -f notifications
```

### 4.2 Reiniciar un servicio

```bash
docker compose -f docker-compose.prod.yml restart question-bank
```

### 4.3 Escalar un servicio (si se necesita)

```bash
docker compose -f docker-compose.prod.yml up -d --scale exam-engine=2
```

### 4.4 Actualizar código

```bash
cd /opt/saber11
git pull origin main
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

## 5. Backups

### 5.1 Backup automático

El contenedor `db-backup` en docker-compose.prod.yml:
- Hace backup diario de las 5 bases de datos
- Los comprime con gzip
- Retiene 7 días (borra automáticamente los más antiguos)
- Se almacenan en el volumen `db_backups`

### 5.2 Backup manual

```bash
# Backup de todas las BDs
for DB in questions exams profiles analytics notifications; do
  docker compose -f docker-compose.prod.yml exec db-$DB \
    pg_dump -U saber11 saber11_$DB | gzip > backup_${DB}_$(date +%Y%m%d).sql.gz
done

# Solo Redis (opcional — datos de eventos)
docker compose -f docker-compose.prod.yml exec redis-saber11 \
  redis-cli BGSAVE
```

### 5.3 Restauración

```bash
# Restaurar una BD específica
gunzip -c backup_questions_20260414.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T db-questions \
  psql -U saber11 saber11_questions
```

## 6. Monitoreo

### 6.1 Health checks

```bash
# Gateway
curl -sf http://localhost:3000/health

# Cada microservicio (internamente)
for port in 3001 3002 3003 3004 3005 3006 3007; do
  echo "Servicio en $port: $(curl -sf http://localhost:$port/health | jq -r '.status')"
done
```

### 6.2 Métricas clave a vigilar

| Métrica | Umbral de alerta | Acción |
|---|---|---|
| Latencia P95 gateway | > 2s | Revisar logs del servicio lento |
| Errores 5xx/min | > 10 | Revisar logs, posible servicio caído |
| CPU contenedor | > 80% | Escalar o revisar queries |
| Disco PostgreSQL | > 80% | Limpiar datos antiguos o ampliar disco |
| Redis memoria | > 100MB | Revisar streams, purgar antiguos |
| Certificado SSL | < 15 días | certbot debería renovar automáticamente |

### 6.3 Redis Streams

```bash
# Ver longitud del stream de eventos
docker compose -f docker-compose.prod.yml exec redis-saber11 \
  redis-cli XLEN saber11:events

# Ver consumer groups
docker compose -f docker-compose.prod.yml exec redis-saber11 \
  redis-cli XINFO GROUPS saber11:events

# Purgar eventos procesados (más de 10000)
docker compose -f docker-compose.prod.yml exec redis-saber11 \
  redis-cli XTRIM saber11:events MAXLEN ~ 10000
```

## 7. Troubleshooting

### 7.1 Servicio no responde

```bash
# Estado del contenedor
docker compose -f docker-compose.prod.yml ps <servicio>

# Logs recientes
docker compose -f docker-compose.prod.yml logs --tail=100 <servicio>

# Reiniciar
docker compose -f docker-compose.prod.yml restart <servicio>
```

### 7.2 Error de conexión a BD

```bash
# Verificar que la BD está healthy
docker compose -f docker-compose.prod.yml exec db-questions pg_isready -U saber11

# Verificar conexiones activas
docker compose -f docker-compose.prod.yml exec db-questions \
  psql -U saber11 -d saber11_questions -c "SELECT count(*) FROM pg_stat_activity;"
```

### 7.3 Error de autenticación / Kampus no responde

```bash
# Verificar conectividad con Kampus
docker compose -f docker-compose.prod.yml exec gateway \
  node -e "fetch('${KAMPUS_BASE_URL}/api/').then(r => console.log(r.status))"

# Verificar CORS (desde el navegador, pestaña Network)
# El header Access-Control-Allow-Origin debe incluir el dominio del simulador
```

### 7.4 Certificado SSL expirado

```bash
# Renovar manualmente
docker compose -f docker-compose.prod.yml run certbot renew

# Reiniciar nginx para cargar nuevo certificado
docker compose -f docker-compose.prod.yml restart nginx
```

## 8. Procedimiento Go/No-Go

### Checklist pre-producción

- [ ] DNS configurado y propagado
- [ ] Certificados SSL emitidos y válidos
- [ ] .env con secretos de producción (no dev defaults)
- [ ] JWT_SECRET es un valor aleatorio de 32+ bytes
- [ ] DB_PASSWORD es segura (16+ caracteres)
- [ ] CORS_ORIGINS apunta al dominio de producción
- [ ] Kampus CORS permite el dominio del simulador
- [ ] Seed de taxonomía ejecutado
- [ ] Health check de todos los servicios OK
- [ ] Tests E2E pasando (`pytest tests/e2e/ -v`)
- [ ] Prueba de carga ejecutada (`k6 run tests/load/load_test.js`)
- [ ] Backups funcionando (verificar volumen db_backups)
- [ ] Al menos 1 admin, 1 docente y 3 estudiantes de prueba

### Post-producción (primeras 48h)

- [ ] Monitorear logs por errores
- [ ] Verificar que backups se generan
- [ ] Confirmar renovación de certificados funciona
- [ ] Confirmar sync con Kampus ejecuta sin errores
- [ ] Recopilar feedback de usuarios piloto

## 9. Contactos

| Rol | Nombre | Canal |
|---|---|---|
| Desarrollador principal | — | — |
| Admin Kampus | — | — |
| Docente líder piloto | — | — |
| Soporte técnico institución | — | — |

> Completar con datos reales antes del Go/No-Go.
