# Addendum — Integración con instancia de producción Kampus

## Instancia institucional identificada

```
Dominio:     https://kampus.ieplayasdelviento.edu.co
Institución: IE Playas del Viento
Backend API: https://kampus.ieplayasdelviento.edu.co  (mismo dominio, proxy inverso)
Frontend:    React SPA servida desde el mismo dominio
Stack:       Django REST Framework + PostgreSQL + Redis + Celery
```

El frontend de Kampus es una SPA React que se sirve como shell HTML estático. El backend Django opera detrás de un proxy inverso (probablemente Nginx o Caddy según el `docker-compose.prod.yml` del repositorio), exponiendo la API REST en el mismo dominio.

---

## 1. Descubrimiento de la API de Kampus

Basándome en la estructura del repositorio (`victorpuello/kampus`) y la documentación funcional, Kampus usa Django REST Framework con la convención estándar. Los endpoints probables del backend son:

### Autenticación

```
POST  /api/auth/login/            → Obtener token (credenciales → JWT o Token DRF)
POST  /api/auth/logout/           → Invalidar token
POST  /api/auth/token/            → JWT token pair (si usa djangorestframework-simplejwt)
POST  /api/auth/token/refresh/    → Refresh JWT
GET   /api/auth/user/             → Usuario autenticado actual (me)
```

### Usuarios y roles

```
GET   /api/users/                 → Listado de usuarios (paginado)
GET   /api/users/{id}/            → Detalle de usuario
GET   /api/users/me/              → Perfil del usuario autenticado
```

Django maneja roles mediante `django.contrib.auth.models.Group`. Según la documentación funcional de Kampus, los groups relevantes son:

| Group en Kampus | Identificador probable |
|---|---|
| Superadministrador | `superadmin` o superuser flag |
| Administrador/Rector | `admin` o `rector` |
| Coordinador | `coordinador` |
| Secretaría | `secretaria` |
| Docente | `docente` |
| Padre de Familia | `padre` o `acudiente` |
| Estudiante | `estudiante` |

### Estudiantes

```
GET   /api/students/              → Listado de estudiantes (filtrable por grado, grupo)
GET   /api/students/{id}/         → Ficha del estudiante (datos personales, grado, grupo)
GET   /api/students/{id}/grades/  → Historial académico
```

### Docentes

```
GET   /api/teachers/              → Listado de docentes
GET   /api/teachers/{id}/         → Perfil del docente (carga académica, asignaturas)
```

### Académico

```
GET   /api/academic/years/        → Años lectivos
GET   /api/academic/periods/      → Periodos académicos
GET   /api/academic/subjects/     → Asignaturas
GET   /api/academic/groups/       → Grupos/cursos (8-A, 9-B, etc.)
```

---

## 2. Pasos concretos para descubrir y documentar la API real

Dado que no puedo explorar la API autenticada desde aquí, estas son las acciones que debes ejecutar para mapear los endpoints exactos:

### Paso 1 — Browsable API de DRF

Django REST Framework incluye una interfaz web navegable. Accede desde el navegador autenticado como admin:

```
https://kampus.ieplayasdelviento.edu.co/api/
```

Si DRF está configurado con el `DefaultRouter`, esta URL mostrará el directorio raíz con todos los endpoints registrados. Captura esa lista — es el mapa completo de la API.

### Paso 2 — Inspeccionar urls.py desde el repositorio

Desde tu copia local del repo, ejecuta:

```bash
cd kampus/backend
grep -r "router.register\|path.*api\|urlpatterns" --include="*.py" | grep -v migrations | grep -v __pycache__
```

Esto listará todos los endpoints registrados en el enrutador de DRF y las URLs manuales.

### Paso 3 — Verificar el sistema de autenticación

Determina si Kampus usa Token Authentication nativo de DRF o JWT (djangorestframework-simplejwt):

```bash
grep -r "simplejwt\|TokenObtainPair\|authtoken\|rest_framework.authentication" --include="*.py" backend/
```

Si usa `simplejwt`, los endpoints serán:

```
POST /api/token/          → {"access": "...", "refresh": "..."}
POST /api/token/refresh/  → {"access": "..."}
```

Si usa `rest_framework.authtoken`:

```
POST /api/auth/login/     → {"token": "..."}
Header: Authorization: Token <token>
```

### Paso 4 — Verificar CORS

El backend de Kampus tiene configurado `CORS_ALLOWED_ORIGINS`. Para que el simulador (que correrá en un dominio diferente) pueda consumir la API, necesitas agregar el dominio del simulador:

```python
# En settings.py de Kampus (o variable de entorno)
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",                          # Kampus frontend dev
    "https://kampus.ieplayasdelviento.edu.co",        # Kampus frontend prod
    "https://saber11.ieplayasdelviento.edu.co",       # Simulador prod (nuevo)
    "http://localhost:5174",                           # Simulador dev
]
```

---

## 3. Configuración del simulador para producción

### 3.1 Dominio sugerido

```
Simulador:   https://saber11.ieplayasdelviento.edu.co
API Gateway: https://saber11-api.ieplayasdelviento.edu.co
```

