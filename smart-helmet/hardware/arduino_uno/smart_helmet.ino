/*
 * =============================================================================
 * Smart Helmet for Industrial Safety - Arduino Uno R3 Firmware
 * =============================================================================
 *
 * Project:     Smart Helmet IoT Safety Monitor
 * Board:       Arduino Uno R3 (ATmega328P)
 * Version:     1.0.0
 * Author:      Smart Helmet Team
 * License:     MIT
 *
 * DESCRIPTION:
 *   This firmware reads environmental sensors (temperature via LM35, flame
 *   detection via digital flame sensor) and transmits telemetry data as JSON
 *   over SoftwareSerial to an ESP8266 (ESP-01 or NodeMCU) for WiFi upload
 *   to a backend server. Local alerts (buzzer + LED) warn the wearer of
 *   hazardous conditions.
 *
 * WIRING:
 *   LM35 Temperature Sensor:
 *     VCC  → 5V
 *     GND  → GND
 *     OUT  → A0
 *
 *   Flame Sensor (digital output):
 *     VCC  → 5V
 *     GND  → GND
 *     DO   → D2
 *
 *   ESP-01 (via SoftwareSerial):
 *     Arduino D10 (SW RX) ← ESP TX  (direct, 3.3V is fine for Arduino input)
 *     Arduino D11 (SW TX) → 1kΩ → ESP RX  (voltage divider: 1kΩ top, 2kΩ to GND)
 *     ESP VCC  → 3.3V external regulator (NOT Arduino 3.3V pin!)
 *     ESP GND  → GND
 *     ESP CH_PD → 3.3V (pulled HIGH to enable)
 *
 *   Buzzer (optional):
 *     (+)  → D6 through 100Ω resistor
 *     (-)  → GND
 *     (For louder output, drive via NPN transistor: D6→1kΩ→base, collector→buzzer→VCC, emitter→GND)
 *
 *   Warning LED (optional):
 *     Anode (+) → D7 through 220Ω resistor
 *     Cathode (-) → GND
 *
 * CALIBRATION PROCEDURE:
 *   1. Measure actual Vref with a multimeter:
 *      - Upload this sketch, open Serial Monitor at 115200 baud
 *      - Measure voltage between Arduino 5V pin and GND with a multimeter
 *      - Update ADC_REF_VOLTAGE with the measured value (e.g., 4.95)
 *   2. Flame sensor polarity:
 *      - With NO flame present, read the DO pin value
 *      - If DO is LOW (no flame) → set FLAME_ACTIVE_HIGH to true
 *      - If DO is HIGH (no flame) → set FLAME_ACTIVE_HIGH to false
 *   3. Temperature verification:
 *      - Compare LM35 reading with a known-good thermometer
 *      - Small offsets can be added in the conversion section if needed
 *
 * TELEMETRY JSON FORMAT:
 *   {"did":"HELMET-001","seq":42,"tc":34.5,"tr":705,"fd":false,"fr":1,"up":123456,"fv":"1.0.0"}\n
 *
 *   Fields:
 *     did = Device ID string
 *     seq = Sequence number (uint32, incrementing, wraps at max)
 *     tc  = Temperature in Celsius (float, -999.0 if invalid)
 *     tr  = Temperature raw ADC value (0-1023)
 *     fd  = Flame detected (boolean, after debounce & polarity)
 *     fr  = Flame raw pin reading (0 or 1, before polarity logic)
 *     up  = Device uptime in milliseconds
 *     fv  = Firmware version string
 *
 * =============================================================================
 */

#include <SoftwareSerial.h>

// =============================================================================
// ============ CONFIGURATION - MODIFY THESE ===================================
// =============================================================================

// --- Device Identity ---
#define DEVICE_ID          "HELMET-001"
#define FIRMWARE_VERSION   "1.0.0"

// --- Sensor Pins ---
#define LM35_PIN           A0       // Analog input for LM35 temperature sensor
#define FLAME_PIN          2        // Digital input for flame sensor DO
#define BUZZER_PIN         6        // PWM-capable pin for buzzer
#define LED_PIN            7        // Digital output for warning LED

// --- Hardware Presence Flags ---
#define BUZZER_ENABLED     true     // Set false if no buzzer connected
#define LED_ENABLED        true     // Set false if no LED connected

