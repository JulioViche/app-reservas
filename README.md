# ReservasEC

Plataforma fullstack de gestión de reservas (microservicios) con pipeline CI/CD, SonarQube + StrictGate, y notificaciones Telegram.

## Entregables

| Entregable | Archivo |
|---|---|
| Workflow análisis SonarQube | `.github/workflows/sonarqube.yml` |
| Workflow notificación Telegram | `.github/workflows/telegram-notify.yml` |
| Quality Gate exportado | `qualitygate.json` |
| Código bot Telegram | `tools/telegram-notify.js` |
| Fusión de cobertura | `tools/merge-coverage.js` |
| Configuración SonarQube | `sonar-project.properties` |

---

## Inicio rápido

```bash
git clone https://github.com/JulioViche/app-reservas.git
cd app-reservas
```

1. Crear `frontend/.env.production.local` con `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_BOOKING_URL`, `NEXT_PUBLIC_USER_URL`
2. Crear `.env` (desde `.env.example`) con `GITHUB_REPO_URL` y `GITHUB_ACCESS_TOKEN` (PAT con scope `repo`)
3. `docker compose build && docker compose up -d`
4. Verificar: `docker compose ps` (7 contenedores)

| Servicio | URL |
|---|---|
| Frontend | http://localhost:3000 |
| SonarQube | http://localhost:9000 |
| Auth API | http://localhost:4000 |
| Booking API | http://localhost:5000 |

> `.env` está en `.gitignore` — nunca se sube.

---

## Self-hosted Runner

El contenedor `app-reservas-runner` (`myoung34/github-runner:latest`) se registra automáticamente con `GITHUB_REPO_URL` y `GITHUB_ACCESS_TOKEN`. Labels: `self-hosted`, `app-reservas`. Corre en la misma red Docker que SonarQube.

Verificar: `GitHub → Settings → Actions → Runners → app-reservas-runner`

---

## SonarQube

```
URL: http://localhost:9000
User: admin
Pass: AppReservasCI2026!
```

> Instalación fresh: `admin:admin`. El pipeline la cambia automáticamente a `AppReservasCI2026!`.

### StrictGate

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

Definición exportable en `qualitygate.json`.

### Crear desde UI

`http://localhost:9000 → Quality Gates → Create → nombre: StrictGate → agregar 9 condiciones → asignar a app-reservas`

### Crear desde API

```bash
SONAR_AUTH="admin:AppReservasCI2026!"
curl -X POST -u "$SONAR_AUTH" "http://localhost:9000/api/qualitygates/create" -d "name=StrictGate"

for c in \
  "metric=blocker_violations&op=GT&error=0" \
  "metric=critical_violations&op=GT&error=0" \
  "metric=major_violations&op=GT&error=5" \
  "metric=security_hotspots_reviewed&op=LT&error=100" \
  "metric=coverage&op=LT&error=80" \
  "metric=duplicated_lines_density&op=GT&error=3" \
  "metric=sqale_debt_ratio&op=GT&error=2.5" \
  "metric=complexity&op=GT&error=50" \
  "metric=cognitive_complexity&op=GT&error=30"; do
  curl -X POST -u "$SONAR_AUTH" "http://localhost:9000/api/qualitygates/create_condition" -d "gateName=StrictGate&$c"
done

curl -X POST -u "$SONAR_AUTH" "http://localhost:9000/api/qualitygates/select" -d "gateName=StrictGate&projectKey=app-reservas"
```

### Ejecutar análisis manual

```bash
cd auth-service && npm test
cd ../booking-service && npm test
cd ../notification-service && npm test
cd ../user-service && npm test
cd ../frontend && npm test
cd .. && node tools/merge-coverage.js

TOKEN=$(curl -s -X POST -u "admin:AppReservasCI2026!" \
  "http://localhost:9000/api/user_tokens/generate" -d "name=manual-scan" \
  | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).token))")

sonar-scanner -Dsonar.token=$TOKEN -Dsonar.host.url=http://localhost:9000

curl -s -X POST -u "admin:AppReservasCI2026!" \
  "http://localhost:9000/api/user_tokens/revoke" -d "name=manual-scan"
```

