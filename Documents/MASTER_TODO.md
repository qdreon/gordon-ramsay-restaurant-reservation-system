# Gordon Ramsay Restaurant Reservation System - Master Development TODO

> **Tech Stack:** Next.js (App Router) | React | Tailwind CSS | Shadcn UI | Supabase (PostgreSQL, Auth, RLS, WebSockets, RPCs/Edge Functions)
> **Methodology:** COMET Design | SOLID Principles | MVC + Repository Pattern
> **External Integrations:** Simulated Payment Gateway (Tokenized only) | SMTP Email Provider (e.g., Resend)

---

## PHASE 0: Project Scaffolding & Architecture Setup

Setting up the environment using MVC and Repository Pattern structures.

### Subtask 0.1: Initialize Next.js & Tailwind
- [x] Run: `npx create-next-app@latest gordon-ramsay-reservations` (Select **App Router**, **Tailwind CSS**, **TypeScript**).
- [x] Navigate into the folder: `cd gordon-ramsay-reservations`
- [ ] Install Shadcn UI for modular, reusable components.

### Subtask 0.2: Backend Connection [QDR-36]
- [x] Install dependencies: `npm install @supabase/supabase-js @supabase/ssr lucide-react date-fns`
- [x] Set up the Supabase project online, get API keys.
- [x] Configure `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### Subtask 0.3: Repository Pattern Folder Structure
- [x] Create `/services` folder (Model layer -- database calls, e.g., `reservationService.js`).
- [x] Create `/components` folder (View layer).
- [x] Create `/app/api` folder (Controller layer -- Next.js API routes).

---

## PHASE 1: Data Layer & Security (Supabase SQL)

Building the 3NF Database Model and RBAC Security.

### Subtask 1.1: Enums & Base Tables (3NF) [QDR-37]

**AI Prompt:**
> "Phase 1, Step 1. Generate the Supabase PostgreSQL schema.
> 1. Create Enums: `Table_Status` (Available, Reserved, Occupied, Dirty) and `Reservation_Status` (Pending, Confirmed, Seated, Completed, No-Show, Cancelled).
> 2. Create tables with UUID primary keys: `Users` (linked to `auth.users`), `Customers` (profile/dietary info), `Tables` (capacity, status), `Menu`.
> 3. Constraint (DB-3): Ensure all date/time columns strictly use `TIMESTAMPTZ` for UTC storage."

- [x] Create `Table_Status` enum.
- [x] Create `Reservation_Status` enum.
- [x] Create `Users`, `Customers`, `Tables`, `Menu` tables with UUID PKs.
- [x] Verify all date/time columns use `TIMESTAMPTZ` (UTC).

### Subtask 1.2: Transactional Tables [QDR-37]

- [x] Create `Reservations` table.
- [x] Create `Waitlist` table.
- [x] Implement Foreign Keys linking to `Customers` and `Tables` with `ON DELETE CASCADE`.

### Subtask 1.3: Role-Based Access Control (RBAC) & RLS

**AI Prompt:**
> "Phase 1, Step 2. Generate the SQL for Role-Based Access Control (RBAC) and Row Level Security (RLS).
> 1. Add a `role` column to distinguish 'Customer' and 'Restaurant Admin'.
> 2. Write RLS policies for all tables: Customers can only SELECT, INSERT, and UPDATE rows where their user ID matches.
> 3. Admins have full CRUD access across all tables."

- [x] Add `role` column (Customer vs. Admin). [QDR-55]
- [x] Write Supabase RLS policies: Customers can only SELECT/UPDATE their own UUID records. [QDR-57]
- [x] Admins get full CRUD access. [QDR-57]

---

## PHASE 2: Core Booking Engine & Concurrency (Backend / RPCs)

Handling the complex business logic via Supabase Remote Procedure Calls (RPCs).

### Subtask 2.1: Table Availability & Combination Logic [QDR-40]

**AI Prompt:**
> "Phase 2, Step 1. Write the backend function (Supabase RPC) to query table availability.
> 1. It must accept Date, Time, and Party Size (Pax).
> 2. Constraint (FR-4): Include logic to automatically combine adjacent tables if the Party Size exceeds a single table's capacity.
> 3. Cap this automatic table combination at a strict maximum of 12 Pax. Return the available table IDs or 'No Availability'."

- [x] Write Postgres RPC to query available tables for a specific Date/Time. [QDR-62]
- [x] Implement algorithmic logic to automatically combine adjacent tables if Party Size exceeds a single table. [QDR-63]
- [x] Cap combination at 12 Pax (FR-4). [QDR-63]

### Subtask 2.2: Concurrency Row-Locking Engine (PR-2) [QDR-40]

**AI Prompt:**
> "Phase 2, Step 2. Write the PostgreSQL transaction function for the booking lock (PR-2, FR-3).
> 1. Use PostgreSQL row-level locking (`FOR UPDATE`) to lock the selected table(s). It must resolve/reject conflicts within 1 second.
> 2. The function must update the table status to 'Reserved' and initiate a 5-minute timeout window for the deposit checkout.
> 3. Include the rollback logic: If the payment is not confirmed within 5 minutes, release the lock and revert the status to 'Available'."

- [x] Write a Postgres transaction using `SELECT ... FOR UPDATE`. [QDR-64]
- [x] Lock selected table row(s); reject concurrent conflicts within 1 second. [QDR-64]

### Subtask 2.3: Checkout Timeout Rollback [QDR-40]

- [x] Write a database trigger or edge function that automatically releases the row-lock. [QDR-65]
- [x] Revert the table to 'Available' if the reservation is not marked 'Confirmed' within 5 minutes. [QDR-65]

---

## PHASE 3: Customer Portal (Frontend / View & Controller)

Building the user-facing web app adhering to Legal Compliance.

### Subtask 3.1: Registration & Login UI [QDR-36]

**AI Prompt:**
> "Phase 3, Step 1. Build the `/login` and `/register` Next.js pages using Supabase Auth.
> 1. Include fields for Name, Email, Password, Contact Info, and Dietary Restrictions.
> 2. Constraint (LEG-1): The register form MUST include a mandatory consent checkbox for RA 10173 (Data Privacy Act). The form cannot submit unless checked."

- [ ] Build Auth forms using Supabase Auth. [QDR-54]
- [ ] Add mandatory checkbox for Data Privacy Act (RA 10173) consent. [QDR-54]

### Subtask 3.2: Search & Menu UI [QDR-39]

**AI Prompt:**
> "Phase 3, Step 2. Build the main booking interface (`/customer/book`).
> 1. Step 1: Input form for Date, Time, and Pax.
> 2. Step 2: Display results from the Phase 2 availability function alongside a view-only menu.
> 3. Step 3: A Checkout Modal for the deposit. It MUST display a visual 5-minute countdown timer.
> 4. Constraint (LEG-2): Build a simulated, tokenized payment form. Do not capture real credit card PANs."

- [ ] Build input form (Date, Time, Party Size).
- [ ] Display results from Phase 2 Availability RPC alongside a view-only digital menu component.

### Subtask 3.3: Simulated Checkout Modal (FR-3 & SEC-3) [QDR-39]

- [ ] Build a tokenized, simulated payment UI (do NOT capture real PANs).
- [ ] Include a visual 5-minute countdown timer.
- [ ] If timer hits 00:00, automatically redirect user and call backend to release the row-lock.

### Subtask 3.4: Customer Dashboard & Right to Erasure [QDR-38]

**AI Prompt:**
> "Phase 3, Step 3. Build the `/customer/dashboard` page.
> 1. Display upcoming and past reservations. Include a 'Cancel' button (disable it if within 2 hours of the booking time).
> 2. Constraint (LEG-1): Build a prominent 'Delete Account' button. Write the backend function this triggers to perform a permanent cascade delete of the user's PII, CRM data, and Supabase Auth record."

- [ ] Build UI for customers to view upcoming/past reservations. [QDR-59]
- [ ] Implement "Cancel Booking" button (disable if within 2 hours of reservation). [QDR-60]
- [ ] Build "Delete Account" button that triggers permanent cascade delete of PII and CRM data (LEG-1). [QDR-61]

---

## PHASE 4: Admin Real-Time Dashboard (Operations)

Building the staff tools using the Observer Pattern.

### Subtask 4.1: Static Floor Plan Grid UI [QDR-42]

**AI Prompt:**
> "Phase 4, Step 1. Build the `/admin/floorplan` Visual Table Management component.
> 1. Map the Tables database rows to a static visual grid.
> 2. Constraint (FR-7): Apply strict color coding: Green (Available), Yellow (Reserved), Red (Occupied), Grey (Dirty).
> 3. Connect Supabase Real-Time WebSockets so when table statuses change in the DB, the UI colors update instantly without a page refresh."

- [ ] Build the interactive visual map of the restaurant tables. [QDR-69]
- [ ] Implement strict color-coding logic: Green (Available), Yellow (Reserved), Red (Occupied), Grey (Dirty). [QDR-69]

### Subtask 4.2: Observer Pattern Integration (WebSockets) [QDR-42]

- [ ] Implement `supabase.channel()` to subscribe to the `Tables` database. [QDR-70]
- [ ] Ensure the Floor Plan UI updates instantly when a customer books a table, without requiring a page refresh. [QDR-70]

### Subtask 4.3: Offline Failsafe (SAF-2) [QDR-42 / QDR-50]

**AI Prompt:**
> "Phase 4, Step 2. Implement the Offline Failsafe (SAF-2) for the floor plan.
> 1. Add a network listener to the React component.
> 2. If the internet disconnects, display a highly visible 'Offline Warning' banner.
> 3. Disable all clickable interactions on the grid until the connection is restored."

- [ ] Implement a React `useEffect` network listener. [QDR-71]
- [ ] If internet disconnects, render an "Offline Warning" overlay and disable all clickable table actions. [QDR-71]

### Subtask 4.4: Master Reservation Calendar [QDR-43]

**AI Prompt:**
> "Phase 4, Step 3. Build the `/admin/reservations` page.
> 1. Display a list/calendar of all bookings.
> 2. Create a form for admins to manually enter Walk-ins and Phone reservations.
> 3. Create a 'Block Date' function so admins can close the restaurant for holidays, preventing online searches for those dates (FR-8)."

- [ ] Build the List/Calendar view of all bookings.
- [ ] Add a form for Admins to manually enter Walk-ins/Phone bookings. [QDR-72]
- [ ] Add a "Block Date" feature to prevent online bookings for holidays. [QDR-73]
- [ ] Add input validation to prevent bookings outside of operating hours (FR-8). [QDR-74]

---

## PHASE 5: Waitlist & Automations (Triggers & APIs)

Building the automated workflows.

### Subtask 5.1: Waitlist UI [QDR-41]

- [ ] If Phase 2.1 returns "No Availability", display a "Join Virtual Waitlist" button on the Customer search page.

### Subtask 5.2: Waitlist Database Trigger [QDR-41]

**AI Prompt:**
> "Phase 5, Step 1. Write the Supabase Database Trigger for Waitlist Automation (FR-5).
> 1. When a reservation status changes to 'Cancelled', query the Waitlist table for the next person for that timeslot.
> 2. Constraint: Do NOT trigger this if the current time is within 60 minutes of the restaurant's closing time.
> 3. Setup the logic to grant the notified waitlist customer exactly 10 minutes to accept the table before moving to the next person."

- [ ] Write a Postgres Trigger: `ON UPDATE` of Reservations to 'Cancelled', automatically pop the next customer off the Waitlist. [QDR-66]
- [ ] Add logic to abort this trigger if the current time is within 60 minutes of the restaurant's closing shift (FR-5). [QDR-68]
- [ ] Grant 10-minute acceptance window before moving to the next person. [QDR-67]

### Subtask 5.3: SMTP Email Service [QDR-45]

**AI Prompt:**
> "Phase 5, Step 3. Build the Next.js API route to integrate SMTP Email (FR-6).
> 1. Write the dispatch logic for Booking Confirmations and Waitlist Offers.
> 2. Generate an `.ics` calendar file containing the reservation details and attach it to the Confirmation email payload."

- [ ] Create a Next.js API route integrating SMTP provider (e.g., Resend).
- [ ] Build Booking Confirmation email (generate and attach a `.ics` calendar invite). [QDR-77 / QDR-78]
- [ ] Build Waitlist Offer email (state explicitly that they have a 10-minute window to click the acceptance link). [QDR-77]

---

## PHASE 6: Admin Auxiliary Features (CRUD & CRM)

Finalizing the management modules.

### Subtask 6.1: Guest CRM Interface (FR-9) [QDR-44]

**AI Prompt:**
> "Phase 6, Step 1. Build the `/admin/crm` page (FR-9).
> 1. Create a searchable table displaying Customer profiles.
> 2. Display their total past visits, total no-show counts (calculated from the DB), VIP tags, and a text area for staff to read/update allergy notes."

- [ ] Build a searchable data table for Admins. [QDR-75]
- [ ] Display customer history, calculate total past visits, add VIP tags, and include a text area for allergy notes. [QDR-75]

### Subtask 6.2: Automated No-Show Cron Job [QDR-44]

**AI Prompt:**
> "Phase 5, Step 2. Write a Supabase Edge Function (or pg_cron job) for No-Shows (FR-9).
> 1. The function should run frequently and check 'Confirmed' reservations.
> 2. If the current time is 15 minutes past the scheduled reservation time and the admin has not updated the status to 'Seated', automatically change the reservation status to 'No-Show'."

- [ ] Write a Supabase Edge Function (or `pg_cron`). [QDR-76]
- [ ] Schedule it to run every 5 minutes. [QDR-76]
- [ ] If a reservation is 'Confirmed' but the time is now > 15 minutes past the start time (and the Admin hasn't marked them 'Seated'), update status to 'No-Show'. [QDR-76]

### Subtask 6.3: Menu Management CRUD [QDR-79]

**AI Prompt:**
> "Phase 6, Step 2. Build the remaining Admin CRUD interfaces.
> 1. `/admin/menu`: Build forms to Create, Read, Update, and Delete digital menu items (FR-11).
> 2. `/admin/waitlist`: Build a UI to view the current waitlist queue. Add buttons allowing admins to manually prioritize (bump up) a VIP customer or remove someone from the queue (FR-12)."

- [ ] Build Admin forms to Create, Read, Update, and Delete digital menu items (FR-11).
- [ ] Updates will instantly reflect on the Customer Portal.

### Subtask 6.4: Manual Waitlist Control [QDR-80]

- [ ] Build Admin UI to view the current waitlist.
- [ ] Add controls to manually bump VIPs to the top of the queue or remove users.
