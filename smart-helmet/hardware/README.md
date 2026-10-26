# Smart Helmet for Industrial Safety — Hardware Documentation

> Complete wiring guide, pin mappings, power requirements, and assembly instructions
> for the Smart Helmet sensor and communication hardware.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Bill of Materials (BOM)](#bill-of-materials-bom)
3. [Wiring Diagram](#wiring-diagram)
4. [Pin Mapping Table](#pin-mapping-table)
5. [Component Wiring Details](#component-wiring-details)
6. [Power Supply Requirements](#power-supply-requirements)
7. [Calibration & Verification](#calibration--verification)
8. [NodeMCU Alternative Wiring](#nodemcu-alternative-wiring)
9. [Assumptions Requiring Physical Verification](#assumptions-requiring-physical-verification)

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SMART HELMET SYSTEM                         │
│                                                                    │
│  ┌──────────┐    Analog    ┌──────────────┐   SoftSerial   ┌─────────┐
│  │  LM35    │───(A0)──────▶│              │───(D11/TX)────▶│         │
│  │ Temp     │              │              │                │ ESP-01  │
│  │ Sensor   │              │  Arduino     │◀──(D10/RX)────│ ESP8266 │───▶ WiFi
│  └──────────┘              │  Uno R3      │                │         │    ▼
│                            │              │                └─────────┘  Backend
│  ┌──────────┐   Digital    │              │                            Server
│  │  Flame   │───(D2)──────▶│              │
│  │ Sensor   │              │              │
│  └──────────┘              │              │   ┌──────────┐
│                            │              │───(D6)──────▶│  Buzzer  │
│                            │              │              └──────────┘
│                            │              │   ┌──────────┐
│                            │              │───(D7)──────▶│  LED     │
│                            └──────────────┘              └──────────┘
│                                 │
│                                USB (Debug Serial @ 115200)
│                                 ▼
│                           ┌───────────┐
│                           │  PC/Laptop│
│                           │ (Monitor) │
│                           └───────────┘
└─────────────────────────────────────────────────────────────────────┘
```

---

## Bill of Materials (BOM)

| # | Component | Specification | Qty | Notes |
|---|-----------|--------------|-----|-------|
| 1 | Arduino Uno R3 | ATmega328P, 5V logic | 1 | Original or compatible clone |
| 2 | ESP-01 Module | ESP8266, AT firmware | 1 | 2×4 pin header, 1MB flash |
| 3 | LM35 Temperature Sensor | TO-92 package, 10mV/°C | 1 | LM35DZ variant recommended |
| 4 | Flame Sensor Module | IR-based, digital output | 1 | Module with DO pin |
| 5 | Active Buzzer | 5V, 2-4kHz | 1 | Or passive with tone() |
| 6 | LED (Red) | 5mm, standard | 1 | Any high-brightness red LED |
| 7 | AMS1117-3.3 Regulator | 3.3V, 800mA | 1 | For ESP-01 power |
| 8 | 1kΩ Resistor | ¼W, 5% | 1 | Voltage divider (top) |
| 9 | 2kΩ Resistor | ¼W, 5% | 1 | Voltage divider (bottom) |
| 10 | 220Ω Resistor | ¼W, 5% | 1 | LED current limiter |
| 11 | 100Ω Resistor | ¼W, 5% | 1 | Buzzer current limiter |
| 12 | 10µF Electrolytic Cap | 16V or higher | 1 | ESP-01 supply decoupling |
| 13 | 100nF Ceramic Cap | 50V | 1 | ESP-01 supply bypass |
| 14 | Breadboard | Full-size | 1 | For prototyping |
| 15 | Jumper Wires | M-M, M-F | ~20 | Various lengths |
| 16 | USB Cable | Type-A to Type-B | 1 | Arduino programming/debug |
| 17 | 5V Power Supply | 2A minimum | 1 | For standalone operation |

**Optional (for louder buzzer):**

| # | Component | Specification | Qty | Notes |
|---|-----------|--------------|-----|-------|
| 18 | NPN Transistor | 2N2222 or BC547 | 1 | Buzzer driver |
| 19 | 1kΩ Resistor | ¼W, 5% | 1 | Base resistor for transistor |
| 20 | 1N4001 Diode | 1A | 1 | Flyback protection |

---

## Wiring Diagram

### Complete ASCII Wiring Schematic

```
                          +5V Rail
                            │
                ┌───────────┼───────────────────────────────┐
                │           │                               │
                │     ┌─────┴─────┐                         │
                │     │  AMS1117  │                         │
                │     │  3.3V REG │                         │
                │     │ IN  OUT   │                         │
                │     └──┬───┬────┘                         │
                │        │   │ +3.3V                        │
                │        │   ├──────────────────┐           │
                │       GND  │    ┌──────┐      │           │
                │        │   ├───▶│10µF  │      │           │
                │        │   │    │cap   │      │           │
                │        │   │    └──┬───┘      │           │
                │        │   │       │          │           │
                │        ▼   │      GND         │           │
                │       GND  │                  │           │
                │            │    ┌──────┐      │           │
                │            ├───▶│100nF │      │           │
                │            │    │cap   │      │           │
                │            │    └──┬───┘      │           │
                │            │       │          │           │
                │            │      GND         │           │
                │            │                  │           │
                │            │   ┌──────────────┴──┐        │
                │            │   │    ESP-01        │        │
                │            │   │                  │        │
                │            ├──▶│ VCC     CH_PD ◀──┤        │
                │            │   │                  │        │
                │            │   │ TX ─────────────────▶ D10 (Arduino RX via SoftSerial)
                │            │   │                  │        │
                │            │   │ RX ◀──┐          │        │
                │            │   │       │          │        │
                │            │   │ GND   │          │        │
                │            │   └──┬────┘          │        │
                │            │      │    │          │        │
                │            │     GND   │          │        │
                │            │           │          │        │
                │            │        ┌──┴──┐       │        │
                │            │  D11──▶│ 1kΩ │       │        │
                │            │        └──┬──┘       │        │
                │            │           ├──(to ESP RX)      │
                │            │        ┌──┴──┐       │        │
                │            │        │ 2kΩ │       │        │
                │            │        └──┬──┘       │        │
                │            │           │          │        │
                │            │          GND         │        │
                │            │                      │        │
    ┌───────────┴────────────┴──────────────────────┴───┐    │
    │                   ARDUINO UNO R3                   │    │
    │                                                    │    │
    │  5V ───────────────────────────────────────────────┼────┘
    │  GND ──────────────────────────────────────────────┼─── GND Rail
    │                                                    │
    │  A0 ◀── LM35 OUT                                  │
    │  D2 ◀── Flame Sensor DO                           │
    │  D6 ──▶ Buzzer (+) via 100Ω                       │
    │  D7 ──▶ LED Anode (+) via 220Ω                    │
    │  D10 ◀── ESP-01 TX  (SoftwareSerial RX)           │
    │  D11 ──▶ Voltage Divider ──▶ ESP-01 RX (SW TX)    │
    │                                                    │
    │  USB ──▶ Debug Serial (115200 baud)                │
    └────────────────────────────────────────────────────┘


    LM35 (TO-92, flat side facing you):
    ┌─────────┐
    │         │
    │  LM35   │
    │         │
    └─┬──┬──┬─┘
      │  │  │
     VCC OUT GND
      │  │   │
     5V  A0 GND


    Flame Sensor Module:
    ┌──────────────┐
    │  Flame Det.  │
    │   Module     │
    │              │
    └─┬────┬────┬──┘
      │    │    │
     VCC  GND  DO
      │    │    │
     5V   GND  D2


    Buzzer:                           LED:
    ┌──────┐                         ┌──────┐
    │Buzzer│                         │ LED  │
    │  (+) │──100Ω──D6               │Anode │──220Ω──D7
    │  (-) │──GND                    │Cath. │──GND
    └──────┘                         └──────┘


    Optional Transistor-Driven Buzzer (louder):
         +5V
          │
      ┌───┴───┐
      │Buzzer │
      │  (+)  │
      └───┬───┘
          │
      ┌───┴───┐
      │1N4001 │ (flyback diode, cathode to +5V)
      └───┬───┘
          │
          ├──── Collector (2N2222)
          │
     Base─┤  (NPN Transistor)
      │   │
  1kΩ─┤   └── Emitter ── GND
      │
     D6
```

---

## Pin Mapping Table

### Arduino Uno R3

| Arduino Pin | Type | Connected To | Direction | Notes |
|-------------|------|-------------|-----------|-------|
| A0 | Analog In | LM35 OUT | Input | 10-bit ADC, 0-5V range |
| D2 | Digital In | Flame Sensor DO | Input | Internal/external pullup optional |
| D6 | Digital Out (PWM) | Buzzer (+) | Output | Via 100Ω resistor, tone() capable |
| D7 | Digital Out | LED Anode | Output | Via 220Ω resistor |
| D10 | Digital In | ESP-01 TX | Input (SW RX) | SoftwareSerial RX, 3.3V input OK |
| D11 | Digital Out | ESP-01 RX | Output (SW TX) | SoftwareSerial TX, via voltage divider |
| TX (D1) | UART TX | USB / NodeMCU RX | Output | Hardware Serial (debug) |
| RX (D0) | UART RX | USB | Input | Hardware Serial (debug) |
| 5V | Power | Sensors, Regulator IN | Output | ~500mA available from USB |
| GND | Ground | All components | Common | Single ground plane |

### ESP-01 Module

| ESP-01 Pin | Connected To | Notes |
|------------|-------------|-------|
| VCC | AMS1117-3.3 OUT | 3.3V regulated, NOT from Arduino 3.3V pin |
| GND | Common Ground | |
| CH_PD (EN) | 3.3V | Must be HIGH for operation |
| RST | Not connected (has internal pullup) | Or connect to 3.3V via 10kΩ |
| TX (GPIO1) | Arduino D10 | Direct connection, 3.3V is valid logic HIGH |
| RX (GPIO0) | Voltage divider output | 5V→3.3V via 1kΩ + 2kΩ divider |
| GPIO0 | Not connected (floats HIGH) | Must be HIGH for normal boot (not flash mode) |
| GPIO2 | Not connected (floats HIGH) | Must be HIGH for normal boot |

---

## Component Wiring Details

### 1. LM35 Temperature Sensor

```
Connection: VCC → 5V, GND → GND, OUT → A0
```

- The LM35 outputs 10mV per °C (e.g., 250mV at 25°C)
- Output range: 0V (0°C) to ~1.5V (150°C) for LM35DZ
- No pull-up/pull-down resistors needed
- Place close to Arduino to minimize noise on analog signal
- Optional: Add 100nF capacitor between OUT and GND for noise filtering

### 2. Flame Sensor Module

```
Connection: VCC → 5V, GND → GND, DO → D2
```

- Uses IR photodiode to detect flame wavelengths (760nm-1100nm)
- Most modules have an onboard potentiometer for sensitivity adjustment
- DO (digital output): HIGH when flame detected (most modules) — verify with `FLAME_ACTIVE_HIGH`
- Detection range: typically 30-100cm depending on flame size
- Adjust potentiometer so the module triggers reliably at your desired distance

### 3. ESP-01 (ESP8266) — Power Supply

> [!CAUTION]
> **The Arduino Uno's 3.3V pin CANNOT power the ESP-01!**
> The Arduino's onboard 3.3V regulator provides only ~50mA.
> The ESP8266 draws up to **300mA** during WiFi transmission peaks.
> Insufficient power causes random resets, failed connections, or permanent damage.

**Required: External 3.3V Regulator (AMS1117-3.3)**

```
5V ──────┬──────────────────────────┐
         │                          │
    ┌────┴────┐               ┌─────┴─────┐
    │  Vin    │               │   10µF    │  (electrolytic, input side)
    │ AMS1117 │               │   16V     │
    │  Vout   │               └─────┬─────┘
    └────┬────┘                     │
         │                         GND
    ┌────┴────┐
    │  3.3V   │──── ESP VCC, ESP CH_PD
    │         │
    ├─────────┤
    │  100nF  │  (ceramic, output side, close to ESP)
    └────┬────┘
         │
        GND
```

### 4. UART Level Shifting (5V → 3.3V)

> [!IMPORTANT]
> **The ESP8266 runs at 3.3V logic.** Connecting Arduino's 5V TX directly to ESP RX
> will damage the ESP8266 over time or immediately. A voltage divider is required.

**Arduino TX (D11) → ESP RX voltage divider:**

```
D11 (5V) ──── 1kΩ ──┬── ESP-01 RX (3.3V)
                      │
                     2kΩ
                      │
                     GND

Output voltage = 5V × 2kΩ / (1kΩ + 2kΩ) = 3.33V ✓
```

**ESP TX → Arduino RX (D10):** Direct connection is fine.
Arduino's logic HIGH threshold is ~2.5V, and ESP's 3.3V output exceeds this.

### 5. Buzzer

```
D6 ──── 100Ω ──── Buzzer (+)
                   Buzzer (-) ──── GND
```

- 100Ω limits current to ~30mA (within Arduino pin max of 40mA)
- For louder output, use an NPN transistor driver (see wiring diagram above)
- `tone()` function generates square wave for passive buzzers
- Active buzzers will sound at any HIGH signal (ignoring frequency)

### 6. Warning LED

```
D7 ──── 220Ω ──── LED Anode (+)
                   LED Cathode (-) ──── GND
```

- 220Ω limits current to ~14mA at 5V with ~2V forward drop
- Use a high-brightness LED for visibility inside a helmet
- Consider using a different color for each state (would require multiple LEDs)

---

## Power Supply Requirements

### Current Budget

| Component | Typical Draw | Peak Draw | Notes |
|-----------|-------------|-----------|-------|
| Arduino Uno | 30mA | 50mA | MCU + onboard regulators |
| LM35 | 60µA | 60µA | Negligible |
| Flame Sensor | 15mA | 20mA | Module with comparator |
| ESP-01 (idle) | 20mA | 20mA | Connected, not transmitting |
| ESP-01 (TX) | 170mA | 300mA | During WiFi transmission |
| Buzzer | 20mA | 30mA | Active buzzer |
| LED | 14mA | 14mA | Through 220Ω |
| **Total** | **~270mA** | **~415mA** | |

### Power Options

1. **USB (development):** Provides 500mA at 5V. Sufficient for normal operation,
   but may be marginal during ESP8266 peak TX. Use a powered USB hub if unstable.

2. **External 5V adapter (production):** Use a 5V/2A DC adapter through the Arduino
   barrel jack or Vin pin. Provides ample headroom.

3. **Battery (portable):** 
   - 3× AA batteries (4.5V) → Arduino Vin (minimum is 6V for barrel jack, but works via 5V pin)
   - Better: 2S LiPo (7.4V) → Arduino Vin pin → onboard regulator handles step-down
   - Best: 5V USB power bank → Arduino USB port

> [!WARNING]
> If powering via the barrel jack or Vin, the minimum input voltage is **7V** 
> (recommended 7-12V) because the onboard regulator needs ~2V dropout.
> Below 7V, the 5V rail may sag and cause erratic behavior.

---

## Calibration & Verification

### How to Validate ADC Reference Voltage

The Arduino Uno's "5V" rail is rarely exactly 5.000V. An incorrect value causes
temperature reading errors.

1. Upload the firmware and open Serial Monitor at 115200 baud
2. Set your multimeter to DC voltage mode
3. Measure between the Arduino's **5V pin** and **GND pin**
4. Note the reading (e.g., 4.95V or 5.12V)
5. Update `ADC_REF_VOLTAGE` in the sketch to match:
   ```cpp
   #define ADC_REF_VOLTAGE  4.95  // Measured with multimeter
   ```
6. Re-upload and verify temperature reading against a known-good thermometer

**Impact of miscalibration:**
- At 25°C, LM35 outputs 250mV → ADC reads ~51
- If Vref is actually 4.95V but you assume 5.0V:
  - Computed: 51 × 5.0 / 1023 × 100 = 24.93°C
  - Actual: 51 × 4.95 / 1023 × 100 = 24.68°C
  - Error: ~0.25°C (small but accumulates at higher temperatures)

### How to Test Flame Sensor Polarity

1. Upload firmware, open Serial Monitor
2. With **NO flame** present, observe the `fr` (flame raw) field in telemetry
3. If `fr` is `0` when no flame → `FLAME_ACTIVE_HIGH = true` (default, correct)
4. If `fr` is `1` when no flame → `FLAME_ACTIVE_HIGH = false` (inverted sensor)
5. Verify by bringing a lighter near the sensor (keep safe distance!)
6. `fd` should become `true` when flame is within detection range

> [!TIP]
> Most flame sensor modules output **HIGH** when flame is detected and **LOW** 
> normally, but some are inverted. Always verify with your specific module.

---

## NodeMCU Alternative Wiring

Using a NodeMCU ESP8266 board instead of an ESP-01 simplifies the design significantly:

- **No external 3.3V regulator needed** (NodeMCU has onboard USB-powered regulator)
- **No level shifting needed** for the serial connection (NodeMCU handles it)
- **Built-in USB** for programming and debug
- **More GPIO pins** available for future expansion

### NodeMCU Wiring

```
┌───────────────┐              ┌───────────────┐
│  Arduino Uno  │              │   NodeMCU     │
│               │              │   ESP8266     │
│          TX(1)│──── wire ───▶│RX (GPIO3)     │
│           GND │──── wire ────│GND            │
│               │              │               │
│   (all other  │              │  Powered via  │
│   sensors as  │              │  own USB port │
│   described   │              │               │
│   above)      │              └───────────────┘
└───────────────┘

Optional voltage divider (recommended):
Arduino TX(1) ── 1kΩ ──┬── NodeMCU RX
                        │
                       2kΩ
                        │
                       GND
```

### Advantages of NodeMCU Approach

| Feature | ESP-01 + AT Commands | NodeMCU |
|---------|---------------------|---------|
| Setup complexity | High (regulator, divider, AT firmware) | Low (plug and play) |
| Debugging | Difficult (shared serial) | Easy (separate USB serial) |
| Code complexity | AT command strings | Clean HTTP library calls |
| Reliability | AT parsing can fail | Native WiFi stack |
| Cost | ~$2 | ~$4 |
| RAM for TLS | Very limited (~40KB) | Usable (~80KB) |
| Recommended for | Space-constrained final product | Development & prototyping |

---

## Assumptions Requiring Physical Verification

> [!IMPORTANT]
> The following assumptions are made in the firmware and must be verified with
> your actual hardware before deployment.

| # | Assumption | How to Verify | Risk if Wrong |
|---|-----------|---------------|---------------|
| 1 | ADC reference voltage is 5.0V | Measure 5V pin with multimeter | Temperature readings off by up to ±2°C |
| 2 | Flame sensor DO is HIGH when flame detected | Test with lighter, observe raw pin value | Inverted detection (false alarms or missed fires) |
| 3 | LM35 variant is LM35DZ (0-100°C range) | Check component marking | May not read negative temperatures |
| 4 | ESP-01 AT firmware baud rate is 9600 | Try AT command, check for response | No communication with ESP module |
| 5 | ESP-01 AT firmware version >= 1.6.x | Send AT+GMR command | Some AT commands may not be supported |
| 6 | SoftwareSerial is reliable at 9600 on D10/D11 | Monitor for garbled data in debug output | Corrupted telemetry, failed WiFi commands |
| 7 | Active buzzer (not passive) is used | Apply 5V and check if it sounds without tone() | If passive, need tone() at specific frequency |
| 8 | WiFi network is 2.4GHz | Check router settings | ESP8266 cannot connect to 5GHz networks |
| 9 | Backend server is reachable on the same network | Ping SERVER_IP from a laptop on same WiFi | HTTP POST will fail silently, data buffers and drops |
| 10 | Power supply can deliver ≥500mA at 5V | Measure with multimeter under load | ESP8266 brownout during TX, random resets |

---

## Troubleshooting Quick Reference

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| No debug output on Serial Monitor | Wrong baud rate | Set to 115200 in Serial Monitor |
| Temperature reads 0°C constantly | LM35 not connected or wrong pin | Check A0 wiring |
| Temperature reads very high (~500°C) | ADC noise / floating pin | Ensure LM35 GND is connected |
| ESP8266 not responding to AT | Wrong baud, no power, TX/RX swapped | Use esp_at_bridge.ino test utility |
| ESP8266 resets during WiFi TX | Insufficient power | Add external 3.3V regulator with caps |
| Flame always detected | Inverted polarity or sensitivity too high | Toggle FLAME_ACTIVE_HIGH, adjust pot |
| Garbled data on SoftwareSerial | Baud rate mismatch or interference | Verify both ends at 9600, use shorter wires |
| WiFi won't connect | Wrong SSID/password, 5GHz network | Verify credentials, check 2.4GHz |
| HTTP POST fails | Server not running, wrong IP/port | Test with curl from laptop first |

