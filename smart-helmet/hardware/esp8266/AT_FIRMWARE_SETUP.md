# ESP8266 AT Firmware Setup Guide

> Complete guide for verifying, configuring, and flashing AT firmware on the ESP-01
> module used in the Smart Helmet project.

---

## Table of Contents

1. [Expected AT Firmware Version](#expected-at-firmware-version)
2. [Checking Firmware Version](#checking-firmware-version)
3. [Baud Rate Configuration](#baud-rate-configuration)
4. [Flashing AT Firmware](#flashing-at-firmware)
5. [Common Issues and Solutions](#common-issues-and-solutions)
6. [TLS/HTTPS Limitations](#tlshttps-limitations)
7. [Resources and Links](#resources-and-links)

---

## Expected AT Firmware Version

The Smart Helmet firmware requires the **Espressif Non-OS AT firmware** on the ESP-01 module.

| Property | Required | Recommended |
|----------|----------|-------------|
| AT Version | >= 1.6.0 | 1.7.5 |
| SDK Version | >= 2.0.0 | 3.0.5 |
| Baud Rate | 9600 | 9600 (configured) |
| Flash Size | >= 1MB (8Mbit) | 1MB |
| Boot Mode | Normal (not flash) | Normal |

**Why these versions?**
- AT >= 1.6 supports `AT+CWJAP` with full error codes
- AT >= 1.7 supports `AT+CIPSTART` with DNS resolution
- SDK >= 2.0 has improved WiFi stability and power management
- SDK >= 3.0 has the latest security patches

---

## Checking Firmware Version

### Step 1: Connect ESP-01 to Arduino

Use the wiring described in the main [README.md](../README.md). Alternatively, use a
dedicated USB-to-Serial adapter (like FTDI FT232RL at 3.3V logic).

### Step 2: Upload the Test Utility

Upload `esp_at_bridge.ino` to the Arduino Uno and open Serial Monitor at 115200 baud.

### Step 3: Send AT+GMR Command

In the test utility, press **`2`** to query firmware version. Or manually send:

```
AT+GMR
```

### Expected Response

```
AT version:1.7.5.0(Oct 20 2021 09:44:11)
SDK version:3.0.5(b29dcd3)
compile time:Oct 20 2021 09:49:04
Bin version(Wroom 02):1.7.5
OK
```

### Interpreting the Output

| Line | Meaning |
|------|---------|
| `AT version:X.Y.Z` | AT command interpreter version |
| `SDK version:X.Y.Z` | Espressif IoT SDK version |
| `compile time:...` | When the firmware was built |
| `Bin version:...` | Binary variant (may indicate flash size) |

If you get **no response**, see [Common Issues](#common-issues-and-solutions) below.

---

## Baud Rate Configuration

### Default Baud Rates

ESP-01 modules ship with varying default baud rates depending on the manufacturer:

| Firmware Source | Default Baud | Notes |
|----------------|-------------|-------|
| Espressif official (old) | 115200 | Pre-2018 modules |
| Espressif official (new) | 115200 | Factory default |
| AI-Thinker | 115200 or 9600 | Varies by batch |
| After AT+UART_DEF | Your setting | Persists across reboots |

### Setting Baud Rate to 9600

The Smart Helmet project uses **9600 baud** for SoftwareSerial reliability. To change
the ESP-01's baud rate:

```
AT+UART_DEF=9600,8,1,0,0
```

Parameters: `baud,databits,stopbits,parity,flow_control`

> [!IMPORTANT]
> After sending this command, you must change your serial monitor's baud rate to 9600
> to continue communicating. The setting persists across power cycles.

### If You Don't Know the Current Baud Rate

Try these baud rates in order (most common first):
1. **115200** — Most common factory default
2. **9600** — Common for modules pre-configured for Arduino
3. **57600** — Occasionally used
4. **38400** — Rare
5. **74880** — ESP8266 boot loader baud (you'll see boot messages but AT won't work)

For each baud rate:
1. Set Serial Monitor to that baud rate
2. Set `ESP_BAUD` in the sketch to match
3. Re-upload the sketch
4. Send `AT` and look for `OK` response
5. If garbled text appears, you're close — try adjacent baud rates

---

## Flashing AT Firmware

### When to Flash

Flash new firmware if:
- ESP-01 has no AT firmware (custom/NodeMCU firmware was loaded)
- AT firmware is too old (< 1.6)
- Module doesn't respond to AT commands
- You need specific features (HTTPS, MQTT, etc.)

### Required Hardware

| Item | Purpose |
|------|---------|
| USB-to-Serial adapter (3.3V) | FTDI FT232RL, CH340, or CP2102 at **3.3V** logic |
| Jumper wires | Connecting adapter to ESP-01 |
| ESP-01 adapter board (optional) | Makes connections easier |
| 3.3V power supply | At least 300mA (USB-Serial adapters usually can't supply enough) |

### Flashing Wiring

```
USB-Serial Adapter         ESP-01
─────────────────         ──────
TX  ──────────────────▶   RX
RX  ◀──────────────────   TX
GND ──────────────────▶   GND
                          VCC ◀── 3.3V (external supply)
                          CH_PD ◀── 3.3V
                          GPIO0 ◀── GND (for flash mode!)
                          GPIO2 ◀── 3.3V or floating (has internal pullup)
                          RST ◀── 3.3V (briefly ground to reset into flash mode)
```

> [!CAUTION]
> **GPIO0 must be pulled LOW** during power-up/reset to enter flash mode.
> After flashing, disconnect GPIO0 from GND and reset for normal operation.

### Flashing Procedure (esptool.py)

#### 1. Install esptool

```bash
pip install esptool
```

#### 2. Download AT Firmware

Download the official Espressif Non-OS AT firmware from:
- **GitHub:** https://github.com/espressif/ESP8266_NONOS_SDK/releases
- Look for `ESP8266_NonOS_AT_Bin` in the release assets

For ESP-01 (1MB flash), use the **1024+1024** or **8Mbit** variant.

#### 3. Identify Flash Size

```bash
esptool.py --port COM3 flash_id
```

Common output for ESP-01:
```
Manufacturer: ef
Device: 4014
Detected flash size: 1MB
```

#### 4. Erase Flash (Recommended)

```bash
esptool.py --port COM3 erase_flash
```

#### 5. Flash AT Firmware

For **1MB (8Mbit) ESP-01** with AT firmware v1.7.5:

```bash
esptool.py --port COM3 --baud 115200 write_flash --flash_mode dout --flash_size 1MB ^
  0x00000 boot_v1.7.bin ^
  0x01000 at/1024+1024/user1.2048.new.5.bin ^
  0xfc000 esp_init_data_default_v08.bin ^
  0x7e000 blank.bin ^
  0xfe000 blank.bin
```

> [!NOTE]
> File names and addresses may vary by firmware version. Always refer to the
> `README.md` included in the firmware download for exact flash addresses.

#### 6. Verify

After flashing:
1. Disconnect GPIO0 from GND
2. Power cycle the ESP-01
3. Connect at 115200 baud (factory default)
4. Send `AT` — should respond with `OK`
5. Send `AT+GMR` to verify version
6. Set desired baud rate with `AT+UART_DEF=9600,8,1,0,0`

### Alternative: Flash Tool (Windows GUI)

Espressif provides a Windows GUI flash tool:
- **Download:** https://www.espressif.com/en/support/download/other-tools
- Look for "Flash Download Tools"
- Select ESP8266, load the bin files at correct addresses, click Start

---

## Common Issues and Solutions

### Issue 1: No Response to AT Commands

| Possible Cause | Solution |
|----------------|----------|
| Wrong baud rate | Try 115200, 9600, 57600 |
| TX/RX swapped | Swap the wires |
| No power to ESP | Measure 3.3V at VCC pin |
| CH_PD not HIGH | Connect CH_PD to 3.3V |
| Not AT firmware | Flash AT firmware (see above) |
| ESP in flash mode | Disconnect GPIO0 from GND, reset |
| Broken module | Try a different ESP-01 |

### Issue 2: ESP Resets During Operation

| Possible Cause | Solution |
|----------------|----------|
| Insufficient current | Use external 3.3V reg (AMS1117), add 10µF cap |
| Power supply noise | Add 100nF ceramic cap near ESP VCC |
| Watchdog timeout | Ensure firmware isn't stuck; update AT firmware |
| Voltage droop during TX | Bigger capacitor (47µF-100µF) on 3.3V rail |

### Issue 3: WiFi Connection Fails

| Possible Cause | Solution |
|----------------|----------|
| Wrong credentials | Double-check SSID and password (case-sensitive!) |
| 5GHz network | ESP8266 only supports 2.4GHz |
| MAC filtering | Add ESP's MAC to router whitelist (`AT+CIPSTAMAC?`) |
| Too far from AP | Move closer, check `AT+CWLAP` for signal strength |
| Router channel 13/14 | Some ESP modules don't support channels > 11 |

### Issue 4: AT+CWJAP Returns Error Codes

| Error Code | Meaning | Solution |
|-----------|---------|----------|
| 1 | Connection timeout | Check WiFi range and credentials |
| 2 | Wrong password | Verify password exactly |
| 3 | Target AP not found | Check SSID, ensure 2.4GHz, check range |
| 4 | Connection failed | Try resetting ESP and router |

### Issue 5: Garbled Serial Output

| Possible Cause | Solution |
|----------------|----------|
| Baud rate mismatch | Ensure both ends match (9600 or 115200) |
| SoftwareSerial limitations | Don't exceed 9600-19200 on SoftwareSerial |
| Electrical noise | Use shorter wires, add bypass caps |
| 5V on ESP RX | Install voltage divider! |

### Issue 6: TCP Connection Fails

| Possible Cause | Solution |
|----------------|----------|
| Server not running | Start the backend server, verify with curl |
| Wrong IP/port | Verify SERVER_IP and SERVER_PORT |
| Firewall blocking | Allow port on server firewall |
| Not on same network | Ensure ESP and server are on same subnet |
| DNS not available | Use IP address, not hostname (AT firmware DNS can be unreliable) |

---

## TLS/HTTPS Limitations

> [!WARNING]
> The ESP-01 has **very limited RAM** (~40KB usable heap) and is poorly suited
> for TLS/HTTPS connections. This is a significant limitation for production IoT.

### Why TLS is Problematic on ESP-01

| Constraint | Impact |
|-----------|--------|
| ~40KB free heap | TLS handshake requires ~15-30KB for certificate processing |
| No hardware crypto | RSA/AES done in software, very slow |
| Certificate storage | Root CAs consume flash space |
| AT firmware TLS | `AT+CIPSTART="SSL"` exists but is unreliable |
| Connection drops | TLS sessions frequently fail mid-handshake |

### Recommended Alternatives for Secure Communication

1. **Use HTTP on local network** — If the backend server is on the same trusted LAN,
   HTTP (not HTTPS) is acceptable. Authenticate using the `X-Device-Token` header.

2. **Use NodeMCU instead** — The ESP-12E/F module on NodeMCU boards has more RAM
   (~80KB free heap) and better TLS support through the Arduino ESP8266 library's
   `BearSSL` implementation. See `nodemcu_bridge/nodemcu_bridge.ino`.

3. **Use MQTT over TLS on NodeMCU** — MQTT is lighter than HTTP and works better
   with TLS on constrained devices.

4. **VPN or encrypted tunnel** — Run the ESP over HTTP inside a WireGuard or
   SSH tunnel on the network router.

5. **Upgrade to ESP32** — The ESP32 has hardware crypto acceleration and ample
   RAM for TLS. Consider for production deployments.

### If You Must Use TLS on ESP-01

The AT firmware supports SSL connections with:

```
AT+CIPSSLSIZE=4096
AT+CIPSTART="SSL","server.example.com",443
```

But expect:
- Frequent `ERROR` responses during handshake
- Only TLS 1.1 or 1.2 (depends on AT firmware version)
- No certificate validation (accepts any cert — insecure!)
- Very slow (~5-10 seconds for handshake)
- Random crashes if heap is fragmented

**Bottom line:** For production use with security requirements, use NodeMCU/ESP32
or add a local HTTPS reverse proxy on the same network.

---

## Resources and Links

### Official Espressif Resources

| Resource | URL |
|----------|-----|
| ESP8266 Non-OS SDK (AT firmware) | https://github.com/espressif/ESP8266_NONOS_SDK |
| AT Command Set Documentation | https://docs.espressif.com/projects/esp-at/en/latest/ |
| ESP8266 Technical Reference | https://www.espressif.com/en/products/socs/esp8266 |
| Flash Download Tool (Windows) | https://www.espressif.com/en/support/download/other-tools |
| esptool.py (Python flash tool) | https://github.com/espressif/esptool |

### Community Resources

| Resource | URL |
|----------|-----|
| ESP8266 Arduino Core | https://github.com/esp8266/Arduino |
| ESP8266 Community Forum | https://www.esp8266.com/ |
| AT Command Reference (community) | https://room-15.github.io/blog/2015/03/26/esp8266-at-command-reference/ |
| Random Nerd Tutorials (ESP) | https://randomnerdtutorials.com/projects-esp8266/ |

### Useful AT Commands Reference

| Command | Purpose | Example |
|---------|---------|---------|
| `AT` | Test communication | `AT` → `OK` |
| `AT+GMR` | Get firmware version | Shows AT/SDK version |
| `AT+RST` | Software reset | Reboots the module |
| `AT+CWMODE=1` | Set station mode | Required for WiFi client |
| `AT+CWJAP="ssid","pass"` | Connect to WiFi | Returns OK or error code |
| `AT+CWJAP?` | Query current WiFi | Shows connected SSID |
| `AT+CIFSR` | Get IP address | Shows STA IP and MAC |
| `AT+CWLAP` | Scan WiFi networks | Lists visible APs |
| `AT+CIPMUX=0` | Single connection | Required for CIPSTART |
| `AT+CIPSTART="TCP","ip",port` | Open TCP | Returns OK or ERROR |
| `AT+CIPSEND=length` | Prepare to send data | Returns `>` prompt |
| `AT+CIPCLOSE` | Close TCP connection | Closes current conn |
| `AT+CIPSTATUS` | Connection status | 2=got IP, 3=connected, 4=disconnected |
| `AT+UART_DEF=baud,8,1,0,0` | Set baud rate (persistent) | Survives reboot |
| `AT+CIPSTAMAC?` | Get MAC address | For MAC filtering |
| `AT+CWQAP` | Disconnect WiFi | Leaves current AP |
| `ATE0` / `ATE1` | Disable/enable echo | Cleaner AT responses |

