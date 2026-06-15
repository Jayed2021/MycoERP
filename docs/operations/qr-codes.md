# QR Code System

MycoERP uses QR codes to physically label batches, rooms, racks, shelves, and harvest crates. Scanning these codes provides instant access to information and verifies that workers are handling the correct items in the correct locations.

## What QR Codes Are Used For

- **Batch identification** -- Every batch gets a QR label so workers can quickly look up batch information by scanning.
- **Location verification** -- Rooms and racks have QR codes to verify workers are in the correct location when completing tasks.
- **Task verification** -- Some tasks require scanning specific QR codes before they can be submitted, ensuring procedures were followed correctly.
- **Traceability** -- Every scan is logged, creating a complete audit trail of who handled what, when, and where.
- **Offline identification** -- QR codes embed basic batch information directly in the code, so workers can identify a batch even without network access.

## QR Code Entity Types

QR codes can be created for:

- **Batch** -- Labels applied to production batches (bags, jars, plates, containers).
- **Location** -- Labels posted at room entrances or work stations.
- **Rack** -- Labels on storage racks within a room.
- **Shelf** -- Labels on individual shelves.
- **Harvest Crate** -- Labels on harvest containers for post-harvest tracking.
- **Checkpoint** -- Labels at procedural stations (e.g., sterilization checkpoint, packaging station).
- **Other** -- Custom labels for any other purpose.

## Auto-Generated QR Codes

When you create a new batch (and auto-QR is enabled in system settings):

1. The system automatically generates a QR code record linked to the batch.
2. A dialog appears showing the QR code with options to:
   - **Download as PNG** -- Saves an image file to your device for printing on an external printer.
   - **Print** -- Opens the browser print dialog with a properly sized label.
3. The QR code text follows the format: QR-BATCH-AP-0012 (prefix + batch code).

## Generating QR Codes Manually

To create QR codes for rooms, racks, shelves, or harvest crates:

1. Navigate to "QR Codes" in the sidebar.
2. Click "Generate QR Code".
3. Select the entity type (Location, Rack, Shelf, Harvest Crate, Checkpoint, or Other).
4. Select or enter a label (e.g., "Fruiting Room 1", "Rack A", "Crate 47").
5. Optionally add a description.
6. Click "Generate".
7. The new QR code appears with options to print or download.

## Printing QR Labels

Labels are printed at sizes configured by your administrator in App Settings. Different batch types can have different label dimensions.

To print a label:

1. Find the QR code in the QR Codes list or in the batch detail (QR Codes tab).
2. Click "Print".
3. The system opens a print-optimized view sized to the configured dimensions.
4. The label includes the QR code image plus text showing:
   - Batch code (e.g., AP-0012)
   - Batch type (e.g., Agar Culture)
   - Species name
   - Strain code
   - Start date
   - (Additional fields as configured by admin)
5. Use your browser's print dialog to send to your label printer.
6. For standard printers, you may prefer to download as PNG and print from an image editor.

Label sizes are configured per batch type. Typical sizes:
- Small labels (1.5" x 1") for agar plates and petri dishes.
- Medium labels (2" x 1.25") for jars and small bags.
- Large labels (2.5" x 1.5") for substrate bags and fruiting blocks.

## Scanning QR Codes

### Using the Camera Scanner

1. Navigate to the QR Scanner (via the sidebar "QR Codes" section, or from a task that requires scanning).
2. Grant camera permission when prompted by your browser.
3. Hold the QR code label in front of your device's camera.
4. Keep the label flat and well-lit, centered in the camera view.
5. The scanner automatically detects and reads the code.
6. The result appears showing the identified entity (batch, room, etc.).

### Manual Text Entry

If the camera is not available or the QR code is too damaged to scan:

1. On the scanner page, look for the "Manual Entry" option.
2. Type the QR code text printed beneath the QR image on the label (e.g., QR-BATCH-AP-0012).
3. Click "Look Up".
4. The system finds the matching record.

### After a Successful Scan

When a code is scanned successfully:

- For batches: You see the batch code, type, species, status, and health at a glance. You can click through to view the full batch detail.
- For locations: You see the room name and type.
- For task verification: The scan is recorded and the QR requirement is marked as satisfied.

## Offline Scanning

If your device has no network connection when you scan:

1. The QR code contains embedded data in the format: MYCO|code|type|label|info|date
2. The scanner reads this data and shows you the batch code, type, and label even without contacting the server.
3. An "Offline" indicator appears to let you know you are not connected.
4. The scan is saved to a local queue on your device.
5. When your device regains network connectivity, the queued scan logs are automatically sent to the server.

This means you can always identify a batch by scanning its QR code, even in areas of the farm without network coverage.

## QR Code Statuses

Each QR code has a status:

- **Active** -- The code is in use and valid for scanning.
- **Inactive** -- The code has been deactivated but not replaced.
- **Lost** -- The physical label has been lost and needs replacement.
- **Replaced** -- This code was replaced by a new one (the new code is linked).
- **Archived** -- The code is no longer relevant (batch closed, etc.).

## Replacing a QR Code

If a label is damaged, lost, or unreadable:

1. Navigate to QR Codes in the sidebar.
2. Find the old QR code record.
3. Click "Replace".
4. A new QR code is generated for the same entity.
5. The old code is marked as "Replaced" with a link to the new one.
6. Print and apply the new label.

The old code will no longer scan successfully (it returns "Inactive code" if someone scans it), directing workers to find the replacement label.

## QR Scanning for Task Verification

When a task has QR requirements:

1. Open the task detail page.
2. You will see indicators for each required scan (Batch QR, Location QR, Checkpoint QR, Crate QR).
3. Click the scan button next to each requirement.
4. Scan the appropriate code.
5. The system checks whether the scanned code matches what is expected:
   - **Matched** -- Correct code scanned. Green checkmark shown.
   - **Wrong QR** -- You scanned a valid code, but it belongs to the wrong entity.
   - **Wrong location** -- The location code does not match the expected room.
   - **Wrong batch** -- The batch code does not match the task's linked batch.
   - **Expired** -- The QR code is no longer active.
6. All required scans must show "Matched" before you can submit the task.
7. If a scan cannot be completed, ask your manager for an override.

## Scan Audit Trail

Every QR scan (successful or failed) is logged in the system with:

- Who scanned it and when.
- What code was scanned.
- The context (task verification, batch lookup, etc.).
- The result (Success, Invalid code, Wrong location, etc.).
- Device information.

This audit trail helps managers track compliance with scanning procedures and investigate any discrepancies.
