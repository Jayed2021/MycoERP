# Environmental Monitoring

MycoERP tracks environmental conditions in all farm rooms. Readings can be logged manually by workers or automatically by IoT sensors. When conditions exceed safe thresholds, the system generates alerts and creates investigation tasks.

## What Is Monitored

For each room, the following measurements are tracked:

- **Temperature** -- Measured in degrees Celsius.
- **Humidity** -- Measured as relative humidity percentage.
- **CO2** -- Carbon dioxide concentration in parts per million (ppm).
- **Light status** -- Whether lights are on or off.
- **Fan status** -- Whether ventilation fans are running.
- **Humidifier status** -- Whether humidification equipment is active.

## Manual Environmental Logging

Any worker with access to the Environmental module can log readings:

1. Navigate to "Environmental" in the sidebar.
2. Click "Log Reading".
3. Select the room you are recording for.
4. Enter the measured values:
   - Temperature (required)
   - Humidity (required)
   - CO2 (optional -- only if you have a CO2 meter)
5. Toggle the equipment status indicators (lights, fan, humidifier) as appropriate.
6. Add any notes about conditions you observed (e.g., "Noticed condensation on walls", "Fan seems weak").
7. Click "Save Reading".

The reading is stored with your name, the timestamp, and the source marked as "manual".

## Viewing Environmental History

On the Environmental page:

- Select a room from the dropdown or room list.
- View a table of recent readings showing temperature, humidity, CO2, and who/what logged them.
- Readings from IoT sensors are marked with a device icon and "IoT" source label.
- Readings from manual logging are marked with a person icon and "Manual" source label.
- Look at the trend over time to spot patterns (rising temperatures, dropping humidity, etc.).

## IoT Automatic Logging

When an ESP32 sensor device is installed in a room:

- The device automatically sends readings to the system at regular intervals (typically every 15 minutes).
- These readings appear in the environmental history with the source marked as "IoT" and the device name shown.
- The device status (online, stale, or offline) is visible on the Devices page and on the room's environmental display.

You do not need to take any action for IoT logging -- it happens automatically. However, you should still perform occasional manual readings to verify sensor accuracy.

## Understanding Environmental Thresholds

Each room has configured threshold limits for temperature, humidity, and CO2. These define the acceptable operating range:

- **Temperature Min / Max** -- e.g., 20C to 26C for a fruiting room.
- **Humidity Min / Max** -- e.g., 85% to 95% for a fruiting room.
- **CO2 Max** -- e.g., 1000 ppm maximum for a fruiting room.

When a reading exceeds any threshold, an environmental alert is triggered.

## Environmental Alerts

When a threshold is breached (either from a manual reading or an IoT sensor):

1. An alert record is created showing:
   - Which room is affected.
   - What type of alert (High Temperature, Low Temperature, High Humidity, Low Humidity, High CO2).
   - The measured value versus the threshold value.
2. A high-priority investigation task is automatically created and assigned to managers.
3. Notifications are sent to all administrators and farm managers.
4. The alert appears on the Dashboard in the "Environmental Alerts" section.

Alert types:
- **High Temperature** -- Temperature exceeds the room's maximum.
- **Low Temperature** -- Temperature is below the room's minimum.
- **High Humidity** -- Humidity exceeds the room's maximum.
- **Low Humidity** -- Humidity is below the room's minimum.
- **High CO2** -- CO2 concentration exceeds the room's maximum.

## Acknowledging an Alert

When you see an environmental alert on the Dashboard:

1. Click the alert to view its details.
2. Review the measured value and threshold.
3. Click "Acknowledge" to indicate you are aware of the issue and investigating.
4. Your name and the acknowledgement time are recorded.

Acknowledging an alert does not resolve it -- it simply confirms someone is looking into it.

## Resolving an Alert

An alert is resolved when:

1. The automatically created investigation task is completed, OR
2. A subsequent reading shows the condition is back within normal range.

When the investigation task linked to the alert is marked complete (approved), the alert is automatically marked as resolved with a timestamp.

## Alert Deduplication

The system avoids creating duplicate alerts. If a threshold breach of the same type occurs in the same room within one hour of an existing unresolved alert, a new alert is not created. This prevents alert fatigue when conditions remain out of range for an extended period.

## Checking Device Status

To see if IoT sensors are working:

1. Navigate to "IoT Devices" in the sidebar (Admin section) or check the room's environmental display.
2. Each device shows a status indicator:
   - **Online** (green) -- The device has reported within its expected interval.
   - **Stale** (amber) -- The device has not reported for longer than expected, but not critically overdue.
   - **Offline** (red) -- The device has not reported for a prolonged period and may be disconnected.
3. The "Last Seen" timestamp shows when the device last sent data.

If a device appears offline, check:
- That the device is powered on.
- That the farm's WiFi network is functioning.
- That the device has not been accidentally unplugged or moved out of WiFi range.

## Best Practices

- Log manual readings at least twice daily for rooms without IoT sensors.
- Verify IoT sensor accuracy against a calibrated thermometer/hygrometer monthly.
- Respond to alerts promptly -- environmental changes can damage batches quickly.
- Note any unusual observations in the "Notes" field when logging readings.
- If you adjust equipment (turn on fans, open vents, adjust humidifier), log a reading afterward to confirm the effect.
