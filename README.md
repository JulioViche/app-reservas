# 📆 ReservasEC

**ReservasEC** es una plataforma fullstack de gestión de reservas desarrollada con una arquitectura de microservicios. Permite a los usuarios registrarse, iniciar sesión, gestionar su perfil, crear y cancelar reservas, y recibir notificaciones. El sistema está dockerizado para facilitar el despliegue local.

## 🚀 Tecnologías principales

- **Frontend:** Next.js + Tailwind CSS
- **Backend (Microservicios):**
  - Auth Service (Node.js + Express)
  - Booking Service (Node.js + Express)
  - User Service (Node.js + Express)
  - Notification Service (Node.js + Express + Nodemailer)
- **Base de datos:** MongoDB
- **Autenticación:** JSON Web Tokens (JWT)
- **Contenedores:** Docker + Docker Compose
- **Calidad:** SonarQube + Quality Gates
- **Notificaciones:** Telegram Bot

---

## 📁 Estructura de carpetas

```plaintext
/reservas-ec
├── frontend/                   # Next.js App
├── auth-service/               # Servicio de autenticación
├── user-service/               # Servicio de usuarios
├── booking-service/            # Servicio de reservas
├── notification-service/       # Servicio de notificaciones por email
├── tools/                      # Scripts auxiliares
│   ├── telegram-notify.js      # Notificador a Telegram
│   └── merge-coverage.js       # Fusión de reportes de cobertura
├── .github/workflows/
│   ├── sonarqube.yml           # Pipeline de análisis SonarQube
│   └── telegram-notify.yml     # Pipeline de notificación Telegram
├── .env.example                # Plantilla para variables de entorno
├── sonar-project.properties    # Configuración de SonarQube
├── qualitygate.json            # Definición del Quality Gate StrictGate
└── docker-compose.yml          # Orquestación de todos los servicios
```

---

## ⚙️ Configuración del entorno

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/reservas-ec.git
cd reservas-ec
```

### 2. Variables de entorno

🔐 Frontend (frontend/.env.production.local)

```bash
NEXT_PUBLIC_API_URL=/api/auth
NEXT_PUBLIC_BOOKING_URL=/api/bookings
NEXT_PUBLIC_USER_URL=/api/users
```

🔐 Backend .env (cada microservicio)
Ejemplo para auth-service:

```bash
PORT=4000
MONGO_URI=mongodb://mongo:27017/auth-db
JWT_SECRET=supersecretkey
```

Repite para los demás servicios cambiando PORT, MONGO_URI y usando el mismo JWT_SECRET.

### 3. Configurar tokens de GitHub para el runner

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

> ⚠️ El `.env` está en `.gitignore` — nunca se sube al repositorio.

### 4. 🐳 Uso con Docker

Todos los servicios comparten la red `app-reservas-net`, lo que permite que se comuniquen entre sí por nombre de contenedor.

1. Construir los contenedores

```bash
docker compose build
```

2. Levantar los servicios

```bash
docker compose up -d
```

3. Verificar que todo esté corriendo

```bash
docker compose ps
```

La app estará disponible en:

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| SonarQube | http://localhost:9000 (admin/admin) |
| Auth API | http://localhost:4000 |
| Booking API | http://localhost:5000 |

### 5. Self-hosted runner

Al ejecutar `docker compose up`, el contenedor `app-reservas-runner` se registra automáticamente en tu repositorio de GitHub usando el token del `.env`.

- **Labels:** `app-reservas`, `self-hosted`
- Los workflows están configurados con `runs-on: [self-hosted, app-reservas]`, por lo que los pipelines se ejecutan localmente.
- Como está en la misma red Docker, el runner accede a SonarQube vía `http://app-reservas-sonarqube:9000`.

Para verificar que el runner está registrado:

```
GitHub → Settings → Actions → Runners
```

---

## 📊 SonarQube - Análisis de Calidad

### Levantar SonarQube localmente

SonarQube está incluido en el `docker-compose.yml`. Para iniciarlo:

```bash
docker-compose up sonarqube -d
```

Acceder a http://localhost:9000 (usuario/admin, contraseña/admin).

### Ejecutar análisis manual

Requisitos: Node.js 18+, SonarQube corriendo, token generado.

```bash
# 1. Ejecutar tests con cobertura en cada servicio
cd auth-service && npm test
cd ../booking-service && npm test
cd ../notification-service && npm test
cd ../user-service && npm test
cd ../frontend && npm test

# 2. Fusionar reportes de cobertura
cd .. && node tools/merge-coverage.js

# 3. Ejecutar análisis SonarQube (desde el host)
sonar-scanner \
  -Dsonar.token=TU_TOKEN \
  -Dsonar.host.url=http://localhost:9000
```

> Si ejecutás el análisis desde **dentro de un contenedor** en la red Docker, usá `http://app-reservas-sonarqube:9000`.

### StrictGate - Quality Gate personalizado

El proyecto define un Quality Gate llamado **StrictGate** con los siguientes umbrales:

| Métrica | Condición | Umbral |
|---------|-----------|--------|
| Blocker Issues | > | 0 |
| Critical Issues | > | 0 |
| Major Issues | > | 5 |
| Security Hotspots Reviewed | < | 100% |
| Coverage | < | 80% |
| Duplicated Lines (%) | > | 3% |
| Technical Debt Ratio | > | 2.5% |
| Cyclomatic Complexity (total) | > | 50 |
| Cognitive Complexity (total) | > | 30 |

> Todos los valores deben cumplirse simultáneamente para que el análisis se considere exitoso.

El pipeline de CI/CD fallará automáticamente si el Quality Gate no se cumple.

### Configurar StrictGate en SonarQube

1. Acceder a http://localhost:9000 → **Quality Gates**
2. Crear nuevo → nombre: `StrictGate`
3. Agregar condiciones según la tabla anterior
4. Establecer como default (opcional)
5. El archivo `qualitygate.json` contiene la definición exportable

---

## 🤖 Bot de Telegram

### Crear el bot

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
|--------|-------------|----------------|
| `TELEGRAM_BOT_TOKEN` | Token del bot de Telegram | @BotFather → `/newbot` |
| `TELEGRAM_CHAT_ID` | ID del grupo de Telegram | `https://api.telegram.org/bot<TOKEN>/getUpdates` |

> ✅ `SONAR_TOKEN` y `SONAR_HOST_URL` **ya no son necesarios**. El workflow genera un token temporal automáticamente usando `admin/admin` y `http://app-reservas-sonarqube:9000` va hardcodeado.

> **Nunca exponer tokens o credenciales en el código.**
> Todos los secretos se configuran exclusivamente vía GitHub Secrets.

### Notificaciones

- **Push a main/develop + PRs:** Notificación detallada con estado del Quality Gate, bugs, vulnerabilidades y enlace a logs de SonarQube.
- **Push a otras ramas:** Notificación básica con autor, rama, archivos modificados y enlace al commit.

---

## ✅ Funcionalidades principales

- Registro e inicio de sesión de usuarios
- Perfil editable
- Creación y cancelación de reservas
- Historial de reservas activas y canceladas
- Límite de 5 reservas canceladas visibles
- Notificaciones por email (reserva y cancelación)
- Gestión de microservicios independientes
- Análisis estático de código con SonarQube
- Notificaciones automáticas a Telegram

---

## 🔐 Roles del equipo

- **Líder de calidad:** Configurar SonarQube y definir Quality Gates
- **DevOps:** Configurar pipelines CI/CD e integración con Telegram
- **Desarrolladores:** Corregir código para cumplir umbrales de calidad
