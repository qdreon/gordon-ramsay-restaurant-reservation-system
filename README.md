# Gordon Ramsay Restaurant Reservation System (GRRRS)

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)

**Qdreon | CPE 2201 Software Design and Development**

GRRRS is a web-based, single-tenant restaurant reservation system designed to replace manual reservation logbooks with a real-time customer booking portal and restaurant admin dashboard.

The system supports customer reservation booking, simulated deposit checkout, virtual waitlist handling, admin table management, guest CRM, menu management, system health monitoring, and QA-backed verification reports.

---

## Demo Access

| Item                    | Link / Location                                                         |
| ----------------------- | ----------------------------------------------------------------------- |
| Google Drive Demo Video | `https://drive.google.com/drive/folders/1yTfuV7mE2hxFuxoOyQJBCsvCg38k4bzc?usp=sharing`                                    |
| GitHub Repository       | `https://github.com/Qdreon/Gordon-Ramsay-Restaurant-Reservation-System` |
| Online Link           | `https://gordon-ramsay-restaurant-reservatio.vercel.app/`                                                            |
| Local Demo URL          | `http://localhost:3000`                                                 |
| Playwright Report       | `playwright-report/index.html`                                          |
| Lighthouse Summary      | `tests/lighthouse/reports/summary.json`                                 |
| Documentation           | `Documents/`                                                            |

---

## Final Activity Timeline

| Section | Timeline | Status | Notes |
|---|---:|---|---|
| Section 1. Planning & Analysis | Feb 2 – May 5, 2026 | Done | Stakeholder requirements, MVP negotiation, SRS, progress report, and SPM-PC |
| Section 2. System Design | Mar 4 – Apr 22, 2026 | Done | COMET architecture, UML diagrams, PostgreSQL schema, UI/UX mockups, and SWDD |
| Section 3. Development | Apr 22 – May 12, 2026 | Done | Coding work completed before the official May 12 coding freeze |
| Section 4. Testing & QA | May 1 – May 12, 2026 | Done | Functional, structural, latency, concurrency, offline, RBAC, and compliance testing |
| Section 5. Submission / Handoff | May 13 – May 14, 2026 | Done | Documentation, evidence sync, Canvas submission, GitHub links, handoff notes |
| Section 6. Presentation & System Demo Prep | May 15 – May 19, 2026 | Done | 20-minute project presentation and 20-minute system demo preparation |
| Final Examination | May 20 – May 21, 2026 | Done | Final examination milestone only |

---

## System Scope

```mermaid
flowchart TB
    GRRRS["GRRRS<br/>Single-Tenant Restaurant Reservation System"]

    GRRRS --> CustomerPortal["Customer Portal"]
    GRRRS --> AdminSystem["Restaurant Management System<br/>(Admin Dashboard)"]
    GRRRS --> Backend["Supabase Backend"]
    GRRRS --> External["External Services"]

    CustomerPortal --> C1["Account Registration / Login"]
    CustomerPortal --> C2["Real-Time Availability Search"]
    CustomerPortal --> C3["View-Only Digital Menu"]
    CustomerPortal --> C4["Book Table + Simulated Deposit"]
    CustomerPortal --> C5["Join Virtual Waitlist"]
    CustomerPortal --> C6["Cancel Reservation"]
    CustomerPortal --> C7["Manage Profile / Delete Account"]

    AdminSystem --> A1["Static Interactive Floor Plan"]
    AdminSystem --> A2["Reservation Calendar / List"]
    AdminSystem --> A3["Walk-In / Phone Reservation Entry"]
    AdminSystem --> A4["Guest CRM"]
    AdminSystem --> A5["Menu Management"]
    AdminSystem --> A6["Manual Waitlist Control"]
    AdminSystem --> A7["System Health Monitoring"]

    Backend --> B1["Supabase Auth"]
    Backend --> B2["PostgreSQL Database"]
    Backend --> B3["Row-Level Security / RBAC"]
    Backend --> B4["Row-Locking / RPCs"]
    Backend --> B5["Realtime Subscriptions"]
    Backend --> B6["Triggers / Scheduled Jobs"]

    External --> E1["Mailtrap / SMTP Email"]
    External --> E2["Simulated Payment Gateway"]
```

