# HazardGuard: Finish and Harden Script (3section.md)

You are a senior full-stack engineer working inside the HazardGuard repo (`D:\IOE`). This file continues `2section.md`. A first pass already built most of Parts 0 to 7 of that file. This file lists **what is still missing or broken**, found by reading the code. Read the whole file first, then work through the parts **in order**. After each part, run the app, check it, and add a short note to `CHANGELOG.md` before moving on.

## Context (already decided, do not ask)

- **Stack (real, not what 2section guessed):** backend is Node/Express **CommonJS** + Prisma (Postgres) + InfluxDB + MQTT + Socket.io. Frontend is **Next.js 14 App Router + TypeScript** (not Vite). Charts use **Recharts** and state uses **Zustand**. Both are fine, do not swap them.
- **Auth:** Clerk. Frontend uses `@clerk/nextjs` **v5 API** (`auth().protect()`, `afterSignInUrl`). Backend uses `@clerk/express` and `@clerk/backend`. Do not suggest alternatives and do not upgrade to Clerk v6 patterns.
- **Hardware:** Arduino UNO → NodeMCU ESP8266 → MQTT. Payload: `{ mq2 (raw ADC 0-1023), temperature, humidity, flame 0|1, rain 0|1 }`. One physical node only.
- Thresholds, zones, sensor-to-room mapping and topic names live in **config files**, never hard-coded in components.

## Prerequisites (the owner does these, the bot must NOT)

The owner will personally: install the missing npm packages (`@clerk/nextjs@5`, `zustand`, `recharts` in `frontend`; `@clerk/express`, `@clerk/backend` in `backend`), add the Clerk keys to `backend/.env` and `frontend/.env.local`, and run `npx prisma generate` and `npx prisma migrate dev`.

The bot may **read** `package.json` and run `npm ls <pkg>` to confirm they are installed. If something is missing, **stop and tell the owner the exact command**. Do not install packages and do not edit `.env` files.

## Working rules

1. Before changing code, list the files you will touch and why. Keep diffs small.
2. Do not rewrite things that work. Extend them.
3. Backend stays CommonJS. All files UTF-8. Use real `°C`, never `\u00B0` text rendered in JSX.
4. No secrets in the repo. Every new variable goes into `backend/.env.example` or `frontend/.env.local.example`.
5. `bug_fixes.md` is **superseded** where it conflicts with 2section/3section (it says to delete the simulator; we keep it behind `SIMULATOR=true`). Add a note at the top of `bug_fixes.md` saying so. Do not follow its "remove simulator" step.
6. After every part, tell the owner exactly how to test it (command + what to see).
7. If something is unclear or unsafe, pick the safest default, note it in `CHANGELOG.md`, and continue. If a part is blocked, say why and move on.

---

## Part A: Make the app boot and look right (blockers)

### A1. Missing styles (the biggest gap)

`frontend/app/globals.css` was **never updated** for the new UI. None of these classes exist in it, so the navbar, map panel, pills and auth pages are unstyled: `desktop-nav`, `mobile-nav`, `topbar-right`, `pill-cluster`, `conn-pill`, `sim-badge`, `latency`, `count-badge`, `info`, `sensors-8`, `twin`, `floor`, `legend`, `sensor-list`, `side-panel`, `mini-chart`, `pulse`, `drawer`, `linkish`, `export-row`, `export-error`, `auth-page`, `auth-card`, `auth-brand`, `lede`. There is also no `:focus-visible` and no `prefers-reduced-motion`.

Add these (extend the file, keep the existing look: navy `#132238`, light blue-grey page, 6 px radius panels):

