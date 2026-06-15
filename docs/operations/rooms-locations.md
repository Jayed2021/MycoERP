# Rooms and Locations

MycoERP tracks the physical layout of your farm -- rooms, racks within rooms, and shelves within racks. Each room has defined environmental thresholds used for alert monitoring.

## Room Types

The farm is organized into functional areas:

- **Lab** -- Clean room for agar work, liquid culture preparation, and inoculation. Requires the highest level of sterility.
- **Incubation Room** -- Dark, warm space where colonization occurs. Batches sit here while mycelium grows through the substrate.
- **Fruiting Room** -- Controlled environment with fresh air, humidity, and light where mushrooms are triggered to grow and develop fruit bodies.
- **Substrate Prep** -- Area for mixing, bagging, and sterilizing substrates. Contains autoclaves, mixers, and bagging equipment.
- **Storage** -- Climate-controlled area for storing raw materials, finished spawn, and supplies.
- **Packaging** -- Area where harvested mushrooms are sorted, graded, weighed, and packaged for sale.
- **Waste** -- Dedicated area for spent substrate, contaminated materials, and general farm waste.

## Viewing Rooms

1. Navigate to "Rooms" in the sidebar.
2. The room list shows all rooms with their type, current environmental readings (if IoT sensors are installed), and number of active batches.
3. Click a room to see its full details.

## Room Details

Each room page shows:

- **Basic Information** -- Room name, type, capacity, and any notes.
- **Environmental Thresholds** -- The acceptable ranges for temperature, humidity, and CO2.
- **Current Conditions** -- The most recent environmental reading (manual or IoT).
- **Active Batches** -- All batches currently stored in this room.
- **Racks and Shelves** -- The physical storage hierarchy within the room.
- **Environmental History** -- Recent readings plotted over time.

## Racks and Shelves

Within each room, storage is organized into racks and shelves:

- A **rack** is a standalone shelving unit (e.g., "Rack A", "Rack B", "Rack 1").
- Each rack contains multiple **shelves** (e.g., "Shelf 1", "Shelf 2" up to the number of shelves configured).
- When creating a batch, you can specify its exact location down to the shelf level.

This granular tracking helps workers locate specific batches quickly and allows managers to see how space is being utilized.

## Environmental Thresholds

Each room has configurable thresholds that define the acceptable operating range:

- **Temperature Min** -- Lowest acceptable temperature (in Celsius).
- **Temperature Max** -- Highest acceptable temperature.
- **Humidity Min** -- Lowest acceptable relative humidity percentage.
- **Humidity Max** -- Highest acceptable relative humidity percentage.
- **CO2 Max** -- Maximum acceptable CO2 concentration (in ppm).

Typical thresholds by room type:

- **Incubation** -- 24-28C, 60-80% humidity, 5000 ppm CO2 max (colonization tolerates higher CO2).
- **Fruiting** -- 18-24C (varies by species), 85-95% humidity, 800-1200 ppm CO2 max (mushrooms need fresh air).
- **Lab** -- 20-25C, 40-60% humidity (for worker comfort and sterile work).
- **Storage** -- 2-10C (refrigerated) or 15-22C (ambient), humidity depends on what is stored.

When any measurement exceeds these thresholds, an environmental alert is generated. See [Environmental Monitoring](./environmental-monitoring.md) for details on alerts.

## Editing Room Thresholds

If you are a manager or admin:

1. Navigate to Rooms.
2. Click the room you want to configure.
3. Click "Edit".
4. Adjust the threshold values.
5. Click "Save".

Changes take effect immediately for future readings. Any IoT sensor reading that now exceeds the new thresholds will trigger an alert.

## Adding a New Room

If the farm expands and a new room is put into service:

1. Navigate to Rooms.
2. Click "Add Room".
3. Fill in:
   - **Name** -- A descriptive name (e.g., "Fruiting Room 2", "Lab B").
   - **Room Type** -- Select the appropriate type.
   - **Capacity** -- Optional. How many batches this room can hold.
   - **Temperature Min/Max** -- Set appropriate thresholds.
   - **Humidity Min/Max** -- Set appropriate thresholds.
   - **CO2 Max** -- Set the maximum acceptable CO2 level.
   - **Notes** -- Any relevant information.
4. Click "Save".

After creating the room, add racks and shelves to define its storage layout.

## Adding Racks and Shelves

1. Open the room detail page.
2. In the Racks section, click "Add Rack".
3. Enter the rack name (e.g., "Rack A") and number of shelves.
4. Click "Save".
5. Shelves are automatically created based on the shelf count.

## Location QR Codes

Each room, rack, and shelf can have a QR code label for location verification:

- Post room QR codes at the entrance so workers can scan when entering.
- Attach rack QR codes to the rack frame.
- Place shelf QR codes on individual shelf positions.

These location QR codes are used in task verification -- when a task requires location scanning, the worker scans the room or rack QR to prove they performed the work in the correct location.

See [QR Code System](./qr-codes.md) for how to generate and print location QR codes.

## Best Practices

- Keep room names short and consistent (workers need to find them quickly in dropdowns).
- Review thresholds seasonally -- ambient temperature changes may require threshold adjustments.
- Label all racks and shelves physically with QR codes and visible text labels.
- Track batch locations accurately -- if you move a batch between shelves, update it in the system.
- Monitor rack utilization to plan future production capacity.
