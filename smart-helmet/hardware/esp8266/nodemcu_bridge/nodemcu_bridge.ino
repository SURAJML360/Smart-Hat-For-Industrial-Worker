/*
 * =============================================================================
 * NodeMCU ESP8266 WiFi Bridge - Smart Helmet for Industrial Safety
 * =============================================================================
 *
 * Project:     Smart Helmet IoT Safety Monitor
 * Board:       NodeMCU ESP8266 (ESP-12E/F module)
 * Purpose:     Receives JSON telemetry from Arduino Uno over hardware Serial,
 *              connects to WiFi, and forwards data via HTTP POST to the
 *              backend server. This is the RECOMMENDED alternative to using
 *              AT commands with an ESP-01, as it is simpler and more reliable.
 *
 * WIRING:
 *   Arduino Uno TX (pin 1) → NodeMCU RX (via voltage divider or direct*)
 *   Arduino Uno GND        → NodeMCU GND
 *   
 *   * The NodeMCU RX pin is 5V tolerant on most modules, but for safety:
 *     Arduino TX → 1kΩ → NodeMCU RX, with 2kΩ from NodeMCU RX to GND
 *
 *   NOTE: Only a ONE-WAY serial connection is needed (Arduino TX → NodeMCU RX).
 *   The NodeMCU does not need to send data back to the Arduino in this design.
 *   If bidirectional communication is desired, connect NodeMCU TX → Arduino RX
 *   (3.3V is sufficient for Arduino's HIGH threshold).
 *
 * REQUIRED LIBRARIES (install via Arduino IDE Library Manager):
 *   - ESP8266WiFi       (built-in with ESP8266 board package)
 *   - ESP8266HTTPClient (built-in with ESP8266 board package)
 *   - ArduinoJson       (by Benoit Blanchon, version >= 6.x)
 *
 * BOARD SETUP:
 *   1. In Arduino IDE: File → Preferences → Additional Board Manager URLs:
 *      http://arduino.esp8266.com/stable/package_esp8266com_index.json
 *   2. Tools → Board → Boards Manager → Install "esp8266" by ESP8266 Community
 *   3. Tools → Board → NodeMCU 1.0 (ESP-12E Module)
 *   4. Tools → Upload Speed → 115200
 *   5. Tools → Flash Size → 4MB (FS:2MB OTA:~1019KB)
 *
 * SERIAL PROTOCOL:
 *   The Arduino Uno sends one JSON line per telemetry reading, terminated by '\n':
 *   {"did":"HELMET-001","seq":42,"tc":34.5,"tr":705,"fd":false,"fr":1,"up":123456,"fv":"1.0.0"}\n
 *
 * =============================================================================
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <ArduinoJson.h>

// =============================================================================
// ============ CONFIGURATION - MODIFY THESE ===================================
// =============================================================================

// --- WiFi Credentials ---
#define WIFI_SSID          "YourSSID"
#define WIFI_PASSWORD      "YourPassword"

// --- Backend Server ---
#define SERVER_URL         "http://192.168.1.100:3001/api/telemetry"
#define DEVICE_TOKEN       "your_device_token_here"

// --- Serial Communication ---
#define SERIAL_BAUD        9600      // Must match ESP_BAUD in Arduino sketch
#define DEBUG_BAUD         115200    // For USB Serial debug output (Serial is shared!)

// --- Buffering ---
#define BUFFER_SIZE        5         // Circular buffer for unsent readings
#define MAX_JSON_LENGTH    250       // Maximum expected JSON line length

// --- WiFi Reconnection ---
#define WIFI_CONNECT_TIMEOUT_MS   15000  // Max time to wait for WiFi connection
#define WIFI_RECONNECT_DELAY_MS   5000   // Delay between reconnection attempts
#define HTTP_TIMEOUT_MS           10000  // HTTP request timeout

// --- Timing ---
#define STATUS_PRINT_INTERVAL_MS  10000  // How often to print status to debug
#define LED_BLINK_INTERVAL_MS     500    // Status LED blink rate

// =============================================================================
// ============ END CONFIGURATION ==============================================
// =============================================================================

// --- Circular Buffer ---
struct BufferedReading {
  char payload[MAX_JSON_LENGTH];
  bool occupied;
};

BufferedReading sendBuffer[BUFFER_SIZE];
uint8_t bufferHead  = 0;
uint8_t bufferTail  = 0;
uint8_t bufferCount = 0;

// --- Serial Input Buffer ---
char serialInputBuf[MAX_JSON_LENGTH];
uint16_t serialInputPos = 0;

// --- Timing ---
unsigned long lastStatusPrintMs    = 0;
unsigned long lastWifiReconnectMs  = 0;
unsigned long lastLedToggleMs      = 0;

// --- Stats ---
uint32_t messagesReceived = 0;
uint32_t messagesSent     = 0;
uint32_t messagesFailed   = 0;
uint32_t messagesDropped  = 0;

// --- LED State ---
bool ledState = false;

// =============================================================================
// ============ BUFFER MANAGEMENT ==============================================
// =============================================================================

/**
 * Add a JSON payload to the circular buffer.
 * If buffer is full, the oldest entry is overwritten.
 */