---

## SWDD Architecture: Three-Tier Client-BaaS Design

```mermaid
flowchart LR
    subgraph Tier1["Client / Presentation Tier"]
        CustomerUI["Customer Portal<br/>Next.js + React"]
        AdminUI["Admin Dashboard<br/>Next.js + React"]
    end

    subgraph Tier2["Data & Logic Tier<br/>Supabase BaaS"]
        Auth["Supabase Auth"]
        RLS["RLS / RBAC"]
        DB[("PostgreSQL Database")]
        RPC["RPC Functions<br/>Availability + Locking"]
        Realtime["Realtime WebSocket<br/>Subscriptions"]
        Triggers["Database Triggers<br/>Waitlist + Teardown"]
        Cron["Scheduled Jobs<br/>No-Show / Timeout"]
    end

    subgraph Tier3["External Services Tier"]
        Payment["Simulated Payment Gateway"]
        Email["SMTP / Mailtrap Email"]
    end

    CustomerUI --> Auth
    AdminUI --> Auth

    CustomerUI --> RPC
    AdminUI --> DB

    Auth --> RLS
    RLS --> DB
    RPC --> DB
    DB --> Realtime
    DB --> Triggers
    DB --> Cron

    Realtime --> AdminUI
    Triggers --> Email
    CustomerUI --> Payment
    Payment --> DB
    Email --> CustomerUI
```

---

## Main Use Cases

```mermaid
flowchart LR
    Customer["Customer / Diner"]
    Admin["Restaurant Administrator"]
    Supabase["Supabase Backend"]
    Email["SMTP / Mailtrap Email Server"]
    Payment["Simulated Payment Gateway"]

    subgraph System["Gordon Ramsay Restaurant Reservation System"]
        U1["U1: Book Table & Pay Deposit"]
        U2["U2: Update Table Status via Static Grid"]
        U3["U3: Join Virtual Waitlist"]
        U4["U4: Manage Account & Login"]
        U5["U5: Manage Reservations & Shifts"]
        U6["U6: View Guest CRM Data"]
        U7["U7: Cancel Reservation"]
        U8["Receive Automated Notifications"]
        U9["Manage Menu Items"]
        U10["Monitor System Health"]
    end

    Customer --> U1
    Customer --> U3
    Customer --> U4
    Customer --> U7
    Customer --> U8

    Admin --> U2
    Admin --> U5
    Admin --> U6
    Admin --> U9
    Admin --> U10

    U1 --> Payment
    U1 --> Supabase
    U7 --> Supabase
    U3 --> Supabase
    U2 --> Supabase
    U5 --> Supabase
    U6 --> Supabase
    U9 --> Supabase
    U10 --> Supabase

    Supabase --> Email
    Email --> U8

    U7 -. "extends" .-> U1
    U1 -. "includes" .-> U8
```

---

## Booking Engine Flow

```mermaid
sequenceDiagram
    actor Customer
    participant Portal as Customer Portal
    participant Auth as Supabase Auth
    participant Booking as Booking Engine / RPC
    participant DB as PostgreSQL
    participant Payment as Simulated Payment
    participant Email as SMTP / Mailtrap

    Customer->>Portal: Enter date, time, party size
    Portal->>Booking: Request availability
    Booking->>DB: Query tables and existing reservations
    DB-->>Booking: Available tables + adjacency data

    alt Party size exceeds single table
        Booking->>Booking: Calculate adjacent table combination
        Booking-->>Portal: Return combined table option
    else Single table available
        Booking-->>Portal: Return single table option
    end

    Customer->>Portal: Select table option
    Portal->>Auth: Validate customer session
    Auth-->>Portal: Session valid

    Portal->>Booking: Create pending reservation lock
    Booking->>DB: Apply row-lock / locked_until

    alt Lock acquired
        DB-->>Booking: Lock success
        Booking-->>Portal: Show checkout modal
        Customer->>Payment: Submit simulated deposit
        Payment-->>Portal: Payment token returned
        Portal->>Booking: Confirm reservation
        Booking->>DB: Commit reservation as confirmed
        DB->>Email: Trigger confirmation payload with .ics
        Email-->>Customer: Booking confirmation email
    else Lock conflict
        Booking-->>Portal: Table already reserved error
    end

    alt Checkout timeout after 5 minutes
        Booking->>DB: Release expired lock
        DB-->>Portal: Table returns to available pool
    end
```