// --- ESP8266 SoftwareSerial ---
#define ESP_RX_PIN         10       // Arduino pin receiving FROM ESP8266 TX
#define ESP_TX_PIN         11       // Arduino pin transmitting TO ESP8266 RX
#define ESP_BAUD           9600     // ESP8266 AT firmware baud rate

// --- Sensor Configuration ---
#define ADC_REF_VOLTAGE    5.0      // Measure actual Vref with multimeter!
#define ADC_RESOLUTION     1023.0   // 10-bit ADC max value
#define FLAME_ACTIVE_HIGH  true     // true = HIGH when flame, false = LOW when flame
#define TEMP_SAMPLES       10       // Number of ADC samples for averaging
#define SAMPLE_DELAY_MS    10       // Delay between consecutive ADC samples

// --- Thresholds ---
#define TEMP_WARNING_C     45.0     // Temperature warning threshold (°C)
#define TEMP_CRITICAL_C    60.0     // Temperature critical threshold (°C)

// --- Timing ---
#define TELEMETRY_INTERVAL_MS  2000   // How often to send telemetry (ms)
#define HEARTBEAT_INTERVAL_MS  10000  // Debug heartbeat print interval (ms)
#define SERIAL_TIMEOUT_MS      5000   // Timeout waiting for ESP8266 response

// --- Debug ---
#define DEBUG_SERIAL       true     // Enable debug output on USB Serial
#define DEBUG_BAUD         115200   // USB Serial baud rate for debug

// --- WiFi & Server (used by ESP8266 AT command functions) ---
#define WIFI_SSID          "YourSSID"
#define WIFI_PASSWORD      "YourPassword"
#define SERVER_IP          "192.168.1.100"
#define SERVER_PORT        3001
#define DEVICE_TOKEN       "your_device_token_here"
#define MAX_RETRY_DELAY_MS 30000    // Maximum retry delay for exponential backoff
#define BUFFER_SIZE        5        // Circular buffer for unsent readings

// =============================================================================
// ============ END CONFIGURATION ==============================================
// =============================================================================

// --- Alert State Enum ---
enum AlertState {
  STATE_NORMAL,
  STATE_WARNING,
  STATE_CRITICAL
};

// --- Telemetry Data Structure ---
struct TelemetryData {
  float    temperatureC;      // Converted temperature in Celsius
  int      temperatureRaw;    // Raw ADC reading (averaged)
  bool     flameDetected;     // Debounced, polarity-corrected flame status
  uint8_t  flameRaw;          // Raw digital pin reading (0 or 1)
  bool     tempValid;         // Whether temperature reading is in valid range
};

// --- Circular Buffer for Unsent Readings ---
struct BufferedReading {
  char     jsonPayload[200];  // Pre-formatted JSON string
  bool     occupied;          // Whether this slot has data
};

// =============================================================================
// ============ GLOBAL VARIABLES ===============================================
// =============================================================================

// SoftwareSerial for ESP8266 communication
SoftwareSerial espSerial(ESP_RX_PIN, ESP_TX_PIN);

// Timing trackers (non-blocking)
unsigned long lastTelemetryMs    = 0;
unsigned long lastHeartbeatMs    = 0;
unsigned long lastLedToggleMs    = 0;
unsigned long lastBuzzerToggleMs = 0;
unsigned long lastSampleStartMs  = 0;

// Sequence counter
uint32_t sequenceNumber = 0;

// Current alert state
AlertState currentState = STATE_NORMAL;

// LED and buzzer states for non-blocking patterns
bool ledState    = false;
bool buzzerState = false;

// Flame debounce counter
uint8_t flameConsecutiveCount = 0;
bool    flameDebouncedState   = false;

// Latest telemetry data
TelemetryData latestData;

// ESP8266 connection state
bool espWifiConnected  = false;
bool espServerReady    = false;
unsigned long lastReconnectAttemptMs = 0;
unsigned long currentRetryDelayMs   = 1000;  // Start at 1 second

// Circular buffer for unsent telemetry
BufferedReading sendBuffer[BUFFER_SIZE];
uint8_t bufferHead = 0;  // Next write position
uint8_t bufferTail = 0;  // Next read position
uint8_t bufferCount = 0; // Number of occupied slots

