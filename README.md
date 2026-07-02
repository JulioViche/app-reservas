# ReservasEC

**ReservasEC** es una plataforma fullstack de gestión de reservas desarrollada con una arquitectura de microservicios.

Incluye un pipeline CI/CD completo con SonarQube, análisis estático de calidad con **StrictGate** (9 métricas), y notificaciones automáticas vía Telegram. El sistema está completamente dockerizado para facilitar el despliegue local y la reproducibilidad.

## Tecnologías principales

- **Frontend:** Next.js + Tailwind CSS
- **Backend (Microservicios):**
  - Auth Service (Node.js + Express)
  - Booking Service (Node.js + Express)
  - User Service (Node.js + Express)
  - Notification Service (Node.js + Express + Nodemailer)
- **Base de datos:** MongoDB
- **Autenticación:** JSON Web Tokens (JWT)
- **Contenedores:** Docker + Docker Compose
- **Calidad:** SonarQube + Quality Gates (StrictGate)
- **CI/CD:** GitHub Actions + Self-hosted Runner
- **Notificaciones:** Telegram Bot

---

## Estructura de carpetas

```plaintext
/reservas-ec
├── frontend/                     # Next.js App
├── auth-service/                 # Servicio de autenticación
├── user-service/                 # Servicio de usuarios
├── booking-service/              # Servicio de reservas
│   ├── src/
│   │   └── bad-code.js           # Código intencionalmente malo (violaciones)
│   └── ...
├── notification-service/         # Servicio de notificaciones por email
├── tools/
│   ├── telegram-notify.js        # Notificador a Telegram (básico + detallado)
│   └── merge-coverage.js         # Fusión de reportes de cobertura
├── .github/workflows/
│   ├── sonarqube.yml             # Pipeline completo de análisis SonarQube
│   └── telegram-notify.yml       # Pipeline de notificación básica (push no-main)
├── .env.example                  # Plantilla para variables de entorno
├── sonar-project.properties      # Configuración unificada de SonarQube
├── qualitygate.json              # Definición exportable de StrictGate
└── docker-compose.yml            # Orquestación de todos los servicios
```

---

## Configuración del entorno

### 1. Clonar el repositorio

```bash
git clone https://github.com/JulioViche/app-reservas.git
cd app-reservas
```

### 2. Variables de entorno del frontend

Crear `frontend/.env.production.local`:

```bash
NEXT_PUBLIC_API_URL=/api/auth
NEXT_PUBLIC_BOOKING_URL=/api/bookings
NEXT_PUBLIC_USER_URL=/api/users
```

### 3. Variables de entorno de cada microservicio

Ejemplo para `auth-service/.env` (repetir para cada servicio cambiando PORT y MONGO_URI):

```bash
PORT=4000
MONGO_URI=mongodb://mongo:27017/auth-db
JWT_SECRET=supersecretkey
```

### 4. Configurar tokens de GitHub para el runner

El `docker-compose.yml` incluye un **self-hosted runner** de GitHub Actions. Para usarlo:

1. Generar un Personal Access Token (classic) en GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic), con scope `repo`.

2. Copiar `.env.example` a `.env` y completar:

```bash
cp .env.example .env
```

Editar `.env`:
```env
GITHUB_REPO_URL=https://github.com/TU_USUARIO/app-reservas
GITHUB_ACCESS_TOKEN=ghp_tu_token_aqui
```

> El `.env` está en `.gitignore` — nunca se sube al repositorio.

### 5. Levantar todo con Docker

```bash
docker compose build
docker compose up -d
```

Verificar que todo esté corriendo:

```bash
docker compose ps
```

La app estará disponible en:

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| SonarQube | http://localhost:9000 |
| Auth API | http://localhost:4000 |
| Booking API | http://localhost:5000 |

---

## Servicios Docker

El archivo `docker-compose.yml` define 7 contenedores en una red compartida `app-reservas-net`:

| Contenedor | Imagen | Propósito |
|---|---|---|
| `app-reservas-mongo` | `mongo:7` | Base de datos MongoDB |
| `app-reservas-auth` | (build local) | Servicio de autenticación |
| `app-reservas-booking` | (build local) | Servicio de reservas |
| `app-reservas-user` | (build local) | Servicio de usuarios |
| `app-reservas-notification` | (build local) | Servicio de notificaciones email |
| `app-reservas-sonarqube` | `sonarqube:community` | Análisis estático de calidad |
| `app-reservas-runner` | `myoung34/github-runner:latest` | Runner self-hosted de GitHub Actions |

Volúmenes persistentes: `sonarqube_data`, `sonarqube_logs`, `sonarqube_extensions`, `runner_data`.

---