Ambos como subdominios de la institución, lo que facilita la gestión de certificados SSL y la percepción de que es un servicio oficial.

### 3.2 Variables de entorno del API Gateway del simulador

```env
# --- Conexión a Kampus ---
KAMPUS_BASE_URL=https://kampus.ieplayasdelviento.edu.co
KAMPUS_AUTH_ENDPOINT=/api/token/           # Ajustar según descubrimiento
KAMPUS_USERS_ENDPOINT=/api/users/
KAMPUS_STUDENTS_ENDPOINT=/api/students/
KAMPUS_TEACHERS_ENDPOINT=/api/teachers/
KAMPUS_GROUPS_ENDPOINT=/api/academic/groups/

# --- Seguridad del simulador ---
JWT_SECRET=<clave_secreta_propia_del_simulador>
JWT_EXPIRATION=3600                         # 1 hora
JWT_REFRESH_EXPIRATION=604800              # 7 días

# --- CORS ---
CORS_ORIGINS=https://saber11.ieplayasdelviento.edu.co

# --- Redis (Event Bus del simulador) ---
REDIS_URL=redis://redis-saber11:6379/0

# --- API Key para generación IA ---
ANTHROPIC_API_KEY=<tu_api_key>
```

### 3.3 Flujo de autenticación actualizado con URLs reales

```
  Estudiante/Docente
         │
         ▼
  saber11.ieplayasdelviento.edu.co
  (Frontend React del simulador)
         │
         │  POST /auth/login
         │  body: { username, password }
         ▼
  saber11-api.ieplayasdelviento.edu.co
  (API Gateway del simulador)
         │
         │  Proxy: POST /api/token/
         │  body: { username, password }
         ▼
  kampus.ieplayasdelviento.edu.co
  (Backend Kampus — Django REST)
         │
         │  Valida credenciales
         │  Retorna JWT de Kampus
         ▼
  API Gateway recibe JWT de Kampus
         │
         │  Decodifica JWT → extrae user_id, groups
         │  Mapea groups → rol del simulador
         │  GET /api/users/{id}/ → datos del perfil
         │  GET /api/students/{id}/ (si es estudiante)
         │  GET /api/teachers/{id}/ (si es docente)
         │
         │  Emite JWT propio del simulador:
         │  {
         │    user_id: 42,
         │    kampus_user_id: 42,
         │    role: "STUDENT",
         │    name: "María García",
         │    grade: "11-A",
         │    institution_id: "ieplayasdelviento",
         │    exp: 1718900000
         │  }
         ▼
  Frontend almacena JWT del simulador
  (httpOnly cookie o memoria)
         │
         ▼
  Todas las peticiones a microservicios
  llevan: Authorization: Bearer <jwt_simulador>
```

### 3.4 Sincronización periódica de datos

Además de la autenticación en tiempo real, el simulador debe sincronizar datos de Kampus periódicamente:

```python
# Celery beat task — cada 6 horas
@celery_app.task
def sync_students_from_kampus():
    """
    Sincroniza la lista de estudiantes de grado 11 desde Kampus.
    Se usa para:
    - Pre-crear perfiles en el simulador
    - Actualizar grado/grupo si hubo cambios
    - Detectar estudiantes retirados
    """
    kampus_token = get_service_token()  # Token de servicio (service account)
    
    response = requests.get(
        f"{KAMPUS_BASE_URL}/api/students/",
        params={"grade__in": "10,11", "status": "active"},
        headers={"Authorization": f"Bearer {kampus_token}"}
    )
    
    for student in response.json()["results"]:
        StudentProfile.objects.update_or_create(
            kampus_user_id=student["user_id"],
            defaults={
                "name": f"{student['first_name']} {student['last_name']}",
                "grade": student["grade"],
                "group": student["group"],
                "is_active": True,
            }
        )

@celery_app.task
def sync_teachers_from_kampus():
    """
    Sincroniza docentes para asignarles permisos de TEACHER.
    """
    kampus_token = get_service_token()
    
    response = requests.get(
        f"{KAMPUS_BASE_URL}/api/teachers/",
        params={"status": "active"},
        headers={"Authorization": f"Bearer {kampus_token}"}
    )
    
    for teacher in response.json()["results"]:
        TeacherProfile.objects.update_or_create(
            kampus_user_id=teacher["user_id"],
            defaults={
                "name": f"{teacher['first_name']} {teacher['last_name']}",
                "subjects": teacher.get("subjects", []),
                "is_active": True,
            }
        )
```

---

## 4. App Bridge en Kampus (si se requieren endpoints adicionales)

Si la API actual de Kampus no expone toda la información necesaria (por ejemplo, si no hay un endpoint que retorne los `groups` del usuario junto con su perfil), debes crear una app Django liviana dentro del monorepo de Kampus:

```
backend/
├── saber11_bridge/
│   ├── __init__.py
│   ├── apps.py
│   ├── urls.py
│   ├── views.py
│   └── serializers.py
```

### saber11_bridge/views.py

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User