// ADC sampling state (non-blocking multi-sample)
int     adcSamples[TEMP_SAMPLES];
uint8_t adcSampleIndex    = 0;
bool    adcSamplingActive = false;
unsigned long lastAdcSampleMs = 0;

// =============================================================================
// ============ HELPER FUNCTIONS ===============================================
// =============================================================================

/**
 * Print debug message to USB Serial (only if DEBUG_SERIAL is enabled).
 * NEVER sends anything to espSerial.
 */
void debugPrint(const char* msg) {
#if DEBUG_SERIAL
  Serial.print(F("[DBG] "));
  Serial.println(msg);
#endif
}

/**
 * Print debug message with a float value.
 */
void debugPrintFloat(const char* label, float value) {
#if DEBUG_SERIAL
  Serial.print(F("[DBG] "));
  Serial.print(label);
  Serial.println(value, 2);
#endif
}

/**
 * Print debug message with an integer value.
 */
void debugPrintInt(const char* label, long value) {
#if DEBUG_SERIAL
  Serial.print(F("[DBG] "));
  Serial.print(label);
  Serial.println(value);
#endif
}

// =============================================================================
// ============ SENSOR READING =================================================
// =============================================================================

/**
 * Start a new multi-sample ADC reading cycle (non-blocking).
 * Call this once, then call updateAdcSampling() in loop() to collect samples.
 */
void startAdcSampling() {
  adcSampleIndex = 0;
  adcSamplingActive = true;
  lastAdcSampleMs = millis();
  // Take first sample immediately
  adcSamples[0] = analogRead(LM35_PIN);
  adcSampleIndex = 1;
}

/**
 * Non-blocking ADC sample collector.
 * Returns true when all TEMP_SAMPLES have been collected.
 */
bool updateAdcSampling() {
  if (!adcSamplingActive) return false;
  if (adcSampleIndex >= TEMP_SAMPLES) {
    adcSamplingActive = false;
    return true;  // All samples collected
  }

  unsigned long now = millis();
  if (now - lastAdcSampleMs >= SAMPLE_DELAY_MS) {
    adcSamples[adcSampleIndex] = analogRead(LM35_PIN);
    adcSampleIndex++;
    lastAdcSampleMs = now;
  }
  return (adcSampleIndex >= TEMP_SAMPLES);
}

/**
 * Compute averaged ADC reading and convert to temperature.
 * Populates the TelemetryData structure fields for temperature.
 */
void computeTemperature(TelemetryData &data) {
  // Calculate average of collected samples
  long sum = 0;
  for (uint8_t i = 0; i < TEMP_SAMPLES; i++) {
    sum += adcSamples[i];
  }
  int avgRaw = (int)(sum / TEMP_SAMPLES);

  // Convert ADC reading to voltage, then to temperature
  // LM35 outputs 10mV per °C → voltage * 100 = temperature in °C
  float voltage = (float)avgRaw * ADC_REF_VOLTAGE / ADC_RESOLUTION;
  float tempC = voltage * 100.0;

  data.temperatureRaw = avgRaw;

  // Validate range: LM35 operates from -55°C to +150°C
  // We use a slightly wider range for safety
  if (tempC >= -40.0 && tempC <= 125.0) {
    data.temperatureC = tempC;
    data.tempValid = true;
  } else {
    data.temperatureC = -999.0;
    data.tempValid = false;
    debugPrint("WARN: Temperature out of valid range (-40 to 125C)!");
    debugPrintFloat("  Raw ADC avg: ", (float)avgRaw);
    debugPrintFloat("  Computed temp: ", tempC);
  }
}

/**
 * Read flame sensor with debounce (3 consecutive matching reads).
 * Uses FLAME_ACTIVE_HIGH to determine polarity.
 */
void readFlameSensor(TelemetryData &data) {
  uint8_t rawPin = digitalRead(FLAME_PIN);
  data.flameRaw = rawPin;

  // Apply polarity logic
  bool flameActive;
#if FLAME_ACTIVE_HIGH
  flameActive = (rawPin == HIGH);
#else
  flameActive = (rawPin == LOW);
#endif

  // Debounce: require 3 consecutive matching reads
  if (flameActive) {
    if (flameConsecutiveCount < 3) {
      flameConsecutiveCount++;
    }
    if (flameConsecutiveCount >= 3) {
      flameDebouncedState = true;
    }
  } else {
    // Reset on any non-flame reading (immediate clear for safety responsiveness)
    // Actually, for safety we debounce OFF as well — require 3 clear reads
    if (flameConsecutiveCount > 0) {
      flameConsecutiveCount--;
    }
    if (flameConsecutiveCount == 0) {
      flameDebouncedState = false;
    }
  }

  data.flameDetected = flameDebouncedState;
}