- **Topbar:** height **64 px** (currently 72), sticky, white, 1 px bottom border. `.brand small` becomes one quiet sentence-case line (no tracked all-caps, no `text-transform`). `.topbar-right` is a flex row with gap 12 px.
- **Navigation:** `.desktop-nav` visible at 768 px and up. `.mobile-nav` is a fixed **bottom tab bar** under 768 px (4 equal items, safe-area padding, white background, top border). On mobile hide `.desktop-nav` and add `padding-bottom` to the page shell so content is not covered. No horizontal overflow at 375 px.
- **Active tab:** filled light-blue pill with the existing blue text, strong enough for 4.5:1 contrast. `.count-badge` is a small red rounded number badge.
- **Connection pill:** `.conn-pill` with state classes `connecting` (grey), `live` (green dot), `disconnected` (red), `device-offline` (amber). `.sim-badge` is a small amber "Simulated data" tag. `.latency` is tiny muted text.
- **Sensor grid:** `.sensors-8` is 4 columns on desktop, 2 on tablet, 1 on mobile. Add `.sensor-source` (small muted line), `.info` (small round "i" with tooltip cursor).
- **Map:** `.twin` is a 2-column layout on desktop (map left, sensor list right) and stacked on mobile. `.legend` is a wrapped row of swatches. `.side-panel` is a fixed right drawer on desktop (width ~340 px) and a bottom sheet on mobile, with a visible Close button. `.pulse` is a gentle opacity pulse **only when** `prefers-reduced-motion: no-preference`.
- **Misc:** `.drawer` (alert detail box under the incidents table), `.linkish` (button that looks like a link), `.export-row` (flex, wraps), `.export-error` (red text), `.auth-page` (full-height centered on the page background), `.auth-card` (white panel, max width 440 px), `.lede` (muted paragraph under h1).
- **Accessibility:** visible `:focus-visible` outline (2 px blue, 2 px offset) on links, buttons, inputs and SVG rooms. Text and background contrast at least 4.5:1. `@media (prefers-reduced-motion: reduce)` disables all animation and transitions.

### A2. Fonts

`layout.tsx` loads `DM_Sans` and `Barlow_Condensed` through `next/font`, but `globals.css` hard-codes `font-family:'DM Sans'` and `'Barlow Condensed'`, which will **not** match the generated font names. Change `body` to `font-family: var(--font-body), system-ui, sans-serif` and every display use (`.brand strong`, `.brand-mark`, `h1`, `.reading`, `.panel-title h2`) to `var(--font-display), 'Arial Narrow', sans-serif`. Add `display: 'swap'` and check there is no layout shift.

### A3. Env example files

Bring both example files up to date.

`backend/.env.example` must add: `SIMULATOR`, `SIMULATOR_SEND_ALERTS`, `MQTT_TOPIC_PREFIX` (and explain that `MQTT_TOPIC` overrides it), `DEFAULT_DEVICE_ID`, `MQ2_R0`, `MQ2_RL`, `MQ2_VC`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `INCIDENT_AUTORESOLVE_MS`, `EXPORT_SHARE_EMAIL`, `CLERK_ROLE_CLAIM` (see B3). Change `STALE_AFTER_MS` to `10000` to match the code default and the 10 s rule.