---

## Pipeline CI/CD (`sonarqube.yml`)

**Disparadores:** push a main/develop, PRs.

Flujo: `Checkout → Node 18 → npm ci (5 servicios) → npm test + coverage (5) → Merge coverage → Ensure admin password → Generate token → SonarQube Scan (wait=false) → Poll QG status → Revoke token → Telegram (always) → Fail if QG failed`

- **Auto-configuración:** prueba `admin:admin` (fresh), cambia a `AppReservasCI2026!`, fallback si ya está cambiada.
- **Token dinámico:** se genera vía API, se revoca al final. No requiere GitHub Secret.
- **Telegram:** `if: always()` — notifica incluso si el QG falla.
- **Fail step:** `exit 1` si el QG es `ERROR` o `FAILED`.

### Pipeline básico (`telegram-notify.yml`)

Push a ramas que no sean main/develop. Mensaje simple: autor, rama, archivos, enlace al commit.

---

## Coverage — Merge

Cada servicio genera `coverage/lcov.info`. `tools/merge-coverage.js` los unifica en `coverage/lcov.info` (raíz). `sonar-project.properties` apunta allí.

---

## Intencional violations (`booking-service/src/bad-code.js`)

Contiene código deliberadamente malo (eval, complejidad, duplicación). Importado por `booking.routes.js`. Mientras exista, el QG falla. Para pasar, eliminar archivo + import.

---

## Telegram

### Crear bot
1. @BotFather → `/newbot` → guardar token
2. Crear grupo, invitar bot
3. `https://api.telegram.org/bot<TOKEN>/getUpdates` → obtener chat_id

### GitHub Secrets

| Secret | Cómo obtenerlo |
|---|---|
| `TELEGRAM_BOT_TOKEN` | @BotFather |
| `TELEGRAM_CHAT_ID` | `getUpdates` |

> `SONAR_TOKEN` **no necesario** — se genera y revoca automáticamente.

### Tipos

| Evento | Contenido |
|---|---|
| Push main/develop o PR | Autor, rama, archivos, commit, QG status, bugs, vulnerabilidades, link SonarQube |
| Otras ramas | Autor, rama, archivos, commit |

---

## Evidencias — Screenshots

Las capturas requeridas deben colocarse en `screenshots/` con los siguientes nombres:

| # | Captura | Archivo | Descripción |
|---|---|---|---|
| 1 | Quality Gate fallido | `screenshots/quality-gate-failed.png` | SonarQube → Quality Gates → StrictGate, mostrando condiciones violadas en rojo (coverage 23.5%, complexity 234, etc.) |
| 2 | Notificación Telegram | `screenshots/telegram-notification.png` | Mensaje recibido en el grupo con autor, rama, archivos, QG status ERROR, bugs, vulnerabilidades |

### Vistas recomendadas para las capturas

**Captura 1 — Quality Gate fallido:**
```
http://localhost:9000 → Projects → app-reservas → Quality Gate tab
```
O también:
```
http://localhost:9000 → Quality Gates → StrictGate → sección Conditions
```

**Captura 2 — Telegram:**
```
Abrir la conversación del grupo donde está el bot → capturar el último mensaje recibido
```

---

## Troubleshooting

| Problema | Causa/Solución |
|---|---|
| Fallo en user-service tests | `JWT_SECRET` faltante — ya corregido en tests |
| Fallo en frontend tests | `jest.config.ts` requiere `ts-node` — convertido a `.js` |
| SonarQube no responde | Esperar 1-2 min, `docker compose logs sonarqube -f` hasta "operational" |
| Runner no registrado | Verificar `.env`, `docker compose down runner && docker compose up -d runner` |
| QG status "NONE" | StrictGate no creado o no asignado — crearlo desde UI o API |

---

## Roles

- **Líder de calidad:** SonarQube, StrictGate, métricas
- **DevOps:** Pipelines, runner, Telegram
- **Desarrolladores:** Corregir código para cumplir umbrales