// =============================================================================
// ============ ALERT STATE MANAGEMENT =========================================
// =============================================================================

/**
 * Determine alert state based on sensor readings.
 */
AlertState determineAlertState(const TelemetryData &data) {
  // Critical: flame detected OR temperature >= critical threshold
  if (data.flameDetected) {
    return STATE_CRITICAL;
  }
  if (data.tempValid && data.temperatureC >= TEMP_CRITICAL_C) {
    return STATE_CRITICAL;
  }

  // Warning: temperature >= warning threshold
  if (data.tempValid && data.temperatureC >= TEMP_WARNING_C) {
    return STATE_WARNING;
  }

  return STATE_NORMAL;
}

/**
 * Update LED pattern (non-blocking).
 *   NORMAL:   LED off
 *   WARNING:  Slow blink at 1Hz (500ms on, 500ms off)
 *   CRITICAL: Fast blink at 4Hz (125ms on, 125ms off)
 */
void updateLed(AlertState state) {
#if LED_ENABLED
  unsigned long now = millis();
  unsigned long interval;

  switch (state) {
    case STATE_NORMAL:
      if (ledState) {
        digitalWrite(LED_PIN, LOW);
        ledState = false;
      }
      return;

    case STATE_WARNING:
      interval = 500;  // 1Hz blink
      break;

    case STATE_CRITICAL:
      interval = 125;  // 4Hz blink
      break;
  }

  if (now - lastLedToggleMs >= interval) {
    ledState = !ledState;
    digitalWrite(LED_PIN, ledState ? HIGH : LOW);
    lastLedToggleMs = now;
  }
#endif
}

/**
 * Update buzzer pattern (non-blocking).
 *   NORMAL:   Buzzer off
 *   WARNING:  Short beeps at 1Hz (100ms on, 900ms off)
 *   CRITICAL: Continuous tone
 */
void updateBuzzer(AlertState state) {
#if BUZZER_ENABLED
  unsigned long now = millis();

  switch (state) {
    case STATE_NORMAL:
      if (buzzerState) {
        noTone(BUZZER_PIN);
        buzzerState = false;
      }
      return;

    case STATE_WARNING:
      // Short beep pattern: 100ms ON, 900ms OFF → 1Hz cycle
      if (buzzerState) {
        // Currently ON — turn off after 100ms
        if (now - lastBuzzerToggleMs >= 100) {
          noTone(BUZZER_PIN);
          buzzerState = false;
          lastBuzzerToggleMs = now;
        }
      } else {
        // Currently OFF — turn on after 900ms
        if (now - lastBuzzerToggleMs >= 900) {
          tone(BUZZER_PIN, 2000);  // 2kHz warning tone
          buzzerState = true;
          lastBuzzerToggleMs = now;
        }
      }
      break;

    case STATE_CRITICAL:
      if (!buzzerState) {
        tone(BUZZER_PIN, 3000);  // 3kHz critical tone (continuous)
        buzzerState = true;
        lastBuzzerToggleMs = now;
      }
      break;
  }
#endif
}

// =============================================================================
// ============ TELEMETRY FORMATTING ===========================================
// =============================================================================

/**
 * Format telemetry data as compact JSON string into the provided buffer.
 * Returns the number of characters written (excluding null terminator).
 */
int formatTelemetryJson(char* buf, size_t bufSize, const TelemetryData &data, uint32_t seq) {
  // Build JSON manually to avoid ArduinoJson dependency on Uno (saves ~3KB RAM)
  // Format: {"did":"HELMET-001","seq":42,"tc":34.50,"tr":705,"fd":false,"fr":1,"up":123456,"fv":"1.0.0"}
  int n = snprintf(buf, bufSize,
    "{\"did\":\"%s\",\"seq\":%lu,\"tc\":",
    DEVICE_ID, (unsigned long)seq);

  // Format temperature with 2 decimal places
  // snprintf %f may not be available on AVR, use dtostrf
  char tempStr[10];
  dtostrf(data.temperatureC, 1, 2, tempStr);
  n += snprintf(buf + n, bufSize - n, "%s", tempStr);

  n += snprintf(buf + n, bufSize - n,
    ",\"tr\":%d,\"fd\":%s,\"fr\":%d,\"up\":%lu,\"fv\":\"%s\"}",
    data.temperatureRaw,
    data.flameDetected ? "true" : "false",
    data.flameRaw,
    millis(),
    FIRMWARE_VERSION);

  return n;
}