---

## Waitlist and Cancellation Automation

```mermaid
flowchart TD
    A["Customer Cancels Reservation"] --> B["Reservation Status = Cancelled"]
    B --> C["Release Table / Table Combination"]
    C --> D["Trigger Waitlist Protocol"]

    D --> E{Within 60 minutes<br/>before closing?}
    E -->|Yes| F["Disable Automated Offer<br/>Leave for Manual Walk-In Handling"]
    E -->|No| G["Find Next Waitlist Customer"]

    G --> H{Waitlist Entry Exists?}
    H -->|No| I["End: Table Remains Available"]
    H -->|Yes| J["Mark Entry as Offered"]
    J --> K["Send Waitlist Offer Email"]
    K --> L["Start 10-Minute Acceptance Window"]

    L --> M{Customer Accepts?}
    M -->|Yes| N["Confirm Reservation"]
    N --> O["Send Confirmation Email"]
    M -->|No| P["Revoke Offer"]
    P --> G
```

---

## Admin Floor Plan State Flow

```mermaid
stateDiagram-v2
    [*] --> Available

    Available --> Reserved: Customer booking confirmed
    Reserved --> Occupied: Admin seats customer
    Occupied --> Dirty: Admin marks table dirty
    Dirty --> Available: Table cleaned

    Reserved --> NoShow: 15-minute no-show rule
    Reserved --> Cancelled: Customer/Admin cancellation
    Cancelled --> Available: Table released

    Dirty --> Completed: Associated reservation auto-completed
    Completed --> Available: Table released

    note right of Available
        Green
    end note

    note right of Reserved
        Yellow / Amber
    end note

    note right of Occupied
        Red
    end note

    note right of Dirty
        Grey
    end note
```

---

## Data Design Overview

```mermaid
erDiagram
    USERS ||--|| CUSTOMERS : "profile"
    CUSTOMERS ||--o{ RESERVATIONS : "makes"
    RESERVATIONS ||--o{ RESERVATION_TABLES : "links"
    TABLES ||--o{ RESERVATION_TABLES : "assigned"
    CUSTOMERS ||--o{ WAITLIST : "joins"
    BLOCKED_DATES ||--o{ RESERVATIONS : "prevents booking"

    USERS {
        uuid id PK
        string email
        enum role
    }

    CUSTOMERS {
        uuid id PK
        uuid user_id FK
        string name
        string contact_info
        string dietary_preferences
        string allergy_notes
        boolean vip_status
        int total_visits
        int total_no_shows
    }

    RESERVATIONS {
        uuid id PK
        uuid customer_id FK
        timestamptz reservation_time
        int party_size
        enum status
        timestamptz locked_until
        string payment_token
    }

    TABLES {
        uuid id PK
        string label
        int capacity
        enum status
        string adjacent_table_ids
    }

    RESERVATION_TABLES {
        uuid reservation_id FK
        uuid table_id FK
    }

    WAITLIST {
        uuid id PK
        uuid customer_id FK
        timestamptz requested_time
        enum status
        timestamptz offered_at
        timestamptz expires_at
    }

    MENU {
        uuid id PK
        string name
        string description
        decimal price
        string category
    }

    BLOCKED_DATES {
        uuid id PK
        date date
        string reason
    }
```

