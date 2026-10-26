/*
 * =============================================================================
 * ESP8266 AT Command Test Utility - Standalone Diagnostic Tool
 * =============================================================================
 *
 * Project:     Smart Helmet for Industrial Safety
 * Board:       Arduino Uno R3 (with ESP-01 on SoftwareSerial)
 * Purpose:     Standalone utility to test and validate ESP8266 AT firmware,
 *              WiFi connectivity, and HTTP POST to the backend server.
 *              Use this sketch BEFORE loading the main smart_helmet.ino to
 *              verify your ESP-01 hardware and network setup.
 *
 * WIRING (same as main project):
 *   Arduino D10 (SW RX) ← ESP-01 TX  (direct connection, 3.3V is fine)
 *   Arduino D11 (SW TX) → 1kΩ → ESP-01 RX  (voltage divider: 1kΩ + 2kΩ to GND)
 *   ESP-01 VCC  → 3.3V external regulator (NOT Arduino 3.3V pin)
 *   ESP-01 GND  → GND
 *   ESP-01 CH_PD → 3.3V
 *
 * USAGE:
 *   1. Upload this sketch to Arduino Uno
 *   2. Open Serial Monitor at 115200 baud
 *   3. Follow the on-screen test menu
 *   4. Send commands via Serial Monitor:
 *        '1' = Test AT communication
 *        '2' = Get firmware version (AT+GMR)
 *        '3' = Scan WiFi networks
 *        '4' = Connect to WiFi
 *        '5' = Get IP address
 *        '6' = Test HTTP POST to server
 *        '7' = Send custom AT command (type command after '7')
 *        '8' = Run full diagnostic sequence
 *        '9' = Reset ESP8266
 *        '0' = Toggle AT echo (ATE0 / ATE1)
 *
 * =============================================================================
 */

#include <SoftwareSerial.h>

// =============================================================================
// ============ CONFIGURATION - MODIFY THESE ===================================
// =============================================================================

// ESP8266 SoftwareSerial pins
#define ESP_RX_PIN         10
#define ESP_TX_PIN         11
#define ESP_BAUD           9600

// Debug Serial (USB)
#define DEBUG_BAUD         115200

// WiFi credentials
#define WIFI_SSID          "YourSSID"
#define WIFI_PASSWORD      "YourPassword"

// Backend server
#define SERVER_IP          "192.168.1.100"
#define SERVER_PORT        3001
#define DEVICE_TOKEN       "your_device_token_here"

// Timeout for AT commands
#define AT_TIMEOUT_SHORT   2000
#define AT_TIMEOUT_MEDIUM  5000
#define AT_TIMEOUT_LONG    15000

// =============================================================================
// ============ END CONFIGURATION ==============================================
// =============================================================================

SoftwareSerial espSerial(ESP_RX_PIN, ESP_TX_PIN);
bool echoEnabled = false;

// =============================================================================
// ============ AT COMMAND HELPERS =============================================
// =============================================================================

/**
 * Send an AT command and print the full response.
 * Returns the complete response string.
 */
String sendATCommand(const char* cmd, unsigned long timeoutMs) {
  // Flush receive buffer
  while (espSerial.available()) {
    espSerial.read();
  }

  Serial.print(F("\n>>> Sending: "));
  Serial.println(cmd);
  Serial.println(F("---"));

  espSerial.println(cmd);

  String response = "";
  unsigned long startMs = millis();
  bool gotOK = false;
  bool gotError = false;

  while (millis() - startMs < timeoutMs) {
    if (espSerial.available()) {
      char c = (char)espSerial.read();
      response += c;
      Serial.write(c);  // Real-time echo to Serial Monitor

      // Check for terminal responses
      if (response.endsWith("OK\r\n")) {
        gotOK = true;
        // Give a tiny bit more time for trailing data
        delay(100);
        while (espSerial.available()) {
          char c2 = (char)espSerial.read();
          response += c2;
          Serial.write(c2);
        }
        break;
      }
      if (response.endsWith("ERROR\r\n")) {
        gotError = true;
        break;
      }
      if (response.endsWith("FAIL\r\n")) {
        gotError = true;
        break;
      }
    }
  }

  Serial.println(F("---"));
  if (gotOK) {
    Serial.println(F("<<< Result: OK"));
  } else if (gotError) {
    Serial.println(F("<<< Result: ERROR/FAIL"));
  } else {
    Serial.println(F("<<< Result: TIMEOUT (no OK/ERROR received)"));
  }

  return response;
}

/**
 * Wait for a specific response pattern.
 */
