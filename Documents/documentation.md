# Gordon Ramsay Restaurant Reservation System -- Technical Documentation

> **Document Version:** 1.3
> **Last Updated:** May 12, 2026 (Phase 1-3 Complete)
> **Team:** Qdreon
> **Course:** CPE 2201 -- Software Design and Development

---

## Revision History

### [May 13, 2026] - Phase 4 Admin Dashboard UI Merge
- **PR #10 Integration:** Merged cyghs's admin dashboard work into main; added CRM, Menu, and Reservations pages to the live app
- **Dependency Fix:** Added `@remixicon/react` for the new UI components and resolved the MasterCalendar export issue
- **Build Status:** ✅ Production build successful after merge; admin routes render correctly in browser smoke tests
- **Contributor Credit:** Applied co-author attribution for cyghs <24104753@usc.edu.ph>
- **Project: 58% Complete** — Phase 4 UI scaffold is now live; real-time wiring still pending

### [May 12, 2026] - Phase Completion: Phases 0-3 Fully Operational
- **Phase 1 (100%):** Data layer complete; schema, RBAC, indexes, triggers, seed data all verified
- **Phase 2 (100%):** Booking engine complete; 3 RPCs deployed; pg_cron scheduler + table teardown trigger added
- **Phase 3 (100%):** Customer portal complete; auth, availability search, checkout modal, lock API, dashboard, account management all verified
- **Build Status:** ✅ Production build successful (Webpack, 3.5s compile time)
- **Project: 50% Complete** — Ready for Phase 4

### [May 12, 2026] - Gap Analysis: Cross-Reference Against SRS/SWDD/SPM
- Cross-referenced all three authoritative documents (SRS v1.4, SWDD, SPM Project Charter) against MASTER_TODO.md.
- Added FR-1 (Account Management), FR-10 (Cancellation backend), and FR-13 (System Health Monitoring) to the FR table -- all were absent.
- Added missing NFRs: PR-1, PR-3, SAF-1, SEC-2, and all SQA attributes.
- Updated Business Logic Constraints Traceability matrix with all previously unlisted constraints.
- Updated Development Roadmap with missing QA tasks (Phase 7) and deliverables.
- Moved raw extraction files to `Documents/extracted_raw/` directory.

### [May 11, 2026] - QDR-54: Customer Portal Authentication
*   **Authentication:** Implemented Supabase Auth client with sign-up, sign-in, sign-out utilities.
*   **Auth Pages:** Created `/auth/login` and `/auth/register` pages with RA 10173 (LEG-1) consent enforcement.
*   **Protected Routes:** Built `middleware.ts` with route protection for `/customer/*` and `/admin/*`; enforces RBAC via role lookup.
*   **Stubs:** Created `/customer/dashboard` (user profile + reservation list) and `/admin/floorplan` (Phase 4 placeholder).
*   **Documentation:** Normalized code comments to neutral voice; updated system prompt with JIRA template.
*   **Verification:** `npm run build` passed TypeScript checks; commit `4c8e9f4` pushed to main.

### [May 9, 2026] - QDR-37: Data Layer & Security (Initial Architecture)
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

The SRS (v1.4) and SWDD define **13 Functional Requirements** spanning the Customer Portal and Admin Dashboard.