---

## SPM Risk-to-Control Mapping

```mermaid
flowchart LR
    subgraph Risks["SPM-PC Risks"]
        R1["Double-booking conflict"]
        R2["Realtime desynchronization"]
        R3["Internet outage"]
        R4["Payment data exposure"]
        R5["Data loss"]
        R6["Scope creep"]
        R7["Waitlist automation conflict"]
        R8["Unauthorized admin access"]
    end

    subgraph Controls["System Controls"]
        C1["PostgreSQL row-locking"]
        C2["Realtime subscriptions"]
        C3["Offline warning + disabled edits"]
        C4["Simulated tokenized checkout"]
        C5["Backup / pg_dump fallback"]
        C6["Single-branch MVP scope"]
        C7["10-minute offer window + 60-minute cutoff"]
        C8["Supabase Auth + RLS/RBAC"]
    end

    R1 --> C1
    R2 --> C2
    R3 --> C3
    R4 --> C4
    R5 --> C5
    R6 --> C6
    R7 --> C7
    R8 --> C8
```

---

## SRS / SWDD / SPM Traceability

```mermaid
flowchart TD
    SRS["SRS<br/>What the system must do"]
    SWDD["SWDD<br/>How the system is designed"]
    SPM["SPM Project Charter<br/>How the project is planned and controlled"]

    SRS --> FR["FR-1 to FR-13<br/>Functional Requirements"]
    SRS --> NFR["PR / SAF / SEC / DB / LEG<br/>Non-Functional Requirements"]

    SWDD --> Arch["Three-Tier Client-BaaS Architecture"]
    SWDD --> Subsystems["Booking Engine<br/>Visual Table Management<br/>Notification & Waitlist<br/>CRM & Menu Management"]

    SPM --> Scope["Single-branch MVP scope"]
    SPM --> Risks["Risk and quality controls"]
    SPM --> Deliverables["Customer Portal<br/>Admin Dashboard<br/>Backend Services<br/>External Integrations<br/>Compliance Features"]

    FR --> Code["GitHub Codebase"]
    NFR --> QA["QA Evidence"]
    Arch --> Code
    Subsystems --> Code
    Scope --> Jira["Jira Timeline"]
    Risks --> QA
    Deliverables --> Submission["Canvas / Final Demo Package"]

    Code --> Demo["Application Demo"]
    QA --> Demo
    Jira --> Demo
    Submission --> Demo
```

---

## Demonstrated Endpoints

| Area | Endpoint | Purpose |
|---|---|---|
| Customer Home | `/` | Availability search and menu preview |
| Login | `/auth/login` | Customer/admin authentication |
| Register | `/auth/register` | Account creation and consent validation |
| Customer Dashboard | `/customer/dashboard` | Reservation output and account management |
| Admin Dashboard | `/admin/dashboard` | Admin overview and system health |
| Admin Floor Plan | `/admin/floorplan` | Real-time table status grid |
| Admin Reservations | `/admin/reservations` | Calendar, blocked dates, operating-hours validation |
| Admin CRM | `/admin/crm` | Guest history, allergies, VIP, no-shows |
| Admin Menu | `/admin/menu` | Menu CRUD |
| Admin Waitlist | `/admin/waitlist` | Queue management and prioritization |
| Health API | `/api/health` | Database, email, and payment checks |
| Reservation Lock API | `/api/reservations/lock` | Booking lock and conflict handling |
| Waitlist Capacity API | `/api/waitlist/capacity` | Waitlist limit check |
| Waitlist Join API | `/api/waitlist/join` | Waitlist entry creation |
| Notification API | `/api/notifications/send` | Booking and waitlist email payloads |

---

## Demo Coverage

