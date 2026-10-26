# System Architecture — Smart Helmet for Industrial Safety

> College Engineering Capstone Project: End-to-End Embedded IoT Safety Monitoring System

---

## 1. High-Level Architectural Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            PHYSICAL HARDWARE LAYER                           │
│                                                                              │
│   ┌───────────────┐                                                          │
│   │ LM35 Sensor   │──(Analog A0)──┐                                          │
│   └───────────────┘               │                                          │
│                                   ▼                                          │
│   ┌───────────────┐        ┌─────────────┐   SoftwareSerial  ┌────────────┐  │
│   │ Flame Sensor  │──(D2)─▶│ Arduino Uno │──(9600 baud D11)─▶│ ESP8266    │  │
│   └───────────────┘        │ R3          │◀─(D10 via div)───│ (ESP-01/   │  │
│                            └─────────────┘                   │  NodeMCU)  │  │
│                              │         │                     └────────────┘  │
│                              ▼         ▼                            │        │
│                           Buzzer(D6)  LED(D7)                       │ WiFi   │
└─────────────────────────────────────────────────────────────────────┼────────┘
                                                                      │
                                                   HTTP POST (JSON)   │
                                                   /api/telemetry     │
                                                   X-Device-Token     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                             BACKEND SERVICE LAYER                            │
│                                                                              │
│                        ┌───────────────────────────────┐                     │
│                        │ Express.js Gateway (:3001)    │                     │
│                        └───────────────────────────────┘                     │
│                                        │                                     │
│            ┌───────────────────────────┼───────────────────────────┐         │
│            ▼                           ▼                           ▼         │
│   ┌─────────────────┐         ┌─────────────────┐         ┌───────────────┐  │
│   │ Ingestion Guard │         │ Alert Engine    │         │ Socket.IO     │  │
│   │ - Device Auth   │         │ - Thresholds    │         │ Real-time Hub │  │
│   │ - Zod Validation│         │ - Deduplication │         │ - Broadcasts  │  │
│   │ - Rate Limiter  │         │ - Escalation    │         │ - Rooms       │  │
│   └─────────────────┘         └─────────────────┘         └───────────────┘  │
│            │                           │                           │         │
│            ▼                           ▼                           │         │
│   ┌─────────────────────────────────────────────┐                  │         │
│   │ MongoDB Database (Collections)              │                  │         │
│   │ - telemetry, alerts, helmets, users, configs│                  │         │
│   └─────────────────────────────────────────────┘                  │         │
└────────────────────────────────────────────────────────────────────┼─────────┘
                                                                     │
                                                   WebSocket Events  │
                                                   & REST JSON API   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND PRESENTATION                             │
│                                                                              │
│     React 18 + Vite + Tailwind CSS Industrial Safety Dashboard (:5173)       │
│                                                                              │
│  ┌───────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐  │
│  │ Live Monitor  │ │ Incident Alerts│ │ Sensor Analysis│ │ Hardware Diag  │  │
│  │ (Gauges/Wave) │ │ (Ack / Resolve)│ │ (History / CSV)│ │ (Link Health)  │  │
│  └───────────────┘ └────────────────┘ └────────────────┘ └────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Telemetry Ingestion Pipeline & Serialization Protocol

### Serial Framing (Arduino to ESP8266)
- Framing: ASCII JSON, newline-delimited (`\n`)
- Serial link: SoftwareSerial on Arduino pins 10 (RX) and 11 (TX) at 9600 baud.
- Pin 0/1 (Hardware UART) is reserved for USB serial debugging at 115200 baud to ensure zero interference between diagnostics and the wireless data stream.

### Wire JSON Schema
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

| Field | Type | Description |
|---|---|---|
| `did` | String | Unique hardware device ID (e.g., `HELMET-001`) |
| `seq` | Unsigned 32-bit Int | Monotonically incrementing telemetry sequence counter |
| `tc` | Float | Calculated temperature in Celsius (°C) |
| `tr` | Unsigned 10-bit Int | Raw ADC integer reading (0 to 1023) |
| `fd` | Boolean | Evaluated flame detection state (`true` = flame detected) |
| `fr` | Integer (0 or 1) | Raw electrical state read from digital input pin D2 |
| `up` | Unsigned 32-bit Int | Embedded node uptime in milliseconds (`millis()`) |
| `fv` | String | Node firmware semantic version |

---

## 3. Server-Authoritative Timestamping & Validation

The server never blindly trusts remote client timestamps. Upon ingestion:
1. `receivedAt`: Generated server-side using `new Date()` upon packet reception.
2. Device `up` (uptime) is retained solely for diagnostics and drift detection.
3. Payloads are checked against the Zod schema: finite numbers only (NaN and Infinity rejected), finite strings, and size capped at 10 KB.

---

## 4. Alert Engine: Deduplication, Escalation, and Recovery

The backend alert engine (`alertService.js`) maintains state consistency without spamming notification channels:

### Temperature State Machine
- **Normal (< 45°C)**:
  - If any active temperature alerts exist (`temperature_warning` or `temperature_critical`), they are auto-resolved with the note: `"Temperature returned to normal"`.
- **Warning (>= 45°C and < 60°C)**:
  - Checks if an active warning alert already exists. If yes, no duplicate alert is created.
  - If no active warning alert exists, creates a `temperature_warning` (severity: `warning`) and broadcasts via Socket.IO.
- **Critical (>= 60°C)**:
  - Any active `temperature_warning` is automatically resolved (escalation).
  - Checks if an active `temperature_critical` already exists. If not, creates one (severity: `critical`) and broadcasts.

### Flame Detection State Machine
- Optical IR flame triggers generate an instantaneous `flame_detected` alert with `critical` severity.
- When flame state returns to clear, the active flame incident is auto-resolved with `"Flame no longer detected"`.

### Inactivity Offline Watchdog
- `deviceMonitor.js` runs a background task every 10 seconds.
- If `now() - helmet.lastSeenAt > DEVICE_OFFLINE_TIMEOUT_S` (default 30s):
  - Helmet status transitions to `offline`.
  - Creates a `device_offline` incident if one is not already open.
- When a valid telemetry packet arrives from an offline device:
  - Helmet status transitions to `online`.
  - Auto-resolves `device_offline` alert and logs `device_reconnected`.

---

## 5. Security & Academic Prototype Boundaries

- **Device Ingestion Auth**: Independent of human user JWTs; authenticated via `X-Device-Token` header.
- **User Auth**: Bearer JWT tokens with bcrypt-hashed passwords.
- **Rate Limiting**: Tiered limits protecting server resources from rogue firmware loops or external probing.
- **Academic Disclaimer**: This software is built for engineering education demonstrations and must never be deployed as life-safety certified equipment.