| ID | Requirement | Description | Status |
|----|-------------|-------------|--------|
| FR-1 | Account Management | Register, login, manage profile (dietary restrictions, contact info) via Supabase Auth | ✅ **COMPLETE** (Phase 3) |
| FR-2 | Search and Discovery | Search table availability by date, time, party size; view-only menu before booking | ✅ **COMPLETE** (Phase 3) |
| FR-3 | Booking Engine | Row-lock table on selection; 5-minute checkout timeout; simulated deposit; error on conflict | ✅ **COMPLETE** (Phase 2 + 3) |
| FR-4 | Table Combination Logic | Auto-combine adjacent tables for large parties; hard cap at 12 Pax; teardown on completion | ✅ **COMPLETE** (Phase 2 + trigger 008) |
| FR-5 | Waitlist Automation | Trigger on cancellation; 10-minute offer window; disable protocol 60 min before closing | Schema done; trigger Phase 5 |
| FR-6 | Email Notifications | Booking confirmation email with .ics calendar invite; waitlist offer email | Phase 5 - Not Started |
| FR-7 | Visual Table Management | Static interactive floor plan grid; color-coded (Green/Yellow/Red/Grey); WebSocket real-time | Phase 4 - Not Started |
| FR-8 | Reservation Management | Admin manual walk-in/phone bookings; Block Date feature; operating hours validation | Phase 4 - Not Started |
| FR-9 | Guest CRM | Past visit history, VIP status, no-show count, allergy notes per customer | Phase 6 - Not Started |
| FR-10 | Booking Cancellation | Customer cancels from dashboard; backend must revert table to Available AND trigger waitlist protocol | UI Phase 3 In Progress; backend Phase 5 dependency |
| FR-11 | Menu Management CRUD | Admin uploads, edits, removes menu items; changes reflect on Customer Portal in real-time | Phase 6 - Not Started |
| FR-12 | Admin Waitlist Control | Admin manually views, prioritizes, edits waitlist queue for VIPs or walk-in emergencies | Phase 6 - Not Started |
| FR-13 | System Health Monitoring | Admin Dashboard displays real-time connection status indicators for Supabase, Payment Gateway, SMTP | API stub `/api/health` exists; full Admin UI Phase 4 |

### 1.2 Key Non-Functional Requirements

The SRS defines non-functional requirements across Performance (PR-*), Safety (SAF-*), Security (SEC-*), Database (DB-*), Legal (LEG-*), and Software Quality (SQA-*) categories.

**Performance Requirements**

| ID | Requirement | Metric | Status |
|----|-------------|--------|--------|
| PR-1 | UI Load Performance | Customer availability grid and admin floor plan must load within 3 seconds over 4G/LTE or broadband | Not tested -- Phase 7 QA task |
| PR-2 | Concurrency Resolution | Row-level locking must resolve booking conflicts within 1 second | Schema ready (Phase 2 complete) |
| PR-3 | Email Dispatch Latency | Booking confirmations dispatched to SMTP within 10 seconds of successful checkout | Not tested -- Phase 7 QA task |

**Safety Requirements**

| ID | Requirement | Description | Status |
|----|-------------|-------------|--------|
| SAF-1 | Data Backup and Recovery | Rely on Supabase automated Point-in-Time Recovery (PITR) and daily backups to prevent data loss | Not explicitly verified -- Phase 0/1 task |
| SAF-2 | Offline Failsafe | If the admin dashboard loses internet, display Offline Warning and disable all grid interactions | Phase 4 - Not Started |

**Security Requirements**

| ID | Requirement | Description | Status |
|----|-------------|-------------|--------|
| SEC-1 | RBAC and RLS | Supabase Auth with role-based access; Customers access only own data | Complete (Phase 1 + QDR-54) |
| SEC-2 | HTTPS/TLS Encryption | All web traffic between client browsers and Supabase backend must be encrypted via HTTPS/TLS | Verify on deployment -- Phase 7 task |
| SEC-3 | No Raw PAN Storage | Tokenized simulated checkout; no real credit card numbers stored or transmitted | Complete (Phase 2; LEG-2 aligned) |

**Database Requirements**

| ID | Requirement | Description | Status |
|----|-------------|-------------|--------|
| DB-1 | ACID Compliance | PostgreSQL via Supabase ensures ACID-compliant transactions | Inherent to Supabase/PostgreSQL |
| DB-2 | Data Retention | CRM and profile data retained indefinitely unless user requests deletion | Implemented via LEG-1 cascade delete |
| DB-3 | UTC Timestamps | All timestamps stored in TIMESTAMPTZ (UTC); converted to local timezone on client-side display | Complete (Phase 1) |

**Legal Requirements**

| ID | Requirement | Description | Status |
|----|-------------|-------------|--------|
| LEG-1 | RA 10173 Data Privacy Act | Mandatory consent checkbox on registration; automated Delete Account with full cascade PII erasure | Complete (Phase 1 schema; Phase 3 auth) |
| LEG-2 | PCI-DSS Compliance | No raw credit card PANs captured, stored, or transmitted; simulated tokenized checkout only | Complete (Phase 2 schema + Phase 3 modal) |

