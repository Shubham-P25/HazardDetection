# HazardGuard: Fix and Upgrade Script (2section.md)

You are a senior full-stack engineer working inside the HazardGuard repo. Read this whole file first, then work through the parts **in order**. After each part, run the app, check it works, and write a short note in `CHANGELOG.md` before moving on.

## Context (do not ask me about this, it is already decided)

- **Product:** HazardGuard, an industrial safety dashboard for an IoT hazard-detection college project.
- **Hardware:** Arduino UNO (sensor hub) sends data to a NodeMCU ESP8266 (Wi-Fi uploader). Sensors: MQ-2 (gas and smoke), DHT11 (temperature and humidity), IR flame module, rain module (used as the drainage/leak sensor).
- **Data path:** NodeMCU publishes JSON every 2 s over MQTT to `broker.hivemq.com:1883`, topic `hazard/sensors`. Payload: `{ "mq2": <int ADC>, "temperature": <°C>, "humidity": <%>, "flame": 0|1, "rain": 0|1 }`.
- **Backend (already built):** Express, MQTT client, Socket.io, InfluxDB, Prisma, Telegram/Email/Google Sheets alerts, FastAPI Isolation Forest ML service.
- **Frontend (already built):** tabs Overview, Analytics, Zone map, Incidents. Components: Navbar, SensorCard, RiskGauge, AlertFeed, SensorChart, FloorMap.
- **Auth provider:** Clerk. Do not suggest alternatives.
- **Reference image:** `docs/reference/factory-layout.jpg` is a factory floor plan with named departments (Receiving, Raw Material, Peeling, Crushing, Forming & Cooking, Blasting, Mixing Cooking, Chopping, Chopping Mixing, Food Court). If the file is missing, ask me to add it, then continue with the other parts.
- Put every threshold, zone, sensor-to-room mapping and topic name in **config files**, never hard-coded in components.

## Working rules

1. Before changing code, list the files you will touch and why. Keep diffs small and focused.
2. Don't rewrite things that work. Extend them.
3. No secrets in the repo. Use `.env` and add every new variable to `.env.example`.
4. After every part, tell me exactly how to test it (commands and what I should see).
5. If something I asked for is unclear or unsafe, pick the safest sensible default, note it in `CHANGELOG.md`, and keep going.

---

## Part 0: Live data is not arriving over WebSockets (main issue, do this first)

**Symptom:** hardware is connected, but the Overview shows "WAITING FOR FEED", all cards show a dash, and nothing updates.

Debug the pipeline **one hop at a time**. Do not guess. At each hop, prove it works before moving on.