| Demo Requirement | Shown Through |
|---|---|
| Application is accessible and functional | Local or deployed app opens and modules are navigable |
| Login / Authentication | Customer and admin login, protected admin routes |
| Major system features | Booking, waitlist, floor plan, CRM, menu, reservation calendar, system health |
| Input and output processes | Search inputs produce availability, reservation, waitlist, or validation outputs |
| Reports or analytics | Lighthouse, Playwright, concurrency, RBAC, system health, traceability matrix |
| Error handling and validations | Consent, operating hours, no availability, protected routes, tokenized payment, offline warning |

---

## Reports and Analytics

Instead of a business analytics dashboard, the MVP uses **System Verification Reports and Performance Analytics**.

```mermaid
flowchart TD
    Reports["System Verification Reports<br/>and Performance Analytics"]

    Reports --> PR1["PR-1<br/>UI Load Performance"]
    Reports --> PR2["PR-2<br/>Concurrency Resolution"]
    Reports --> PR3["PR-3<br/>Email Dispatch Latency"]
    Reports --> SEC1["SEC-1<br/>RBAC / Protected Routes"]
    Reports --> SAF2["SAF-2<br/>Offline Failsafe"]
    Reports --> Trace["Traceability Matrix"]

    PR1 --> L1["Lighthouse:<br/>Customer Home LCP 1496 ms"]
    PR1 --> L2["Lighthouse:<br/>Admin Dashboard LCP 1889 ms"]

    PR2 --> C1["Playwright / RPC Test:<br/>One success, one conflict"]
    PR3 --> E1["Mailtrap Evidence:<br/>Booking / waitlist notification"]
    SEC1 --> S1["Admin redirect:<br/>/admin/dashboard to /admin/login"]
    SAF2 --> O1["Offline warning<br/>and disabled edits"]
    Trace --> T1["SRS ↔ SWDD ↔ SPM-PC ↔ Code ↔ QA"]
```

### Lighthouse Performance Results

| Page | Endpoint | Score | LCP | FCP | TBT | CLS | TTI | Speed Index | Result |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| Customer Home | `/` | 79 | 1496 ms | 1046 ms | 963 ms | 0.001 | 7538 ms | 2202 ms | PASS |
| Admin Dashboard | `/admin/dashboard` | 79 | 1889 ms | 1191 ms | 895 ms | 0.000 | 7789 ms | 1543 ms | PASS |

### Endpoint Protection Observation

| Requested URL | Final URL | Meaning |
|---|---|---|
| `/admin/dashboard` | `/admin/login?next=%2Fadmin%2Fdashboard` | Unauthenticated admin access is redirected to login |

### Re-run Needed

| Page | Endpoint | Result | Reason |
|---|---|---|---|
| Login Page | `/auth/login` | Re-run needed | Lighthouse returned `CHROME_INTERSTITIAL_ERROR` during one audit run |

---

## Validation and Error Handling

```mermaid
flowchart TD
    A[Validation Scenarios] --> B[Consent Required]
    A --> C[Invalid Login Rejected]
    A --> D[Out-of-Hours Booking Rejected]
    A --> E[No Availability Shows Waitlist]
    A --> F[Booking Conflict Returns Error]
    A --> G[Raw Card Data Not Stored]
    A --> H[Unauthorized Admin Access Redirected]
    A --> I[Offline Warning Displayed]
```

| Validation | Result |
|---|---|
| Consent checkbox | Registration blocked until consent is checked |
| Invalid login | User remains unauthenticated |
| Out-of-hours reservation | Error message displayed |
| No availability | Waitlist option displayed |
| Booking conflict | One reservation succeeds, conflicting request fails |
| Payment data | Tokenized simulated payment only |
| Admin route protection | Non-authenticated users redirected to login |
| Offline state | Admin floor plan shows warning |

---

## Development and QA Timeline