**Software Quality Attributes (SQA)**

| Attribute | Requirement | Target |
|-----------|-------------|--------|
| Usability | Responsive UI for mobile, tablet, and desktop browsers | All phases |
| Reliability | 99.9% uptime via Supabase globally distributed cloud infrastructure | Inherent to Supabase hosting |
| Maintainability | MVC + Repository Pattern separation of concerns | Phase 0 complete |
| Portability | Operates on Windows PC, Mac, tablets (iPads for front desk), smartphones | Phase 7 device testing |

---

## Traceability & Verification

- **Scope:** Functional Requirements (FR-*), Platform Requirements (PR-*), Database constraints (DB-*), Security requirements (SEC-*), and Legal constraints (LEG-*) declared in this document were cross-referenced with the authoritative project artifacts located in the `Documents/` folder: `SRS_Qdreon.pdf`, `SWDD_Qdreon.pdf`, and `SPM_ProjectCharter_GRRRS_Qdreon.pdf`.
- **Status:** High-level cross-check performed: core FR identifiers (FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-8, FR-9, FR-11, FR-12) are present in this documentation and referenced in migrations, prompts, and migration SQL filenames. A full verification of the PDF source documents (word-for-word traceability) requires text extraction from the PDFs and manual confirmation; see `Documents/MASTER_TODO.md` for the tracking task.
- **Action Items:**
  - Extract and validate all FR/PR/DB/SEC/LEG references from the `SRS_Qdreon.pdf`, `SWDD_Qdreon.pdf`, and `SPM_ProjectCharter_GRRRS_Qdreon.pdf` into a traceability matrix (CSV/Markdown).
  - Confirm each QDR ticket maps to at least one FR or design constraint in the SRS/SWDD/SPM and update this document's "Business Logic Constraints Traceability" section with exact citations.

### Additional Audit Findings (Gemini)

The following findings were reported by an external audit (Gemini). They summarize missing features, subtle business-logic edge cases, and architecture/infrastructure items that should be tracked in the traceability matrix and implemented as tickets where applicable:

1. Major Missing Features (Entirely Omitted)

  - System Health Monitoring (FR-13): Your admin dashboard lacked the requirement to display real-time connection status indicators for your three critical external dependencies: Supabase, the Payment Gateway, and the SMTP Email Server.
  - Automated Deposit Refunds (FR-10): While you included the cancellation button, you missed the financial logic. The system must trigger an automated simulated deposit refund for cancellations made at least 24 hours in advance.
  - Upcoming Email Reminders (FR-6): Your email API tasks covered confirmations and waitlist offers, but missed the requirement to automatically dispatch upcoming reminder notifications to customers before their scheduled reservation time.

2. Business Logic & Edge Cases (Subtle Misses)

  - Table Combination Teardown (FR-4): Your booking engine correctly combines adjacent tables for large parties, but misses the teardown logic. Upon conclusion of a reservation (status changed to 'Completed' or 'Cancelled'), the system must automatically dissolve these logical links to return tables to an 'Available' state.
  - Status Synchronization (FR-7): On the interactive floor plan, if an Admin manually changes a Table Status to 'Dirty', the system must automatically transition the associated Reservation Status from 'Seated' to 'Completed'.
  - Shift Hours Validation (FR-8): For the Admin reservation manager, you must enforce strict input validation preventing administrators from setting a closing time that is earlier than the opening time.
  - Concurrency Failure Error Handling (FR-3): If the 1-second concurrency lock fails due to a conflict, the system must immediately abort and display a specific 'Table already reserved' error message to the customer.

3. Architecture & Infrastructure

  - Local Time Zone Conversion (DB-3): You correctly planned to store data in UTC format. However, the database must automatically convert this to the restaurant's local time zone for display on both the Customer Portal and Admin Dashboard.
  - Data Loss Prevention (SAF-1): There was no DevOps task to explicitly rely on Supabase's automated Point-in-Time Recovery (PITR) and daily backups to prevent catastrophic loss of CRM data.
  - Connection Security (SEC-2): A baseline task is needed to ensure all web traffic between client browsers and the backend is strictly encrypted using standard HTTPS/TLS protocols.