bool waitForResponse(const char* expected, unsigned long timeoutMs) {
  String response = "";
  unsigned long startMs = millis();

  while (millis() - startMs < timeoutMs) {
    if (espSerial.available()) {
      char c = (char)espSerial.read();
      response += c;
      Serial.write(c);

      if (response.indexOf(expected) >= 0) {
        return true;
      }
    }
  }
  return false;
}

// =============================================================================
// ============ TEST FUNCTIONS =================================================
// =============================================================================

/**
 * Test 1: Basic AT communication
 */
void testATComm() {
  Serial.println(F("\n====== TEST 1: AT Communication ======"));
  String resp = sendATCommand("AT", AT_TIMEOUT_SHORT);

  if (resp.indexOf("OK") >= 0) {
    Serial.println(F("[PASS] ESP8266 is responding to AT commands"));
  } else {
    Serial.println(F("[FAIL] ESP8266 not responding!"));
    Serial.println(F("  Troubleshooting:"));
    Serial.println(F("  - Check wiring (TX/RX not swapped?)"));
    Serial.println(F("  - Check power supply (3.3V, enough current?)"));
    Serial.println(F("  - Check CH_PD is pulled HIGH"));
    Serial.println(F("  - Try different baud rate (some ESP come at 115200)"));
    Serial.println(F("  - Check AT firmware is flashed"));
  }
}

/**
 * Test 2: Firmware version
 */
void testFirmwareVersion() {
  Serial.println(F("\n====== TEST 2: Firmware Version ======"));
  String resp = sendATCommand("AT+GMR", AT_TIMEOUT_SHORT);

  if (resp.indexOf("OK") >= 0) {
    Serial.println(F("[PASS] Firmware version retrieved"));
    Serial.println(F("  Expected: AT version >= 1.6, SDK >= 2.0"));
    Serial.println(F("  If version is old, consider flashing newer AT firmware"));
  } else {
    Serial.println(F("[FAIL] Could not get firmware version"));
  }
}

/**
 * Test 3: Scan WiFi networks
 */
void testWifiScan() {
  Serial.println(F("\n====== TEST 3: WiFi Network Scan ======"));
  Serial.println(F("  (This may take 5-10 seconds...)"));

  // Set station mode first
  sendATCommand("AT+CWMODE=1", AT_TIMEOUT_SHORT);

  String resp = sendATCommand("AT+CWLAP", AT_TIMEOUT_LONG);

  if (resp.indexOf("+CWLAP:") >= 0) {
    Serial.println(F("[PASS] WiFi networks found"));

    // Check if our target SSID is visible
    if (resp.indexOf(WIFI_SSID) >= 0) {
      Serial.print(F("[PASS] Target SSID '"));
      Serial.print(F(WIFI_SSID));
      Serial.println(F("' is visible"));
    } else {
      Serial.print(F("[WARN] Target SSID '"));
      Serial.print(F(WIFI_SSID));
      Serial.println(F("' NOT found in scan results!"));
    }
  } else {
    Serial.println(F("[FAIL] No WiFi networks found or scan failed"));
  }
}

/**
 * Test 4: Connect to WiFi
 */
void testWifiConnect() {
  Serial.println(F("\n====== TEST 4: WiFi Connection ======"));

  // Set station mode
  sendATCommand("AT+CWMODE=1", AT_TIMEOUT_SHORT);

  // Connect
  char cmd[100];
  snprintf(cmd, sizeof(cmd), "AT+CWJAP=\"%s\",\"%s\"", WIFI_SSID, WIFI_PASSWORD);

  Serial.print(F("  Connecting to: "));
  Serial.println(F(WIFI_SSID));
  Serial.println(F("  (This may take 10-15 seconds...)"));

  String resp = sendATCommand(cmd, AT_TIMEOUT_LONG);

  if (resp.indexOf("OK") >= 0) {
    Serial.println(F("[PASS] WiFi connected successfully!"));
  } else if (resp.indexOf("FAIL") >= 0) {
    Serial.println(F("[FAIL] WiFi connection failed"));
    Serial.println(F("  Troubleshooting:"));
    Serial.println(F("  - Verify SSID and password are correct"));
    Serial.println(F("  - Check if router is 2.4GHz (ESP8266 doesn't support 5GHz)"));
    Serial.println(F("  - Move closer to the access point"));
  } else {
    Serial.println(F("[FAIL] WiFi connection timed out"));
  }
}

/**
 * Test 5: Get IP address
 */
