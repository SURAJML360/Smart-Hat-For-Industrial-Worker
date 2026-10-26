# Smart Helmet for Industrial Safety

> Comprehensive IoT Safety Telemetry Platform for Industrial Worker Protection  
> Capstone Engineering Prototype Project

[![Backend Unit Tests](https://img.shields.io/badge/backend%20tests-23%20passed-brightgreen.svg)]()
[![Frontend Build](https://img.shields.io/badge/vite%20build-passing-brightgreen.svg)]()
[![Architecture](https://img.shields.io/badge/stack-React%20%7C%20Node%20%7C%20MongoDB%20%7C%20Arduino%20%7C%20ESP8266-blue.svg)]()

---

## 1. System Overview

The **Smart Helmet for Industrial Safety** is an integrated hardware and software solution that continuously monitors ambient temperature and detects flame/fire hazards around industrial personnel in hazardous environments (manufacturing plants, chemical storage, refineries, construction sites).

The system integrates:
1. **Arduino Uno R3** reading an analog LM35 precision temperature sensor and an optical IR flame detector.
2. **Dedicated ESP8266 Wi-Fi Module** forwarding structured telemetry over Wi-Fi via HTTP POST requests.
3. **Node.js & Express REST Backend** enforcing device token authentication, rate limiting, and Zod payload schema validation.
4. **Authoritative Alert Engine** with threshold evaluation, deduplication, escalation, and automatic recovery state machines.
5. **MongoDB Persistence** storing telemetry time series, incident audit logs, worker profiles, and configurable trip points.
6. **Socket.IO Real-time Engine** streaming live sensor readings and incident events to connected clients with sub-second latency.
7. **React 18 + Vite Industrial Dashboard** offering 10 rich dark-mode views including real-time waveforms, interactive gauges, historical trend analytics, hardware diagnostics, and presentation demo simulations.

```
LM35 + IR Flame Sensor 
   ──▶ Arduino Uno R3 
   ──▶ ESP8266 (Wi-Fi) 
   ──▶ Node.js/Express Backend 
   ──▶ MongoDB Atlas 
   ──▶ Socket.IO 
   ──▶ React Industrial Dashboard
```

---

## 2. Project Directory Structure

```
smart-helmet/
├── .env.example                       # Documented environment variable template
├── .gitignore                         # Build, dependency, and secret exclusions
├── README.md                          # Master documentation and quick start
│
├── backend/                           # Node.js / Express / Socket.IO API
│   ├── package.json
│   ├── server.js                      # Application entry point & server setup
│   └── src/
│       ├── config/                    # Environment & database connection
│       ├── models/                    # Mongoose schemas (User, Helmet, Telemetry, Alert, Config)
│       ├── middleware/                # JWT auth, deviceAuth, rate limiting, error handling, Zod
│       ├── validators/                # Zod validation schemas
│       ├── routes/                    # API route definitions
│       ├── controllers/               # Business controllers
│       ├── services/                  # Alert engine, telemetry pipeline, device monitor, demo
│       ├── socket/                    # Socket.IO WebSocket handlers and room management
│       ├── utils/                     # Logger and admin seed generator
│       └── tests/                     # Automated unit and integration test suite
│
├── frontend/                          # React 18 + Vite + Tailwind CSS Dashboard
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx                   # React mounting point
│       ├── App.jsx                    # Route mapping and provider wrapping
│       ├── api/                       # Axios client & modular REST calls
│       ├── context/                   # Auth, Socket.IO, and Demo mode providers
│       ├── hooks/                     # Custom hooks (useSocket, useTelemetry, useAlerts)
│       ├── components/
│       │   ├── layout/                # Sidebar, Header, AppLayout
│       │   ├── common/                # Badges, Spinners, Error & Empty states
│       │   ├── dashboard/             # StatCards, Gauges, Indicators, Active Alerts
│       │   ├── charts/                # Temperature waveforms, Flame timelines, History
│       │   └── alerts/                # Alert cards and resolution modals
│       └── pages/                     # 10 Full Application Pages
│           ├── LoginPage.jsx
│           ├── DashboardPage.jsx
│           ├── LiveMonitorPage.jsx
│           ├── HelmetDetailPage.jsx
│           ├── AlertsPage.jsx
│           ├── AnalyticsPage.jsx
│           ├── HelmetsPage.jsx
│           ├── SettingsPage.jsx
│           ├── DiagnosticsPage.jsx
│           └── AccountPage.jsx
│
├── hardware/                          # Embedded C++ Firmware & Hardware Documentation
│   ├── README.md                      # Complete wiring guide, ASCII schematics, BOM
│   ├── arduino_uno/
│   │   └── smart_helmet.ino           # Production Arduino sketch (LM35 + Flame + SoftSerial)
│   └── esp8266/
│       ├── AT_FIRMWARE_SETUP.md       # ESP-01 AT command reference & flashing instructions
│       ├── esp_at_bridge.ino          # Arduino AT command diagnostic & test utility
│       └── nodemcu_bridge/
│           └── nodemcu_bridge.ino     # Alternative native ESP8266 firmware (NodeMCU)
│
└── docs/                              # Project Technical Documentation
    ├── ARCHITECTURE.md                # System design & data pipeline details
    ├── API_DOCUMENTATION.md           # REST API endpoint reference
    ├── WIRING_AND_CALIBRATION.md      # Pinout, voltage divider & calibration guide
    ├── WINDOWS_SETUP_GUIDE.md         # Windows LAN setup, Firewall rules & IP discovery
    ├── TROUBLESHOOTING_GUIDE.md       # Diagnostic guide for common hardware/software bugs
    └── SAMPLE_PAYLOADS.md             # PowerShell and curl testing commands
```

---

## 3. Quick Start Guide (Windows)

### Prerequisites
- **Node.js** v18+ (tested on v24.14.0)
- **MongoDB** running locally (`mongodb://localhost:27017/smart_helmet`) OR a free **MongoDB Atlas** cluster URI
- **Arduino IDE** (for uploading firmware to hardware)

---

### Step 1: Environment Configuration
Copy `.env.example` in `smart-helmet/` to `.env`:
```powershell
cp .env.example .env
```
Key default values configured:
- Backend port: `3001`
- Frontend port: `5173`
- Default Admin Account: `admin@smarthelmet.local` / `Admin@12345`
- Default Device Ingestion Token: `dev-device-token`

---

### Step 2: Start the Backend Service
```powershell
cd E:\EC\smart-helmet\backend
npm install
npm test          # Runs all 23 automated tests
npm start         # Starts server on http://localhost:3001
```

---

### Step 3: Start the React Dashboard
In a separate terminal:
```powershell
cd E:\EC\smart-helmet\frontend
npm install
npm run dev       # Starts Vite dev server on http://localhost:5173
```
Open **`http://localhost:5173`** in your browser. Sign in using:
- **Email**: `admin@smarthelmet.local`
- **Password**: `Admin@12345`

---

### Step 4: Presentation Demo Mode (No Hardware Needed)
To demonstrate the full real-time telemetry stream before hardware assembly:
1. Navigate to **Settings** in the dashboard.
2. Under **Academic Demo Mode**, click **Launch Demo Mode**.
3. Return to **Dashboard** or **Live Monitor** to view real-time sinusoidal temperature curves and flame events updating via WebSockets without manual page refresh.

---

## 4. Hardware Assembly & Firmware Flashing

### Bill of Materials
- Arduino Uno R3 (ATmega328P)
- LM35 Precision Analog Temperature Sensor
- IR Flame Detector Module (LM393 with digital DO pin)
- ESP8266 (ESP-01 module or NodeMCU)
- 3.3V External Power Regulator (AMS1117-3.3V or buck converter)
- Resistors: 1× 1kΩ, 1× 2kΩ (for UART level shifter), 1× 220Ω (LED), 1× 100Ω (Buzzer)
- Active Buzzer (5V) & Warning LED (5mm Red)

### Flashing Arduino Uno:
1. Connect Arduino Uno via USB.
2. In Arduino IDE, open `hardware/arduino_uno/smart_helmet.ino`.
3. Verify your multimeter-measured reference voltage (`ADC_REF_VOLTAGE`) and Wi-Fi credentials.
4. Select Board: **Arduino Uno** -> Click **Upload**.
5. Open Serial Monitor at **115200 baud** to view real-time diagnostics.

Detailed electrical schematics and calibration procedures are documented in [`docs/WIRING_AND_CALIBRATION.md`](docs/WIRING_AND_CALIBRATION.md).

---

## 5. Verification Checklist

| Status | Verification Dimension | Details |
|---|---|---|
| ✅ **Verified & Tested** | **Backend API & Middleware** | All 23 automated tests pass (device auth, JWT auth, schema validation, rate limits, threshold logic). |
| ✅ **Verified & Tested** | **Frontend Production Build** | React + Vite + Tailwind bundle builds with 0 syntax or compilation errors (`dist/` verified). |
| ✅ **Verified & Tested** | **Real-Time WebSockets** | Socket.IO bi-directional communication channels and room subscription verified. |
| ✅ **Verified & Tested** | **Presentation Demo Mode** | Simulated telemetry generator isolated and clearly marked with `DEMO MODE` tags. |
| 🟡 **Requires Configuration** | **MongoDB Connection** | Requires local MongoDB service running or valid MongoDB Atlas connection string in `.env`. |
| 🟡 **Requires Configuration** | **Windows Firewall** | Requires allowing inbound TCP port 3001 in Windows Defender to allow ESP8266 LAN packets. |
| 🟡 **Requires Hardware Setup** | **Physical Wiring & Power** | Requires connecting sensors, 1kΩ/2kΩ level shifter, and dedicated 3.3V power supply for ESP8266. |
| 🟡 **Requires Hardware Setup** | **Wi-Fi & LAN IP** | Requires updating `WIFI_SSID`, `WIFI_PASSWORD`, and laptop LAN `SERVER_IP` in firmware sketch. |
| 🟡 **Requires Physical Validation** | **Multimeter Calibration** | Requires measuring exact 5V rail voltage and checking flame detector potentiometer sensitivity. |

---

## 6. Safety & Academic Disclaimer

> **IMPORTANT**: This software and hardware design is an **academic college prototype** created for educational and laboratory demonstration purposes. It has not been certified under OSHA, ATEX, IECEx, ANSI/ISEA, or ISO standards for hazardous locations. It must **NOT** be used as a certified industrial safety device, life-safety alarm, or workplace personal protective equipment (PPE).