4. Performance Testing & UI Requirements

  - UI Latency QA Testing (PR-1): The Project Charter schedules a specific testing phase. You must verify that the real-time availability grid and static floor plan load within a strict 3-second limit.
  - Notification Latency Testing (PR-3): Automated booking confirmations must be dispatched to the SMTP server within 10 seconds of a successful simulated checkout.
  - Tablet Responsiveness: The system must be explicitly tested on standard touchscreen tablets (e.g., iPads), as this is the assumed hardware for the front-desk host stand.

Add these items to the traceability matrix and create follow-up QDR tickets where appropriate.


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

This matrix maps every business constraint from the SRS (v1.4), SWDD, and SPM Project Charter to its implementation. Cross-referenced via full PDF text extraction on May 12, 2026.

### 15.1 Functional Requirement Constraints

| Constraint | Source | Rule | Implementation | Status |
|-----------|--------|------|----------------|--------|
| FR-1 | SRS 3.2.1 | Account management via Supabase Auth with UUID PKs | `public.users` + `public.customers` tables; `authClient.ts` | Complete |
| FR-3 | SRS 3.2.1 | 5-minute checkout timeout; auto-revert table to Available on expiry | `reservations.locked_until`; rollback Edge Function / pg_cron (Phase 2) | Schema done |
| FR-3 | SRS 3.2.1 | On 1-second lock conflict: abort transaction, display 'Table already reserved' error | RPC error handling in booking engine (Phase 2) | Phase 2 complete |
| FR-4 | SRS 3.2.1 | Auto-combine adjacent tables; hard cap at 12 Pax | `reservation_tables` junction + `adjacent_table_ids` + CHECK <= 12 | Schema done |
| FR-4 | SRS 3.2.1 | On reservation Completed or Cancelled: dissolve table combination, revert all tables to Available | Trigger logic required (Phase 2/5) | Not yet implemented |
| FR-5 | SRS 3.2.1 | Waitlist trigger on cancellation; 10-minute offer window before moving to next person | `waitlist.offered_at`, `expires_at`; Postgres trigger (Phase 5) | Schema done |
| FR-5 | SRS 3.2.1 | Waitlist automation DISABLED 60 minutes before restaurant closing time | Closing time comparison in trigger logic (Phase 5) | Not yet implemented |
| FR-5 | SRS U3 | Waitlist capped at max ~50 parties; display 'Waitlist Full' when exceeded | Waitlist count check in UI (Phase 5) | Not yet implemented |
| FR-7 | SRS 3.2.2 | Color codes: Green=Available, Yellow=Reserved, Red=Occupied, Grey=Dirty | `table_status` enum (Phase 1); floor plan UI (Phase 4) | Schema done |
| FR-7 | SRS 3.2.2 | Admin marking table Dirty must auto-transition linked reservation from Seated to Completed | Status sync trigger (Phase 4) | Not yet implemented |
| FR-8 | SRS 3.2.2 | Admin Block Date prevents all online bookings for that date | `blocked_dates` table; availability RPC filter (Phase 2) | Schema done |
| FR-8 | SRS 3.2.2 | Bookings outside operating hours must be rejected (customer-facing validation) | Client-side + RPC validation (Phase 2/3) | Not yet implemented |
| FR-9 | SRS 3.2.2 | No-Show auto-flag: if Confirmed reservation is not marked Seated within 15 min past start time | pg_cron / Edge Function every 5 min (Phase 6) | Not yet implemented |
| FR-10 | SRS 3.2.1 | Customer cancel from dashboard: backend must (a) revert table to Available AND (b) trigger waitlist protocol | Cancel API route + DB trigger (Phase 3/5) | UI partial only |
| FR-13 | SRS 3.2.2 | Admin Dashboard shows real-time connection status for Supabase, Payment Gateway, SMTP | `/api/health` stub exists; Admin UI widget (Phase 4) | API stub only |

### 15.2 Non-Functional Requirement Constraints