void testGetIP() {
  Serial.println(F("\n====== TEST 5: IP Address ======"));
  String resp = sendATCommand("AT+CIFSR", AT_TIMEOUT_SHORT);

  if (resp.indexOf("STAIP") >= 0) {
    Serial.println(F("[PASS] IP address obtained"));
  } else {
    Serial.println(F("[FAIL] No IP address - WiFi may not be connected"));
  }
}

/**
 * Test 6: HTTP POST to server
 */
void testHttpPost() {
  Serial.println(F("\n====== TEST 6: HTTP POST Test ======"));

  // Ensure single connection mode
  sendATCommand("AT+CIPMUX=0", AT_TIMEOUT_SHORT);

  // Open TCP connection
  char connectCmd[80];
  snprintf(connectCmd, sizeof(connectCmd), "AT+CIPSTART=\"TCP\",\"%s\",%d", SERVER_IP, SERVER_PORT);

  Serial.println(F("  Opening TCP connection..."));
  String resp = sendATCommand(connectCmd, AT_TIMEOUT_MEDIUM);

  if (resp.indexOf("OK") < 0 && resp.indexOf("ALREADY") < 0) {
    Serial.println(F("[FAIL] TCP connection failed"));
    Serial.println(F("  Troubleshooting:"));
    Serial.println(F("  - Check SERVER_IP and SERVER_PORT"));
    Serial.println(F("  - Ensure server is running"));
    Serial.println(F("  - Check firewall settings"));
    return;
  }

  Serial.println(F("[PASS] TCP connected"));

  // Build test payload
  const char* testJson = "{\"did\":\"HELMET-TEST\",\"seq\":0,\"tc\":25.00,\"tr\":512,\"fd\":false,\"fr\":0,\"up\":0,\"fv\":\"TEST\"}";
  int contentLen = strlen(testJson);

  // Build HTTP request
  char httpReq[350];
  int reqLen = snprintf(httpReq, sizeof(httpReq),
    "POST /api/telemetry HTTP/1.1\r\n"
    "Host: %s:%d\r\n"
    "Content-Type: application/json\r\n"
    "X-Device-Token: %s\r\n"
    "Content-Length: %d\r\n"
    "Connection: close\r\n"
    "\r\n"
    "%s",
    SERVER_IP, SERVER_PORT, DEVICE_TOKEN, contentLen, testJson);

  // Send data length
  char sendCmd[30];
  snprintf(sendCmd, sizeof(sendCmd), "AT+CIPSEND=%d", reqLen);

  resp = sendATCommand(sendCmd, AT_TIMEOUT_SHORT);

  if (resp.indexOf(">") < 0) {
    Serial.println(F("[FAIL] Did not receive '>' prompt for data"));
    sendATCommand("AT+CIPCLOSE", AT_TIMEOUT_SHORT);
    return;
  }

  // Send the HTTP request
  Serial.println(F("  Sending HTTP POST..."));
  espSerial.print(httpReq);

  // Wait for SEND OK and response
  Serial.println(F("  Waiting for response..."));
  delay(100);

  unsigned long respStart = millis();
  String httpResp = "";
  while (millis() - respStart < AT_TIMEOUT_MEDIUM) {
    if (espSerial.available()) {
      char c = (char)espSerial.read();
      httpResp += c;
      Serial.write(c);

      if (httpResp.indexOf("CLOSED") >= 0) break;
    }
  }

  Serial.println();

  // Analyze response
  if (httpResp.indexOf("SEND OK") >= 0) {
    Serial.println(F("[PASS] Data sent successfully"));
  } else {
    Serial.println(F("[WARN] SEND OK not confirmed"));
  }

  if (httpResp.indexOf("200") >= 0 || httpResp.indexOf("201") >= 0) {
    Serial.println(F("[PASS] Server responded with success (2xx)!"));
  } else if (httpResp.indexOf("HTTP/1.") >= 0) {
    Serial.println(F("[WARN] Server responded but not with 2xx"));
  } else {
    Serial.println(F("[WARN] Could not parse HTTP response"));
  }

  // Close connection
  sendATCommand("AT+CIPCLOSE", AT_TIMEOUT_SHORT);
}

/**
 * Test 7: Send custom AT command
 */
void testCustomCommand() {
  Serial.println(F("\n====== Custom AT Command ======"));
  Serial.println(F("  Type your AT command and press Enter:"));

  // Wait for user input
  while (!Serial.available()) { ; }
  delay(100);  // Wait for full command

  String customCmd = Serial.readStringUntil('\n');
  customCmd.trim();

  if (customCmd.length() > 0) {
    char cmdBuf[100];
    customCmd.toCharArray(cmdBuf, sizeof(cmdBuf));
    sendATCommand(cmdBuf, AT_TIMEOUT_MEDIUM);
  } else {
    Serial.println(F("  No command entered"));
  }
}

