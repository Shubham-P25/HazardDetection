# HazardGuard - Bug Fix Guide (for the VS Code bot)

Project root: `D:\IOE`  |  Backend: Node/Express (CommonJS) + Prisma + InfluxDB + MQTT  |  Frontend: Next.js 14 (App Router) + TypeScript  |  ML: FastAPI

Goal of this guide: remove ALL dummy/static data, make the app run only on LIVE data (ESP -> MQTT -> backend -> dashboard), and fix every bug found in the review.

---

## 0. RULES FOR THE BOT (read first, obey always)

1. Do the STEPS in the exact order written. Do ONE step at a time. After each step run its **Verify** command and only continue if it passes.
2. Where a step says **REPLACE ENTIRE FILE**, delete everything in that file and paste the given code. Do not merge, do not "keep the old parts".
3. Do NOT edit any file that is not named in the step. Do NOT rename files or folders. Do NOT "improve" or "refactor" the given code.
4. Backend uses **CommonJS** (`require` / `module.exports`). Do NOT convert it to ES modules / `import`.
5. Do NOT add any npm/pip package that is not listed in this guide.
6. NEVER recreate dummy data, a simulator, an in-memory fallback store, or fake "AI offline" results. If something is missing the app must fail loudly (log or exit), not silently pretend.
7. NEVER print, log, or commit secrets (`.env`, tokens, passwords, `google-credentials.json`).
8. If any command fails, STOP and show the exact error text. Do not try random fixes.
9. All commands are **Windows PowerShell**. Save every file as **UTF-8**.
10. In the code below the degree sign is written as `\u00B0` and the dash as `\u2014` on purpose (fixes broken characters like `Â°C`). Keep them exactly.

---

## 1. BUG INDEX (what is broken and where it is fixed)

| ID | Bug | Fixed in |
|----|-----|----------|
| B01 | MQTT is OFF by default (`MQTT_ENABLED` must equal `true`; template `.env` never sets it) so no live data arrives | Step 2, 10 |
| B02 | Silent fallbacks hide failures: in-memory store, `localReadings`, fake "AI service offline" result, alert channels return silently when not configured | Step 2, 4, 5, 6, 7, 13 |
| B03 | `/history` and `/latest` call `queryInflux('local')` (invalid Flux, can crash Node), ignore `range` | Step 4, 11 |
| B04 | Compliance table never fills in local mode, and counts READINGS not MINUTES | Step 8 |
| B05 | Dashboard starts empty, history/alerts reset every time you change page | Step 12, 16 |
| B06 | "LIVE FEED" badge only means websocket connected, not that the sensor is sending | Step 9, 16 |
| B07 | Risk score can never reach CRITICAL (max 75 without flame); simulator "critical" scored ~61 | Step 3 |
| B08 | Telegram / Gmail / Sheets fail silently when not configured or misconfigured | Step 6, 11, 13 |
| B09 | Sheets: `init()` async and never awaited, first alert never logged, hard-coded key path and tab name | Step 6 |
| B10 | Channel rules inconsistent (email only DANGER+CRITICAL, sheets only CRITICAL) | Step 2, 7 |
| B11 | Cooldown set BEFORE sending, so a failed send is never retried | Step 7 |
| B12 | Incident spam: one incident per minute for the same hazard, never resolved (`resolvedAt` unused) | Step 7 |
| B13 | `AlertLog` table exists but is never written | Step 7 |
| B14 | An error in alerts/compliance aborts the whole pipeline and returns HTTP 400 (wrong status) | Step 9, 11 |
| B15 | No validation: missing fields become `0`, so `{}` is a valid "all safe" reading | Step 9 |
| B16 | No auth, CORS `*`, MQTT on a public broker/topic, no rate limit | Step 2, 11, 13 |
| B17 | Prisma list queries have no `orderBy` (random order on Postgres) | Step 11 |
| B18 | Thresholds duplicated in 4 places and disagree | Step 3, 16 |
| B19 | Analytics chart field mismatch (`risk_score` vs `riskScore`), range ignored | Step 4, 16 |
| B20 | Map page shows `undefined ppm`, "Waiting for feed" never appears, zones ignore warning levels | Step 16 |
| B21 | ML model trained on random fake data, never auto-trained, uses constant flame/rain features | Step 15 |
| B22 | Sensor semantics: flame/rain may be active-LOW, MQ-2 is raw ADC (not ppm), DHT11 can send `nan` | Step 2, 9, 17 |
| B23 | Influx `flush()` on every single point (defeats batching) | Step 4 |
| B24 | `localReadings` kept in memory even when Influx is on | Step 4 |
| B25 | ThingSpeak called on every reading and awaited (free tier = 1 update / 15 s) | Step 9 |
| B26 | Pipeline fully sequential (ML, Influx, ThingSpeak, alerts block each other) | Step 9 |
| B27 | Unused dependencies (`framer-motion`, `clsx`, `python-dotenv`) | Step 0, 15 |
| B28 | `.next/` build output, `Hazard.md`, no `.gitignore`, no `.env.example`, `prisma` only in devDependencies, no `prisma generate` on install | Step 0 |
| B29 | Broken characters (`Â°C`, `â€”`) from wrong file encoding | Step 16 |
| B30 | Dummy data everywhere (simulator, memory stores, synthetic ML training, DB rows) | Step 1, 14, 15 |
| B31 | NEW: two readings processed at the same time can open two incidents (race) | Step 7 |
| B32 | NEW: no crash handlers, no graceful shutdown, no startup checks, no `/health` detail | Step 13 |