## Self-hosted Runner

El contenedor `app-reservas-runner` se registra automáticamente en tu repositorio usando `GITHUB_REPO_URL` y `GITHUB_ACCESS_TOKEN` del `.env`.

- **Labels:** `self-hosted`, `app-reservas`
- Los workflows usan `runs-on: [self-hosted, app-reservas]`
- Corre en la misma red Docker que SonarQube → accede a `http://app-reservas-sonarqube:9000`

Para verificar el registro:
```
GitHub → Settings → Actions → Runners → app-reservas-runner
```

---

## Pipeline CI/CD — SonarQube Analysis

### Disparadores

- Push a `main` o `develop`
- Pull request contra `main` o `develop`

### Flujo del pipeline (`sonarqube.yml`)

El pipeline se ejecuta en el self-hosted runner y consta de 20 pasos:

```
[Checkout] → [Setup Node.js 18] → [npm ci en cada servicio]
  → [npm test + coverage en cada servicio]
  → [Merge coverage reports]          # tools/merge-coverage.js
  → [Ensure SonarQube admin password]  # Auto-configura contraseña
  → [Generate temporary SONAR_TOKEN]   # Token dinámico, no requiere GitHub Secret
  → [SonarQube Scan]                   # qualitygate.wait=true
  → [Get Quality Gate status]          # bugs, vulnerabilities
  → [Revoke temporary token]
  → [Send Telegram notification]       # Detallado (solo si secrets configurados)
  → [Fail pipeline if QG failed]       # exit 1
```

### Auto-configuración de contraseña admin

El step `Ensure SonarQube admin password` intenta autenticarse con `admin:admin` (credenciales por defecto de una instalación fresca). Si funciona, cambia la contraseña a `AppReservasCI2026!`. Si no funciona, prueba con `AppReservasCI2026!` directamente. Esto permite que cualquier desarrollador que levante el entorno localmente obtenga automáticamente un pipeline funcional sin necesidad de configurar manualmente SonarQube.

### Token dinámico

`SONAR_TOKEN` se genera en cada ejecución del pipeline mediante la API de SonarQube (`/api/user_tokens/generate`) y se revoca al finalizar (`/api/user_tokens/revoke`). No es necesario configurarlo como GitHub Secret.

### Fail step

Si el Quality Gate devuelve `FAILED` o `ERROR` (medido con `/api/qualitygates/project_status`), el pipeline imprime `❌ Quality Gate FAILED - Pipeline fallando` y termina con `exit 1`, bloqueando la integración.

---

## Pipeline de notificación básica (`telegram-notify.yml`)

Se ejecuta en **push a cualquier rama excepto main/develop**. Envía un mensaje simple con:

- Autor del commit
- Rama afectada
- Lista de archivos modificados
- Enlace al commit en GitHub

Usa `tools/telegram-notify.js` en modo básico (sin análisis SonarQube).

---

## Coverage — Merge de reportes

Cada servicio genera sus propios reportes de cobertura con Jest en `coverage/lcov.info`. El script `tools/merge-coverage.js` los unifica en un solo archivo `coverage/lcov.info` en la raíz del proyecto. La configuración de SonarQube (`sonar-project.properties`) apunta a esa ruta unificada.

```bash
# Ejecutar tests en cada servicio
cd auth-service && npm test
cd ../booking-service && npm test
cd ../notification-service && npm test
cd ../user-service && npm test
cd ../frontend && npm test

# Fusionar reportes
cd .. && node tools/merge-coverage.js
```

---

## Intentional violations — `booking-service/src/bad-code.js`

El archivo `booking-service/src/bad-code.js` contiene código intencionalmente escrito con malas prácticas para demostrar que el Quality Gate funciona correctamente:

- Variables sin usar
- Funciones excesivamente complejas (anidamiento profundo, lógica redundante)
- Duplicación de código
- Violaciones de seguridad (uso de `eval`)

Mientras este archivo esté presente y sea importado por `booking-service/src/routes/booking.routes.js`, el análisis de SonarQube detectará las violaciones y el Quality Gate fallará.

Para que el pipeline pase exitosamente, eliminar el archivo y la importación en `booking.routes.js`.

---

## SonarQube - Análisis de Calidad

### Acceder a SonarQube

```bash
URL: http://localhost:9000
Usuario: admin
Contraseña: AppReservasCI2026!
```

> En una instalación fresca, las credenciales por defecto son `admin / admin`. El pipeline las cambia automáticamente a `AppReservasCI2026!`.

### StrictGate — Quality Gate personalizado

El proyecto define un Quality Gate llamado **StrictGate** con 9 condiciones que deben cumplirse simultáneamente:

| Métrica | Condición | Umbral |
|---|---|---|
| Blocker Issues | > | 0 |
| Critical Issues | > | 0 |
| Major Issues | > | 5 |
| Security Hotspots Reviewed | < | 100% |
| Coverage | < | 80% |
| Duplicated Lines (%) | > | 3% |
| Technical Debt Ratio | > | 2.5% |
| Cyclomatic Complexity (total) | > | 50 |
| Cognitive Complexity (total) | > | 30 |

El archivo `qualitygate.json` contiene la definición en formato exportable.

### Crear StrictGate desde la UI

1. Ir a http://localhost:9000 → **Quality Gates**
2. Hacer clic en **Create** → nombre: `StrictGate`
3. Agregar cada condición de la tabla anterior (9 en total)
4. Asignar el Quality Gate al proyecto `app-reservas`

### Crear StrictGate desde la API

```bash
# 1. Autenticarse
SONAR_AUTH="admin:AppReservasCI2026!"

# 2. Crear el Quality Gate
curl -X POST -u "$SONAR_AUTH" \
  "http://localhost:9000/api/qualitygates/create" \
  -d "name=StrictGate"

# 3. Agregar condiciones (repetir para las 9 métricas)
curl -X POST -u "$SONAR_AUTH" \
  "http://localhost:9000/api/qualitygates/create_condition" \
  -d "gateName=StrictGate&metric=blocker_issues&op=GT&error=0"

curl -X POST -u "$SONAR_AUTH" \
  "http://localhost:9000/api/qualitygates/create_condition" \
  -d "gateName=StrictGate&metric=critical_issues&op=GT&error=0"

curl -X POST -u "$SONAR_AUTH" \
  "http://localhost:9000/api/qualitygates/create_condition" \
  -d "gateName=StrictGate&metric=major_issues&op=GT&error=5"

curl -X POST -u "$SONAR_AUTH" \
  "http://localhost:9000/api/qualitygates/create_condition" \
  -d "gateName=StrictGate&metric=security_hotspots_reviewed&op=LT&error=100"

curl -X POST -u "$SONAR_AUTH" \
  "http://localhost:9000/api/qualitygates/create_condition" \
  -d "gateName=StrictGate&metric=coverage&op=LT&error=80"

curl -X POST -u "$SONAR_AUTH" \
  "http://localhost:9000/api/qualitygates/create_condition" \
  -d "gateName=StrictGate&metric=duplicated_lines_density&op=GT&error=3"

curl -X POST -u "$SONAR_AUTH" \
  "http://localhost:9000/api/qualitygates/create_condition" \
  -d "gateName=StrictGate&metric=sqale_debt_ratio&op=GT&error=2.5"

curl -X POST -u "$SONAR_AUTH" \
  "http://localhost:9000/api/qualitygates/create_condition" \
  -d "gateName=StrictGate&metric=complexity&op=GT&error=50"

curl -X POST -u "$SONAR_AUTH" \
  "http://localhost:9000/api/qualitygates/create_condition" \
  -d "gateName=StrictGate&metric=cognitive_complexity&op=GT&error=30"
```

### Asignar StrictGate al proyecto

```bash
# Como default (todos los proyectos)
curl -X POST -u "$SONAR_AUTH" \
  "http://localhost:9000/api/qualitygates/set_as_default" \
  -d "name=StrictGate"

# O solo para app-reservas
curl -X POST -u "$SONAR_AUTH" \
  "http://localhost:9000/api/qualitygates/select" \
  -d "gateName=StrictGate&projectKey=app-reservas"
```

### Ejecutar análisis manual

Requisitos: Node.js 18+, SonarQube corriendo, token generado.

```bash
# Instalar sonar-scanner (una vez)
npm install -g sonar-scanner

# 1. Ejecutar tests con cobertura
cd auth-service && npm test
cd ../booking-service && npm test
cd ../notification-service && npm test
cd ../user-service && npm test
cd ../frontend && npm test

# 2. Fusionar reportes
cd .. && node tools/merge-coverage.js

# 3. Generar token temporal
TOKEN=$(curl -s -X POST -u "admin:AppReservasCI2026!" \
  "http://localhost:9000/api/user_tokens/generate" \
  -d "name=manual-scan" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).token))")

# 4. Ejecutar análisis
sonar-scanner \
  -Dsonar.token=$TOKEN \
  -Dsonar.host.url=http://localhost:9000

# 5. Revocar token
curl -s -X POST -u "admin:AppReservasCI2026!" \
  "http://localhost:9000/api/user_tokens/revoke" \
  -d "name=manual-scan"
```

> Si ejecutás el análisis desde un contenedor en la misma red Docker, usá `http://app-reservas-sonarqube:9000`.

