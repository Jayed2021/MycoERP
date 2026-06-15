# Component Map

Quick-reference directory of every source file in the MycoERP project. Use this to direct AI tools to the exact file(s) that need work.

---

## Application Shell

| File | Export | Description |
|------|--------|-------------|
| `src/App.tsx` | `App` | Root component. Wraps app in AuthProvider and PermissionsProvider, renders router. |
| `src/main.tsx` | (entry) | Vite entry point. Mounts `<App />` to DOM. |
| `index.html` | (entry) | HTML shell with root div and font imports. |

---

## Layout and Navigation

| File | Export | Props | Description |
|------|--------|-------|-------------|
| `src/components/Layout.tsx` | `Layout` | `currentPath: string`, `children: ReactNode` | Main app chrome: sidebar navigation, top header bar, notification bell, language toggle. |

Dependencies: `useAuth`, `usePermissions`, `navigate`, `supabase`, `LanguageSelector`, `Notification` type.

---

## Shared UI Components

| File | Export(s) | Props | Description |
|------|-----------|-------|-------------|
| `src/components/Modal.tsx` | `Modal` | `open`, `onClose`, `title`, `children`, `size` ('sm'\|'md'\|'lg'\|'xl') | Generic overlay modal dialog. |
| `src/components/ConfirmDialog.tsx` | `ConfirmDialog` | `open`, `onClose`, `onConfirm`, `title`, `message`, `confirmLabel`, `danger` | Two-button confirmation prompt with optional red styling. |
| `src/components/StatusBadge.tsx` | `StatusBadge` | `label`, `type` ('health'\|'task'\|'priority'\|'batch'\|'severity'\|'custom'), `color`, `size` ('sm'\|'md') | Colored pill badge. Auto-picks color from utils when type is set. |
| `src/components/EmptyState.tsx` | `EmptyState` | `icon` (LucideIcon), `title`, `description`, `action` (ReactNode) | Placeholder shown when a list has no items. |
| `src/components/LoadingSpinner.tsx` | `LoadingSpinner`, `PageLoader` | `size` ('sm'\|'md'\|'lg'), `className` | Spinner and full-page centered loader. |
| `src/components/QrCodeDisplay.tsx` | `QrCodeDisplay` | `qrCode` (QrCode), `size`, `showActions`, `onUpdated` | Renders QR code SVG with print/download buttons and status. |
| `src/components/BatchCreatedDialog.tsx` | `BatchCreatedDialog` | `batch` (BatchInfo), `qrText`, `onClose`, `onGoToBatch` | Success dialog after batch creation showing QR label with print/download. |
| `src/components/LanguageSelector.tsx` | `LanguageSelector` | (none) | Dropdown toggling EN/BN language. |

---

## Context Providers

| File | Export(s) | Description |
|------|-----------|-------------|
| `src/contexts/AuthContext.tsx` | `AuthProvider`, `useAuth` | Manages Supabase auth session and user profile. Provides `signIn`, `signUp`, `signOut`, `user`, `loading`. |
| `src/contexts/PermissionsContext.tsx` | `PermissionsProvider`, `usePermissions` | Fetches role permissions from DB. Provides `can`, `canView`, `canCreate`, `canEdit`, `canDelete`, `canApprove`, `refresh`. |

---

## Hooks

| File | Export(s) | Description |
|------|-----------|-------------|
| `src/hooks/useRoute.ts` | `useRoute`, `navigate`, `getHashPath`, `getHashParams` | Hash-based client-side router. `useRoute()` returns `{path, params}`. `navigate(path)` changes route. |

---

## Page Components

### Main

| File | Export | Route | Props | Description |
|------|--------|-------|-------|-------------|
| `src/pages/Dashboard.tsx` | `Dashboard` | `#/` | (none) | Overview: stats cards, pipeline visualization, today's tasks, overdue tasks, environmental alerts, QR activity, upcoming harvests. |
| `src/pages/Login.tsx` | `Login` | `#/login` | (none) | Sign in / sign up forms with role and department selection. |

### Production

