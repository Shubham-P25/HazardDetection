# HazardGuard

Industrial hazard detection dashboard with a Node.js/Socket.io backend, Next.js frontend, optional Isolation Forest service, and HTTP sensor simulator.

## Local run

1. Install Node.js 18+ and Python 3.10+.
2. In `backend`, run `npm install` then `npm run dev`.
3. In `frontend`, run `npm install` then copy `.env.local.example` to `.env.local` and run `npm run dev`.
4. In `simulator`, run `npm install` then `npm start`.
5. Open http://localhost:3000.

### Sending real sensor data

For the Arduino/ESP live path, the ESP should publish JSON to MQTT topic `hazard/sensors`. The backend subscribes to that topic and forwards every reading through risk scoring, alerts, persistence, and Socket.io to the dashboard.

In `backend/.env`, configure the broker used by the ESP:

```env
MQTT_ENABLED=true
MQTT_BROKER=mqtt://broker.hivemq.com
MQTT_TOPIC=hazard/sensors
MQTT_USERNAME=
MQTT_PASSWORD=
```

Start the backend with `npm start`. A successful connection logs `MQTT connected` and each received packet logs `MQTT reading received`. The ESP payload should contain `mq2`, `temperature`, `humidity`, `flame`, and `rain`.

The simulator can replay a JSON or CSV export to the backend. Set `DATA_FILE` to the file path:

```powershell
cd simulator
$env:BACKEND_URL = 'http://localhost:4000'
$env:DATA_FILE = 'D:\path\to\sensor-data.json'
$env:INTERVAL_MS = '2000'
npm start
```

JSON may be an array of readings or `{ "readings": [...] }`. CSV must have a header row. The canonical fields are `mq2`, `temperature`, `humidity`, `flame`, and `rain`; common aliases (`gas_ppm`, `temp`, `fire`, and `rain_detected`) are also accepted. Each record is posted to `/api/sensors/reading`.

The backend starts without Postgres, InfluxDB, or ML credentials by using an in-memory development store. Set `backend/.env` from `.env.example` to enable cloud integrations. The ML service is optional; install `ml-service/requirements.txt`, run `python main.py`, then `python train.py`.