1. **Device to broker.** Check that messages reach `hazard/sensors` (use a tiny Node script with `mqtt` that subscribes and prints, or the HiveMQ web client). If nothing arrives, the problem is the NodeMCU (Wi-Fi setup, topic, JSON). Stop and tell me.
2. **Broker to backend.** Check that the backend's MQTT client connects, subscribes to the **exact same topic string** as `config.js`, and logs every received message. Add a log line like `[mqtt] hazard/sensors <payload>`. Check that `JSON.parse` doesn't throw silently, and that field names match the payload (`mq2`, `temperature`, `humidity`, `flame`, `rain`).
3. **Backend to Socket.io.** Check that the server emits right after parsing, with a clear event name, e.g. `io.emit("sensor:update", reading)`. The emit must happen **before** any database or alert work, and must not be blocked by an `await` on InfluxDB, Prisma, Telegram or the ML service.
4. **Socket.io to browser.** Check the following, which are the most common causes:
   - Frontend connects to the wrong URL or port. Use `VITE_SOCKET_URL` (or the framework's equivalent) and log the connection.
   - CORS: the Socket.io server `cors.origin` must include the frontend origin (`http://localhost:5173` or whichever port is used), with `credentials: true` if cookies or auth are used.
   - Event name mismatch between `emit` and `on`.
   - The listener is registered inside a component that re-renders or unmounts, so it is attached twice or never. Move the socket into **one** shared module and a `useSocket` hook with proper cleanup (`socket.off`).
   - Dev proxy settings (Vite `server.proxy` with `ws: true`) if the socket goes through the dev server.
   - Mixed content or blocked transport. Try `transports: ["websocket"]` on both sides.
5. **Add a visible connection state** in the UI: `Connecting`, `Live` (with last-message age, e.g. "2 s ago"), `Disconnected` (auto-retry with backoff), and `Device offline` (socket connected but no sensor message for more than 10 s). This replaces the static "WAITING FOR FEED" dot.
6. **Add a debug endpoint** `GET /api/health` returning `{ mqttConnected, socketClients, lastMessageAt, lastReading }` so I can see which hop is broken in one request.
7. Keep the **simulator** working behind `SIMULATOR=true` so the dashboard can be tested without hardware. Show a small "Simulated data" badge when it is on.

**Done when:** with the simulator on, then with the real device on, the Overview updates within about 1 s of each message and the connection pill shows `Live`.

> Security note to apply here: `broker.hivemq.com` is a **public** broker, so anyone can read or publish to `hazard/sensors`. Make the topic prefix configurable (`MQTT_TOPIC_PREFIX`) and recommend a unique hard-to-guess prefix (e.g. `hazardguard/<random-id>/sensors`). Tell me to update the NodeMCU firmware to the same string. Longer term, suggest a private broker with username and password.

---

## Part 1: Navbar redesign

The current navbar looks bad. Replace it with a clean, sticky, responsive one that keeps the existing HazardGuard identity (navy "HG" logo tile, condensed bold wordmark, light blue-grey page background).

Requirements:

- Sticky top bar, about 64 px high, white background, 1 px bottom border, no overlap with page content when scrolling (add top padding to the page container).
- Left: logo tile + "HazardGuard" wordmark. Remove the tracked-out all-caps subtitle or shrink it to one quiet line of sentence-case text.
- Centre or right: tabs **Overview, Analytics, Zone map, Incidents**. Drop the "01 / 02 / 03 / 04" numbering, since these are not a sequence. Active tab uses a bottom underline or a filled pill with strong contrast, plus `aria-current="page"`.
- Far right: the connection pill from Part 0 (`Live`, `Disconnected`, etc.), an **incident count badge** on the Incidents tab (open incidents only), and the Clerk `<UserButton />`.
- Mobile (under 768 px): collapse tabs into a bottom tab bar or a hamburger menu. No horizontal overflow.
- Accessibility: visible keyboard focus, 4.5:1 text contrast, `prefers-reduced-motion` respected, real `<nav>` and `<a>` / router `<NavLink>` elements.
- Fix the fonts so they load reliably (self-host or preload) and make sure nothing flashes or shifts.

---

## Part 2: Authentication with Clerk

Add sign-up, sign-in and route protection. Use `@clerk/clerk-react` on the frontend and `@clerk/express` on the backend.

**Frontend**
1. Wrap the app in `<ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>`.
2. Add routes `/sign-in` and `/sign-up` using Clerk's `<SignIn />` and `<SignUp />` with `routing="path"`. Style the page to match HazardGuard (centered card on the light background with the logo).
3. Protect **all dashboard routes** (Overview, Analytics, Zone map, Incidents). Signed-out users are redirected to `/sign-in`. After sign-in, land on Overview.
4. Show `<UserButton />` in the navbar.

**Backend**
1. Add `clerkMiddleware()` and protect every `/api/*` route with `requireAuth()` (return 401 JSON, not a redirect, for API calls). `/api/health` may stay public but must not expose readings.
2. **Secure the WebSocket too.** The browser sends its Clerk session token in the Socket.io handshake (`auth: { token }`, fetched with `getToken()`). On the server, verify it in an `io.use(...)` middleware (`verifyToken` from `@clerk/backend`) and reject unauthenticated sockets. Handle token refresh on reconnect.
3. Roles: read `publicMetadata.role` with values `admin`, `operator`, `viewer` (default `viewer`). Rules: viewers can only look; operators can acknowledge/resolve incidents; admins can also export, edit alert recipients and thresholds.
4. Add a Prisma `User` model keyed by `clerkId` (email, name, role, `notifyEmail`, `notifyTelegramChatId` nullable). Sync it from Clerk webhooks or on first authenticated request.

**Env vars to add to `.env.example`:** `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`. Tell me exactly where in the Clerk dashboard to enable Google sign-in and set the allowed redirect URLs for `localhost`.

---

## Part 3: Overview, eight sensor fields with clear names

Today there are four cards (Gas / smoke / MQ-2, Temperature, Humidity, Fire / flame / module). Expand to **eight** cards in a responsive grid (4 columns on desktop, 2 on tablet, 1 on mobile). Use plain names a safety officer understands, with the physical sensor shown as small secondary text.

| # | Card name | Source | Unit | Notes |
|---|-----------|--------|------|-------|
| 1 | Gas | MQ-2 | ppm | Combustible gas (LPG/propane curve) |
| 2 | Smoke | MQ-2 | ppm | Smoke curve of the same sensor |
| 3 | Temperature | DHT11 | °C | |
| 4 | Humidity | DHT11 | % | |
| 5 | Flame | IR flame module | Clear / Detected | |
| 6 | Drainage / leak | Rain module | Dry / Wet | Water on the sensor means leakage or flooding |
| 7 | Heat index | Derived from temperature + humidity | °C | "Feels-like" heat stress, computed on the backend |
| 8 | Dew point | Derived from temperature + humidity | °C | Condensation and corrosion risk, computed on the backend |

Important honesty notes, show them in a small info tooltip on the Gas and Smoke cards and in the docs:
- Gas and Smoke both come from **one MQ-2 sensor**. Separate them in software using the MQ-2 datasheet curves (the `MQUnifiedsensor` library already uses these). They are **approximate** and need calibration in clean air (R0) before the numbers mean much.
- Heat index and dew point are **calculated**, not separate sensors. Label them "calculated".
- The DHT11 only reads **0–50 °C** (±2 °C) and 20–90 % humidity. Do not set temperature thresholds above 50.

Backend work for this:
- Extend the reading shape to `{ ts, gas, smoke, temperature, humidity, flame, drainage, heatIndex, dewPoint, risk }` and keep accepting the current NodeMCU payload (`mq2`, `rain`, etc.) so the firmware does not have to change. Put the conversion in one `normalizeReading()` function.
- Fix the unit text bug: the card shows the literal text `\u00B0C`. Use the real character `°C` in source (and make sure files are UTF-8), never an escaped string inside JSX or JSON that is rendered as text.
- Each card shows: big live value, unit, status chip (**Safe / Warning / Danger / Critical**), and a tiny sparkline of the last 60 readings.
- Keep **Composite risk** (0–100 gauge) and **Alert feed**. Risk is computed on the backend from all eight fields, and the existing ML anomaly score may feed into it. Alert feed shows new incidents instantly via socket.

### Thresholds (put in `config/thresholds.js`, editable later by admin, these are starting values to tune after calibration)

| Field | Warning | Danger | Critical |
|-------|---------|--------|----------|
| Gas (ppm) | 300 | 1000 | 2000 |
| Smoke (ppm) | 100 | 300 | 600 |
| Temperature (°C) | 35 | 42 | 48 |
| Humidity (%) | above 75 or below 25 | above 85 or below 20 | n/a |
| Flame | n/a | n/a | Detected = Critical |
| Drainage / leak | n/a | Wet = Danger | Wet for more than 5 min = Critical |
| Heat index (°C) | 38 | 45 | 52 |
| Dew point (°C) | 22 | 26 | n/a |

Use **hysteresis** (a value must drop below the threshold by a margin before the status downgrades) and require **2 consecutive readings** before raising a status, so one noisy sample does not fire an alert.

---

## Part 4: Live graphs with low latency

Every chart (Overview sparklines and Analytics live charts) must be driven by the socket, not static data.

- Keep a **ring buffer** of the last N points per field (N = 120 for live view) in a store (Zustand or a `useRef` + external store). Append on each `sensor:update`, drop the oldest.
- Charting: use **uPlot** or Recharts with `isAnimationActive={false}`. No entrance animation on live data. Update at most once per animation frame (batch with `requestAnimationFrame`) so a burst of messages does not freeze the page.
- Memoize chart components, pass only the slice they need, and never re-render the whole page on each reading.
- Backend: emit to the socket **first**, then write to InfluxDB in the background. Batch Influx writes (for example flush every 1 s or every 20 points) with retry on failure. A slow database must never delay the live feed.
- Show a "last updated 1 s ago" label and let the chart handle gaps (device offline) by breaking the line instead of drawing a flat one.
- Target: reading received by the backend to shown on screen in **under 500 ms** on localhost. Add a tiny dev-only latency meter (`serverTs` vs `Date.now()`) so I can verify it.

---

## Part 5: Analytics tab

Layout, top to bottom: time range control, charts, safety compliance, hazard logs.

1. **Time range control:** Last hour, 24 hours, 7 days, 30 days, custom range. Default 24 hours. The latest minutes stay live (socket) while older data comes from the database.
2. **Charts:** one per field (Risk score, Gas, Smoke, Temperature, Humidity, Flame events, Drainage, Heat index, Dew point). Data comes from `GET /api/history?field=&from=&to=&bucket=`. The backend picks the bucket automatically (raw for 1 h, 1 min for 24 h, 15 min for 7 d, 1 h for 30 d) using InfluxDB aggregation (`aggregateWindow`, mean plus max). Show min/max band where useful. Empty state: "No data for this range yet" with the range shown, not blank axes with 0 to 4.
3. **Data is saved:** confirm every normalized reading is written to InfluxDB (all eight fields plus risk and zone). Add a retention policy note in the README (for example keep raw data 30 days and downsample older).
4. **Safety compliance log** (last 30 days): a table with Date, Zone, Safe minutes, Unsafe minutes, Compliance %. Compute it per day and per zone from stored status history (a scheduled job or an on-demand query). Compliance % = safe minutes ÷ (safe + unsafe minutes). Empty state: "Compliance appears after the first full day of data."
5. **Hazard logs section** (below compliance): a paginated, filterable table of every threshold crossing. Columns: Time, Zone, Sensor, Value and unit, Severity, Duration, Acknowledged by. Filters for severity, sensor and date. Match the layout of the reference image I will add at `docs/reference/hazard-logs.png`. If it is not there yet, build a clean table and mark the layout "pending reference".
6. **Export to Google Sheets button** (admin and operator only):
   - `POST /api/export/sheets` with the current time range and selected fields.
   - The backend writes all sensor data (and optionally hazard logs on a second tab) to a Google Sheet using the existing Google Sheets integration (service account). Create a new spreadsheet named `HazardGuard export <date-time>` or append to a configured one, then return its URL.
   - UI: button with loading state, then a success message with an "Open in Google Sheets" link. On failure, show the reason (for example "sheet not shared with the service account") and offer **Download CSV** as a fallback.
   - Respect Sheets API limits: write in batches of a few thousand rows, and for ranges beyond 30 days warn and cap the export.

---

## Part 6: Zone map (industrial floor plan)

Replace the plain four rectangles with an **SVG factory floor plan** based on `docs/reference/factory-layout.jpg`. This is a digital twin: it must be live.

Layout:
- Draw the plant as one SVG (viewBox about 1200×800) with outer walls, interior walls, doors gaps, and labelled rooms. Draw it as a **clean redrawn plan**, not a pasted copy of the image. Use the reference only for room names and arrangement.
- Rooms (names editable in `config/zones.js`): Receiving, Raw Material Store, Peeling, Crushing, Forming & Cooking, Mixing & Cooking, Chopping, Chopping Mixing, Blasting, Food Court, plus **Toilets / Washroom** (needed for the drainage sensor), and Electrical room. Include a thin walkway/corridor so it reads as a real floor.
- Sensor markers are **small** (about 10–14 px circles with an icon or letter), with a name tooltip and a current value on hover and on tap.

Sensor placement (set in `zones.js`, it should be easy to move them):
| Sensor | Room |
|--------|------|
| Gas | Forming & Cooking (a working room where gas is used) |
| Smoke | Blasting |
| Flame | Raw Material Store (storage) |
| Drainage / leak | Toilets / Washroom |
| Temperature and Humidity | Mixing & Cooking (or the Electrical room, my choice later) |
| Heat index and Dew point | Same room as temperature and humidity |

Behavior:
- Each room has a status computed **only from the sensors inside it**: Safe (green fill), Warning (amber), Danger (orange), Critical (red, with a gentle pulse, respecting reduced motion).
- When one sensor is in danger, **only that room turns red**. Every other room and sensor stays green.
- Rooms with no sensor stay neutral grey and say "No sensor".
- Sensor markers change color with their own status, and the room outline matches the worst status of its sensors.
- Clicking a room or sensor opens a side panel with live value, mini chart, thresholds, and the latest incidents for that room.
- Below the map: a legend (Safe, Warning, Danger, Critical, No sensor) and a compact list of all sensors with live values.
- **Important truth about the hardware:** I physically have **one** sensor node. For now, the single node's readings feed all mapped sensors. Design the data model so a future payload can include `deviceId` and `zone`, and each sensor can then come from a different node without changing the map code. Do not fake per-room values, except when the simulator is on and shows the "Simulated data" badge.

---

## Part 7: Incidents tab

Show **only real emergencies**, saved in the database.

**Prisma models** (add migrations):
- `Incident`: `id`, `sensorField`, `zone`, `severity` (WARNING | DANGER | CRITICAL), `peakValue`, `unit`, `thresholdCrossed`, `startedAt`, `resolvedAt` (nullable), `status` (OPEN | ACKNOWLEDGED | RESOLVED), `acknowledgedByClerkId` (nullable), `note` (nullable).
- `IncidentAlert`: `id`, `incidentId`, `channel` (EMAIL | TELEGRAM), `recipient`, `status` (SENT | FAILED), `error` (nullable), `sentAt`.

**Logic**
- Open an incident when a status reaches Warning or higher (after the debounce from Part 3). While it stays open, update `peakValue` and escalate `severity` if it gets worse, but do **not** create duplicates.
- Auto-resolve when the sensor returns to Safe for a set time (default 60 s).
- Send alerts through the existing Email and Telegram code, record the result of each send in `IncidentAlert` (success or failure with the error). Alerts go to users with `notifyEmail` / `notifyTelegramChatId` set, plus a configured default recipient list. **Rate-limit** alerts so one ongoing incident doesn't spam, for example one alert on open, one on escalation, and one reminder every 10 minutes while open.
- Push `incident:new` and `incident:update` over the socket so the page updates live.

**UI**
- Keep the severity filter (All, Warning, Danger, Critical) and add Open / Resolved filters and a date filter.
- Table columns: Time, Sensor, Zone, Severity, Peak value, Duration, **Alerted** (for example "Email: 2 sent, Telegram: 1 sent, 1 failed" with a detail drawer listing each recipient and time), Status.
- Row actions by role: Acknowledge (operator and admin), Resolve with note (operator and admin).
- Empty state: "No incidents. All sensors are within limits."
- Newest first, paginated, live-updating without reload.

---

## Final checks (run all of these and report results)

1. With the simulator on: all eight cards, live graphs, zone map and incidents update live, and a simulated danger turns **only** the relevant room red.
2. With the real device on: a reading shows on the dashboard in under 1 s; unplugging the device shows `Device offline` after about 10 s.
3. Signed-out users cannot open any page, call any `/api/*` route, or connect a socket.
4. Analytics shows saved history after a page reload, and the Google Sheets export works (or falls back to CSV with a clear message).
5. An incident shows up in the Incidents tab, in the database, and in Email and Telegram, with a recorded send result for each.
6. No console errors, no layout overflow at 375 px width, keyboard navigation works.
7. Update `README.md` (setup, env vars, how to run the simulator, how to calibrate the MQ-2, how to add a new sensor node) and `CHANGELOG.md`.

If any part cannot be completed, stop at that part, say clearly what is blocking it, and continue with the rest.