| Constraint | Source | Rule | Implementation | Status |
|-----------|--------|------|----------------|--------|
| PR-1 | SRS 4.1 | Customer grid and admin floor plan must load within 3 seconds over 4G/LTE | Lighthouse/performance test (Phase 7) | Not tested |
| PR-2 | SRS 4.1 | Row-level locking resolves concurrent booking conflict within 1 second | `SELECT ... FOR UPDATE` in booking RPC (Phase 2) | Complete |
| PR-3 | SRS 4.1 | Booking confirmation email dispatched to SMTP within 10 seconds of successful checkout | Email API timing test (Phase 7) | Not tested |
| SAF-1 | SRS 4.2 | Supabase PITR and daily backups enabled to prevent data loss | Enable PITR in Supabase dashboard (Phase 1/DevOps) | Not verified |
| SAF-2 | SRS 4.2 | Offline Warning banner + disable grid clicks when internet lost | React `useEffect` network listener (Phase 4) | Not started |
| SEC-1 | SRS 4.2 | Supabase Auth + RBAC + RLS: Customers access only own UUID rows | `003_rbac_rls_policies.sql`; `middleware.ts` | Complete |
| SEC-2 | SRS 4.2 | All traffic encrypted via HTTPS/TLS | Supabase HTTPS + hosting config verification (Phase 7) | Implicit; not verified |
| SEC-3 / LEG-2 | SRS 4.2 / SRS 5.2 | No raw PAN stored or transmitted; simulated tokenized checkout only | `reservations.payment_token` (simulated); CheckoutModal UI | Complete |
| DB-1 | SRS 5.1 | PostgreSQL ACID compliance via Supabase | Inherent to Supabase/PostgreSQL hosting | Complete |
| DB-2 | SRS 5.1 | CRM data retained indefinitely unless user requests deletion | CASCADE delete chain satisfies LEG-1 Right to Erasure | Complete |
| DB-3 | SRS 5.1 | All timestamps stored in UTC (TIMESTAMPTZ); converted to local time on client | All date/time columns TIMESTAMPTZ; `date-fns` for client conversion | Complete |
| LEG-1 | SRS 5.2 | RA 10173: mandatory consent checkbox on register; Delete Account permanently purges all PII | `users.consent_given`; cascade delete chain; `/customer/dashboard` Delete Account button | Schema complete; UI Phase 3 |
| LEG-2 | SRS 5.2 | PCI-DSS: no raw PAN capture, storage, or transmission during MVP | `reservations.payment_token` (token only); CheckoutModal (simulated) | Complete |

### 15.3 Architecture and Design Pattern Constraints

| Pattern | Source | Requirement | Implementation | Status |
|---------|--------|-------------|----------------|--------|
| MVC | SWDD 3.1 | Strict separation: Supabase=Model, React=View, API Routes=Controller | Folder structure Phase 0 | Complete |
| Repository Pattern | SWDD 3.1 | All DB queries abstracted into `/services/` files; no raw queries in UI components | 5 service files (stubs) | Schema done; Phase 2-6 implementation |
| Observer Pattern | SWDD 5.2 | Supabase Real-Time as Subject; Admin Floor Plan Grid as Observer | `supabase.channel()` subscription (Phase 4) | Not started |
| COMET Method | SWDD 1.4 | UML Use Case, Class, Sequence diagrams produced during planning | QDR-31 (Done per Jira) | Documented |
| 3NF | SWDD 4.1 | All tables in Third Normal Form; no partial or transitive dependencies | All 8 tables verified | Complete |

---

## 16. Development Roadmap Status

### 16.1 Phase Completion Summary

| Phase | Jira Epic | Name | Status | Completion Date |
|-------|-----------|------|--------|----------------|
| Phase 0 | QDR-36 | Project Scaffolding | **Complete** | May 8, 2026 |
| Phase 1 | QDR-37 | Data Layer and Security | **Complete** | May 9, 2026 |
| Phase 2 | QDR-40 | Core Booking Engine | **Complete (90%)** | May 11, 2026 |
| Phase 3 | QDR-35 (sub: QDR-36, QDR-38, QDR-39) | Customer Portal | **In Progress (~30%)** | -- |
| Phase 4 | QDR-42, QDR-43 | Admin Real-Time Dashboard | Not Started | -- |
| Phase 5 | QDR-41, QDR-45 | Waitlist and Automations | Not Started | -- |
| Phase 6 | QDR-44, QDR-79, QDR-80 | Admin Auxiliary Features | Not Started | -- |
| Phase 7 | QDR-46 | QA, Testing, and Deliverables | Not Started | -- |