/**
 * Test 8: Full diagnostic sequence
 */
void testFullDiagnostic() {
  Serial.println(F("\n############################################"));
  Serial.println(F("##   FULL ESP8266 DIAGNOSTIC SEQUENCE     ##"));
  Serial.println(F("############################################\n"));

  testATComm();
  delay(500);

  testFirmwareVersion();
  delay(500);

  testWifiScan();
  delay(500);

  testWifiConnect();
  delay(500);

  testGetIP();
  delay(500);

  testHttpPost();
  delay(500);

  Serial.println(F("\n############################################"));
  Serial.println(F("##   DIAGNOSTIC COMPLETE                  ##"));
  Serial.println(F("############################################"));
  Serial.println(F("  Review results above for any [FAIL] or [WARN] items"));
}

/**
 * Test 9: Reset ESP8266
 */
void testReset() {
  Serial.println(F("\n====== TEST 9: ESP8266 Reset ======"));
  sendATCommand("AT+RST", AT_TIMEOUT_MEDIUM);
  Serial.println(F("  ESP8266 reset. Wait 2-3 seconds before next command."));
  delay(3000);
}

/**
 * Test 0: Toggle echo
 */
void testToggleEcho() {
  Serial.println(F("\n====== Toggle AT Echo ======"));
  if (echoEnabled) {
    sendATCommand("ATE0", AT_TIMEOUT_SHORT);
    echoEnabled = false;
    Serial.println(F("  Echo DISABLED"));
  } else {
    sendATCommand("ATE1", AT_TIMEOUT_SHORT);
    echoEnabled = true;
    Serial.println(F("  Echo ENABLED"));
  }
}

// =============================================================================
// ============ MENU ===========================================================
// =============================================================================

void printMenu() {
  Serial.println(F(""));
  Serial.println(F("=============================================="));
  Serial.println(F("  ESP8266 AT Command Test Utility"));
  Serial.println(F("  Smart Helmet Project"));
  Serial.println(F("=============================================="));
  Serial.println(F("  1 = Test AT communication"));
  Serial.println(F("  2 = Get firmware version (AT+GMR)"));
  Serial.println(F("  3 = Scan WiFi networks"));
  Serial.println(F("  4 = Connect to WiFi"));
  Serial.println(F("  5 = Get IP address"));
  Serial.println(F("  6 = Test HTTP POST to server"));
  Serial.println(F("  7 = Send custom AT command"));
  Serial.println(F("  8 = Run FULL diagnostic sequence"));
  Serial.println(F("  9 = Reset ESP8266"));
  Serial.println(F("  0 = Toggle AT echo"));
  Serial.println(F("=============================================="));
  Serial.println(F("  Send a number (1-9, 0) to run a test"));
  Serial.println(F(""));
}

// =============================================================================
// ============ SETUP & LOOP ===================================================
// =============================================================================

void setup() {
  Serial.begin(DEBUG_BAUD);
  while (!Serial) { ; }

  espSerial.begin(ESP_BAUD);

  Serial.println(F("\n\n"));
  Serial.println(F("  Initializing ESP8266 AT Test Utility..."));
  Serial.println(F("  Waiting 2 seconds for ESP8266 to boot..."));
  delay(2000);

  printMenu();
}

void loop() {
  // Check for user input
  if (Serial.available()) {
    char input = Serial.read();

    // Consume any trailing newline/carriage return
    delay(50);
    while (Serial.available()) {
      char extra = Serial.peek();
      if (extra == '\n' || extra == '\r') {
        Serial.read();
      } else {
        break;
      }
    }

    switch (input) {
      case '1': testATComm();          break;
      case '2': testFirmwareVersion(); break;
      case '3': testWifiScan();        break;
      case '4': testWifiConnect();     break;
      case '5': testGetIP();           break;
      case '6': testHttpPost();        break;
      case '7': testCustomCommand();   break;
      case '8': testFullDiagnostic();  break;
      case '9': testReset();           break;
      case '0': testToggleEcho();      break;
      default:
        Serial.print(F("  Unknown command: '"));
        Serial.print(input);
        Serial.println(F("'"));
        printMenu();
        break;
    }

    // Re-display menu after test completes
    if (input >= '0' && input <= '9') {
      Serial.println(F("\n  (Send another number to run a test, or see menu above)"));
    }
  }

  // Pass-through: show any unsolicited ESP8266 output
  while (espSerial.available()) {
    Serial.write(espSerial.read());
  }
}

