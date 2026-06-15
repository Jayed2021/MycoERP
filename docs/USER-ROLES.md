# User Roles, Permissions & Access Control

This document describes how users are created, what roles exist, how permissions are assigned, and how administrators can modify access at runtime.

---

## Table of Contents

1. [User Creation](#user-creation)
2. [Roles](#roles)
3. [Departments](#departments)
4. [Modules](#modules)
5. [Permission Actions](#permission-actions)
6. [Default Permission Matrix](#default-permission-matrix)
7. [Modifying Permissions (Admin UI)](#modifying-permissions-admin-ui)
8. [Technical Architecture](#technical-architecture)

---

## User Creation

Users can be created in two ways:

### Self-Registration (Sign Up)

Any user can create an account through the login page by clicking "Create Account". They provide:
- Full Name
- Email address
- Password (minimum 6 characters)
- Role (selected from available roles)
- Department (selected from available departments)

After sign-up, the system creates an entry in `auth.users` (Supabase Auth) and a matching `profiles` record with the selected role and department.

### Admin Management

Admins can modify existing users through **Users > Edit User**:
- Change a user's name, role, or department
- Activate or deactivate user accounts
- Deactivated users cannot log in

Note: Admins cannot create users directly -- users must self-register. Admins can then adjust their role and permissions after registration.

---

## Roles

The system has 6 predefined roles, ordered from most to least access:

| Role | Key | Description |
|------|-----|-------------|
| **Admin** | `admin` | Full system access. Can manage users, devices, permissions, and all operational data. |
| **Farm Manager** | `manager` | Production oversight. Can create/edit batches, tasks, approve work, manage QR codes, and view reports. Cannot manage users or IoT devices. |
| **Lab Worker** | `lab_worker` | Lab-focused operations. Can create/edit batches (agar, LC, grain spawn), record contamination, manage inventory, and log environmental data. |
| **Production Worker** | `production_worker` | Production-focused operations. Can create/edit batches (substrate, fruiting), record harvests, manage inventory, and log environmental data. |
| **Harvest Worker** | `harvest_worker` | Harvest-focused operations. Can record harvests, complete tasks, report contamination, and scan QR codes. |
| **Viewer** | `viewer` | Read-only access. Can view all production data but cannot create, edit, or delete anything. |

---

## Departments

Users are assigned to one department for organizational purposes:

- Lab
- Spawn
- Substrate
- Incubation
- Fruiting
- Harvest
- Packaging
- Management

Departments are informational and used for task routing. They do not restrict access -- only roles and permissions control what a user can do.

---

## Modules

The application is divided into 14 permission-controlled modules:

| Module ID | Label | Category | Description |
|-----------|-------|----------|-------------|
| `dashboard` | Dashboard | Main | Overview statistics, alerts, and quick actions |
| `tasks` | Tasks | Main | Work task assignment, completion, and approval |
| `batches` | Batches | Production | All batch types (agar, LC, grain, substrate, fruiting) |
| `contamination` | Contamination Reports | Production | Contamination incident tracking |
| `harvests` | Harvests | Production | Harvest recording and grading |
| `env_logs` | Environmental Logs | Production | Temperature, humidity, CO2 readings |
| `inventory` | Inventory | Resources | Supply tracking and stock movements |
| `rooms` | Rooms | Resources | Physical room management |
| `species_strains` | Species & Strains | Resources | Mushroom species and strain catalog |
| `process_templates` | Process Templates | Resources | SOP/task template management |
| `qr_codes` | QR Codes | Resources | QR code generation and scanning |
| `reports` | Reports | Admin | Production analytics and reports |
| `users` | Users | Admin | User account management |
| `devices` | IoT Devices | Admin | IoT device configuration |

---

## Permission Actions

Each module supports 5 granular actions:

| Action | Description |
|--------|-------------|
| **View** | Can see the module in navigation and access its data |
| **Create** | Can create new records (batches, tasks, etc.) |
| **Edit** | Can modify existing records |
| **Delete** | Can remove records |
| **Approve** | Can approve/reject submissions (tasks, reports) |

---

## Default Permission Matrix

Below is the default permission assignment for each role. Admins can modify these at runtime.

### Admin
Full access to all modules (View, Create, Edit, Delete, Approve).

### Farm Manager

| Module | View | Create | Edit | Delete | Approve |
|--------|------|--------|------|--------|---------|
| Dashboard | Yes | Yes | Yes | Yes | Yes |
| Batches | Yes | Yes | Yes | Yes | Yes |
| Tasks | Yes | Yes | Yes | Yes | Yes |
| Species & Strains | Yes | Yes | Yes | Yes | - |
| Rooms | Yes | Yes | Yes | Yes | - |
| Inventory | Yes | Yes | Yes | Yes | - |
| Process Templates | Yes | Yes | Yes | Yes | - |
| QR Codes | Yes | Yes | Yes | Yes | - |
| Contamination | Yes | Yes | Yes | Yes | Yes |
| Harvests | Yes | Yes | Yes | Yes | Yes |
| Env. Logs | Yes | Yes | Yes | - | - |
| Reports | Yes | - | - | - | - |
| Users | - | - | - | - | - |
| Devices | Yes | - | - | - | - |

### Lab Worker

| Module | View | Create | Edit | Delete | Approve |
|--------|------|--------|------|--------|---------|
| Dashboard | Yes | - | - | - | - |
| Batches | Yes | Yes | Yes | - | - |
| Tasks | Yes | Yes | Yes | - | - |
| Species & Strains | Yes | - | - | - | - |
| Rooms | Yes | - | - | - | - |
| Inventory | Yes | Yes | Yes | - | - |
| Process Templates | Yes | - | - | - | - |
| QR Codes | Yes | Yes | - | - | - |
| Contamination | Yes | Yes | Yes | - | - |
| Harvests | Yes | - | - | - | - |
| Env. Logs | Yes | Yes | - | - | - |
| Reports | - | - | - | - | - |
| Users | - | - | - | - | - |
| Devices | - | - | - | - | - |

### Production Worker

| Module | View | Create | Edit | Delete | Approve |
|--------|------|--------|------|--------|---------|
| Dashboard | Yes | - | - | - | - |
| Batches | Yes | Yes | Yes | - | - |
| Tasks | Yes | Yes | Yes | - | - |
| Species & Strains | Yes | - | - | - | - |
| Rooms | Yes | - | - | - | - |
| Inventory | Yes | Yes | Yes | - | - |
| Process Templates | Yes | - | - | - | - |
| QR Codes | Yes | Yes | - | - | - |
| Contamination | Yes | Yes | Yes | - | - |
| Harvests | Yes | Yes | Yes | - | - |
| Env. Logs | Yes | Yes | - | - | - |
| Reports | - | - | - | - | - |
| Users | - | - | - | - | - |
| Devices | - | - | - | - | - |

### Harvest Worker

| Module | View | Create | Edit | Delete | Approve |
|--------|------|--------|------|--------|---------|
| Dashboard | Yes | - | - | - | - |
| Batches | Yes | - | - | - | - |
| Tasks | Yes | Yes | Yes | - | - |
| Species & Strains | Yes | - | - | - | - |
| Rooms | Yes | - | - | - | - |
| Inventory | Yes | - | - | - | - |
| Process Templates | Yes | - | - | - | - |
| QR Codes | Yes | Yes | - | - | - |
| Contamination | Yes | Yes | - | - | - |
| Harvests | Yes | Yes | Yes | - | - |
| Env. Logs | Yes | Yes | - | - | - |
| Reports | - | - | - | - | - |
| Users | - | - | - | - | - |
| Devices | - | - | - | - | - |

### Viewer

| Module | View | Create | Edit | Delete | Approve |
|--------|------|--------|------|--------|---------|
| Dashboard | Yes | - | - | - | - |
| Batches | Yes | - | - | - | - |
| Tasks | Yes | - | - | - | - |
| Species & Strains | Yes | - | - | - | - |
| Rooms | Yes | - | - | - | - |
| Inventory | Yes | - | - | - | - |
| Process Templates | Yes | - | - | - | - |
| QR Codes | Yes | - | - | - | - |
| Contamination | Yes | - | - | - | - |
| Harvests | Yes | - | - | - | - |
| Env. Logs | Yes | - | - | - | - |
| Reports | - | - | - | - | - |
| Users | - | - | - | - | - |
| Devices | - | - | - | - | - |

---

## Modifying Permissions (Admin UI)

Administrators can modify role permissions at runtime without any code changes or redeployment.

### Accessing the Permissions Page

1. Log in as an Admin user
2. Navigate to **Administration > Permissions** in the sidebar
3. The permissions matrix loads from the database

### Changing Permissions

1. Select the role tab you want to modify (e.g., "Lab Worker")
2. For each module row, toggle the checkboxes for View, Create, Edit, Delete, and Approve
3. Use the "All" button to grant all permissions for a module, or "None" to revoke all
4. Click **Save Changes** to persist

### Resetting to Defaults

If permissions become misconfigured:
1. Select the affected role tab
2. Click the **Reset** button
3. Confirm the reset -- this restores the original default permissions for that role

### When Changes Take Effect

Permission changes take effect on the next page load for affected users. Users who are currently logged in will see updated permissions after navigating to a new page or refreshing.

---

## Technical Architecture

### Data Flow

```
Database (role_permissions table)
    |
    v
PermissionsContext (loaded on login, cached in React state)
    |
    v
usePermissions() hook
    |
    v
Component-level checks: canView(), canCreate(), canEdit(), canDelete(), canApprove()
```

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/permissions.ts` | Module definitions, role list, action types, utility functions |
| `src/contexts/PermissionsContext.tsx` | React context that loads permissions and exposes `can*()` helpers |
| `src/pages/Permissions.tsx` | Admin UI for the permission matrix |
| `supabase/migrations/..._005_role_permissions.sql` | Database table definition and seed data |

### How Pages Use Permissions

Each page imports `usePermissions()` and calls the appropriate check:

```tsx
import { usePermissions } from '../contexts/PermissionsContext';

function MyPage() {
  const { canView, canCreate, canEdit, canDelete, canApprove } = usePermissions();

  // Hide the entire page if user can't view this module
  if (!canView('batches')) return <AccessDenied />;

  return (
    <div>
      {/* Only show "New" button if user can create */}
      {canCreate('batches') && <button>New Batch</button>}

      {/* Only show edit actions if user can edit */}
      {canEdit('batches') && <button>Edit</button>}
    </div>
  );
}
```

### Sidebar Visibility

The navigation sidebar automatically shows/hides items based on `canView()`. Each nav item has a `module` property that maps to the permissions table. If a user's role doesn't have `can_view` for that module, the nav item is hidden.

### Database Schema

The `role_permissions` table stores one row per role+module combination:

```sql
role_permissions (
  id uuid PRIMARY KEY,
  role text NOT NULL,        -- e.g., 'lab_worker'
  module text NOT NULL,      -- e.g., 'batches'
  can_view boolean,
  can_create boolean,
  can_edit boolean,
  can_delete boolean,
  can_approve boolean,
  updated_at timestamptz,
  updated_by uuid,
  UNIQUE(role, module)
)
```

RLS policies ensure only admins can modify permissions, while all authenticated users can read them.
