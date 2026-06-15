# MycoERP - Mushroom Cultivation Management System

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-crj6spzk)

A full-featured Enterprise Resource Planning (ERP) system purpose-built for commercial mushroom cultivation operations. Track every batch from agar plate to harvest, manage worker tasks with approval workflows, monitor environmental conditions, and verify physical operations with QR codes -- all in a single responsive web application.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Backend / Database | Supabase (PostgreSQL, Auth, RLS) |
| QR Generation | qrcode.react |
| QR Scanning | jsQR + native getUserMedia |
| IoT Integration | Supabase Edge Functions + ESP32 sensors |
| Routing | Custom hash-based router |

## Features

### Production Batch Lifecycle

- Full pipeline tracking: Agar Culture, Liquid Culture, Grain Spawn, Substrate, Fruiting Block, Harvest
- Batch genealogy (parent-child linking between stages)
- Status and health tracking with timeline event log
- Automatic task generation from SOP process templates
- Contamination reporting with severity levels

### Task Management

- Assignment to specific workers or roles
- Priority levels (Low, Normal, High, Critical)
- Overdue detection and duration tracking
- Photo proof requirement
- Multi-step approval workflow (Submit, Approve, Reject)
- QR verification requirements per task

### QR Code System

- Generate QR codes for batches, rooms, racks, shelves, harvest crates, and checkpoints
- Camera-based scanning with jsQR (no external DOM libraries)
- Manual text entry fallback
- Deep-linking: phone cameras open the app directly to scan results
- Print-optimized labels in 3 sizes (50x30mm, 70x40mm, 100x60mm)
- Scan logging with full audit trail
- Task QR verification: workers must scan specific QR codes before completing tasks
- Manager override capability for QR requirements
- QR replacement flow (old code marked Replaced, new one generated)

### IoT Environmental Monitoring

- ESP32-based sensor integration via Supabase Edge Functions
- Automatic environmental readings every 15 minutes
- Real-time room status with live indicators
- Threshold-based alerting with auto-task generation
- Device management panel for registering and monitoring sensors
- Supports DHT22 (temperature/humidity) and MH-Z19B (CO2) sensors
- Manual reading entry as fallback

### Inventory Management

- Stock tracking with minimum level alerts
- Movement history (Stock In, Stock Out, Used in Batch, Adjustment, Waste)
- Category-based organization

### Harvest Tracking

- Multi-flush harvest recording per fruiting batch
- Grade A / Grade B / Waste weight breakdown
- Per-batch and monthly yield reporting

### Reporting

- Production pipeline visualization
- Task performance metrics
- Harvest yield reports with date ranges
- Contamination trend analysis

### User Management and Security

- Role-based access: Admin, Manager, Lab Worker, Production Worker, Harvest Worker, Viewer
- Row-Level Security (RLS) on all database tables
- In-app notifications for approvals, rejections, and task events
- Department-based organization

## Project Structure

```
src/
  components/       Reusable UI components (Modal, StatusBadge, QrCodeDisplay, etc.)
  contexts/         React contexts (AuthContext)
  hooks/            Custom hooks (useRoute for hash-based routing)
  lib/              Shared utilities, types, Supabase client
  pages/            Page-level components (Dashboard, BatchDetail, QrScanner, etc.)

supabase/
  migrations/       SQL migrations (schema, seed data, QR system, IoT system)
  functions/        Edge Functions (sensor data ingestion)

hardware/
  esp32-sensor/     Example ESP32 firmware for IoT sensors
```

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project (free tier works)

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Database Setup

Apply the migrations in order via the Supabase SQL editor or MCP tools:

1. `001_core_schema.sql` - Creates all tables, RLS policies, and relationships
2. `002_seed_data.sql` - Seeds species, rooms, inventory items, and process templates
3. `003_qr_code_system.sql` - Adds QR tables, scan logs, task verification, and batch movements
4. `004_iot_system.sql` - Adds IoT device management and environmental alert tables

### Running Locally

```bash
npm run dev
```

### Building for Production

```bash
npm run build
npm run preview
```

## User Roles

| Role | Capabilities |
|------|-------------|
| Admin | Full access: manage users, devices, all CRUD operations, override QR requirements |
| Manager | Approve tasks, manage batches/templates/QR codes, acknowledge alerts, view reports |
| Lab Worker | Work agar/LC tasks, log observations, scan QR codes |
| Production Worker | Work spawn/substrate/fruiting tasks, move batches, scan QR |
| Harvest Worker | Record harvests, manage crates, complete harvest tasks |
| Viewer | Read-only access to all operational data |

## Routing

The app uses hash-based routing (`#/path?params`) which works without server-side configuration and enables deployment to any static hosting. Key routes:

| Route | Page |
|-------|------|
| `#/dashboard` | Main dashboard with stats, pipeline, and alerts |
| `#/batches` | Batch list (filterable by type) |
| `#/batches/:id` | Batch detail with multiple tabs |
| `#/tasks` | Task list |
| `#/tasks/:id` | Task detail with completion/approval |
| `#/scan` | QR scanner (camera + manual) |
| `#/scan?code=X` | Auto-process a scanned code (deep-link target) |
| `#/scan?task_id=X&required=batch` | Task QR verification flow |
| `#/qr` | QR code manager |
| `#/qr/:id/print` | Print-optimized QR label view |
| `#/devices` | IoT device management (admin only) |
| `#/env-logs` | Environmental logs |
| `#/rooms` | Room and location management |
| `#/inventory` | Inventory management |
| `#/harvest` | Harvest records |
| `#/contamination` | Contamination reports |
| `#/reports` | Analytics and reports |
| `#/users` | User management (admin only) |

## Database Schema (Key Tables)

### Core
- **profiles** - User accounts with roles
- **species / strains** - Mushroom reference data
- **rooms / racks / shelves** - Physical location hierarchy
- **recipes / recipe_ingredients** - Substrate recipes

### Production
- **batches** - Core production units
- **batch_sources** - Parent-child genealogy
- **batch_events** - Timeline event log
- **batch_notes / batch_photos** - Attached documentation
- **tasks** - Work items with approval workflow
- **process_templates / steps** - SOP definitions for auto-task generation
- **contamination_reports** - Incident records
- **harvests** - Yield records per flush

### QR System
- **qr_codes** - Physical label records
- **qr_scan_logs** - Full scan audit trail
- **task_qr_verifications** - Per-task QR verification records
- **batch_movements** - Physical movement history with QR traceability

### IoT
- **iot_devices** - Registered sensor devices
- **environmental_alerts** - Threshold breach alerts with auto-task links
- **environmental_logs** - Room condition readings (manual + IoT)

### Operations
- **inventory_items / inventory_movements** - Stock management
- **notifications** - In-app alerts
- **audit_logs** - System-wide audit trail

## IoT Sensor Integration

See [FEATURES.md](./FEATURES.md) for complete IoT setup instructions including:
- Hardware components list and wiring guide
- ESP32 firmware installation
- Edge Function deployment
- Device registration in the admin panel
- Alert threshold configuration

## License

Private project. All rights reserved.
