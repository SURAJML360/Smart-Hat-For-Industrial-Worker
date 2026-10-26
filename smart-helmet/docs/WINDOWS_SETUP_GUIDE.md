# Windows Local Development & Network Setup Guide

> Step-by-step instructions for running the Smart Helmet backend and connecting your ESP8266 over your local Windows Wi-Fi network.

---

## 1. Finding Your Laptop's Local IPv4 Address

The ESP8266 Wi-Fi module is an independent computer on your local network. It **cannot connect to `localhost` or `127.0.0.1`** because those refer to the ESP8266 itself!

In PowerShell, run:
```powershell
ipconfig | Select-String "IPv4 Address"
```

Output example:
```
IPv4 Address. . . . . . . . . . . : 192.168.1.105
```

In this example, your laptop's LAN IP is `192.168.1.105`.

---

## 2. Configuring the ESP8266 Firmware

Open `hardware/arduino_uno/smart_helmet.ino` or `hardware/esp8266/nodemcu_bridge/nodemcu_bridge.ino` and update:

```cpp
#define WIFI_SSID          "MyHomeWiFi"           // Must be 2.4 GHz (ESP does not support 5 GHz)
#define WIFI_PASSWORD      "MySecretPassword"
#define SERVER_IP          "192.168.1.105"        // YOUR LAPTOP'S IPv4 FROM STEP 1
#define SERVER_PORT        3001                   // Backend API Port
#define DEVICE_TOKEN       "your_device_token"    // Matches DEVICE_TOKEN in .env
```

---

## 3. Allowing Inbound Traffic on Port 3001 in Windows Firewall

By default, Windows Defender Firewall blocks incoming connections from other devices on the LAN.

Run PowerShell **as Administrator**:
```powershell
New-NetFirewallRule -DisplayName "Smart Helmet Backend (3001)" `
  -Direction Inbound `
  -LocalPort 3001 `
  -Protocol TCP `
  -Action Allow
```

*(To remove this rule later: `Remove-NetFirewallRule -DisplayName "Smart Helmet Backend (3001)"`)*

---

## 4. Wi-Fi Network & Router Best Practices

### College / University Wi-Fi Warning:
- Most university campus networks (eduroam, campus-wide Wi-Fi) enable **Client Isolation (AP Isolation)**, which blocks devices from communicating with one another.
- Campus networks also commonly use **WPA2 Enterprise (802.1x username + password)**, which default ESP8266 AT firmware does not support.

### Recommended Workaround:
Create a **Mobile Hotspot** on your smartphone or Windows laptop:
1. Turn on **Mobile Hotspot** (ensure band is set to **2.4 GHz**).
2. Connect both your Windows laptop and your ESP8266 to this hotspot.
3. Check `ipconfig` again for the new hotspot IPv4 address.

---

## 5. Verifying Connectivity Before Flashing Hardware

Test the backend endpoint locally from PowerShell:
```powershell
# Test health endpoint
Invoke-RestMethod -Uri "http://localhost:3001/api/health" -Method Get

# Test simulated telemetry ingestion
$headers = @{ "X-Device-Token" = "dev-device-token" }
$body = @{
    did = "HELMET-001"
    seq = 1
    tc = 32.5
    tr = 665
    fd = $false
    fr = 1
    up = 10000
    fv = "1.0.0"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/telemetry" `
  -Method Post `
  -Headers $headers `
  -ContentType "application/json" `
  -Body $body
```

---

## 6. TLS / HTTPS Limitations on ESP8266

When transitioning to a public cloud deployment:
- An **ESP-01** module has only **80 KB of internal SRAM** (most of which is consumed by the Wi-Fi stack).
- Verifying large X.509 RSA-4096 certificate chains often causes ESP-01 memory allocation crashes (`out of memory`).
- If HTTPS is mandatory in cloud deployment, use **fingerprint / thumbprint pinning** (supported in native NodeMCU sketches) or deploy a local edge gateway (like a Raspberry Pi or local Node.js bridge) to handle TLS offloading.