// =============================================================================
// ============ CIRCULAR BUFFER MANAGEMENT =====================================
// =============================================================================

/**
 * Add a JSON payload string to the circular send buffer.
 * If buffer is full, the oldest entry is overwritten.
 */
void bufferEnqueue(const char* json) {
  strncpy(sendBuffer[bufferHead].jsonPayload, json, sizeof(sendBuffer[0].jsonPayload) - 1);
  sendBuffer[bufferHead].jsonPayload[sizeof(sendBuffer[0].jsonPayload) - 1] = '\0';
  sendBuffer[bufferHead].occupied = true;

  bufferHead = (bufferHead + 1) % BUFFER_SIZE;

  if (bufferCount < BUFFER_SIZE) {
    bufferCount++;
  } else {
    // Overwriting oldest — advance tail
    bufferTail = (bufferTail + 1) % BUFFER_SIZE;
    debugPrint("WARN: Send buffer full, oldest reading dropped");
  }
}

/**
 * Peek at the oldest buffered entry (does not remove it).
 * Returns pointer to JSON string, or NULL if buffer empty.
 */
const char* bufferPeek() {
  if (bufferCount == 0) return NULL;
  return sendBuffer[bufferTail].jsonPayload;
}

/**
 * Remove the oldest entry from the buffer (after successful send).
 */
void bufferDequeue() {
  if (bufferCount == 0) return;
  sendBuffer[bufferTail].occupied = false;
  bufferTail = (bufferTail + 1) % BUFFER_SIZE;
  bufferCount--;
}

// =============================================================================
// ============ ESP8266 AT COMMAND INTERFACE ===================================
// =============================================================================

/**
 * Send an AT command to ESP8266 and wait for expected response.
 * Returns true if expected response received within timeout.
 */
bool espSendCommand(const char* cmd, const char* expectedResp, unsigned long timeoutMs) {
  // Flush any pending data in the receive buffer
  while (espSerial.available()) {
    espSerial.read();
  }

  espSerial.println(cmd);

  debugPrint(cmd);

  unsigned long startMs = millis();
  String response = "";

  while (millis() - startMs < timeoutMs) {
    if (espSerial.available()) {
      char c = (char)espSerial.read();
      response += c;

      // Check if we got the expected response
      if (response.indexOf(expectedResp) >= 0) {
#if DEBUG_SERIAL
        Serial.print(F("[ESP] OK: "));
        Serial.println(response);
#endif
        return true;
      }
      // Also check for ERROR
      if (response.indexOf("ERROR") >= 0) {
#if DEBUG_SERIAL
        Serial.print(F("[ESP] ERROR: "));
        Serial.println(response);
#endif
        return false;
      }
    }
  }

#if DEBUG_SERIAL
  Serial.print(F("[ESP] TIMEOUT: "));
  Serial.println(response);
#endif
  return false;
}

/**
 * Initialize ESP8266 module with basic AT commands.
 * Returns true if module responds.
 */
bool espInitialize() {
  debugPrint("Initializing ESP8266...");

  // Test AT communication
  if (!espSendCommand("AT", "OK", 2000)) {
    debugPrint("ESP8266 not responding to AT");
    return false;
  }

  // Disable echo
  espSendCommand("ATE0", "OK", 1000);

  // Set WiFi mode to Station
  if (!espSendCommand("AT+CWMODE=1", "OK", 2000)) {
    debugPrint("Failed to set WiFi mode");
    return false;
  }

  // Enable single connection mode
  espSendCommand("AT+CIPMUX=0", "OK", 2000);

  debugPrint("ESP8266 initialized successfully");
  return true;
}

/**
 * Connect ESP8266 to WiFi network.
 * Returns true if connection successful.
 */