```mermaid
gantt
    title GRRRS Deadline-Compliant Timeline
    dateFormat  YYYY-MM-DD

    section Planning and Analysis
    Stakeholder requirements and MVP negotiation       :done, 2026-02-02, 2026-03-03
    SRS v1.4 and progress report                       :done, 2026-03-01, 2026-04-30
    SPM Project Charter                                :done, 2026-04-21, 2026-05-05

    section System Design
    COMET Architecture and UML                         :done, 2026-03-04, 2026-03-27
    PostgreSQL Schema and UI/UX Mockups                :done, 2026-03-28, 2026-04-16
    SWDD Finalization                                  :done, 2026-03-16, 2026-04-22

    section Development - Code Freeze by May 12
    Supabase Auth and Data Layer                       :done, 2026-04-29, 2026-05-03
    Customer Portal and Account Management             :done, 2026-05-09, 2026-05-12
    Booking Engine and Availability                    :done, 2026-05-04, 2026-05-12
    Admin Floor Plan and Reservation Calendar          :done, 2026-05-07, 2026-05-12
    Waitlist, Email, CRM, Menu                         :done, 2026-05-08, 2026-05-12

    section Testing and QA - Testing Freeze by May 12
    Functional and Structural Testing                  :done, 2026-05-01, 2026-05-12
    UI Latency and Email Dispatch Testing              :done, 2026-05-06, 2026-05-12
    Real-Time Concurrency Testing                      :done, 2026-05-06, 2026-05-12
    Offline Mode, RBAC, Security, Compliance           :done, 2026-05-07, 2026-05-12

    section Submission and Handoff
    Production Hosting, Backup Fallback, Handoff Notes :done, 2026-05-13, 2026-05-14
    User Manual and Submission Documents               :done, 2026-05-13, 2026-05-14
    Traceability Matrix and QA Evidence                :done, 2026-05-13, 2026-05-14
    Canvas Submission Package                          :done, 2026-05-14, 2026-05-14
    Deferred Deployment-Time Items                     :done, 2026-05-14, 2026-05-14

    section Presentation and System Demo
    Presentation and Demo Preparation                  :done, 2026-05-15, 2026-05-19
    System Demo Dry Run                                :done, 2026-05-16, 2026-05-18
    Final Examination Milestone                        :done, 2026-05-20, 2026-05-21
```

---

## Jira-Aligned Phase Summary

| Jira Section | Timeline | Status |
|---|---:|---|
| QDR-23 Section 1. Planning & Analysis | Feb 2 – May 5 | Done |
| QDR-29 Section 2. System Design | Mar 4 – Apr 22 | Done |
| QDR-35 Section 3. Development — Code Freeze by May 12 | Apr 22 – May 12 | Done |
| QDR-46 Section 4. Testing and QA — Testing Freeze by May 12 | May 1 – May 12 | Done |
| QDR-51 Section 5. Submission, Deployment Evidence, and Handoff | May 13 – May 14 | Done |
| Section 6. Presentation and System Demo Preparation | May 15 – May 19 | Done |
| Final Examination Readiness Milestone | May 20 – May 21 | Done |

---

## Playwright Live Demo

Recommended command:

```bash
npx playwright test tests/e2e/grrrs-live-demo.spec.ts --headed --project=chromium --workers=1
```

For screen recording with slower actions:

```bash
npx playwright test tests/e2e/grrrs-live-demo.spec.ts --headed --project=chromium --workers=1 --slow-mo=500
```

Open the report:

```bash
npx playwright show-report
```

---

## Demo Video Structure

```mermaid
flowchart TD
    A[1. Project Overview] --> B[2. Customer Login]
    B --> C[3. Availability Search]
    C --> D[4. Booking and Checkout]
    D --> E[5. Waitlist]
    E --> F[6. Admin Login]
    F --> G[7. Floor Plan]
    G --> H[8. Reservation Calendar]
    H --> I[9. CRM]
    I --> J[10. Menu Management]
    J --> K[11. Admin Waitlist]
    K --> L[12. System Health]
    L --> M[13. Validations]
    M --> N[14. Reports and Analytics]
```

---

## Final Demo Claim

GRRRS demonstrates a complete requirements-driven MVP: customer booking, admin operations, real-time table management, waitlist automation, security controls, validation handling, and QA-backed performance evidence.