void bufferEnqueue(const char* json) {
  strncpy(sendBuffer[bufferHead].payload, json, MAX_JSON_LENGTH - 1);
  sendBuffer[bufferHead].payload[MAX_JSON_LENGTH - 1] = '\0';
  sendBuffer[bufferHead].occupied = true;

  bufferHead = (bufferHead + 1) % BUFFER_SIZE;

  if (bufferCount < BUFFER_SIZE) {
    bufferCount++;
  } else {
    // Overwriting oldest entry
    bufferTail = (bufferTail + 1) % BUFFER_SIZE;
    messagesDropped++;
    Serial.println(F("[WARN] Buffer full, oldest reading dropped"));
  }
}

/**
 * Peek at the oldest buffered entry.
 * Returns pointer to payload string, or NULL if empty.
 */
const char* bufferPeek() {
  if (bufferCount == 0) return NULL;
  return sendBuffer[bufferTail].payload;
}

/**
 * Remove the oldest entry after successful send.
 */
void bufferDequeue() {
  if (bufferCount == 0) return;
  sendBuffer[bufferTail].occupied = false;
  bufferTail = (bufferTail + 1) % BUFFER_SIZE;
  bufferCount--;
}

// =============================================================================
// ============ WIFI MANAGEMENT ================================================
// =============================================================================

/**
 * Connect to WiFi network. Blocks up to WIFI_CONNECT_TIMEOUT_MS.
 * Returns true if connected.
 */
bool connectWifi() {
  if (WiFi.status() == WL_CONNECTED) {
    return true;
  }

  Serial.print(F("[WIFI] Connecting to "));
  Serial.print(F(WIFI_SSID));
  Serial.print(F("..."));

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startMs = millis();
  while (WiFi.status() != WL_CONNECTED) {
    if (millis() - startMs > WIFI_CONNECT_TIMEOUT_MS) {
      Serial.println(F(" TIMEOUT"));
      return false;
    }
    delay(250);
    Serial.print(F("."));
  }

  Serial.println(F(" Connected!"));
  Serial.print(F("[WIFI] IP: "));
  Serial.println(WiFi.localIP());
  Serial.print(F("[WIFI] RSSI: "));
  Serial.print(WiFi.RSSI());
  Serial.println(F(" dBm"));

  return true;
}

/**
 * Check WiFi and reconnect if necessary.
 */
void ensureWifiConnected() {
  if (WiFi.status() == WL_CONNECTED) return;

  unsigned long now = millis();
  if (now - lastWifiReconnectMs < WIFI_RECONNECT_DELAY_MS) return;

  lastWifiReconnectMs = now;
  Serial.println(F("[WIFI] Connection lost, reconnecting..."));
  connectWifi();
}

// =============================================================================
// ============ HTTP POST ======================================================
// =============================================================================