`frontend/.env.local.example` must add: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` (the Next middleware needs it), `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/`, `NEXT_PUBLIC_SOCKET_URL`, `NEXT_PUBLIC_BACKEND_URL`.

Remove every `VITE_CLERK_PUBLISHABLE_KEY` reference from `Providers.tsx`, `Navbar.tsx`, and `backend/src/config.js`. This is Next.js, so only `NEXT_PUBLIC_*` reaches the browser.

### A4. Boot test

With `SIMULATOR=true` run backend and frontend and fix every startup error and every browser console error. Report the output of `GET /api/health`. **Done when:** both start clean, the Overview shows 8 cards updating, the pill says Live, and the page is styled.

---

## Part B: Security and auth fixes

### B1. Ingest key can be bypassed (real hole)

In `backend/src/index.js`, `requireIngestKey` compares `req.get('x-api-key') !== config.INGEST_API_KEY`. If `INGEST_API_KEY` is **not set**, both sides are `undefined`, the comparison is false, and **anyone can POST readings**. Fix:
- `validateConfig()` must **fail at startup** if `INGEST_API_KEY` is missing, empty, or `CHANGE_ME` (only when the HTTP ingest route is enabled).
- Compare with `crypto.timingSafeEqual` on equal-length buffers.

### B2. `req.auth` is overwritten, and `/api/health` never shows the last reading

- In `middleware/auth.js`, `apiAuth` assigns `req.auth = auth`, which clobbers the property that `@clerk/express` provides (it is a function in current versions). Store it as `req.clerk = auth` instead and update `incidentRoutes.js` (`req.auth?.userId` becomes `req.clerk?.userId`).
- In `healthRoutes.js`, `req.auth?.userId` is never truthy, so `lastReading` is never returned, even to signed-in users. Use `getAuth(req)` to decide. Public response: `{ mqttConnected, socketClients, lastMessageAt, simulator }`. Signed-in response adds `lastReading` and `mqttTopic`.
- Remove the hacky top-level `/health` handler that rewrites `req.url`. Make it a normal tiny route returning `{ ok: true }`.

### B3. Roles will always be "viewer" (Clerk gotcha)

Clerk's default session token does **not** contain `publicMetadata`, so `sessionClaims.publicMetadata.role` is always empty and every user becomes `viewer`, which blocks acknowledge, resolve and export for admins. Pick this approach and implement it:

1. In the Clerk Dashboard, Sessions → Customize session token, add the claim `{ "metadata": "{{user.public_metadata}}" }`. Document this in the README.
2. Backend reads the role from `sessionClaims.metadata.role` (and the same claim in the Socket.io `verifyToken` payload). Keep a fallback: if the claim is missing, fetch the user once with `clerkClient.users.getUser(userId)` and cache the role in memory for 5 minutes.
3. `syncUser` currently runs an `upsert` with `update: { role }` on **every API request**, which is a database write per request and overwrites the stored role with the default. Change it to: create the user on first sight, only update role/email/name when they actually changed, and throttle with an in-memory per-user timestamp (once per 5 minutes). Fill `email` and `name` from the Clerk user when fetched.
4. Add `GET /api/me` returning `{ userId, role, email, notifyEmail, notifyTelegramChatId }`.
5. Document how to make someone admin (Clerk Dashboard → Users → Public metadata → `{"role":"admin"}`).

### B4. Flux injection and unchecked input in history

`queryHistory` in `influx.js` interpolates `field`, `from`, `to` and `bucket` straight into a Flux string. Validate in `analyticsRoutes.js` **before** the query:
- `field` must be in a whitelist: `gas, smoke, temperature, humidity, flame, drainage, heatIndex, dewPoint, riskScore`.
- `from` and `to` must parse as valid dates (`Number.isNaN(Date.parse(...))` is rejected with 400), `from < to`, span at most 31 days.
- `bucket` must be one of `raw, 1m, 15m, 1h`.
- `range` must match `^\d+(m|h|d)$` (already true in `queryInflux`, keep it).

### B5. Frontend auth transport

- The API client relies on the Clerk cookie (`credentials: 'include'`). That only works because localhost shares cookies across ports, and breaks in production. Add `setTokenGetter(fn)` in `lib/api.ts`; `Providers` registers `() => getToken()`; every request sends `Authorization: Bearer <token>`. Keep `credentials: 'include'` off unless needed.
- `lib/socket.ts`: use the **function form** `auth: (cb) => getToken().then((token) => cb({ token }))` so every (re)connect sends a fresh token. Do not call `socket.connect()` until the token is available when Clerk is enabled.
- `Providers.tsx` `AuthedShell` re-runs `useSocket` every 50 s because the token is state. Remove the interval and the token state, which also stops `useSocket` from rebinding all listeners and refetching incidents every 50 s.
- Note: when a Socket.io middleware rejects a connection, the client does **not** auto-reconnect. On `connect_error` with message `Unauthorized`, refresh the token and call `socket.connect()` again (max 3 tries), then show `Disconnected`.

### B6. Process-level crash handlers

`unhandledRejection` currently calls `shutdown()`, so any stray rejection (a Telegram timeout, a Prisma hiccup) kills the server. Change it: log the error and keep running. Keep `uncaughtException` as log plus graceful shutdown. Mention in the README that production should run under `pm2` or a similar supervisor.

---

## Part C: Live pipeline correctness

### C1. Cards stay blank after reload

On a new socket connection the server sends only incidents. Until the next sensor message (up to 2 s, or 10 s offline) cards show a dash. In `socketHandler.js` also emit `state.lastReading` and the last 120 readings (keep a small ring buffer in `runtimeState.js`) as `sensor:snapshot`. Frontend: handle `sensor:snapshot` by seeding `history` and `current`.

### C2. Connection state is wrong

- `useSocket.ts` captures `const store = useSensorStore.getState()` once and reads `store.lastMessageAt` inside handlers, which is a **stale snapshot**. Call `useSensorStore.getState()` inside each handler.
- Add `socketConnected: boolean` to the store. `connect` → true, `disconnect`/`connect_error` → false. `connection` is then derived: not socket-connected = `disconnected` (or `connecting` before the first connect); connected but no message for more than 10 s = `device-offline`; otherwise `live`. Today `tick()` flips to `device-offline` about one second after load, so `Connecting` is almost never shown.
- Add reconnection back-off display (`Reconnecting in Ns`) if easy; otherwise skip.

### C3. Re-render cost

`tick()` writes `lastAge` into the store every second, and `app/page.tsx` subscribes to it, so the **whole Overview re-renders every second** and rebuilds four `history.map(...)` series. Fix:
- Move the "N s ago" ticker into `ConnectionPill` and the "Last updated" text into a tiny component with its own `setInterval` and local state. Remove `lastAge` from the store.
- In `page.tsx` build chart series with `useMemo` keyed on `history`, and select only the slice each component needs. Memoize `SensorCard` (`React.memo`).
- `pushReading` replaces missing `gas/smoke/heatIndex/dewPoint` with `0`, which draws fake zeros. Use `null` for missing values and let `LiveChart` break the line.

### C4. Alerts wait for the ML service, and the gauge disagrees with the status

In `readingPipeline.js`:
- `persist()` awaits `checkAnomaly()` (up to 1.5 s timeout) **before** starting alerts and Influx. A slow ML service therefore delays alerts. Start `processAlert`, `updateCompliance` and the Influx write **immediately** with the statuses already computed. Call the ML service in parallel; store its latest result in `runtimeState` and let the **next** reading use it for the score. Do not mutate `data` after it has been emitted.
- The live emit uses the score without anomaly, but Influx stores the score with anomaly, so chart history and the live gauge differ. Use one function, `computeRisk(reading, statuses, lastAnomaly)`, for both.
- `riskScore.js`: a single sensor in DANGER only contributes about 12 points, so the gauge reads about 12 while the status says DANGER. Make the score at least a floor per worst status: WARNING 41, DANGER 66, CRITICAL 86 (use `config.RISK_THRESHOLDS`). Then add the weighted extras, cap at 100.
- Replace the nested ternary that computes `riskLevel` with a small `maxLevel(a, b)` helper.

### C5. DHT11 and partial readings

The DHT11 fails often. The firmware will then send `null` or omit the fields, and `normalizeReading()` **throws and drops the whole reading**, so gas, flame and drainage freeze too. Change it to:
- `mq2`, `flame` and `rain` are still required.
- `temperature` and `humidity` may be missing or non-finite. Reuse the last good values (kept in `runtimeState`) and set `dhtStale: true` plus `dhtAgeMs`. If there is no last good value yet, set them to `null`, skip heat index and dew point, and give those cards the status `NONE` ("No data").
- Frontend: show a small "stale" tag on Temperature, Humidity, Heat index and Dew point when `dhtStale` is true.
- Also reject physically impossible values (temperature outside -10 to 80, humidity outside 0 to 100) as stale, not as a crash.

### C6. The simulator never triggers anything

`simulator.js` makes a spike on **one** tick (`tick % 40 === 39`). The status engine requires **2 consecutive** readings, so a one-tick spike never raises a status, never opens an incident and never turns a room red. Rewrite the pattern:
- A repeating scenario: 30 ticks normal, then **8 ticks** of one fault (cycling gas, smoke, temperature, humidity, flame, drainage), then recover.
- Because auto-resolve is 60 s, make it configurable with `INCIDENT_AUTORESOLVE_MS` (default 60000; use 15000 in the demo).
- Simulated readings must **not pollute real data**: tag Influx points with `simulated=true`; do not write simulated readings to `ComplianceRecord`; do **not** send Email or Telegram for simulated incidents unless `SIMULATOR_SEND_ALERTS=true`; and when `SIMULATOR=true`, log a loud warning and ignore live MQTT messages (or refuse to start if both are on), so fake and real data never mix.

### C7. Status engine is global per field

`statusEngine.js` keeps one `fieldState` per field, so a second node would corrupt the first. Key the map by `${deviceId}:${field}`. Also key `drainageWetSince` in the pipeline by device. Low priority, but cheap now and required by the "future payload with deviceId and zone" rule.

---

## Part D: Incidents, alerts and compliance

### D1. Reminder alert fires right after the first alert (real bug)

In `alertEngine.js`, `dispatchAlerts` keys the timer by `${incident.id}:${kind}`. For kind `reminder` the stored value is `0`, so the check `Date.now() - 0 < alertReminderMs` is false and a "reminder" is sent on the **second reading** (about 2 s after the opening alert), then every 10 minutes. Fix with one timer per incident:
- `lastAlertAt` is keyed by `incident.id` only.
- `open` and `escalation` always send and set the timer.
- `reminder` sends only if `now - lastAlertAt >= alertReminderMs`.
- **No reminders** while the incident status is `ACKNOWLEDGED`.
- Persist the last-alert time so a backend restart does not re-send (add `lastAlertAt DateTime?` and `peakAt` to `Incident`, **tell the owner to run a migration**, or derive it from the newest `IncidentAlert.sentAt`, which needs no migration. Prefer deriving).

### D2. Database write and socket emit on every reading

For every open incident, `processAlert` runs `prisma.incident.update` and `io.emit('incident:update')` on **every reading** (every 2 s) even when nothing changed. The Incidents page refetches `/api/incidents` each time. Only update and emit when `peakValue` or `severity` actually changed. Also cache the open incidents in memory (reload on start) instead of `findMany` on every reading.

### D3. Incident data quality

- `zone` is saved as the room **id** (`raw-material`) but compliance and the UI use the room **name**. Store the room name (look it up in `zones.js`) and keep `zoneId` out of the table.
- For humidity below the low threshold, "peak" must be the **minimum**, not the maximum. Track the most extreme value in the breached direction.
- `unit` is empty for flame and drainage, so the UI shows `1`. In `AlertFeed` and the incidents table format via the field: flame = Detected, drainage = Wet.
- Add an incident `acknowledgedAt` display and show who acknowledged (name or email, not the raw Clerk id) by looking up the `User`.

### D4. Alert content

`dispatchAlerts` passes `riskScore: 0`, so every email says "Risk: 0/100", and messages lack zone, value, unit and time. Pass the real risk score and send: severity, sensor name, **room**, value + unit, threshold crossed, time (IST, `Asia/Kolkata`), and a link to `/incidents`. Escape any user text in the HTML email. Keep Telegram short (one message, no HTML).

### D5. Compliance table writes

`compliance.js` runs a no-op `upsert` with `increment: 0` for **every room on every reading** (about 7 database writes every 2 s) before the real minute logic. Delete that first loop. Keep the per-minute logic but dedupe the minute **per zone**, and skip simulated readings (see C6). A zone is unsafe if any sensor in that room is Warning or higher.

### D6. Incidents page

- Hide Acknowledge/Resolve for `viewer` using the role from `GET /api/me` (and still handle 403 by showing "You do not have permission").
- `acknowledgeAlert` and `resolveIncident` ignore HTTP errors. Check `response.ok` and show an inline message.
- Add an **All** status filter next to Open and Resolved, and a "to" date. Show total count and disable Next on the last page (the API already returns `total`).
- The resolve note input only appears after opening the "Alerted" drawer. Make it a small inline prompt when Resolve is clicked.
- Keep it live without refetching on every event: update the list from the store on `incident:new/update`, refetch only when filters or page change.
- Show alert send detail (who, channel, sent or failed, error) in the drawer. This exists, keep it.

### D7. Notification settings (needed for per-user alerts)

`User.notifyEmail` and `notifyTelegramChatId` exist but nothing sets them, so only the default env recipients ever get alerts. Add a small `/settings` page (protected) where a user sets their own alert email and Telegram chat id via `PATCH /api/me`, and a "Send test alert" button. Validate email and chat id format. Add a **Settings** link to the navbar user area.

---

## Part E: Analytics

### E1. Charts use the old query

`analytics/page.tsx` calls `fetchHistory(range)` (`/api/analytics/history?range=`), which returns **every raw row for the range**: up to 43,000 points a day, and 1.2 million for 30 days. It also ignores the custom range. Switch to `GET /api/history?field=&from=&to=&bucket=` (it already exists) and add a batched form `GET /api/history?fields=gas,smoke,...` so the page makes **one** request, not nine.
- Custom range: send `from` and `to` from the date inputs. Apply only when both are set.
- Bucket by range (raw 1 h, 1 min 24 h, 15 min 7 d, 1 h 30 d), already in `bucketForRange`.
- Return **mean, min and max** per bucket (three aggregations) and draw a light min/max band on charts where it helps (gas, smoke, temperature).
- Empty state: "No data for this range yet" with the range shown.

### E2. Merging history with live data

`merged` just concatenates DB rows and live rows: no sorting, no dedupe, and it recomputes for nine charts on every reading. Fix: sort by time, drop live points older than the last DB point, and insert a `null` point where the gap is more than 3 expected intervals so lines break when the device was offline. Recompute only the live tail for ranges above 1 h.

### E3. Hazard logs

Add filters (severity, sensor, date from/to) and pagination to the table, driven by `/api/analytics/hazards` (it already supports `severity`, `sensor`, `from`, `to`, `limit`, `offset`). Show total count. Keep the "pending reference" note until `docs/reference/hazard-logs.png` exists; when it exists, match its column order and styling.

### E4. Google Sheets export (will not work as built)

`exportToSheets` creates a **new** spreadsheet with the service account. A file created by a service account is owned by that account and is **not visible to the signed-in user**, so "Open in Google Sheets" gives "access denied". Fix, choose in this order:
1. If `GOOGLE_SHEETS_ID` is set (a sheet the owner created and shared with the service account email as Editor), **append a new tab** named `HazardGuard export <date-time>` to it and return that URL.
2. Otherwise create the spreadsheet and **share it** through the Drive API (`drive.permissions.create`) with `EXPORT_SHARE_EMAIL` and the requesting user's email (from `GET /api/me`), then return the URL.

Also: honour `from`, `to` and the selected fields (it currently ignores them and always uses the closest `Nh/Nd` range); use the same bucketed history query as E1 so a 30-day export is not 1M rows; write in batches of at most 2000 rows with a short delay for API limits; return `capped` and show the warning in the UI; map the common errors (403 not shared, missing credentials file, quota) to readable messages. Keep the CSV fallback, and make it export the **same** data as the Sheets export.

### E5. Compliance table

Works, but show Compliance % with a colored chip (green at 95 or more, amber 80 to 94, red below) and sort by date then zone.

---

## Part F: Overview, charts and zone map polish

### F1. `LiveChart`

`LiveChart` puts a `<Line>` inside an `<AreaChart>`. It is redundant (and can be ignored by Recharts). Use `AreaChart` with only `Area`, or `LineChart` with only `Line`. Keep `isAnimationActive={false}`, `connectNulls={false}`. Add the min/max band support from E1.

### F2. Floor map

`FloorMap.tsx` is a good start (room status from its own sensors, legend, side panel). Still missing from 2section Part 6:
- It is **rectangles only**: add interior wall lines, door gaps between rooms and the walkway, and a clean outer wall so it reads like a floor plan. Keep the layout in `config/zones.js`.
- Frontend `config/zones.ts` is a **duplicate** of `backend/src/config/zones.js` and has already drifted (`chopping-mixing` width 180 vs 240). Make the backend the source: the frontend fetches `GET /api/config` once and uses it. Same for thresholds (`config/sensors.ts` duplicates `thresholds.js`).
- Tooltips use SVG `<title>`, which does not work on tap. Show a small floating label with the sensor name and live value on hover **and** on tap/focus.
- Rooms are clickable but not keyboard accessible: add `role="button"`, `tabIndex={0}`, Enter/Space to open, and an `aria-label` with the room name and status.
- Side panel needs: live value per sensor, a mini chart **per sensor** (it only charts the first sensor), the thresholds, and the **latest incidents for that room** (not built yet).
- Room outline must equal the worst status of its own sensors, and sensor markers use their own status. This exists, keep it. Check that a danger in one room leaves every other room green.
- Keep sensor markers small (10 to 14 px). They are currently r=8 (16 px), so use r=6 or 7.
- Data model check: confirm a future payload with `deviceId` and `zone` maps to rooms without changing `FloorMap`.

### F3. Overview

- `sensors-8` grid needs the CSS from A1.
- Cards with status `NONE` (no data) should show "No data", not "Safe".
- The composite risk panel should show the **last updated** time and a small "calculated on server" label.
- Gas/Smoke tooltips exist. Make the info icon keyboard-focusable.

### F4. Calibration (so Gas and Smoke mean something)

`MQ2_R0` defaults to 10, but R0 must come from the sensor in clean air (Rs divided by about 9.83). With R0 = 10, clean air already reads about 100 ppm "gas". Add `backend/scripts/calibrate-mq2.js`: subscribes to MQTT for 60 s in clean air (after the sensor has warmed up for at least 20 min), averages the raw `mq2`, computes Rs and R0, and prints `MQ2_R0=<value>` to paste into `.env`. Document it in the README.

---

## Part G: Repo hygiene and docs

1. `.qmind/chromadb/chroma.sqlite3` is **committed** even though it is in `.gitignore`. Run `git rm --cached .qmind/chromadb/chroma.sqlite3` (tell the owner to commit). Also add `.qmind/`, `*.log`, `.DS_Store` to `.gitignore`. Confirm `.env`, `.env.local` and `google-credentials.json` are not tracked (`git ls-files`).
2. `README.md` is **stale** (says topic `hazard/sensors`, no Clerk, no simulator flag). Rewrite it: setup (backend, frontend, ml-service), every env var, how to run the simulator and what it shows, **how to update the NodeMCU firmware topic** when `MQTT_TOPIC_PREFIX` is set (the firmware topic must equal `<prefix>/sensors`, and a unique random prefix on the public HiveMQ broker is required), MQ-2 calibration (F4), adding a new sensor node (`deviceId` + `zone` in the payload and a row in `zones.js`), data retention (suggest keep raw 30 days, downsample older in Influx), Clerk setup (enable Google sign-in, allowed redirect URLs for `http://localhost:3000`, the session token claim from B3, making an admin), and a troubleshooting section built on `/api/health` and `backend/scripts/mqtt-sniff.js`.
3. Create `CHANGELOG.md` with one entry per part of this file.
4. Add `docs/reference/README.md` explaining that `factory-layout.jpg` and `hazard-logs.png` should be placed there (the owner adds them), and keep the code working without them.
5. Add a note at the top of `bug_fixes.md` (rule 5).
6. Add `backend/scripts/selftest.js` (plain Node, no test framework) that feeds scripted readings through `normalizeReading`, `statusEngine`, `riskScore` and checks: two consecutive high gas readings raise WARNING, one does not; flame = CRITICAL and risk 100; a single DANGER sensor gives a score of at least 66; humidity 90 gives DANGER and 15 gives DANGER; heat index and dew point are finite; a reading with `temperature: null` does not throw (C5). Add `"selftest": "node scripts/selftest.js"` to `backend/package.json` scripts.