### 16.2 Jira Timeline (QDR Board) -- Authoritative Mapping

This table mirrors the exact structure and ticket IDs from the official Jira board.
Epics (bold) contain the child tasks listed below them.

| Ticket | Task | Status |
|--------|------|--------|
| **QDR-23** | **Section 1. Planning & Analysis (Epic)** | **Done** |
| QDR-24 | Elicit Stakeholder Requirements | Done |
| QDR-25 | Negotiate Scope and MVP | Done |
| QDR-26 | Software Requirements Specification (SRS) | Done |
| QDR-27 | Progress Report | Done |
| QDR-28 | SPM Document / Project Charter | Done |
| **QDR-29** | **Section 2. System Design (Epic)** | **Done** |
| QDR-30 | Architectural Design (COMET) | Done |
| QDR-31 | Create UML Diagrams | Done |
| QDR-32 | Design PostgreSQL Schema | Done |
| QDR-33 | Design UI/UX Mockups | Done |
| QDR-34 | Software Design Document (SWDD) | Done |
| **QDR-35** | **Section 3. Development (Epic)** | **In Progress** |
| QDR-36 | Setup Supabase Authentication | Done |
|  | -- QDR-54: Implement customer login/register with RA 10173 consent checkbox (LEG-1) | Done |
|  | -- QDR-55: Configure RBAC to separate Customer and Admin privileges (SEC-1) | Done |
| QDR-37 | Configure Database Tables | Done |
|  | -- QDR-56: Build PostgreSQL schema: Users, Tables, Reservations, Waitlist, Menu, CRM | Done |
|  | -- QDR-57: Apply Row Level Security (RLS) policies | Done |
|  | -- QDR-58: Enforce UTC timezone standardization for all date/time entries (DB-3) | Done |
| QDR-38 | Build Account Management Module | To Do |
|  | -- QDR-59: Build UI for updating contact info and dietary restrictions (FR-1) | To Do |
|  | -- QDR-60: Build UI for customers to cancel upcoming reservations + backend revert (FR-10) | To Do |
|  | -- QDR-61: Implement Delete Account to permanently purge PII/CRM data (LEG-1) | To Do |
| QDR-39 | Build Search & Availability UI | To Do |
|  | -- QDR-65: Wire CheckoutModal to availability results and /api/reservations/lock (FR-3) | To Do |
|  | -- QDR-82: Display view-only digital menu alongside availability results (FR-2) | To Do |
| QDR-40 | Implement Booking Engine | In Progress |
|  | -- QDR-62: Write DB query for real-time table availability by Date, Time, and Pax (FR-2) | Done |
|  | -- QDR-63: Implement table combination logic, capped at 12 Pax (FR-4) | Done |
|  | -- QDR-64: Implement PostgreSQL 1-second row-locking mechanism (PR-2) | Done |
|  | -- QDR-65: Integrate Simulated Payment Gateway with 5-minute timeout (FR-3) | In Progress |
| QDR-41 | Develop Virtual Waitlist System | To Do |
|  | -- QDR-66: Backend trigger: cancelled reservation auto-notifies next waitlist customer (FR-5) | To Do |
|  | -- QDR-67: Implement 10-minute acceptance window timer for waitlist offers (FR-5) | To Do |
|  | -- QDR-68: Implement 60-minute pre-closing cutoff to disable waitlist automation (FR-5) | To Do |
| QDR-42 | Build Static Floor Plan Grid | To Do |
|  | -- QDR-69: Build interactive grid with color-coding: Green/Yellow/Red/Grey (FR-7) | To Do |
|  | -- QDR-70: Integrate Supabase Real-Time WebSockets for instant status updates (FR-7) | To Do |
|  | -- QDR-71: Implement Offline Failsafe: disable grid and show warning banner (SAF-2) | To Do |
| QDR-43 | Implement Reservation Calendar | To Do |
|  | -- QDR-72: Build admin form for walk-in and phone reservation entry (FR-8) | To Do |
|  | -- QDR-73: Add Block Out Dates functionality for holidays/private events (FR-8) | To Do |
|  | -- QDR-74: Add input validation to prevent bookings outside operating hours (FR-8) | To Do |
| QDR-44 | Develop Guest CRM Table | To Do |
|  | -- QDR-75: Create searchable table: guest history, VIP status, allergy notes (FR-9) | To Do |
|  | -- QDR-76: Implement automated No-Show trigger at 15 minutes past reservation time (FR-9) | To Do |
| QDR-45 | Integrate SMTP Email Server | To Do |
|  | -- QDR-77: Create email payloads for Booking Confirmations and Waitlist Invites (FR-6) | To Do |
|  | -- QDR-78: Generate and attach .ics calendar invites to confirmation emails (FR-6) | To Do |
| QDR-79 | Implement Menu Management Module | To Do |
|  | -- QDR-81: Build Admin CRUD forms to upload/edit digital menu items (FR-11) | To Do |
| QDR-80 | Admin Waitlist Control Module | To Do |
|  | -- QDR-83: Build Admin UI to view, edit, and prioritize waitlist queue for VIPs (FR-12) | To Do |
| **QDR-46** | **Section 4. Testing (Epic)** | **In Progress** |
| QDR-47 | Functional & Structural Testing | To Do |
| QDR-48 | UI Latency Testing (3s Target) -- PR-1 + PR-3 email latency (10s) | To Do |
| QDR-49 | Real-Time Concurrency Testing -- PR-2 (1s row-lock resolution) | To Do |
| QDR-50 | Verify Offline Mode Failsafe -- SAF-2, SEC-2, LEG-1, LEG-2 | To Do |
| **QDR-51** | **Section 5. Deployment (Epic)** | **To Do** |
| QDR-52 | Deploy to Supabase Cloud + Enable PITR (SAF-1) | To Do |
| QDR-53 | Finalize User Manual | To Do |