/**
 * Send a JSON payload via HTTP POST to the backend server.
 * Returns true if server responded with 2xx status.
 */
bool sendHttpPost(const char* jsonPayload) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("[HTTP] Cannot send: WiFi not connected"));
    return false;
  }

  // Validate JSON before sending (basic check with ArduinoJson)
  StaticJsonDocument<256> doc;
  DeserializationError jsonErr = deserializeJson(doc, jsonPayload);
  if (jsonErr) {
    Serial.print(F("[HTTP] Invalid JSON: "));
    Serial.println(jsonErr.c_str());
    return false;
  }

  WiFiClient wifiClient;
  HTTPClient http;

  http.begin(wifiClient, SERVER_URL);
  http.setTimeout(HTTP_TIMEOUT_MS);

  // Set headers
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Token", DEVICE_TOKEN);

  Serial.print(F("[HTTP] POST "));
  Serial.print(F(SERVER_URL));
  Serial.print(F(" ... "));

  int httpCode = http.POST(jsonPayload);

  if (httpCode > 0) {
    Serial.print(F("HTTP "));
    Serial.println(httpCode);

    if (httpCode >= 200 && httpCode < 300) {
      // Read response body (for debug)
      String responseBody = http.getString();
      if (responseBody.length() > 0 && responseBody.length() < 200) {
        Serial.print(F("[HTTP] Response: "));
        Serial.println(responseBody);
      }
      http.end();
      return true;
    } else {
      String responseBody = http.getString();
      Serial.print(F("[HTTP] Error response: "));
      Serial.println(responseBody);
    }
  } else {
    Serial.print(F("FAILED: "));
    Serial.println(http.errorToString(httpCode));
  }

  http.end();
  return false;
}

/**
 * Attempt to send all buffered readings.
 * Stops on first failure.
 */
void drainBuffer() {
  while (bufferCount > 0) {
    const char* payload = bufferPeek();
    if (payload == NULL) break;

    if (sendHttpPost(payload)) {
      bufferDequeue();
      messagesSent++;
    } else {
      messagesFailed++;
      break;  // Stop trying, will retry later
    }
  }
}

// =============================================================================
// ============ SERIAL INPUT PROCESSING ========================================
// =============================================================================

/**
 * Read serial data from Arduino Uno and process complete JSON lines.
 * Non-blocking: reads whatever is available and buffers it.
 */
void processSerialInput() {
  while (Serial.available()) {
    char c = (char)Serial.read();

    if (c == '\n' || c == '\r') {
      // End of line — process if we have data
      if (serialInputPos > 0) {
        serialInputBuf[serialInputPos] = '\0';

        // Validate it looks like JSON (starts with '{')
        if (serialInputBuf[0] == '{') {
          messagesReceived++;
          Serial.print(F("[RX] "));
          Serial.println(serialInputBuf);

          // Add to send buffer
          bufferEnqueue(serialInputBuf);
        } else {
          // Non-JSON line (debug output from Arduino), ignore
          Serial.print(F("[RX-IGN] "));
          Serial.println(serialInputBuf);
        }

        serialInputPos = 0;
      }
    } else {
      // Accumulate character
      if (serialInputPos < MAX_JSON_LENGTH - 1) {
        serialInputBuf[serialInputPos++] = c;
      } else {
        // Overflow — reset buffer
        Serial.println(F("[WARN] Serial input buffer overflow, discarding"));
        serialInputPos = 0;
      }
    }
  }
}

// =============================================================================
// ============ STATUS REPORTING ===============================================
// =============================================================================

/**
 * Print periodic status to Serial (visible on USB Serial Monitor).
 */