---

## Part H (optional, only if time remains)

- Admin-editable thresholds: store overrides in a `ThresholdOverride` table, `PATCH /api/config/thresholds` (admin only), reload without restart. Say in the reply that this needs a migration.
- Admin page to manage default alert recipients.
- Sound or browser notification on new CRITICAL incident (with a mute toggle).
- Per-sensor "last seen" and a "sensor fault" status (for example, MQ-2 stuck at 0 or 1023 for 5 minutes).

---

## Final checks (run all, report results)

1. `npm run selftest` in `backend` passes.
2. Simulator on: all 8 cards and charts update live, one fault raises an incident after two readings, **only that room** turns red, the incident appears in the register, and no Email/Telegram goes out (simulated).
3. Real device on: reading shows in under 1 s; unplugging it shows `Device offline` after about 10 s; a flame test opens a CRITICAL incident and sends exactly **one** opening alert (no second alert 2 s later, no spam for 10 minutes).
4. Signed-out users cannot open any page, call any `/api/*` route (except the limited `/api/health`), or connect a socket. A viewer cannot acknowledge, resolve or export. An admin can.
5. Reload the Overview: cards fill immediately (C1), not after 2 s.
6. Analytics: one network request for history, custom range works, history survives a reload, Sheets export opens for the signed-in user, CSV fallback matches.
7. 375 px width: no horizontal overflow, bottom tab bar visible, keyboard navigation works, no console errors.
8. `git status` clean of secrets; README and CHANGELOG updated.

If any part cannot be completed, stop at that part, say exactly what is blocking it, and continue with the rest.