---

## STEP 0 - Housekeeping and dependencies

### 0.1 Delete junk and move the build notes

```powershell
cd D:\IOE
Remove-Item -Recurse -Force frontend\.next
New-Item -ItemType Directory -Force docs | Out-Null
Move-Item -Force Hazard.md docs\original-build-notes.md
```
If the folder is in git also run: `git rm -r --cached frontend/.next` (ignore the error if it says it did not match).

### 0.2 Create `D:\IOE\.gitignore` (NEW FILE)

```
node_modules/
.next/
.env
.env.local
google-credentials.json
*.pkl
__pycache__/
.venv/
```

### 0.3 `backend/package.json` - REPLACE ENTIRE FILE

(`prisma` moves to `dependencies`, `postinstall` generates the client, `express-rate-limit` is added.)

```json
{
  "name": "hazard-backend",
  "version": "1.0.0",
  "private": true,
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "postinstall": "prisma generate"
  },
  "dependencies": {
    "@influxdata/influxdb-client": "^1.33.2",
    "@prisma/client": "^5.14.0",
    "axios": "^1.6.8",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "express-rate-limit": "^7.2.0",
    "googleapis": "^134.0.0",
    "mqtt": "^5.5.0",
    "node-telegram-bot-api": "^0.64.0",
    "nodemailer": "^6.9.13",
    "prisma": "^5.14.0",
    "socket.io": "^4.7.5"
  },
  "devDependencies": {
    "nodemon": "^3.1.0"
  }
}
```

Then:
```powershell
cd D:\IOE\backend
npm install
```

### 0.4 Remove unused frontend packages

```powershell
cd D:\IOE\frontend
npm uninstall framer-motion clsx
```

### 0.5 Create `backend/.env.example` (NEW FILE)