void printStatus() {
  Serial.println(F(""));
  Serial.println(F("========================================"));
  Serial.println(F("  NodeMCU Bridge Status"));
  Serial.println(F("========================================"));
  Serial.print(F("  WiFi:     "));
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print(F("Connected ("));
    Serial.print(WiFi.localIP());
    Serial.print(F(", RSSI: "));
    Serial.print(WiFi.RSSI());
    Serial.println(F(" dBm)"));
  } else {
    Serial.println(F("DISCONNECTED"));
  }
  Serial.print(F("  Buffer:   "));
  Serial.print(bufferCount);
  Serial.print(F("/"));
  Serial.println(BUFFER_SIZE);
  Serial.print(F("  Received: ")); Serial.println(messagesReceived);
  Serial.print(F("  Sent:     ")); Serial.println(messagesSent);
  Serial.print(F("  Failed:   ")); Serial.println(messagesFailed);
  Serial.print(F("  Dropped:  ")); Serial.println(messagesDropped);
  Serial.print(F("  Uptime:   "));
  Serial.print(millis() / 1000);
  Serial.println(F("s"));
  Serial.print(F("  Free RAM: "));
  Serial.print(ESP.getFreeHeap());
  Serial.println(F(" bytes"));
  Serial.println(F("========================================"));
  Serial.println(F(""));
}

/**
 * Blink onboard LED to indicate status.
 *   Connected + idle:    Slow blink (1Hz)
 *   Connected + sending: Fast blink (4Hz)
 *   Disconnected:        Solid ON
 */
void updateStatusLed() {
  unsigned long now = millis();
  unsigned long interval;

  if (WiFi.status() != WL_CONNECTED) {
    // Solid ON when disconnected
    digitalWrite(LED_BUILTIN, LOW);  // NodeMCU LED is active LOW
    return;
  }

  interval = (bufferCount > 0) ? 125 : LED_BLINK_INTERVAL_MS;

  if (now - lastLedToggleMs >= interval) {
    ledState = !ledState;
    digitalWrite(LED_BUILTIN, ledState ? LOW : HIGH);  // Active LOW
    lastLedToggleMs = now;
  }
}

// =============================================================================
// ============ SETUP ==========================================================
// =============================================================================

void setup() {
  // --- Initialize Serial ---
  // On NodeMCU, Serial is the hardware UART (TX=GPIO1, RX=GPIO3)
  // which is also the USB Serial port.
  // When connected to Arduino Uno, the Uno's TX connects to NodeMCU RX (GPIO3).
  // Debug output goes to USB Serial Monitor via the same Serial object.
  // This works because the Uno sends data infrequently and we can interleave
  // debug output between received messages.
  Serial.begin(SERIAL_BAUD);
  delay(100);

  Serial.println(F(""));
  Serial.println(F("=============================================="));
  Serial.println(F("  Smart Helmet - NodeMCU WiFi Bridge"));
  Serial.println(F("=============================================="));
  Serial.println(F(""));

  // --- Initialize LED ---
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);  // OFF (active LOW)

  // --- Initialize buffer ---
  for (uint8_t i = 0; i < BUFFER_SIZE; i++) {
    sendBuffer[i].occupied = false;
    sendBuffer[i].payload[0] = '\0';
  }

  // --- Connect to WiFi ---
  Serial.println(F("[INIT] Connecting to WiFi..."));
  connectWifi();

  // --- Initialize timing ---
  lastStatusPrintMs = millis();
  lastLedToggleMs = millis();

  Serial.println(F("[INIT] Setup complete. Waiting for telemetry data..."));
  Serial.println(F(""));
}

// =============================================================================
// ============ MAIN LOOP ======================================================
// =============================================================================

void loop() {
  unsigned long now = millis();

  // --- 1. Process incoming serial data from Arduino ---
  processSerialInput();

  // --- 2. Ensure WiFi is connected ---
  ensureWifiConnected();

  // --- 3. Drain send buffer ---
  if (bufferCount > 0 && WiFi.status() == WL_CONNECTED) {
    drainBuffer();
  }

  // --- 4. Print status periodically ---
  if (now - lastStatusPrintMs >= STATUS_PRINT_INTERVAL_MS) {
    lastStatusPrintMs = now;
    printStatus();
  }

  // --- 5. Update status LED ---
  updateStatusLed();

  // --- 6. Yield to ESP8266 background tasks (WiFi, TCP stack) ---
  yield();
}

