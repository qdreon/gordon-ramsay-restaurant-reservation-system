# Gordon Ramsay Restaurant Reservation System -- Technical Documentation

> **Document Version:** 1.1
> **Last Updated:** May 11, 2026
> **Team:** Qdreon
> **Course:** CPE 2201 -- Software Design and Development

---

## Revision History

### [May 11, 2026] - Phase 3: Customer Portal Authentication (QDR-54)
*   **Authentication:** Implemented Supabase Auth client with sign-up, sign-in, sign-out utilities.
*   **Auth Pages:** Created `/auth/login` and `/auth/register` pages with RA 10173 (LEG-1) consent enforcement.
*   **Protected Routes:** Built `middleware.ts` with route protection for `/customer/*` and `/admin/*`; enforces RBAC via role lookup.
*   **Stubs:** Created `/customer/dashboard` (user profile + reservation list) and `/admin/floorplan` (Phase 4 placeholder).
*   **Documentation:** Normalized code comments to neutral voice; updated system prompt with JIRA template.
*   **Verification:** `npm run build` passed TypeScript checks; commit `4c8e9f4` pushed to main.

### [May 9, 2026] - Phase 1: Data Layer & Security (Initial Architecture)
*   **Schema:** Created 8 core 3NF tables (`users`, `customers`, `tables`, `menu`, `reservations`, `reservation_tables`, `waitlist`, `blocked_dates`) and dropped legacy tables.
*   **Security:** Implemented comprehensive Row Level Security (RLS) matrix and Role-Based Access Control (RBAC).
*   **Integrity:** Added database triggers (`handle_new_user`, `updated_at`), strict `TIMESTAMPTZ` data types, and cascade delete chains.
*   **Foundation:** Seeded 15-table restaurant grid with adjacency mapping and generated TypeScript `database.types.ts`.
*   **Compliance:** Fully mapped and verified CPE 2201 standard compliance and SRS business logic constraints.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack and Architecture](#2-technology-stack-and-architecture)
3. [Development Environment Setup](#3-development-environment-setup)
4. [Database Schema Design (3NF)](#4-database-schema-design-3nf)
5. [Enumerated Types](#5-enumerated-types)
6. [Table Definitions](#6-table-definitions)
7. [Relationships and Constraints](#7-relationships-and-constraints)
8. [Row Level Security (RLS) and RBAC](#8-row-level-security-rls-and-rbac)
9. [Database Functions and Triggers](#9-database-functions-and-triggers)
10. [Seed Data and Floor Plan Layout](#10-seed-data-and-floor-plan-layout)
11. [TypeScript Type Definitions](#11-typescript-type-definitions)
12. [Frontend Architecture (MVC + Repository Pattern)](#12-frontend-architecture-mvc--repository-pattern)
13. [Migration Execution Log](#13-migration-execution-log)
14. [CPE 2201 Standards Compliance Matrix](#14-cpe-2201-standards-compliance-matrix)
15. [Business Logic Constraints Traceability](#15-business-logic-constraints-traceability)
16. [Development Roadmap Status](#16-development-roadmap-status)

---

## 1. Project Overview

The **Gordon Ramsay Restaurant Reservation System (GRRRS)** is a single-tenant Minimum Viable Product (MVP) web application designed to replace manual reservation logbooks for a fine-dining restaurant. The system enables customers to search for table availability, make reservations with simulated deposit payments, and join virtual waitlists. Restaurant administrators manage operations through a real-time floor plan dashboard, reservation calendar, and guest CRM interface.

### 1.1 Key Functional Requirements

| ID | Requirement | Description |
|----|-------------|-------------|
| FR-2 | Table Search | Customers search availability by date, time, and party size |
| FR-3 | Booking with Deposit | 5-minute checkout window with simulated tokenized payment |
| FR-4 | Table Combination | Auto-combine adjacent tables for large parties (max 12 pax) |
| FR-5 | Virtual Waitlist | Auto-promote waitlisted customers on cancellation (10-min window) |
| FR-6 | Email Notifications | Booking confirmations with .ics calendar attachments |
| FR-7 | Admin Floor Plan | Real-time color-coded grid (Green/Yellow/Red/Grey) |
| FR-8 | Block Dates | Admin blocks holidays from online availability |
| FR-9 | Guest CRM | Searchable customer profiles with visit history and VIP tags |
| FR-11 | Menu CRUD | Admin manages digital menu items |
| FR-12 | Waitlist Control | Admin manually bumps VIPs or removes entries |

### 1.2 Key Non-Functional Requirements

| ID | Requirement | Description |
|----|-------------|-------------|
| PR-2 | Concurrency | Row-level locking resolves booking conflicts in less than 1 second |
| DB-3 | UTC Timestamps | All database timestamps stored in UTC via TIMESTAMPTZ |
| SEC-1 | RBAC | Role-Based Access Control (Customer vs Admin) via RLS |
| SAF-2 | Offline Failsafe | Disable floor plan interactions on network loss |
| LEG-1 | RA 10173 | Data Privacy Act compliance with Right to Erasure |
| LEG-2 | PCI-DSS | No raw credit card PANs stored; simulated tokens only |

---

## 2. Technology Stack and Architecture

### 2.1 Stack Overview

| Layer | Technology | Role |
|-------|-----------|------|
| **Frontend** | Next.js 16 (App Router), React 19, Tailwind CSS 4 | View layer (MVC) |
| **Backend (BaaS)** | Supabase (PostgreSQL, Auth, RLS, WebSockets, RPCs) | Model layer (MVC) |
| **Controller** | Next.js API Routes / Server Actions | Controller layer (MVC) |
| **Language** | TypeScript 5 | Full-stack type safety |
| **Icons** | Lucide React | UI iconography |
| **Date Utilities** | date-fns | Client-side UTC-to-local conversion |

### 2.2 Architectural Patterns

**MVC (Model-View-Controller):**
- **Model:** Supabase PostgreSQL database with RLS policies
- **View:** React components (Next.js App Router pages)
- **Controller:** Next.js API routes under `/app/api/`

**Repository Pattern:**
- Database queries are abstracted into service files under `/services/`
- UI components never write raw Supabase queries directly
- Each service file has a Single Responsibility (SOLID)

**Observer Pattern (Phase 4):**
- Supabase Real-Time WebSockets for the Admin Floor Plan
- Database = Subject, Admin UI Grid = Observer
- Table status changes propagate instantly without page refresh

### 2.3 Supabase Project Configuration

| Setting | Value |
|---------|-------|
| Project Name | Gordon Ramsay Restaurant Reservation System |
| Region | Oceania (Sydney) -- ap-southeast-2 |
| Compute | NANO |
| Organization | Qdreon (Free Tier) |
| Project URL | `https://supabase.com/dashboard/project/zhzvtvrgkriunsdbibfv` |

---

## 3. Development Environment Setup

### 3.1 Project Initialization

The project was initialized using `create-next-app` with the following selections:
- **App Router** (not Pages Router)
- **Tailwind CSS** for styling
- **TypeScript** for type safety
- **ESLint** for code quality

### 3.2 Dependencies Installed

```json
{
  "dependencies": {
    "@supabase/ssr": "^0.10.3",
    "@supabase/supabase-js": "^2.105.4",
    "date-fns": "^4.1.0",
    "lucide-react": "^1.14.0",
    "next": "16.2.6",
    "react": "19.2.4",
    "react-dom": "19.2.4"
  }
}
```

### 3.3 Environment Variables

Configured in `.env.local` (gitignored):

| Variable | Purpose | Exposure |
|----------|---------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project endpoint | Client-safe (RLS enforced) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anonymous API key | Client-safe (RLS enforced) |
| `SUPABASE_SERVICE_ROLE_KEY` | Elevated privileges key | Server-side ONLY |

### 3.4 Supabase Client Configuration

Two client instances are maintained:

**Browser-Side** (`src/lib/supabaseClient.ts`):
- Uses `createClient` from `@supabase/supabase-js`
- Singleton pattern with guard clauses for missing env vars
- Subject to RLS policies via anonymous key

**Server-Side** (`src/lib/supabaseServer.ts`):
- Uses `createServerClient` from `@supabase/ssr`
- Cookie-based session management for authenticated SSR
- Reads user session from Next.js cookies automatically

### 3.5 Folder Structure (MVC + Repository Pattern)

```
gordon-ramsay-reservations/
  src/
    app/                    # Controller + View layer
      api/                  # Controller: Next.js API routes
        health/route.ts     # System health endpoint
      layout.tsx            # Root layout
      page.tsx              # Landing page
      globals.css           # Global styles
    lib/                    # Shared utilities
      supabaseClient.ts     # Browser Supabase client
      supabaseServer.ts     # Server Supabase client
      database.types.ts     # TypeScript type definitions
    services/               # Model layer (Repository Pattern)
      reservationService.ts # Reservation data access
      customerService.ts    # Customer data access
      tableService.ts       # Table data access
      menuService.ts        # Menu data access
      waitlistService.ts    # Waitlist data access
  supabase/
    migrations/             # SQL migration files (version-controlled)
      000_clean_slate.sql
      001_enums_and_base_tables.sql
      002_transactional_tables.sql
      003_rbac_rls_policies.sql
      003_1_grant_permissions.sql
      004_seed_data.sql
      005_verification_queries.sql
```

---

## 4. Database Schema Design (3NF)

All tables strictly adhere to **Third Normal Form (3NF)**:
- **1NF:** All columns contain atomic values; no repeating groups.
- **2NF:** No partial dependencies; every non-key column depends on the entire primary key.
- **3NF:** No transitive dependencies; non-key columns do not depend on other non-key columns.

### 4.1 Entity-Relationship Overview

```
auth.users (Supabase Auth)
    |
    | 1:1 (ON DELETE CASCADE)
    v
public.users (role, consent)
    |
    | 1:1 (ON DELETE CASCADE)
    v
public.customers (dietary, CRM)
    |
    |--- 1:N ---> public.reservations ---> N:M ---> public.tables
    |                                        (via reservation_tables)
    |--- 1:N ---> public.waitlist
    
public.menu (standalone, publicly readable)
public.blocked_dates (admin-managed)
```

### 4.2 Design Decisions

| Decision | Rationale |
|----------|-----------|
| `users` + `customers` split | 3NF: CRM data (dietary, visits, VIP) is customer-specific, not user-generic. Prevents transitive dependency. |
| `user_role` enum vs `roles` table | KISS principle: only 2 roles exist. An enum is simpler and more performant than a join table. |
| `reservation_tables` junction | 3NF: Enables many-to-many for table combination (FR-4). A single reservation can span multiple physical tables. |
| `blocked_dates` separate table | Single Responsibility: holiday blocking is independent of reservations. |
| `adjacent_table_ids` UUID array | Stores physical adjacency for the table combination algorithm. Array is appropriate here as adjacency is a fixed physical property. |

---

## 5. Enumerated Types

Five PostgreSQL enum types enforce data integrity at the database level:

### 5.1 `table_status`

Controls Admin Floor Plan color-coding (FR-7).

| Value | Color | Meaning |
|-------|-------|---------|
| `available` | Green | Table is open for booking |
| `reserved` | Yellow/Amber | Table is booked but guests have not arrived |
| `occupied` | Red | Guests are currently seated |
| `dirty` | Grey | Table needs cleaning before next use |

### 5.2 `reservation_status`

State machine for the booking lifecycle:

```
pending_payment --> confirmed --> seated --> completed
                |                       \--> no_show
                \--> cancelled
```

| Value | Description |
|-------|-------------|
| `pending_payment` | Checkout initiated; 5-minute timeout active (PR-2) |
| `confirmed` | Deposit received; reservation is locked |
| `seated` | Admin marked guest as arrived |
| `completed` | Dining session finished |
| `no_show` | Auto-flagged 15 minutes past start time (FR-9) |
| `cancelled` | Customer or admin cancelled; triggers waitlist (FR-5) |

### 5.3 `user_role`

| Value | RLS Access Level |
|-------|-----------------|
| `customer` | Own data only (SELECT, INSERT, UPDATE on own UUID) |
| `admin` | Full CRUD on all tables |

### 5.4 `waitlist_status`

| Value | Description |
|-------|-------------|
| `waiting` | In queue, awaiting an opening |
| `offered` | Table became available; 10-minute acceptance window active |
| `accepted` | Customer accepted the offer |
| `expired` | 10-minute window elapsed without response |
| `cancelled` | Customer voluntarily left the waitlist |

### 5.5 `menu_category`

| Value |
|-------|
| `starters` |
| `mains` |
| `desserts` |
| `sides` |
| `beverages` |

---

## 6. Table Definitions

### 6.1 `public.users`

Central identity table linked to Supabase `auth.users`.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, FK -> auth.users, ON DELETE CASCADE | Matches Supabase Auth UID |
| `email` | TEXT | NOT NULL, UNIQUE | User email address |
| `full_name` | TEXT | NOT NULL | Display name |
| `phone` | TEXT | nullable | Contact number |
| `role` | user_role | NOT NULL, DEFAULT 'customer' | RBAC role (SEC-1) |
| `consent_given` | BOOLEAN | NOT NULL, DEFAULT false | RA 10173 Data Privacy consent (LEG-1) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | UTC creation timestamp (DB-3) |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | UTC last-modified timestamp (DB-3) |

### 6.2 `public.customers`

3NF extension of `users` with customer-specific CRM data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Customer record ID |
| `user_id` | UUID | NOT NULL, UNIQUE, FK -> users, ON DELETE CASCADE | Links to users table |
| `dietary_restrictions` | TEXT | nullable | Dietary preferences |
| `allergies` | TEXT | nullable | Known food allergies |
| `vip_status` | BOOLEAN | NOT NULL, DEFAULT false | VIP flag for priority service |
| `total_visits` | INTEGER | NOT NULL, DEFAULT 0 | Completed reservation count |
| `total_no_shows` | INTEGER | NOT NULL, DEFAULT 0 | No-show count |
| `staff_notes` | TEXT | nullable | Internal admin notes |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | UTC timestamp (DB-3) |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | UTC timestamp (DB-3) |

### 6.3 `public.tables`

Physical restaurant tables for the floor plan grid.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Table record ID |
| `table_number` | INTEGER | NOT NULL, UNIQUE | Human-readable table identifier |
| `capacity` | INTEGER | NOT NULL, CHECK (> 0) | Maximum seats |
| `status` | table_status | NOT NULL, DEFAULT 'available' | Floor plan color-coding (FR-7) |
| `position_x` | INTEGER | NOT NULL, DEFAULT 0 | Grid X coordinate |
| `position_y` | INTEGER | NOT NULL, DEFAULT 0 | Grid Y coordinate |
| `is_combinable` | BOOLEAN | NOT NULL, DEFAULT true | Can be combined with adjacent tables |
| `adjacent_table_ids` | UUID[] | DEFAULT '{}' | Array of neighboring table UUIDs (FR-4) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | UTC timestamp (DB-3) |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | UTC timestamp (DB-3) |

### 6.4 `public.menu`

Digital menu items (read-only for customers, CRUD for admins).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Menu item ID |
| `name` | TEXT | NOT NULL | Item name |
| `description` | TEXT | nullable | Item description |
| `price` | DECIMAL(10,2) | NOT NULL, CHECK (>= 0) | Price in local currency |
| `category` | menu_category | NOT NULL | Category grouping |
| `image_url` | TEXT | nullable | Item photo URL |
| `is_available` | BOOLEAN | NOT NULL, DEFAULT true | Currently offered |
| `sort_order` | INTEGER | NOT NULL, DEFAULT 0 | Display ordering |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | UTC timestamp (DB-3) |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | UTC timestamp (DB-3) |

### 6.5 `public.reservations`

Core booking records with concurrency control.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Reservation ID |
| `customer_id` | UUID | NOT NULL, FK -> customers, ON DELETE CASCADE | Who booked |
| `reservation_date` | DATE | NOT NULL | Booking date |
| `start_time` | TIMESTAMPTZ | NOT NULL | Start time in UTC (DB-3) |
| `end_time` | TIMESTAMPTZ | NOT NULL | End time in UTC (DB-3) |
| `party_size` | INTEGER | NOT NULL, CHECK (> 0 AND <= 12) | Guest count, capped at 12 (FR-4) |
| `status` | reservation_status | NOT NULL, DEFAULT 'pending_payment' | Lifecycle state |
| `special_requests` | TEXT | nullable | Dietary or seating preferences |
| `deposit_amount` | DECIMAL(10,2) | NOT NULL, DEFAULT 0.00, CHECK (>= 0) | Simulated deposit |
| `payment_token` | TEXT | nullable | Tokenized reference only; no raw PANs (LEG-2) |
| `locked_until` | TIMESTAMPTZ | nullable | 5-minute checkout timeout (PR-2) |
| `created_by` | UUID | FK -> users, ON DELETE SET NULL | Admin who created walk-in/phone booking |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | UTC timestamp (DB-3) |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | UTC timestamp (DB-3) |

### 6.6 `public.reservation_tables`

Many-to-many junction table supporting table combination (3NF).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Junction row ID |
| `reservation_id` | UUID | NOT NULL, FK -> reservations, ON DELETE CASCADE | Parent reservation |
| `table_id` | UUID | NOT NULL, FK -> tables, ON DELETE CASCADE | Assigned table |
| -- | -- | UNIQUE (reservation_id, table_id) | Prevents duplicate assignments |

### 6.7 `public.waitlist`

Virtual queue with automated promotion logic.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Waitlist entry ID |
| `customer_id` | UUID | NOT NULL, FK -> customers, ON DELETE CASCADE | Who is waiting |
| `desired_date` | DATE | NOT NULL | Desired booking date |
| `desired_time` | TIMESTAMPTZ | NOT NULL | Desired time in UTC (DB-3) |
| `party_size` | INTEGER | NOT NULL, CHECK (> 0 AND <= 12) | Party size, max 12 |
| `position` | INTEGER | NOT NULL, DEFAULT 0 | Queue priority (lower = higher) |
| `status` | waitlist_status | NOT NULL, DEFAULT 'waiting' | Entry lifecycle state |
| `offered_at` | TIMESTAMPTZ | nullable | When offer was sent |
| `expires_at` | TIMESTAMPTZ | nullable | 10-minute acceptance deadline (FR-5) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | UTC timestamp (DB-3) |

### 6.8 `public.blocked_dates`

Admin-managed holiday blocks (FR-8).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Block record ID |
| `blocked_date` | DATE | NOT NULL, UNIQUE | Calendar date to block |
| `reason` | TEXT | nullable | Reason for closure |
| `created_by` | UUID | FK -> users, ON DELETE SET NULL | Admin who blocked it |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | UTC timestamp (DB-3) |

---

## 7. Relationships and Constraints

### 7.1 Foreign Key Map

| Child Table | FK Column | Parent Table | Parent Column | On Delete |
|-------------|-----------|-------------|---------------|-----------|
| `users` | `id` | `auth.users` | `id` | CASCADE |
| `customers` | `user_id` | `users` | `id` | CASCADE |
| `reservations` | `customer_id` | `customers` | `id` | CASCADE |
| `reservations` | `created_by` | `users` | `id` | SET NULL |
| `reservation_tables` | `reservation_id` | `reservations` | `id` | CASCADE |
| `reservation_tables` | `table_id` | `tables` | `id` | CASCADE |
| `waitlist` | `customer_id` | `customers` | `id` | CASCADE |
| `blocked_dates` | `created_by` | `users` | `id` | SET NULL |

### 7.2 Cascade Delete Chain (Right to Erasure -- LEG-1)

When a user account is deleted (via Supabase Auth):
```
auth.users (deleted) 
  --> public.users (CASCADE)
    --> public.customers (CASCADE)
      --> public.reservations (CASCADE)
        --> public.reservation_tables (CASCADE)
      --> public.waitlist (CASCADE)
```

This satisfies RA 10173 Right to Erasure: all PII, CRM data, and booking history are permanently removed.

### 7.3 CHECK Constraints

| Table | Column | Constraint | Rationale |
|-------|--------|-----------|-----------|
| `tables` | `capacity` | `> 0` | No zero-capacity tables |
| `reservations` | `party_size` | `> 0 AND <= 12` | FR-4: Max 12 pax with combination |
| `reservations` | `deposit_amount` | `>= 0` | No negative deposits |
| `waitlist` | `party_size` | `> 0 AND <= 12` | Consistent with reservation cap |
| `menu` | `price` | `>= 0` | No negative prices |

### 7.4 Performance Indexes

| Index Name | Table | Columns | Purpose |
|-----------|-------|---------|---------|
| `idx_reservations_date_status` | reservations | (reservation_date, status) | Availability search queries |
| `idx_reservations_customer_id` | reservations | (customer_id) | Customer dashboard lookups |
| `idx_reservations_locked_until` | reservations | (locked_until) WHERE NOT NULL | Checkout timeout expiry checks |
| `idx_reservation_tables_table_id` | reservation_tables | (table_id) | Table availability joins |
| `idx_reservation_tables_reservation_id` | reservation_tables | (reservation_id) | Reservation detail joins |
| `idx_waitlist_date_status` | waitlist | (desired_date, status) | Waitlist auto-promotion queries |
| `idx_waitlist_customer_id` | waitlist | (customer_id) | Customer waitlist lookups |
| `idx_blocked_dates_date` | blocked_dates | (blocked_date) | Availability search filter |
| `idx_tables_status` | tables | (status) | Floor plan rendering |

---

## 8. Row Level Security (RLS) and RBAC

### 8.1 Overview

RLS is **enabled on all 8 tables**. Every query through the Supabase client (PostgREST) is filtered by the policies below. The `service_role` key bypasses RLS for server-side admin operations.

Two helper functions provide DRY policy logic:
- `is_admin()` -- Returns true if `auth.uid()` has `role = 'admin'` in `users`
- `get_customer_id()` -- Returns the `customers.id` for `auth.uid()`

### 8.2 Policy Matrix

| Table | Policy Name | Role | Operation | Rule |
|-------|------------|------|-----------|------|
| **users** | `users_select_own` | Customer | SELECT | `auth.uid() = id` |
| | `users_update_own` | Customer | UPDATE | `auth.uid() = id` |
| | `users_admin_all` | Admin | ALL | `is_admin()` |
| **customers** | `customers_select_own` | Customer | SELECT | `user_id = auth.uid()` |
| | `customers_insert_own` | Customer | INSERT | `user_id = auth.uid()` |
| | `customers_update_own` | Customer | UPDATE | `user_id = auth.uid()` |
| | `customers_admin_all` | Admin | ALL | `is_admin()` |
| **tables** | `tables_select_authenticated` | Authenticated | SELECT | Any authenticated user |
| | `tables_admin_modify` | Admin | ALL | `is_admin()` |
| **menu** | `menu_select_public` | Public | SELECT | `true` (no auth required) |
| | `menu_admin_modify` | Admin | ALL | `is_admin()` |
| **reservations** | `reservations_select_own` | Customer | SELECT | `customer_id = get_customer_id()` |
| | `reservations_insert_own` | Customer | INSERT | `customer_id = get_customer_id()` |
| | `reservations_update_own` | Customer | UPDATE | `customer_id = get_customer_id()` |
| | `reservations_admin_all` | Admin | ALL | `is_admin()` |
| **reservation_tables** | `reservation_tables_select_own` | Customer | SELECT | Reservation belongs to customer |
| | `reservation_tables_insert_authenticated` | Authenticated | INSERT | Any authenticated user |
| | `reservation_tables_admin_all` | Admin | ALL | `is_admin()` |
| **waitlist** | `waitlist_select_own` | Customer | SELECT | `customer_id = get_customer_id()` |
| | `waitlist_insert_own` | Customer | INSERT | `customer_id = get_customer_id()` |
| | `waitlist_update_own` | Customer | UPDATE | `customer_id = get_customer_id()` |
| | `waitlist_admin_all` | Admin | ALL | `is_admin()` |
| **blocked_dates** | `blocked_dates_select_authenticated` | Authenticated | SELECT | Any authenticated user |
| | `blocked_dates_admin_modify` | Admin | ALL | `is_admin()` |

### 8.3 PostgreSQL Role Grants

When tables are created via raw SQL (not the Supabase UI), explicit GRANT statements are required for PostgREST access:

| Role | Permissions | Purpose |
|------|------------|---------|
| `service_role` | ALL on all tables, sequences, routines | Server-side admin operations (bypasses RLS) |
| `authenticated` | SELECT, INSERT, UPDATE, DELETE on all tables | Client operations (subject to RLS) |
| `anon` | SELECT on all tables | Unauthenticated read access (subject to RLS) |

---

## 9. Database Functions and Triggers

### 9.1 `handle_new_user()` -- Auth Signup Trigger

**Purpose:** Automatically creates a `public.users` row and a linked `public.customers` row when a new user signs up via Supabase Auth.

**Trigger:** `AFTER INSERT ON auth.users`

**Logic:**
1. Reads `email` and metadata (`full_name`, `phone`, `consent_given`) from the new `auth.users` row
2. Inserts into `public.users` with `role = 'customer'` (default)
3. Inserts into `public.customers` with only `user_id` (profile populated later)

**Security:** `SECURITY DEFINER` -- executes with the function owner's privileges, bypassing RLS to insert into both tables.

### 9.2 `handle_updated_at()` -- Auto-Update Timestamp

**Purpose:** Automatically sets `updated_at = now()` on every UPDATE operation.

**Applied to:** `users`, `customers`, `tables`, `menu`, `reservations` (5 triggers)

**Trigger type:** `BEFORE UPDATE ... FOR EACH ROW`

### 9.3 `is_admin()` -- RBAC Helper

**Purpose:** Returns `true` if the currently authenticated user has `role = 'admin'` in the `users` table.

**Used by:** All admin RLS policies (DRY principle -- single function instead of duplicated subqueries).

**Attributes:** `SECURITY DEFINER`, `STABLE` (result is consistent within a transaction).

### 9.4 `get_customer_id()` -- Customer ID Resolver

**Purpose:** Returns the `customers.id` UUID for the currently authenticated user.

**Used by:** RLS policies on `reservations`, `reservation_tables`, and `waitlist` that filter by `customer_id`.

**Attributes:** `SECURITY DEFINER`, `STABLE`.

---

## 10. Seed Data and Floor Plan Layout

### 10.1 Restaurant Table Configuration

15 tables seeded across a 5-column x 3-row grid layout:

| Table # | Capacity | Grid Position (x, y) | Section |
|---------|----------|----------------------|---------|
| T1 | 2-seat | (0, 0) | Front of house |
| T2 | 2-seat | (1, 0) | Front of house |
| T3 | 4-seat | (2, 0) | Front of house |
| T4 | 4-seat | (3, 0) | Front of house |
| T5 | 4-seat | (4, 0) | Front of house |
| T6 | 2-seat | (0, 1) | Middle section |
| T7 | 2-seat | (1, 1) | Middle section |
| T8 | 4-seat | (2, 1) | Middle section |
| T9 | 4-seat | (3, 1) | Middle section |
| T10 | 4-seat | (4, 1) | Middle section |
| T11 | 6-seat | (0, 2) | Back section |
| T12 | 6-seat | (1, 2) | Back section |
| T13 | 6-seat | (2, 2) | Back section |
| T14 | 8-seat | (3, 2) | Back section |
| T15 | 8-seat | (4, 2) | Back section |

**Capacity Summary:** 4x 2-seat + 6x 4-seat + 3x 6-seat + 2x 8-seat = **66 total seats**

### 10.2 Visual Grid Layout

```
     Col 0    Col 1    Col 2    Col 3    Col 4
   +--------+--------+--------+--------+--------+
R0 | T1 (2) | T2 (2) | T3 (4) | T4 (4) | T5 (4) |  Front
   +--------+--------+--------+--------+--------+
R1 | T6 (2) | T7 (2) | T8 (4) | T9 (4) |T10 (4) |  Middle
   +--------+--------+--------+--------+--------+
R2 |T11 (6) |T12 (6) |T13 (6) |T14 (8) |T15 (8) |  Back
   +--------+--------+--------+--------+--------+
```

### 10.3 Adjacency Map

Each table stores an array of UUIDs of its physically adjacent neighbors (horizontal and vertical). This powers the table combination algorithm (FR-4, max 12 pax):

| Table | Adjacent To |
|-------|------------|
| T1 | T2, T6 |
| T2 | T1, T3, T7 |
| T3 | T2, T4, T8 |
| T4 | T3, T5, T9 |
| T5 | T4, T10 |
| T6 | T1, T7, T11 |
| T7 | T2, T6, T8, T12 |
| T8 | T3, T7, T9, T13 |
| T9 | T4, T8, T10, T14 |
| T10 | T5, T9, T15 |
| T11 | T6, T12 |
| T12 | T7, T11, T13 |
| T13 | T8, T12, T14 |
| T14 | T9, T13, T15 |
| T15 | T10, T14 |

---

## 11. TypeScript Type Definitions

Located at `src/lib/database.types.ts`, this file provides compile-time type safety across the entire frontend. It serves as the **Single Source of Truth** -- if the database schema changes, this file is updated and TypeScript flags all affected code.

### 11.1 Naming Convention

| Category | Convention | Example |
|----------|-----------|---------|
| Enum types | PascalCase | `TableStatus`, `ReservationStatus` |
| Row types | PascalCase + "Row" | `UserRow`, `ReservationRow` |
| Insert types | PascalCase + "Insert" | `ReservationInsert`, `MenuInsert` |
| Update types | PascalCase + "Update" | `ReservationUpdate`, `CustomerUpdate` |

### 11.2 Type Categories

**Row Types (8):** Mirror exact database columns. Used for query results.
- `UserRow`, `CustomerRow`, `TableRow`, `MenuRow`, `ReservationRow`, `ReservationTableRow`, `WaitlistRow`, `BlockedDateRow`

**Insert Types (5):** Omit auto-generated fields (`id`, `created_at`, `updated_at`). Used for creating new records.
- `UserInsert`, `ReservationInsert`, `WaitlistInsert`, `MenuInsert`, `BlockedDateInsert`

**Update Types (6):** Partial picks of mutable columns. Used for patching existing records.
- `UserUpdate`, `CustomerUpdate`, `TableUpdate`, `ReservationUpdate`, `WaitlistUpdate`, `MenuUpdate`

---

## 12. Frontend Architecture (MVC + Repository Pattern)

### 12.1 Service Layer (Repository Pattern)

Each service file in `src/services/` abstracts all database queries for a single entity. UI components call service functions rather than writing raw Supabase queries.

| Service File | Entity | Phase |
|-------------|--------|-------|
| `reservationService.ts` | Reservations | Phase 2 |
| `customerService.ts` | Customer profiles / CRM | Phase 3 |
| `tableService.ts` | Table availability / Floor plan | Phase 2 |
| `menuService.ts` | Menu items CRUD | Phase 6 |
| `waitlistService.ts` | Waitlist queue | Phase 5 |

**Current Status:** All service files contain documented placeholder stubs. Implementation begins in their respective phases.

### 12.2 API Routes (Controller Layer)

| Route | Method | Purpose | Status |
|-------|--------|---------|--------|
| `/api/health` | GET | System health check (FR-13) | Implemented |

Additional API routes will be created in Phases 2-6 for booking, auth, email, and admin operations.

---

## 13. Migration Execution Log

All migrations were executed on **May 9, 2026** in the Supabase SQL Editor.

| Order | File | Description | Status |
|-------|------|-------------|--------|
| 1 | `000_clean_slate.sql` | Dropped pre-existing non-compliant tables from previous team member | Executed |
| 2 | `001_enums_and_base_tables.sql` | Created 5 enums, 4 base tables, updated_at trigger function | Executed |
| 3 | `002_transactional_tables.sql` | Created 4 transactional tables, 9 performance indexes | Executed |
| 4 | `003_rbac_rls_policies.sql` | Created 4 functions, auth trigger, RLS on 8 tables, 24 policies | Executed |
| 5 | `003_1_grant_permissions.sql` | Granted PostgREST permissions to anon/authenticated/service_role | Executed |
| 6 | `004_seed_data.sql` | Inserted 15 tables with adjacency mapping | Executed |
| 7 | `005_verification_queries.sql` | Read-only validation (8 queries) | Verified |

### 13.1 Schema Cleanup Note

A previous team member had created tables (`auditlogs`, `crm`, `customers`, `menu`, `reservations`, `roles`, `tables`, `waitlist`) with a non-compliant schema:
- Tables were not linked to `auth.users`
- Used `VARCHAR(20)` for statuses instead of enums
- Used `TIME` instead of `TIMESTAMPTZ` (violated DB-3)
- No RLS policies
- Separate `crm` and `roles` tables (violated 3NF)

All tables were empty (0 records). Migration `000_clean_slate.sql` dropped everything for a clean rebuild.

### 13.2 Verification Results

Direct API verification via Supabase JS client with `service_role` key confirmed:

```
[PASS] tables: 15 rows found
  T1: 2-seat (available)    T6: 2-seat (available)    T11: 6-seat (available)
  T2: 2-seat (available)    T7: 2-seat (available)    T12: 6-seat (available)
  T3: 4-seat (available)    T8: 4-seat (available)    T13: 6-seat (available)
  T4: 4-seat (available)    T9: 4-seat (available)    T14: 8-seat (available)
  T5: 4-seat (available)    T10: 4-seat (available)   T15: 8-seat (available)

[PASS] users: accessible (0 rows)
[PASS] customers: accessible (0 rows)
[PASS] reservations: accessible (0 rows)
[PASS] menu: accessible (0 rows)
[PASS] waitlist: accessible (0 rows)
[PASS] blocked_dates: accessible (0 rows)
[PASS] reservation_tables: accessible (0 rows)
```

Auth trigger (`on_auth_user_created` on `auth.users`) confirmed via `information_schema.triggers`.

---

## 14. CPE 2201 Standards Compliance Matrix

| Standard | Requirement | Implementation | Status |
|----------|------------|----------------|--------|
| **Naming: snake_case** | DB tables and columns | All tables/columns use snake_case | Compliant |
| **Naming: PascalCase** | React components, TS interfaces | `UserRow`, `ReservationInsert`, etc. | Compliant |
| **Naming: camelCase** | Variables and functions | `supabaseClient`, `createServerSupabaseClient` | Compliant |
| **KISS** | No over-engineering | Enum for roles (2 values) instead of join table | Compliant |
| **DRY** | No repeated logic | `is_admin()`, `get_customer_id()`, `handle_updated_at()` reused | Compliant |
| **SRP (SOLID)** | Single responsibility per file | Each service handles one entity only | Compliant |
| **3NF** | No partial/transitive dependencies | `users`/`customers` split; `reservation_tables` junction | Compliant |
| **UUID PKs** | All tables use UUID primary keys | `gen_random_uuid()` or auth.users reference | Compliant |
| **TIMESTAMPTZ** (DB-3) | UTC storage for all timestamps | All date/time columns use TIMESTAMPTZ | Compliant |
| **ON DELETE CASCADE** | Referential integrity | Applied on all FK relationships | Compliant |
| **Repository Pattern** | Abstract DB queries into services | 5 service files in `/services/` | Compliant |
| **MVC** | Separation of concerns | Model (Supabase), View (React), Controller (API routes) | Compliant |
| **Documentation** | Inline comments on all functions | SQL COMMENT ON, JSDoc headers, inline notes | Compliant |
| **Defensive Programming** | Edge case handling | CHECK constraints, guard clauses, early returns | Compliant |

---

## 15. Business Logic Constraints Traceability

This matrix maps each business constraint from the SRS/SWDD to its database implementation:

| Constraint ID | Requirement | Implementation |
|--------------|-------------|----------------|
| **DB-3** | UTC timestamps | All date/time columns use `TIMESTAMPTZ`. Client converts to local. |
| **SEC-1** | RBAC (Customer vs Admin) | `user_role` enum on `users.role`; RLS policies use `is_admin()` |
| **PR-2** | Row-level locking (<1s) | `reservations.locked_until` column ready for `SELECT ... FOR UPDATE` (Phase 2) |
| **FR-3** | 5-minute checkout timeout | `reservations.locked_until` stores expiry timestamp; rollback logic in Phase 2 |
| **FR-4** | Table combination (max 12 pax) | `reservation_tables` junction + `tables.adjacent_table_ids` + CHECK (party_size <= 12) |
| **FR-5** | Waitlist auto-promotion | `waitlist.status`, `offered_at`, `expires_at` (10-min window). Trigger in Phase 5 |
| **FR-7** | Floor plan color-coding | `table_status` enum: available/reserved/occupied/dirty |
| **FR-8** | Block dates for holidays | `blocked_dates` table with UNIQUE date constraint |
| **FR-9** | No-show auto-flag (15 min) | `reservation_status` includes `no_show`. Cron job in Phase 6 |
| **FR-11** | Menu CRUD | `menu` table with `menu_category` enum. Admin-only RLS for writes |
| **LEG-1** | RA 10173 Right to Erasure | CASCADE delete chain: auth.users -> users -> customers -> reservations/waitlist |
| **LEG-1** | Consent checkbox | `users.consent_given` BOOLEAN (registration gate) |
| **LEG-2** | PCI-DSS (no raw PANs) | `reservations.payment_token` stores simulated tokens only |
| **SAF-2** | Offline failsafe | Implementation in Phase 4 (React useEffect network listener) |

---

## 16. Development Roadmap Status

### 16.1 Phase Completion Summary

| Phase | Name | Status | Completion Date |
|-------|------|--------|----------------|
| Phase 0 | Project Scaffolding | **Complete** (Shadcn UI pending) | May 8, 2026 |
| Phase 1 | Data Layer and Security | **Complete** | May 9, 2026 |
| Phase 2 | Core Booking Engine | **Complete** | May 11, 2026 |
| Phase 3 | Customer Portal Authentication | **In Progress** (Auth scaffolding done; checkout modal & dashboard pending) | May 11, 2026 |
| Phase 4 | Admin Real-Time Dashboard | Not Started | -- |
| Phase 5 | Waitlist and Automations | Not Started | -- |
| Phase 6 | Admin Auxiliary Features | Not Started | -- |

### 16.2 Jira Timeline (QDR Board)

| Ticket | Task | Due Date | Status |
|--------|------|----------|--------|
| **QDR-23** | **Section 1. Planning & Analysis (Epic)** | **May 5, 2026** | **Done** |
| QDR-24 | Elicit Stakeholder Requirements | Apr 20, 2026 | Done |
| QDR-25 | Negotiate Scope and MVP | Apr 21, 2026 | Done |
| QDR-26 | Software Requirements Specification (SRS) | Apr 23, 2026 | Done |
| QDR-27 | Progress Report | Apr 24, 2026 | Done |
| QDR-28 | SPM Document / Project Charter | Apr 25, 2026 | Done |
| **QDR-29** | **Section 2. System Design (Epic)** | **May 12, 2026** | **Done** |
| QDR-30 | Architectural Design (COMET) | May 1, 2026 | Done |
| QDR-31 | Create UML Diagrams | May 2, 2026 | Done |
| QDR-32 | Design PostgreSQL Schema | May 3, 2026 | Done |
| QDR-33 | Design UI/UX Mockups | May 4, 2026 | Done |
| QDR-34 | Software Design Document (SWDD) | May 5, 2026 | Done |
| **QDR-35** | **Section 3. Development (Epic)** | **May 20, 2026** | **In Progress** |
| QDR-36 | Setup Supabase Authentication | Apr 25, 2026 | Done |
| QDR-37 | Configure Database Tables | Apr 28, 2026 | Done |
| QDR-38 | Build Account Management Module | May 1, 2026 | Done |
| QDR-39 | Build Search & Availability UI | May 4, 2026 | Done |
| QDR-40 | Implement Booking Engine | May 9, 2026 | Done |
| **QDR-54** | **Phase 3 - Customer Portal Authentication Setup (QDR-35 Subtask)** | **May 11, 2026** | **Done** |
| QDR-41 | Develop Virtual Waitlist System | May 10, 2026 | To Do |
| QDR-42 | Build Static Floor Plan Grid | May 11, 2026 | To Do |
| QDR-43 | Implement Reservation Calendar | May 12, 2026 | To Do |
| QDR-44 | Develop Guest CRM Table | May 13, 2026 | To Do |
| QDR-45 | Integrate SMTP Email Server | May 14, 2026 | To Do |
| QDR-79 | Implement Menu Management Module | TBD | To Do |
| QDR-80 | Admin Waitlist Control Module | TBD | To Do |
| **QDR-46** | **Section 4. Testing (Epic)** | **May 20, 2026** | **In Progress** |
| QDR-47 | Functional & Structural Testing | Apr 30, 2026 | Done |
| QDR-48 | UI Latency Testing (3s Target) | May 17, 2026 | To Do |
| QDR-49 | Real-Time Concurrency Testing | May 19, 2026 | To Do |
| QDR-50 | Verify Offline Mode Failsafe | May 20, 2026 | To Do |
| **QDR-51** | **Section 5. Deployment (Epic)** | **May 24, 2026** | **To Do** |
| QDR-52 | Deploy to Supabase Cloud | May 22, 2026 | To Do |
| QDR-53 | Finalize User Manual | May 24, 2026 | To Do |

---

## 16.3 Phase 3: Customer Portal -- Development Status (QDR-54)

### Completed Tasks (May 11, 2026)

| Task | File(s) | Status | Details |
|------|---------|--------|----------|
| **QDR-54: Auth Client** | `src/lib/authClient.ts` | **Done** | Implemented `signUp()`, `signIn()`, `signOut()`, `getCurrentUser()`, `getCurrentSession()` with RA 10173 consent enforcement |
| **QDR-54: Login Page** | `src/app/auth/login/page.tsx` | **Done** | Customer login form with email/password; redirects to dashboard on success |
| **QDR-54: Register Page** | `src/app/auth/register/page.tsx` | **Done** | Registration with mandatory Data Privacy Act (LEG-1) consent checkbox; 8-char min password |
| **QDR-54: Auth Layout** | `src/app/auth/layout.tsx` | **Done** | Centered auth page frame with gradient background |
| **QDR-54: Middleware RBAC** | `middleware.ts` | **Done** | Route protection for `/customer/*` and `/admin/*`; role lookup from `public.users`; redirects to login |
| **QDR-54: Customer Layout** | `src/app/customer/layout.tsx` | **Done** | Shared header with navigation and sign-out |
| **QDR-54: Admin Layout** | `src/app/admin/layout.tsx` | **Done** | Shared admin header with navigation links |
| **QDR-54: Dashboard Stub** | `src/app/customer/dashboard/page.tsx` | **Done** | Authenticated dashboard with user email display; placeholder reservation list |
| **QDR-54: Admin Floorplan Stub** | `src/app/admin/floorplan/page.tsx` | **Done** | Phase 4 placeholder with feature list |
| **Code Quality** | All new files | **Done** | Comments normalized to neutral voice; TypeScript build passes |
| **Git Commit** | `4c8e9f4` | **Done** | QDR-54 committed to main branch with complete message |

### Remaining Tasks (Phase 3 Completion)

| Task | Blocking | Priority | Details |
|------|----------|----------|----------|
| **QDR-39: Checkout Modal** | QDR-54 complete | High | 5-minute countdown timer; tokenized simulated payment UI; confirm/cancel buttons |
| **QDR-59: Customer Dashboard Expansion** | QDR-39 complete | High | Display upcoming/past reservations; cancel button (disabled within 2 hours); delete account button |
| **QDR-60: Reservation Cancellation** | QDR-59 complete | High | Backend cancellation logic; refund simulation; waitlist auto-promotion trigger |
| **QDR-61: Right to Erasure** | QDR-59 complete | Medium | Delete account button; cascade delete all PII/reservations/waitlist (LEG-1) |
| **QDR-82: Digital Menu Display** | QDR-39 complete | Medium | Show menu items alongside availability results; category filters |
| **RBAC Testing** | Middleware complete | Medium | Create test accounts with `customer` and `admin` roles; verify route access; manual SQL verification |

---

## 16.4 Next Immediate Tasks

### Highest Priority (Unblock Phase 3 Completion)

1. **QDR-39: Build Checkout Modal**
   - 5-minute countdown timer using `setInterval` and React state
   - Simulated payment form (card number, expiry, CVV placeholders)
   - Lock/confirm/cancel buttons
   - Integration with `/api/reservations/lock` endpoint
   - Target completion: May 12, 2026

2. **QDR-59-61: Expand Customer Dashboard**
   - Query `public.reservations` for authenticated user
   - Display upcoming (start_time > now) and past (start_time <= now) separate lists
   - Cancel button disabled if reservation.start_time < now + 2 hours
   - Delete account button triggers `DELETE FROM auth.users` (cascade deletes all related data)
   - Target completion: May 13, 2026

### Medium Priority (Phase 3 Polish)

3. **QDR-82: Digital Menu Component**
   - Fetch `public.menu` on availability page
   - Display in sidebar or modal alongside table results
   - Filter by category (starters/mains/desserts/beverages)
   - Target completion: May 14, 2026

4. **RBAC Manual Testing & Verification**
   - Create 2 test accounts via UI: one with `customer` role, one with `admin` role
   - Verify `middleware.ts` grants/denies access appropriately
   - Document test results and attach to QDR-54 ticket
   - Target completion: May 12, 2026 (parallel with QDR-39)

---

*End of Documentation*

