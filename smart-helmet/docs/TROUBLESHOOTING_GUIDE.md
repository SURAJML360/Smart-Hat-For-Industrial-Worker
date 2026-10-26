# Troubleshooting Guide — Smart Helmet

> Common hardware, network, and application issues with verified diagnosis and remediation steps.

---

## 1. ESP8266 / Wi-Fi Issues

### Symptom: Serial Monitor displays garbled characters or `???`
- **Cause**: Baud rate mismatch.
- **Fix**:
  - The USB debug monitor runs at `115200` baud.
  - SoftwareSerial between Arduino Uno and ESP8266 runs at `9600` baud.
  - Check that your Arduino IDE Serial Monitor is set to **115200 baud**.
  - If your ESP-01 module is set to 115200 factory default on AT firmware, upload `esp_at_bridge.ino` and execute command `AT+UART_DEF=9600,8,1,0,0` to permanently switch it to 9600 baud for stable SoftwareSerial operation.

### Symptom: ESP-01 reboots whenever connecting to Wi-Fi (`AT+CWJAP`)
- **Cause**: Voltage sag / brownout.
- **Fix**: The ESP-01 draws up to 300 mA during RF transmission. Ensure you are powering it via an external 3.3V regulator (AMS1117) with a 10µF capacitor across VCC and GND, rather than the Arduino's 3.3V pin.

### Symptom: ESP reports `ERROR` or `CLOSED` on `AT+CIPSTART`
- **Cause**: The laptop firewall is blocking port 3001, or the IP address changed.
- **Fix**:
  1. Re-check `ipconfig` to ensure your laptop's LAN IP has not changed via DHCP.
  2. Verify Windows Firewall allows TCP port 3001.
  3. Ensure both laptop and ESP8266 are on the same Wi-Fi subnet (e.g., both on `192.168.1.xxx`).

---

## 2. LM35 Temperature Sensor Issues

### Symptom: Temperature reading jumps rapidly by ±5°C to 10°C
- **Cause**: Electrical noise on the ADC input line or analog reference fluctuation.
- **Fix**:
  1. The firmware samples 10 readings and averages them (`TEMP_SAMPLES 10`).
  2. Place a **0.1 µF (100 nF) ceramic capacitor** directly between LM35 `VOUT` and `GND` right at the sensor pins.
  3. Keep the sensor jumper wires as short as possible, away from the ESP8266 antenna.

### Symptom: Temperature reads negative or extreme values (`-999` or `> 125°C`)
- **Cause**: Loose ground connection or inverted LM35 pins (note: looking at the flat face of TO-92 with leads down, pin 1 is Left: +Vs, pin 2 is Center: Vout, pin 3 is Right: GND).
- **Warning**: Inverting LM35 pins will cause the chip to heat up rapidly.

---

## 3. IR Flame Detector Issues

### Symptom: Flame status shows "DETECTED" constantly even without fire
- **Cause**:
  1. Potentiometer sensitivity is adjusted too high (triggering on ambient daylight or fluorescent lights).
  2. Inverted polarity setting in firmware.
- **Fix**:
  1. Use a small screwdriver to turn the on-board blue trimpot counter-clockwise until the `DO` LED turns OFF in normal ambient room lighting.
  2. In `SettingsPage` or `smart_helmet.ino`, toggle `FLAME_ACTIVE_HIGH` if your sensor triggers inverted logic.

---

## 4. Backend & MongoDB Issues

### Symptom: `MongoServerSelectionError: connect ECONNREFUSED`
- **Cause**: Local MongoDB service is not running, or MongoDB Atlas IP whitelist is missing your current IP.
- **Fix**:
  - For local MongoDB: start MongoDB service (`net start MongoDB` in admin terminal).
  - For MongoDB Atlas: log into MongoDB Atlas console -> **Network Access** -> click **Add Current IP Address** (or `0.0.0.0/0` for development).

### Symptom: `401 Unauthorized: Invalid device token`
- **Cause**: The `X-Device-Token` header sent in the POST request does not match `DEVICE_TOKEN` in the backend `.env`.
- **Fix**: Check `DEVICE_TOKEN` in `.env` and verify the exact string is configured in `smart_helmet.ino` or your testing curl command.

---

## 5. Frontend & Browser Issues

### Symptom: Browser displays "Disconnected" with red dot in header
- **Cause**: Socket.IO transport failed to connect to backend server.
- **Fix**:
  1. Verify the backend server is running (`npm start` in `backend/`).
  2. Check browser Developer Tools Console (`F12`).
  3. Ensure valid JWT token is stored in `localStorage` by signing in at `/login`.

