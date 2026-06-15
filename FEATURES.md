# MycoERP - Feature Roadmap and IoT Integration Guide

## Current Features

### Implemented
- Production batch lifecycle (agar through harvest)
- Task management with approval workflows
- QR code system (generation, scanning, verification)
- Environmental logging (manual)
- Inventory management
- Contamination reporting
- Harvest tracking
- Multi-tab reporting dashboard
- Role-based user management
- In-app notifications

### IoT Environmental Monitoring (New)
- ESP32 sensor integration via Edge Functions
- Automatic readings every 15 minutes
- Threshold alerting with auto-task generation
- Device management admin panel
- Live status indicators on rooms

---

## IoT Sensor Integration Guide

### Architecture Overview

```
[ESP32 + DHT22 + MH-Z19B]
         |
         | HTTP POST (every 15 min)
         v
[Supabase Edge Function: ingest-sensor-data]
         |
         |-- INSERT --> environmental_logs table
         |-- CHECK  --> room thresholds (temp_min/max, humidity_min/max, co2_max)
         |-- IF OUT OF RANGE:
         |       |-- INSERT --> environmental_alerts table
         |       |-- INSERT --> tasks table (auto-generated investigation task)
         |       |-- INSERT --> notifications table (notify managers)
         |
         v
[MycoERP Dashboard] <-- Real-time alert panel + live room indicators
```

### Hardware Components

| Component | Purpose | Approx. Cost |
|-----------|---------|-------------|
| ESP32 DevKit v1 (ESP32-WROOM-32) | Microcontroller with WiFi | $4-8 |
| DHT22 (AM2302) | Temperature + Humidity sensor | $3-5 |
| MH-Z19B NDIR CO2 sensor (optional) | CO2 measurement | $15-20 |
| Micro USB cable + 5V USB adapter | Power supply | $3-5 |
| Breadboard + jumper wires | Prototyping connections | $3-5 |

**Total cost per sensor node: ~$13-43** depending on whether CO2 sensing is needed.

### Wiring Diagram

```
ESP32 DevKit v1
+-----------+
|           |
| 3.3V  ----+---- DHT22 VCC (Pin 1)
| GND   ----+---- DHT22 GND (Pin 4)
| GPIO4 ----+---- DHT22 DATA (Pin 2) [10K pull-up to 3.3V recommended]
|           |
| 5V/Vin ---+---- MH-Z19B Vin
| GND   ----+---- MH-Z19B GND
| GPIO16 ---+---- MH-Z19B TX (ESP32 RX2)
| GPIO17 ---+---- MH-Z19B RX (ESP32 TX2)
|           |
| GPIO2 ----+---- Status LED (+) --> 220R --> GND
|           |
+-----------+
```

**Notes:**
- DHT22 Pin 3 is not connected
- Use a 10K ohm pull-up resistor between DHT22 DATA and 3.3V for reliable readings
- MH-Z19B requires 5V power (do NOT use 3.3V)
- Status LED is optional but helpful for debugging

### Firmware Setup (Arduino IDE)

#### 1. Install Arduino IDE Board Support

1. Open Arduino IDE > File > Preferences
2. Add to "Additional Boards Manager URLs":
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Tools > Board > Board Manager > Search "esp32" > Install "ESP32 by Espressif Systems"

#### 2. Install Required Libraries

Open Arduino IDE > Sketch > Include Library > Manage Libraries:
- **DHT sensor library** by Adafruit (+ Adafruit Unified Sensor)
- **MH-Z19** by Jonathan Dempsey

#### 3. Configure the Firmware

Copy `hardware/esp32-sensor/config.h.example` to `hardware/esp32-sensor/config.h` and fill in your values:

```cpp
// WiFi credentials
#define WIFI_SSID          "YourFarmWiFi"
#define WIFI_PASSWORD      "YourWiFiPassword"

// Supabase Edge Function URL (from your project dashboard)
#define EDGE_FUNCTION_URL  "https://your-project.supabase.co/functions/v1/ingest-sensor-data"

// Device credentials (from MycoERP admin panel after registering the device)
#define DEVICE_ID          "uuid-from-device-registration"
#define API_KEY            "api-key-shown-during-registration"

// Sensor configuration
#define READING_INTERVAL_MS 900000  // 15 minutes (900,000 ms)
#define ENABLE_CO2          true    // Set false if MH-Z19B is not connected
#define ENABLE_DEEP_SLEEP   false   // Set true to save power between readings
```

#### 4. Flash the Firmware

1. Connect ESP32 via USB
2. Tools > Board > "ESP32 Dev Module"
3. Tools > Port > Select the correct COM port
4. Upload `hardware/esp32-sensor/sensor.ino`

