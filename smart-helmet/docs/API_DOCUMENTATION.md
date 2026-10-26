# Smart Helmet for Industrial Safety — API Reference

> Base URL: `http://localhost:3001` (or `http://<YOUR_LAN_IP>:3001` for ESP8266)

---

## Authentication Schemes

### 1. User Web Authentication (JWT)
- **Header**: `Authorization: Bearer <JWT_TOKEN>`
- Used for all dashboard user actions (monitoring, viewing helmets, resolving alerts, modifying settings).

### 2. Device Hardware Ingestion (Shared Secret)
- **Header**: `X-Device-Token: <DEVICE_TOKEN>`
- Used exclusively by the ESP8266 or simulated node when submitting sensor telemetry.

---

## Endpoints

### 1. Ingest Telemetry
```http
POST /api/telemetry
Content-Type: application/json
X-Device-Token: your_configured_device_token
```

#### Request Body
```json
{
  "did": "HELMET-001",
  "seq": 142,
  "tc": 34.5,
  "tr": 705,
  "fd": false,
  "fr": 1,
  "up": 284000,
  "fv": "1.0.0"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "receivedAt": "2026-10-20T04:36:18.109Z"
}
```

---

### 2. User Authentication: Login
```http
POST /api/auth/login
Content-Type: application/json
```

#### Request Body
```json
{
  "email": "admin@smarthelmet.local",
  "password": "Admin@12345"
}
```

#### Response (200 OK)
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "67148a...",
    "email": "admin@smarthelmet.local",
    "role": "admin",
    "displayName": "System Administrator"
  }
}
```

---

### 3. Dashboard Summary
```http
GET /api/dashboard/summary
Authorization: Bearer <TOKEN>
```

#### Response (200 OK)
```json
{
  "totalHelmets": 1,
  "onlineHelmets": 1,
  "offlineHelmets": 0,
  "activeAlerts": 0,
  "criticalAlerts": 0,
  "recentTelemetry": [ ... ]
}
```

---

### 4. Helmet Management
```http
GET /api/helmets
Authorization: Bearer <TOKEN>
```
Returns paginated list of all helmets.

```http
GET /api/helmets/:id
Authorization: Bearer <TOKEN>
```
Returns single helmet metadata, latest packet, and recent alerts.

```http
POST /api/helmets
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "deviceId": "HELMET-002",
  "displayName": "Worker Beta",
  "assignedWorker": "Jane Doe"
}
```

---

### 5. Telemetry Queries
```http
GET /api/telemetry/latest/:deviceId
Authorization: Bearer <TOKEN>
```
Returns most recent telemetry reading for `:deviceId`.

```http
GET /api/telemetry/history/:deviceId?limit=100&page=1
Authorization: Bearer <TOKEN>
```
Returns paginated historical sensor records.

---

### 6. Alert Management
```http
GET /api/alerts?status=active&severity=critical
Authorization: Bearer <TOKEN>
```
Filter alerts by `status` (`active`, `acknowledged`, `resolved`), `severity`, and `deviceId`.

```http
PATCH /api/alerts/:id/acknowledge
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "notes": "Acknowledged by control room operator"
}
```

```http
PATCH /api/alerts/:id/resolve
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "resolutionNote": "Area evacuated and cleared by team"
}
```

---

### 7. Threshold & Demo Configuration
```http
GET /api/settings/thresholds
Authorization: Bearer <TOKEN>
```

```http
PATCH /api/settings/thresholds
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "temperatureWarningC": 45,
  "temperatureCriticalC": 60,
  "flameActiveHigh": true,
  "deviceOfflineTimeoutS": 30
}
```

```http
POST /api/settings/demo/toggle
Authorization: Bearer <TOKEN>
```
Toggles background simulated telemetry generation.

---

### 8. System Health Check (Public)
```http
GET /api/health
```

#### Response (200 OK)
```json
{
  "status": "ok",
  "timestamp": "2026-10-20T04:36:18.109Z",
  "uptime": 128.45,
  "mongoStatus": "connected",
  "disclaimer": "PROTOTYPE ONLY - This system is a college project and must NOT be used as a certified industrial safety system..."
}
```