---

## Bot de Telegram

### Crear el bot con BotFather

1. En Telegram, buscar **@BotFather**
2. Enviar `/newbot` y seguir las instrucciones
3. Guardar el **HTTP Token** generado

### Configurar el grupo

1. Crear un grupo de Telegram para el equipo
2. Invitar al bot al grupo
3. Obtener el **Chat ID** enviando un mensaje y consultando:

```text
https://api.telegram.org/bot<TOKEN>/getUpdates
```

### Secrets de GitHub necesarios

Agregar en GitHub → Settings → Secrets and variables → Actions:

| Secret | Descripción | Cómo obtenerlo |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Token del bot de Telegram | @BotFather → `/newbot` |
| `TELEGRAM_CHAT_ID` | ID del grupo de Telegram | `https://api.telegram.org/bot<TOKEN>/getUpdates` |

> `SONAR_TOKEN` **no es necesario como secreto**. El workflow genera un token temporal automáticamente usando la contraseña admin y la API de SonarQube, y lo revoca al finalizar.

> **Nunca exponer tokens o credenciales en el código.**
> Todos los secretos se configuran exclusivamente vía GitHub Secrets.

### Tipos de notificación

| Evento | Tipo | Contenido |
|---|---|---|
| Push a main/develop o PR | Detallada | Autor, rama, archivos, enlace al commit, estado del Quality Gate, bugs, vulnerabilidades, enlace a SonarQube |
| Push a otras ramas | Básica | Autor, rama, archivos, enlace al commit |

La notificación detallada se envía desde el pipeline `sonarqube.yml` (paso 19). La notificación básica se envía desde el pipeline `telegram-notify.yml`.

---

## Troubleshooting

### Pipeline falla en "Run user-service tests with coverage"

**Causa:** `JWT_SECRET` no está definido en el entorno de tests. El middleware `verifyToken.js` retorna 500 si no encuentra la variable.

**Solución ya aplicada:** El test setea `process.env.JWT_SECRET` antes de importar los módulos.

### Pipeline falla en "Run frontend tests with coverage"

**Causa:** `jest.config.ts` requiere `ts-node` para parsear TypeScript, pero `ts-node` no está instalado como dependencia.

**Solución ya aplicada:** El archivo se convirtió a `jest.config.js` (CommonScript), eliminando la dependencia de `ts-node`.

### SonarQube no responde

SonarQube tarda 1-2 minutos en iniciar completamente. Esperar y reintentar:

```bash
docker compose logs sonarqube -f
# Esperar hasta que aparezca "SonarQube is operational"
```

### El runner no se registra

Verificar que `.env` contiene las credenciales correctas:

```bash
cat .env
# Debe tener:
# GITHUB_REPO_URL=https://github.com/TU_USUARIO/app-reservas
# GITHUB_ACCESS_TOKEN=ghp_...
```

Si el token expiró, generar uno nuevo y actualizar `.env`, luego reiniciar:

```bash
docker compose down runner
docker compose up -d runner
```

### Quality Gate status es "NONE" (no FAILED)

El StrictGate no ha sido creado o no está asignado al proyecto. Crearlo desde la UI (http://localhost:9000 → Quality Gates) y asignarlo al proyecto `app-reservas`. Alternativamente, usar los comandos curl de la sección [Crear StrictGate desde la API](#crear-strictgate-desde-la-api).

---

## Roles del equipo

- **Líder de calidad:** Configurar SonarQube, definir StrictGate, monitorear métricas.
- **DevOps:** Configurar pipelines CI/CD, mantener el self-hosted runner, integrar Telegram.
- **Desarrolladores:** Corregir código para cumplir umbrales de calidad, eliminar `bad-code.js` cuando corresponda.

---

## Entregables (Tarea)

| Entregable | Archivo |
|---|---|
| Workflow de análisis SonarQube | `.github/workflows/sonarqube.yml` |
| Workflow de notificación Telegram | `.github/workflows/telegram-notify.yml` |
| Quality Gate exportado | `qualitygate.json` |
| Código del bot de Telegram | `tools/telegram-notify.js` |
| Fusión de cobertura | `tools/merge-coverage.js` |
| Configuración de SonarQube | `sonar-project.properties` |

---

## Funcionalidades principales

- Registro e inicio de sesión de usuarios
- Perfil editable
- Creación y cancelación de reservas
- Historial de reservas activas y canceladas
- Límite de 5 reservas canceladas visibles
- Notificaciones por email (reserva y cancelación)
- Gestión de microservicios independientes
- Análisis estático de código con SonarQube (StrictGate)
- Pipeline CI/CD con quality gates y auto-configuración
- Notificaciones automáticas a Telegram