| File | Export | Route | Props | Description |
|------|--------|-------|-------|-------------|
| `src/pages/BatchList.tsx` | `BatchList` | `#/batches` | `initialType?: string` | Filterable batch list with type tabs and create-batch modal. |
| `src/pages/BatchDetail.tsx` | `BatchDetail` | `#/batches/:id` | `batchId: string` | Full batch view with 8 tabs: Info, Events, Photos, Tasks, QR Codes, Genealogy, Contamination, Harvest. |
| `src/pages/TaskList.tsx` | `TaskList` | `#/tasks` | `filter?: string`, `priority?: string`, `batchId?: string` | Task list with status/priority/batch filtering. |
| `src/pages/TaskDetail.tsx` | `TaskDetail` | `#/tasks/:id` | `taskId: string` | Task details with completion workflow, photo upload, QR verification, approval/rejection. |
| `src/pages/ContaminationReports.tsx` | `ContaminationReports` | `#/contamination` | `batchId?: string` | Contamination report list and create form. |
| `src/pages/Harvests.tsx` | `Harvests` | `#/harvests` | `batchId?: string` | Harvest records list and create form with weight grading. |
| `src/pages/EnvironmentalLogs.tsx` | `EnvironmentalLogs` | `#/environmental` | (none) | Environmental readings list with manual logging form. |

### Resources

| File | Export | Route | Props | Description |
|------|--------|-------|-------|-------------|
| `src/pages/Inventory.tsx` | `Inventory` | `#/inventory` | (none) | Inventory items with stock levels, movement recording, low-stock warnings. |
| `src/pages/Rooms.tsx` | `Rooms` | `#/rooms` | (none) | Room/rack/shelf management with threshold configuration. |
| `src/pages/SpeciesStrains.tsx` | `SpeciesStrains` | `#/species` | (none) | Species, strain, and recipe catalog management. |
| `src/pages/ProcessTemplates.tsx` | `ProcessTemplates` | `#/templates` | (none) | SOP templates with step editor by batch type. |
| `src/pages/QrManager.tsx` | `QrManager` | `#/qr` | (none) | QR code generation, status management, print queue. |
| `src/pages/QrPrint.tsx` | `QrPrint` | `#/qr/print/:id` | `qrId: string` | Print-optimized QR label layout. |
| `src/pages/QrScanner.tsx` | `QrScanner` | `#/scan` | `taskId?: string`, `required?: string`, `code?: string` | Camera-based QR scanner with offline fallback and manual entry. |

### Reporting

| File | Export | Route | Props | Description |
|------|--------|-------|-------|-------------|
| `src/pages/Reports.tsx` | `Reports` | `#/reports` | (none) | Analytics: pipeline overview, yield trends, contamination trends, task metrics. |

### Admin

| File | Export | Route | Props | Description |
|------|--------|-------|-------|-------------|
| `src/pages/Users.tsx` | `Users` | `#/users` | (none) | User account list with role/department editing, activate/deactivate. |
| `src/pages/Permissions.tsx` | `Permissions` | `#/permissions` | (none) | Role-permission matrix editor with reset-to-defaults. |
| `src/pages/AppSettings.tsx` | `AppSettings` | `#/settings` | (none) | System settings: label sizes per batch type, label fields, farm name, auto-QR toggle. |
| `src/pages/Devices.tsx` | `Devices` | `#/devices` | (none) | IoT device registration, API key generation, status monitoring. |

---

## Libraries and Utilities

| File | Key Exports | Description |
|------|-------------|-------------|
| `src/lib/supabase.ts` | `supabase` | Initialized Supabase client instance. |
| `src/lib/types.ts` | All TypeScript interfaces and type aliases | `UserRole`, `Profile`, `Batch`, `BatchType`, `Task`, `TaskWithQr`, `Species`, `Strain`, `Room`, `Rack`, `Shelf`, `Recipe`, `RecipeIngredient`, `ProcessTemplate`, `ProcessTemplateStep`, `ContaminationReport`, `Harvest`, `EnvironmentalLog`, `EnvironmentalAlert`, `IoTDevice`, `InventoryItem`, `InventoryMovement`, `Notification`, `QrCode`, `QrScanLog`, `TaskQrVerification`, `BatchSource`, `BatchEvent`, `BatchNote`, `BatchPhoto`, `BatchMovement` |
| `src/lib/utils.ts` | Formatting and helper functions | `formatDate`, `formatDateTime`, `formatRelativeTime`, `isOverdue`, `getOverdueDuration`, `getBatchTypeLabel`, `getBatchTypePrefix`, `generateBatchCode`, `getRoleLabel`, `getRoomTypeLabel`, `getHealthStatusColor`, `getTaskStatusColor`, `getPriorityColor`, `getSeverityColor`, `getBatchStatusColor`, `canManage`, `isAdmin`, `truncate`, `generateQrText`, `buildQrUrl`, `buildQrPayload`, `parseQrPayload`, `getQrStatusColor`, `getQrEntityTypeLabel`, `getQrScanResultColor`, `getVerificationResultColor`, `getAlertTypeLabel`, `getAlertTypeColor`, `getDeviceStatusColor` |
| `src/lib/permissions.ts` | Permission logic and constants | `MODULES`, `ROLES`, `ACTIONS`, `ACTION_LABELS`, `getPermission`, `canViewModule`, `canCreateInModule`, `canEditInModule`, `canDeleteInModule`, `canApproveInModule` |