bool espConnectWifi() {
  debugPrint("Connecting to WiFi...");

  // Build AT+CWJAP command
  char cmd[100];
  snprintf(cmd, sizeof(cmd), "AT+CWJAP=\"%s\",\"%s\"", WIFI_SSID, WIFI_PASSWORD);

  if (espSendCommand(cmd, "OK", 15000)) {
    espWifiConnected = true;
    debugPrint("WiFi connected!");

    // Get and display IP address
    espSendCommand("AT+CIFSR", "OK", 3000);
    return true;
  }

  espWifiConnected = false;
  debugPrint("WiFi connection failed");
  return false;
}

/**
 * Check if ESP8266 is still connected to WiFi.
 */
bool espCheckWifi() {
  return espSendCommand("AT+CWJAP?", WIFI_SSID, 3000);
}

/**
 * Send an HTTP POST with the given JSON payload to the backend server.
 * Returns true if the server responded with HTTP 2xx.
 */
bool espSendHttpPost(const char* jsonPayload) {
  if (!espWifiConnected) {
    debugPrint("Cannot send: WiFi not connected");
    return false;
  }

  // Calculate content length
  int contentLen = strlen(jsonPayload);

  // Build the full HTTP request
  // We need to know the total length for AT+CIPSEND
  char httpHeader[256];
  int headerLen = snprintf(httpHeader, sizeof(httpHeader),
    "POST /api/telemetry HTTP/1.1\r\n"
    "Host: %s:%d\r\n"
    "Content-Type: application/json\r\n"
    "X-Device-Token: %s\r\n"
    "Content-Length: %d\r\n"
    "Connection: close\r\n"
    "\r\n",
    SERVER_IP, SERVER_PORT, DEVICE_TOKEN, contentLen);

  int totalLen = headerLen + contentLen;

  // Step 1: Establish TCP connection
  char connectCmd[80];
  snprintf(connectCmd, sizeof(connectCmd), "AT+CIPSTART=\"TCP\",\"%s\",%d", SERVER_IP, SERVER_PORT);

  if (!espSendCommand(connectCmd, "OK", 5000)) {
    debugPrint("TCP connection failed");
    espServerReady = false;
    return false;
  }
  espServerReady = true;

  // Step 2: Initiate send with data length
  char sendCmd[30];
  snprintf(sendCmd, sizeof(sendCmd), "AT+CIPSEND=%d", totalLen);

  if (!espSendCommand(sendCmd, ">", 3000)) {
    debugPrint("CIPSEND prompt not received");
    espSendCommand("AT+CIPCLOSE", "OK", 2000);
    return false;
  }

  // Step 3: Send HTTP headers
  espSerial.print(httpHeader);

  // Step 4: Send JSON body
  espSerial.print(jsonPayload);

  // Step 5: Wait for SEND OK
  if (!espSendCommand("", "SEND OK", 5000)) {
    debugPrint("Send confirmation not received");
    espSendCommand("AT+CIPCLOSE", "OK", 2000);
    return false;
  }

  // Step 6: Read HTTP response (look for status code)
  unsigned long respStart = millis();
  String httpResp = "";
  bool gotResponse = false;

  while (millis() - respStart < SERIAL_TIMEOUT_MS) {
    if (espSerial.available()) {
      char c = (char)espSerial.read();
      httpResp += c;

      // Look for HTTP status line
      if (httpResp.indexOf("CLOSED") >= 0 || httpResp.length() > 400) {
        gotResponse = true;
        break;
      }
    }
  }

  // Close connection
  espSendCommand("AT+CIPCLOSE", "OK", 2000);

  // Parse HTTP status code
  if (gotResponse) {
    int statusIdx = httpResp.indexOf("HTTP/1.");
    if (statusIdx >= 0) {
      // Status code is at offset +9 from "HTTP/1.x "
      int codeStart = httpResp.indexOf(' ', statusIdx) + 1;
      if (codeStart > 0 && codeStart + 3 <= (int)httpResp.length()) {
        int statusCode = httpResp.substring(codeStart, codeStart + 3).toInt();
        debugPrintInt("HTTP Status: ", statusCode);

        if (statusCode >= 200 && statusCode < 300) {
          // Reset retry delay on success
          currentRetryDelayMs = 1000;
          return true;
        }
      }
    }
    debugPrint("HTTP response not 2xx or unparseable");
  } else {
    debugPrint("No HTTP response received");
  }

  return false;
}