---

## 16.3 Phase 3: Customer Portal -- Development Status (QDR-54 & QDR-55)

### Completed Tasks (May 11-12, 2026)

**Authentication & Authorization (QDR-54, QDR-55):**

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
| **QDR-55: RBAC Testing Suite** | `tests/rbac/*` | **Done** | Comprehensive test suite with manual scenarios, automated runner, and test results |
| **QDR-55: Build Verification** | Build output | **Done** | `npm run build` passed; all routes compiled; TypeScript checks passed |
| **Code Quality** | All files | **Done** | Comments normalized to neutral voice; full SEC-1 compliance verified |
| **Git Commits** | `4c8e9f4`, `929a2cb`, `eced079` | **Done** | QDR-54, test suite, and results committed to main branch |

### Remaining Tasks (Phase 3 Completion)

| Task | Blocking | Priority | Details |
|------|----------|----------|----------|
| **QDR-39: Checkout Modal** | QDR-54+55 complete | High | 5-minute countdown timer; tokenized simulated payment UI; confirm/cancel buttons |
| **QDR-59: Customer Dashboard Expansion** | QDR-39 complete | High | Display upcoming/past reservations; cancel button (disabled within 2 hours); delete account button |
| **QDR-60: Reservation Cancellation** | QDR-59 complete | High | Backend cancellation logic; refund simulation; waitlist auto-promotion trigger |
| **QDR-61: Right to Erasure** | QDR-59 complete | Medium | Delete account button; cascade delete all PII/reservations/waitlist (LEG-1) |
| **QDR-82: Digital Menu Display** | QDR-39 complete | Medium | Show menu items alongside availability results; category filters |

---

## 16.4 Next Immediate Task

### Highest Priority (Unblock Phase 3 Completion)

**QDR-39: Build Checkout Modal** (Starting Now)
- 5-minute countdown timer using `setInterval` and React state
- Simulated payment form (card number, expiry, CVV placeholders)
- Lock/confirm/cancel buttons
- Integration with `/api/reservations/lock` endpoint
- Target completion: May 12, 2026
- **Dependency:** QDR-54 + QDR-55 (✅ Complete)

---

*End of Documentation*

