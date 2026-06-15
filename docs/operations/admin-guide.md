# Administration Guide

This guide is for Admins and Farm Managers responsible for configuring and maintaining MycoERP.

## User Management

### Viewing Users

Navigate to "Users" in the sidebar (Admin group). You see a list of all registered user accounts showing their name, email, role, department, and active status.

### Changing a User's Role

1. Click on the user you want to modify.
2. Click "Edit".
3. Change the "Role" dropdown to the appropriate role:
   - **Admin** -- Full system access.
   - **Manager** -- Production oversight and approval authority.
   - **Lab Worker** -- Lab-focused batch management.
   - **Production Worker** -- Substrate and fruiting production.
   - **Harvest Worker** -- Harvest recording and task completion.
   - **Viewer** -- Read-only access.
4. Click "Save".

The user's access changes immediately on their next page load.

### Changing a User's Department

1. Edit the user record.
2. Change the "Department" dropdown to one of: Lab, Spawn, Substrate, Incubation, Fruiting, Harvest, Packaging, or Management.
3. Click "Save".

Departments are informational and used for task assignment grouping. They do not directly control access permissions.

### Deactivating a User

If a worker leaves the farm or should no longer have access:

1. Edit the user record.
2. Toggle "Active" to off (or click "Deactivate").
3. Click "Save".

Deactivated users cannot log in but their historical records (tasks completed, batches created, contamination reports filed) remain intact for audit purposes.

### Reactivating a User

If a previously deactivated user needs access again, edit their record and toggle "Active" back on.

## Permission Management

### Understanding the Permission Matrix

Navigate to "Permissions" in the sidebar. You see a grid showing:

- **Rows** -- Each of the 6 roles.
- **Columns** -- Each permission action (View, Create, Edit, Delete, Approve).
- **Groups** -- Permissions are organized by the 14 modules.

A checked box means that role has that permission for that module.

### The 14 Permission Modules

1. **Dashboard** -- The main overview page.
2. **Tasks** -- Task management and completion.
3. **Batches** -- Production batch management.
4. **Contamination** -- Contamination incident tracking.
5. **Harvests** -- Harvest recording.
6. **Environmental Logs** -- Environmental data entry and viewing.
7. **Inventory** -- Supply tracking.
8. **Rooms** -- Physical location management.
9. **Species/Strains** -- Mushroom catalog management.
10. **Process Templates** -- SOP template management.
11. **QR Codes** -- QR generation and scanning.
12. **Reports** -- Analytics and reporting.
13. **Users** -- User account management.
14. **Devices** -- IoT device management.

### Modifying Permissions

1. On the Permissions page, find the role and module you want to change.
2. Check or uncheck the relevant permission (View, Create, Edit, Delete, Approve).
3. Click "Save Changes".

Changes take effect on the next page load for all users with that role.

### Resetting to Defaults

If permissions have become confused or overly modified:

1. On the Permissions page, click "Reset to Defaults".
2. Confirm the action.
3. All permissions revert to the factory-default matrix.

Use this carefully -- it overrides all custom permission changes.

### Permission Guidelines

- **View** controls whether the user can see the module at all (sidebar item, page access).
- **Create** controls whether the user can add new records.
- **Edit** controls whether the user can modify existing records.
- **Delete** controls whether the user can remove records.
- **Approve** controls whether the user can approve/reject submissions (tasks, harvests).

A role needs "View" permission to access a module. Without it, the sidebar item is hidden and the page returns an access denied message.

## App Settings

Navigate to "Settings" in the sidebar (Admin group). Settings are organized into two tabs:

### Label and Barcode Tab

This configures how QR code labels are printed throughout the system.

**Label Sizes Per Batch Type:**

Different batch types can have different label dimensions. Select a batch type tab to configure:

- **Width (inches)** -- Physical label width (0.5" to 6").
- **Height (inches)** -- Physical label height (0.5" to 4").
- **QR Size (px)** -- How large the QR code image is rendered (40px to 300px).
- **Layout** -- Horizontal (QR on the left, text on the right) or Vertical (QR on top, text below).

A live preview shows how the label will appear at the configured size.

