# Wiring, Power, and Calibration Guide — Smart Helmet

> Complete electrical reference and verification instructions for the physical hardware prototype.

---

## 1. Master Wiring Schematic

```
                                +5V (External or USB)
                                 │
                                 ├── LM35 VCC (Pin 1)
                                 ├── Flame Module VCC
                                 │
                                GND
                                 │
                                 ├── LM35 GND (Pin 3)
                                 ├── Flame Module GND
                                 ├── Buzzer (-)
                                 ├── LED Cathode (-)
                                 ├── ESP-01 GND
                                 └── Arduino Uno GND (COMMON GROUND)

       ┌────────────────────────────────────────────────────────┐
       │                    ARDUINO UNO R3                      │
       │                                                        │
       │   A0 ◀───────────── LM35 VOUT (Pin 2)                  │
       │                                                        │
       │   D2 ◀───────────── Flame Module DO (Digital Out)      │
       │                                                        │
       │   D6 ────────────── 100Ω Resistor ─────▶ Buzzer (+)    │
       │                                                        │
       │   D7 ────────────── 220Ω Resistor ─────▶ LED Anode (+) │
       │                                                        │
       │   D10 (SW RX) ◀──── ESP-01 TX (Direct 3.3V OK)         │
       │                                                        │
       │   D11 (SW TX) ──┬── 1kΩ Resistor ──────▶ ESP-01 RX     │
       │                 │                         │            │
       │                 └── 2kΩ Resistor ──┐      │            │
       │                                    ▼      │            │
       │                                   GND     │            │
       │                                           │            │
       │   USB ◀──────────── Laptop USB Port (Debug 115200)     │
       └────────────────────────────────────────────────────────┘

       ┌────────────────────────────────────────────────────────┐
       │                   ESP-01 / ESP8266                     │
       │                                                        │
       │   VCC   ◀────────── 3.3V External Power (>= 300mA)     │
       │   CH_PD ◀────────── 3.3V Pullup (Enables chip)         │
       │   GND   ◀────────── Common GND                         │
       │   TX    ─────────── Arduino D10                        │
       │   RX    ─────────── From Voltage Divider (3.3V logic)  │
       └────────────────────────────────────────────────────────┘
```

---

## 2. Pin Mapping Table

| Component | Pin Function | Arduino Pin | Notes |
|---|---|---|---|
| **LM35** | Analog Temp Out | `A0` | Linear 10 mV/°C output |
| **LM35** | Power | `5V` & `GND` | Keep leads short to prevent noise |
| **Flame Sensor** | Digital Output | `D2` | Connected to on-module comparator |
| **Buzzer** | Alert Signal | `D6` | PWM capable; optional 100Ω resistor |
| **Warning LED** | Visual Alert | `D7` | Uses 220Ω current-limiting resistor |
| **ESP-01 RX** | Serial In | `D11 (TX)` | Must be stepped down from 5V to 3.3V |
| **ESP-01 TX** | Serial Out | `D10 (RX)` | 3.3V logic is safely read as HIGH by Uno |
| **USB Serial** | Programming/Logs| `D0 / D1` | Strictly reserved for debug @ 115200 |

---

## 3. Power Requirements & Voltage Regulation

### CRITICAL WARNING: The Arduino 3.3V Pin CANNOT Power the ESP-01
- The onboard 3.3V voltage regulator on an authentic Arduino Uno R3 delivers at most **50 mA to 150 mA**.
- The ESP8266 draws up to **250 mA to 350 mA peak currents during Wi-Fi transmission bursts**.
- Powering the ESP8266 from the Uno 3.3V header causes brownouts, intermittent reboots, corrupted AT responses, or damaged regulators.

### Safe Power Alternatives:
1. **Dedicated 3.3V LDO Regulator**: An AMS1117-3.3V regulator taking 5V from the Arduino 5V rail (or external 9V/12V source) with a 10µF and 100µF capacitor to smooth Wi-Fi RF power spikes.
2. **Dedicated ESP-01 Breadboard Adapter**: A module with a built-in 3.3V regulator and level shifting.
3. **NodeMCU Alternative**: The NodeMCU board has its own robust onboard 3.3V regulator and can be powered via micro-USB.

---

## 4. UART Voltage Level Shifter

The ATmega328P outputs 5V TTL logic on digital pin D11. The ESP8266 inputs are **3.3V max**.

Use a two-resistor voltage divider:
- **R1 (Top)**: 1 kΩ (between Arduino D11 and ESP-01 RX)
- **R2 (Bottom)**: 2 kΩ (between ESP-01 RX and GND)

$$V_{\text{out}} = 5.0\,\text{V} \times \frac{2\,\text{k}\Omega}{1\,\text{k}\Omega + 2\,\text{k}\Omega} = 3.33\,\text{V}$$

---

## 5. LM35 Temperature Calculation & Multimeter Calibration

The LM35 produces an output voltage of:
$$\text{Sensor Voltage} = 10\,\text{mV/}^\circ\text{C} = 0.010\,\text{V/}^\circ\text{C}$$

On a 10-bit ADC:
$$\text{Measured Voltage} = \text{analogRead}(\text{A0}) \times \frac{V_{\text{ref}}}{1023.0}$$
$$\text{Temperature}^\circ\text{C} = \text{Measured Voltage} \times 100.0$$

### Calibration Steps:
1. Connect a digital multimeter between the Arduino `5V` pin and `GND`.
2. Measure the exact voltage with the board powered via USB (often between 4.85V and 5.08V).
3. In `smart_helmet.ino`, update:
   ```cpp
   #define ADC_REF_VOLTAGE 4.96  // Your multimeter reading
   ```
4. This removes a potential 2°C–4°C error in temperature calculations.

---

## 6. Flame Sensor Polarity Verification

Infrared flame sensor modules feature an onboard potentiometer and comparator (LM393):
1. Power the module and observe the `DO` LED.
2. In the absence of fire/lighter, note the digital state on D2.
3. Bring a small flame or test lighter 20–30 cm in front of the sensor.
4. If DO switches from `LOW` to `HIGH` upon fire, set:
   ```cpp
   #define FLAME_ACTIVE_HIGH true
   ```
5. If DO switches from `HIGH` to `LOW`, set:
   ```cpp
   #define FLAME_ACTIVE_HIGH false
   ```