/**
 * Attempt to send all buffered readings.
 * Stops on first failure to preserve ordering.
 */
void espDrainBuffer() {
  while (bufferCount > 0) {
    const char* payload = bufferPeek();
    if (payload == NULL) break;

    if (espSendHttpPost(payload)) {
      bufferDequeue();
      debugPrintInt("Buffer drained, remaining: ", bufferCount);
    } else {
      // Stop trying — will retry later
      debugPrint("Buffer drain failed, will retry later");
      break;
    }
  }
}

/**
 * Handle ESP8266 reconnection with exponential backoff.
 */
void espHandleReconnection() {
  unsigned long now = millis();

  if (now - lastReconnectAttemptMs < currentRetryDelayMs) {
    return;  // Not time to retry yet
  }

  lastReconnectAttemptMs = now;

  debugPrintInt("Reconnection attempt, delay was: ", (long)currentRetryDelayMs);

  // Check/re-establish WiFi
  if (!espCheckWifi()) {
    espWifiConnected = false;
    if (!espConnectWifi()) {
      // Exponential backoff
      currentRetryDelayMs = min(currentRetryDelayMs * 2, (unsigned long)MAX_RETRY_DELAY_MS);
      debugPrintInt("Next retry in ms: ", (long)currentRetryDelayMs);
      return;
    }
  }

  espWifiConnected = true;

  // Try to drain buffered readings
  espDrainBuffer();
}

// =============================================================================
// ============ TELEMETRY SEND =================================================
// =============================================================================

/**
 * Format and send (or buffer) the current telemetry reading.
 */
void sendTelemetry(const TelemetryData &data) {
  char jsonBuf[200];
  formatTelemetryJson(jsonBuf, sizeof(jsonBuf), data, sequenceNumber);

  // Always send the raw JSON line over SoftwareSerial for any device
  // listening (NodeMCU bridge, ESP-01, or serial logger)
  espSerial.println(jsonBuf);

  // Debug: print what we sent
#if DEBUG_SERIAL
  Serial.print(F("[TX] "));
  Serial.println(jsonBuf);
#endif

  // Buffer for HTTP sending (if using AT command mode)
  bufferEnqueue(jsonBuf);

  // Increment sequence number (wraps at uint32 max)
  sequenceNumber++;

  // Attempt to send buffered data
  if (espWifiConnected) {
    espDrainBuffer();
  }
}

// =============================================================================
// ============ DEBUG HEARTBEAT ================================================
// =============================================================================

/**
 * Print periodic human-readable status on USB Serial.
 */
void printHeartbeat(const TelemetryData &data) {
#if DEBUG_SERIAL
  Serial.println(F("========================================"));
  Serial.print(F("  Device: ")); Serial.println(F(DEVICE_ID));
  Serial.print(F("  FW:     ")); Serial.println(F(FIRMWARE_VERSION));
  Serial.print(F("  Uptime: ")); Serial.print(millis() / 1000); Serial.println(F("s"));
  Serial.print(F("  Seq:    ")); Serial.println(sequenceNumber);
  Serial.println(F("--- Sensors ---"));
  Serial.print(F("  Temp:   "));
  if (data.tempValid) {
    Serial.print(data.temperatureC, 2);
    Serial.println(F(" C"));
  } else {
    Serial.println(F("INVALID"));
  }
  Serial.print(F("  ADC:    ")); Serial.println(data.temperatureRaw);
  Serial.print(F("  Flame:  ")); Serial.println(data.flameDetected ? "DETECTED!" : "clear");
  Serial.print(F("  State:  "));
  switch (currentState) {
    case STATE_NORMAL:   Serial.println(F("NORMAL")); break;
    case STATE_WARNING:  Serial.println(F("WARNING")); break;
    case STATE_CRITICAL: Serial.println(F("CRITICAL!")); break;
  }
  Serial.println(F("--- Comms ---"));
  Serial.print(F("  WiFi:   ")); Serial.println(espWifiConnected ? "Connected" : "Disconnected");
  Serial.print(F("  Buffer: ")); Serial.print(bufferCount); Serial.print(F("/")); Serial.println(BUFFER_SIZE);
  Serial.println(F("========================================"));
#endif
}