**Fields Shown on Label:**

Toggle which information appears on printed labels:

- Batch Code (e.g., AP-0012)
- Batch Type (e.g., Agar Culture)
- Species Name
- Strain Code
- Start Date
- Room Name
- Responsible Person

**Error Correction Level:**

Controls how much redundancy the QR code contains. Higher levels make the code scannable even when partially damaged:

- **Low (L)** -- 7% damage recovery. Smallest QR code. Use for clean environments.
- **Medium (M)** -- 15% damage recovery. Good default for most uses.
- **Quartile (Q)** -- 25% damage recovery. Use for labels that may get wet or dirty.
- **High (H)** -- 30% damage recovery. Use for harsh environments. Produces the densest code.

### General Tab

- **Farm Name** -- The name displayed in reports and on labels. Change this to your farm's actual name.
- **Auto-generate QR code on batch creation** -- When enabled, every new batch automatically receives a QR code and shows a download/print dialog. When disabled, QR codes must be generated manually from the QR Codes page.

After making changes, click "Save Settings" at the top of the page.

## IoT Device Management

Navigate to "IoT Devices" in the sidebar (Admin group).

### Viewing Devices

The device list shows all registered sensor hardware with:

- Device name.
- Assigned room.
- Device type (ESP32, Raspberry Pi, Other).
- Last seen timestamp.
- Status indicator (Online/Stale/Offline).
- Firmware version.

### Registering a New Device

1. Click "Add Device".
2. Fill in:
   - **Device Name** -- A descriptive label (e.g., "Fruiting Room 1 Sensor", "Incubation Temp Monitor").
   - **Room** -- Which room this device monitors.
   - **Device Type** -- Select ESP32, Raspberry Pi, or Other.
   - **Reporting Interval** -- How often the device sends data (in seconds, default 900 = 15 minutes).
3. Click "Register".
4. The system generates a unique Device ID and API Key.
5. Copy the API key immediately -- it is only shown once. If lost, you must re-register the device.
6. Configure the device firmware with the Device ID and API Key (see the hardware setup documentation).

### Understanding Device Status

- **Online** (green) -- Last report received within 2x the reporting interval. Working normally.
- **Stale** (amber) -- Last report received between 2x and 4x the reporting interval. May have intermittent connectivity issues.
- **Offline** (red) -- Last report was more than 4x the reporting interval ago. Likely disconnected, powered off, or broken.

### Troubleshooting Offline Devices

If a device shows as offline:

1. Check that the device is physically powered on (look for LED indicators).
2. Verify the farm WiFi network is operational.
3. Confirm the device is within WiFi range.
4. Check that the Supabase Edge Function endpoint is accessible.
5. If the device was recently moved, update the room assignment in the system.
6. If all else fails, re-register the device with a new API key and reflash the firmware.

### Deactivating a Device

If a device is removed from service:

1. Click on the device in the list.
2. Click "Deactivate" or toggle its active status.
3. The device will no longer appear in active device lists or affect room status displays.

## Notifications System

The system sends notifications for:

- Environmental alerts (threshold breaches).
- Task assignments and due date reminders.
- Task approval/rejection outcomes.
- Contamination reports on batches you manage.

Notifications appear as a count badge on the bell icon in the header. Click the bell to see all notifications. Click a notification to navigate to the related item.

## Operational Maintenance

### Regular Tasks

- **Weekly**: Review the Reports page for production trends and issues.
- **Weekly**: Check all IoT devices are reporting (no offline sensors).
- **Monthly**: Review and approve any pending tasks that may be stuck.
- **Monthly**: Verify inventory levels match physical counts (run stock takes).
- **Quarterly**: Review process templates and update based on operational learnings.
- **Quarterly**: Review user accounts and deactivate any that are no longer needed.
- **As needed**: Adjust room thresholds based on seasonal temperature changes.

### Data Integrity

- All data in MycoERP is stored in the cloud database and backed up automatically.
- Batch records, task history, and environmental logs are never deleted -- they form a permanent operational record.
- Deactivated users, inactive species, and archived QR codes remain in the system for historical reference.