class Saber11UserProfileView(APIView):
    """
    Endpoint dedicado para el simulador Saber 11.
    Retorna el perfil del usuario con rol mapeado y datos relevantes.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        groups = list(user.groups.values_list('name', flat=True))
        
        # Mapeo de grupos de Kampus → rol del simulador
        role = self._map_role(groups, user.is_superuser)
        
        data = {
            "user_id": user.id,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "role": role,
            "groups": groups,
        }
        
        # Si es estudiante, incluir grado y grupo
        if role == "STUDENT":
            try:
                from students.models import Student
                student = Student.objects.get(user=user)
                data["grade"] = student.grade.name if student.grade else None
                data["group"] = student.group.name if student.group else None
                data["student_id"] = student.id
            except Student.DoesNotExist:
                pass
        
        # Si es docente, incluir asignaturas
        elif role == "TEACHER":
            try:
                from teachers.models import Teacher
                teacher = Teacher.objects.get(user=user)
                data["subjects"] = list(
                    teacher.academic_loads.values_list(
                        'subject__name', flat=True
                    ).distinct()
                )
                data["teacher_id"] = teacher.id
            except Teacher.DoesNotExist:
                pass
        
        return Response(data)

    def _map_role(self, groups, is_superuser):
        if is_superuser:
            return "ADMIN"
        
        admin_groups = {'admin', 'rector', 'administrador', 'coordinador'}
        teacher_groups = {'docente', 'teacher'}
        student_groups = {'estudiante', 'student'}
        
        group_set = {g.lower() for g in groups}
        
        if group_set & admin_groups:
            return "ADMIN"
        elif group_set & teacher_groups:
            return "TEACHER"
        elif group_set & student_groups:
            return "STUDENT"
        else:
            return "STUDENT"  # Default para usuarios sin grupo explícito
```

### saber11_bridge/urls.py

```python
from django.urls import path
from .views import Saber11UserProfileView

urlpatterns = [
    path('saber11/profile/', Saber11UserProfileView.as_view(), name='saber11-profile'),
]
```

### Registrar en kampus_backend/urls.py

```python
urlpatterns = [
    # ... urls existentes de Kampus ...
    path('api/', include('saber11_bridge.urls')),
]
```

Esto crea un único endpoint limpio:

```
GET https://kampus.ieplayasdelviento.edu.co/api/saber11/profile/
Authorization: Bearer <jwt_kampus>

Response:
{
    "user_id": 42,
    "username": "maria.garcia",
    "first_name": "María",
    "last_name": "García",
    "email": "maria@ieplayasdelviento.edu.co",
    "role": "STUDENT",
    "groups": ["estudiante"],
    "grade": "11",
    "group": "11-A",
    "student_id": 156
}
```

---

## 5. Docker Compose de producción del simulador

```yaml
# docker-compose.prod.yml para el simulador
services:
  gateway:
    image: saber11/gateway:latest
    environment:
      - KAMPUS_BASE_URL=https://kampus.ieplayasdelviento.edu.co
      - JWT_SECRET=${JWT_SECRET}
      - NODE_ENV=production
    labels:
      - "traefik.http.routers.saber11-api.rule=Host(`saber11-api.ieplayasdelviento.edu.co`)"
      - "traefik.http.routers.saber11-api.tls.certresolver=letsencrypt"

  frontend:
    image: saber11/frontend:latest
    environment:
      - VITE_API_URL=https://saber11-api.ieplayasdelviento.edu.co
    labels:
      - "traefik.http.routers.saber11.rule=Host(`saber11.ieplayasdelviento.edu.co`)"
      - "traefik.http.routers.saber11.tls.certresolver=letsencrypt"

  # ... microservicios (misma configuración del docker-compose.yml principal
  #     pero con imágenes de producción y sin volúmenes de código fuente)

  traefik:
    image: traefik:v3
    command:
      - "--providers.docker=true"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@ieplayasdelviento.edu.co"
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik_certs:/letsencrypt

volumes:
  traefik_certs:
```

---

## 6. Checklist de integración

| # | Tarea | Estado |
|---|---|---|
| 1 | Acceder a `https://kampus.ieplayasdelviento.edu.co/api/` con credenciales admin para mapear endpoints reales | Pendiente |
| 2 | Verificar sistema de autenticación (Token vs JWT) con `grep` en el repositorio | Pendiente |
| 3 | Crear app `saber11_bridge` en el backend de Kampus con el endpoint `/api/saber11/profile/` | Pendiente |
| 4 | Agregar dominio del simulador a `CORS_ALLOWED_ORIGINS` en Kampus producción | Pendiente |
| 5 | Configurar DNS para `saber11.ieplayasdelviento.edu.co` y `saber11-api.ieplayasdelviento.edu.co` | Pendiente |
| 6 | Generar certificados SSL (Let's Encrypt via Traefik o Caddy) | Pendiente |
| 7 | Crear service account en Kampus para sincronización periódica | Pendiente |
| 8 | Desplegar microservicios del simulador con `docker-compose.prod.yml` | Pendiente |
| 9 | Probar flujo completo: login → diagnóstico → plan de estudio | Pendiente |
| 10 | Configurar ANTHROPIC_API_KEY para el AI Generator Service | Pendiente |