---

## Internationalization

| File | Description |
|------|-------------|
| `src/i18n/index.ts` | i18next initialization with React plugin. Exports `changeLanguage(lng)`. |
| `src/i18n/languages.ts` | Language config array (`languages`) and `defaultLanguage` constant. |
| `src/i18n/locales/en.json` | English translation strings. |
| `src/i18n/locales/bn.json` | Bengali translation strings. |

---

## Backend (Edge Functions)

| File | Endpoint | Description |
|------|----------|-------------|
| `supabase/functions/ingest-sensor-data/index.ts` | `POST /ingest-sensor-data` | Receives sensor readings from IoT devices. Validates API key, inserts environmental log, checks thresholds, creates alerts and auto-tasks on breach. |

---

## Hardware Firmware

| File | Description |
|------|-------------|
| `hardware/esp32-sensor/sensor.ino` | Arduino sketch for ESP32. Reads DHT22 (temp/humidity) and MH-Z19B (CO2), POSTs to edge function at configured interval. |
| `hardware/esp32-sensor/config.h.example` | Template config file with WiFi credentials, Supabase URL, device API key, reporting interval. |

---

## Database Migrations

| File | Description |
|------|-------------|
| `supabase/migrations/20260609103547_001_core_schema.sql` | Core tables: profiles, species, strains, rooms, racks, shelves, recipes, recipe_ingredients, batches, batch_sources, batch_events, batch_notes, batch_photos, tasks, contamination_reports, harvests, environmental_logs, inventory_items, inventory_movements, notifications. RLS policies. |
| `supabase/migrations/20260609103705_002_seed_data.sql` | Seed data: default species, rooms, and sample inventory items. |
| `supabase/migrations/20260609114335_003_qr_code_system.sql` | QR tables: qr_codes, qr_scan_logs, task_qr_verifications, batch_movements. RLS policies. |
| `supabase/migrations/20260615112332_004_iot_system.sql` | IoT tables: iot_devices, environmental_alerts. Edge function support. Alert deduplication logic. |
| `supabase/migrations/20260615141011_005_role_permissions.sql` | Role permissions table with default permission matrix seed. |
| `supabase/migrations/20260615161111_006_app_settings.sql` | App settings table (key-value JSON store) with default label sizes and general config. |

---

## Dependency Graph (Simplified)

```
App.tsx
  ├── AuthContext (provides user session)
  ├── PermissionsContext (provides access control)
  ├── Layout (sidebar + header)
  │     ├── LanguageSelector
  │     └── Notification bell
  └── Pages (routed by useRoute)
        ├── Use: supabase client, types, utils
        ├── Use: Modal, ConfirmDialog, StatusBadge, EmptyState, PageLoader
        └── Use: QrCodeDisplay, BatchCreatedDialog (where relevant)
```

---

## How to Use This File

When directing an AI to work on a specific feature, reference the exact file path(s):

- "Modify the task completion workflow" --> `src/pages/TaskDetail.tsx`
- "Fix QR scanner offline mode" --> `src/pages/QrScanner.tsx`
- "Add a new field to batch creation" --> `src/pages/BatchList.tsx` (create modal) + `src/lib/types.ts` (Batch interface)
- "Change how permissions work" --> `src/lib/permissions.ts` + `src/contexts/PermissionsContext.tsx` + `src/pages/Permissions.tsx`
- "Update the edge function for sensor data" --> `supabase/functions/ingest-sensor-data/index.ts`
- "Add a new database table" --> Create new migration in `supabase/migrations/`
- "Change dashboard layout" --> `src/pages/Dashboard.tsx`
- "Add a new page" --> Create in `src/pages/`, register route in `src/App.tsx`, add sidebar link in `src/components/Layout.tsx`