#### 5. Verify Operation

After flashing:
- Status LED blinks once: WiFi connecting
- Status LED solid for 2s: WiFi connected
- Status LED blinks twice: Reading sensors
- Status LED blinks three times: Data sent successfully
- Status LED rapid blink: Error (check Serial Monitor at 115200 baud)

### Edge Function Deployment

The Edge Function `ingest-sensor-data` is deployed to Supabase and handles:
- API key validation against registered devices
- Inserting environmental readings
- Checking room thresholds
- Generating alerts and tasks when thresholds are breached

It is deployed via the Supabase MCP tools (already done in this project).

**Required Edge Function Secrets:**
- `SUPABASE_SERVICE_ROLE_KEY` - Used to bypass RLS for inserting data from unauthenticated devices

### MycoERP Device Registration

1. Log in as Admin
2. Navigate to **IoT Devices** (in the Administration nav group)
3. Click **Register Device**
4. Fill in:
   - **Device Name**: e.g., "Fruiting Room 1 - Sensor A"
   - **Room**: Select the room this sensor will monitor
   - **Device Type**: ESP32
   - **Reporting Interval**: 900 seconds (15 min)
5. Click **Register** -- the system generates a Device ID and API Key
6. **Copy the API Key immediately** -- it is only shown once
7. Enter these values into your ESP32's `config.h` file

### Alert Behavior

When a sensor reading exceeds the room's configured thresholds:

1. **Alert Created**: An environmental alert is logged with the type (e.g., `temp_high`), measured value, and threshold value
2. **Task Auto-Generated**: A high-priority task is created with title like:
   - "Investigate: High temperature in Fruiting Room 1 (28.5C, max 22C)"
   - Due in 2 hours, assigned to the "manager" role
3. **Notification Sent**: All managers receive an in-app notification
4. **Deduplication**: The system won't create duplicate alerts for the same type in the same room within 1 hour

### Alert Resolution

1. Manager sees alert on Dashboard
2. Manager clicks "Acknowledge" to take ownership
3. The auto-generated task can be assigned to a worker
4. When the task is marked Completed, the alert is automatically resolved
5. Resolved alerts are archived and visible in the Environmental Logs history

### Threshold Configuration

Room thresholds are configured in the **Rooms** page:
- **temp_min / temp_max**: Acceptable temperature range (Celsius)
- **humidity_min / humidity_max**: Acceptable humidity range (%)
- **co2_max**: Maximum acceptable CO2 level (ppm)

If these values are not set for a room, no threshold alerting occurs for that metric.

### Troubleshooting

| Symptom | Likely Cause | Solution |
|---------|-------------|----------|
| Device shows "Offline" in admin panel | No readings received in 2x interval | Check WiFi, verify API key, check Serial Monitor |
| Readings arrive but no alerts fire | Room thresholds not configured | Set temp/humidity/CO2 limits in Rooms page |
| "Unauthorized" in device serial log | API key mismatch | Regenerate key in admin panel, update config.h |
| Temperature reads -999 or NaN | DHT22 wiring issue | Check data pin, add pull-up resistor |
| CO2 always reads 400-410 | Sensor needs warm-up | MH-Z19B needs 3 min warm-up; first few readings are ignored |

---

## Planned Features (Roadmap)

### High Priority

- **Yield Analytics / Biological Efficiency** - Calculate BE% per batch and strain, compare performance over time
- **Photo Upload with Supabase Storage** - Replace URL text fields with camera capture and file upload
- **Batch Cloning** - "Repeat this batch" button that pre-fills a new batch with same species/strain/recipe
- **Mobile Worker View** - Simplified large-button interface for floor workers

### Medium Priority

- **Export to CSV/PDF** - Download reports, harvest data, and batch lists
- **Dark Mode** - Toggle between light and dark themes
- **Recurring Tasks** - Schedule repeating tasks (cleaning, maintenance) without templates
- **Batch Status Automation** - Rules to auto-advance batch status when all tasks complete
- **Search Everywhere (Ctrl+K)** - Global command palette searching batches, tasks, QR codes
- **Activity Feed** - Global audit log viewer with filtering

### Future Enhancements

- **Multi-Farm Support** - Organization-level data isolation for multiple locations
- **Strain Performance Comparison** - Side-by-side analytics across strains
- **Offline QR Scanning** - Queue verifications when WiFi is unavailable
- **Notification Preferences** - Per-user notification type filtering
- **Onboarding Wizard** - Guided setup for new installations
- **Batch Forecasting** - Predict room capacity based on pipeline and historical cycle times