// =============================================================================
// ============ SETUP ==========================================================
// =============================================================================

void setup() {
  // --- Initialize USB Serial for debug ---
#if DEBUG_SERIAL
  Serial.begin(DEBUG_BAUD);
  while (!Serial) { ; }  // Wait for Serial (important for Leonardo/Micro, quick on Uno)
  Serial.println(F(""));
  Serial.println(F("=============================================="));
  Serial.println(F("  Smart Helmet for Industrial Safety"));
  Serial.print(F("  Device ID: ")); Serial.println(F(DEVICE_ID));
  Serial.print(F("  Firmware:  ")); Serial.println(F(FIRMWARE_VERSION));
  Serial.println(F("=============================================="));
  Serial.println(F(""));
#endif

  // --- Configure pin modes ---
  pinMode(FLAME_PIN, INPUT);

#if BUZZER_ENABLED
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  debugPrint("Buzzer enabled on pin " + String(BUZZER_PIN));
#endif

#if LED_ENABLED
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  debugPrint("LED enabled on pin " + String(LED_PIN));
#endif

  // Note: Analog pins don't need pinMode() for analogRead()

  // --- Initialize SoftwareSerial for ESP8266 ---
  espSerial.begin(ESP_BAUD);
  debugPrint("ESP8266 SoftwareSerial initialized");

  // --- Initialize circular buffer ---
  for (uint8_t i = 0; i < BUFFER_SIZE; i++) {
    sendBuffer[i].occupied = false;
    sendBuffer[i].jsonPayload[0] = '\0';
  }

  // --- Initialize ESP8266 ---
  delay(2000);  // Allow ESP8266 time to boot (only blocking delay in entire sketch)
  debugPrint("Waiting for ESP8266 boot...");

  if (espInitialize()) {
    espConnectWifi();
  } else {
    debugPrint("ESP8266 init failed - will retry in loop");
  }

  // --- Initialize timing ---
  unsigned long now = millis();
  lastTelemetryMs    = now;
  lastHeartbeatMs    = now;
  lastLedToggleMs    = now;
  lastBuzzerToggleMs = now;

  // --- Start first ADC sampling cycle ---
  startAdcSampling();

  debugPrint("Setup complete. Entering main loop.");
}

// =============================================================================
// ============ MAIN LOOP ======================================================
// =============================================================================

void loop() {
  unsigned long now = millis();

  // --- 1. Non-blocking ADC sampling ---
  bool samplesReady = updateAdcSampling();

  // --- 2. Read flame sensor on every loop iteration (for debounce) ---
  readFlameSensor(latestData);

  // --- 3. Process completed ADC samples ---
  if (samplesReady) {
    computeTemperature(latestData);
  }

  // --- 4. Determine alert state ---
  AlertState newState = determineAlertState(latestData);
  if (newState != currentState) {
    currentState = newState;
#if DEBUG_SERIAL
    Serial.print(F("[STATE] Changed to: "));
    switch (currentState) {
      case STATE_NORMAL:   Serial.println(F("NORMAL")); break;
      case STATE_WARNING:  Serial.println(F("WARNING")); break;
      case STATE_CRITICAL: Serial.println(F("CRITICAL!")); break;
    }
#endif
  }

  // --- 5. Update local alerts (non-blocking) ---
  updateLed(currentState);
  updateBuzzer(currentState);

  // --- 6. Send telemetry at configured interval ---
  if (now - lastTelemetryMs >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryMs = now;

    // Ensure we have valid samples
    if (!adcSamplingActive) {
      sendTelemetry(latestData);
      // Start next sampling cycle
      startAdcSampling();
    }
  }

  // --- 7. Debug heartbeat ---
  if (now - lastHeartbeatMs >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatMs = now;
    printHeartbeat(latestData);
  }

  // --- 8. Handle ESP8266 reconnection if needed ---
  if (!espWifiConnected || bufferCount > 0) {
    espHandleReconnection();
  }

  // --- 9. Check for incoming data from ESP8266 (responses, unsolicited) ---
  while (espSerial.available()) {
    char c = (char)espSerial.read();
    // Could parse for "+IPD" data or other unsolicited messages here
    // For now, just consume to prevent buffer overflow
#if DEBUG_SERIAL
    Serial.write(c);  // Echo ESP responses to debug serial
#endif
  }
}