```
# ---------- Server ----------
PORT=4000
# Comma separated list of allowed dashboard URLs
FRONTEND_ORIGIN=http://localhost:3000
# Secret used by devices / scripts that POST to the backend. Generate with:
# node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
INGEST_API_KEY=CHANGE_ME

# ---------- Postgres (REQUIRED) ----------
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public

# ---------- InfluxDB (REQUIRED) ----------
INFLUX_URL=https://YOUR_REGION.gcp.influxdata.com
INFLUX_TOKEN=YOUR_INFLUX_TOKEN
INFLUX_ORG=YOUR_INFLUX_ORG
INFLUX_BUCKET=hazard-sensors

# ---------- MQTT (live ESP data) ----------
MQTT_ENABLED=true
MQTT_BROKER=mqtt://broker.hivemq.com
# Use a UNIQUE secret topic on a public broker, or use a private broker with username/password
MQTT_TOPIC=hazardguard/CHANGE_ME_unique_id/sensors
MQTT_USERNAME=
MQTT_PASSWORD=

# ---------- Sensor behaviour ----------
# Set true if your flame / rain module outputs LOW (0) when it detects something
FLAME_ACTIVE_LOW=false
RAIN_ACTIVE_LOW=false
# Mark sensor offline if no reading for this long
STALE_AFTER_MS=30000

# ---------- ML service ----------
ML_SERVICE_URL=http://localhost:8000

# ---------- Alerts (optional but recommended) ----------
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
# Gmail needs 2-Step Verification ON and a 16 character App Password (no spaces)
EMAIL_USER=
EMAIL_PASS=
EMAIL_TO=
GOOGLE_SHEETS_ID=
GOOGLE_SHEETS_TAB=Sheet1
# Defaults to backend/google-credentials.json
GOOGLE_CREDENTIALS_PATH=

# ---------- ThingSpeak (optional) ----------
THINGSPEAK_WRITE_KEY=
```

Now copy it: `Copy-Item backend\.env.example backend\.env` (only if `.env` does not exist) and let the USER fill in the real values. The bot must never invent values.

**Verify Step 0:** `git status` (if git is used) must not list `.next` or `.env`; `node_modules\.prisma\client` exists inside `backend`.

---

## STEP 1 - Database schema and DELETE the dummy data (B30)

### 1.1 `backend/prisma/schema.prisma` - REPLACE ENTIRE FILE

(If this file was missing it MUST exist now. Added: `Incident.riskScore`, `AlertLog.incidentId`, `AlertLog.error`.)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Incident {
  id           String    @id @default(cuid())
  type         String
  sensor       String
  value        Float
  message      String
  riskScore    Int       @default(0)
  acknowledged Boolean   @default(false)
  resolvedAt   DateTime?
  createdAt    DateTime  @default(now())

  @@index([createdAt])
  @@index([resolvedAt])
}

model AlertLog {
  id         String   @id @default(cuid())
  incidentId String?
  channel    String
  message    String
  success    Boolean
  error      String?
  createdAt  DateTime @default(now())

  @@index([createdAt])
}

model ComplianceRecord {
  id            String   @id @default(cuid())
  date          DateTime
  zone          String
  safeMinutes   Int      @default(0)
  unsafeMinutes Int      @default(0)

  @@unique([date, zone])
}
```

### 1.2 Migrate (this also WIPES the Postgres dummy data)

```powershell
cd D:\IOE\backend
npx prisma validate
npx prisma migrate reset --force
npx prisma migrate dev --name hazardguard_v2
```
Explanation: `migrate reset` drops and recreates all tables. This is allowed ONLY because the current rows are dummy data. The `migrations/` folder currently only has `migration_lock.toml` (no SQL), so `migrate dev` creates the first real migration.

### 1.3 Wipe the InfluxDB dummy data

Run once (needs the Influx CLI) or use Influx Cloud UI -> Load Data -> Buckets -> hazard-sensors -> Delete Data:
```powershell
influx delete --bucket hazard-sensors --org YOUR_ORG --token YOUR_TOKEN --start 1970-01-01T00:00:00Z --stop 2100-01-01T00:00:00Z --predicate '_measurement="sensor_readings"'
```
(The bot must ask the user to run this with their own credentials. Do not guess them.)

**Verify Step 1:** `npx prisma studio` shows the three tables, all empty.

---
