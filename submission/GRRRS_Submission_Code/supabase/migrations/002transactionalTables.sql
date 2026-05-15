-- ============================================================
-- MIGRATION 2: Transactional Tables & Indexes
-- Gordon Ramsay Restaurant Reservation System
-- ============================================================
-- Run this SECOND in: Supabase Dashboard -> SQL Editor -> New Query
-- Prerequisite: Migration 1 (Enums & Base Tables) must be run first.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Transactional Tables
-- ------------------------------------------------------------

-- Reservations table: Core booking records.
-- Links to customers (who booked) and tracks the full lifecycle
-- from pending_payment -> confirmed -> seated -> completed.
CREATE TABLE public.reservations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id         UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    reservation_date    DATE NOT NULL,
    start_time          TIMESTAMPTZ NOT NULL,           -- DB-3: UTC storage
    end_time            TIMESTAMPTZ NOT NULL,           -- DB-3: UTC storage
    party_size          INTEGER NOT NULL CHECK (party_size > 0 AND party_size <= 12),  -- FR-4: Max 12 pax
    status              public.reservation_status NOT NULL DEFAULT 'pending_payment',
    special_requests    TEXT,
    deposit_amount      DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (deposit_amount >= 0),
    payment_token       TEXT,                           -- LEG-2/SEC-3: Simulated token ONLY, no raw PANs
    locked_until        TIMESTAMPTZ,                    -- 5-minute checkout timeout (PR-2)
    created_by          UUID REFERENCES public.users(id) ON DELETE SET NULL,  -- Admin attribution for walk-ins
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.reservations IS 'Core booking records. Tracks the full reservation lifecycle with concurrency support via locked_until.';
COMMENT ON COLUMN public.reservations.party_size IS 'Number of guests. Hard-capped at 12 pax even with table combination (FR-4).';
COMMENT ON COLUMN public.reservations.payment_token IS 'Simulated payment token. NEVER stores raw credit card PANs (PCI-DSS / LEG-2).';
COMMENT ON COLUMN public.reservations.locked_until IS 'UTC timestamp for the 5-minute checkout timeout. Row-lock released if payment not confirmed before this time (PR-2).';
COMMENT ON COLUMN public.reservations.created_by IS 'References the admin user who created a walk-in or phone booking. NULL for online bookings.';

-- Reservation-Tables junction table: Many-to-many bridge (3NF).
-- Supports table combination: one reservation can span multiple tables.
CREATE TABLE public.reservation_tables (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id      UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
    table_id            UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
    CONSTRAINT uq_reservation_table UNIQUE (reservation_id, table_id)
);

COMMENT ON TABLE public.reservation_tables IS 'Junction table linking reservations to tables. Supports multi-table combination (FR-4, 3NF).';

-- Waitlist table: Virtual queue for when no tables are available.
-- Automated promotion logic triggers when a reservation is cancelled (FR-5).
CREATE TABLE public.waitlist (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    desired_date    DATE NOT NULL,
    desired_time    TIMESTAMPTZ NOT NULL,               -- DB-3: UTC storage
    party_size      INTEGER NOT NULL CHECK (party_size > 0 AND party_size <= 12),
    position        INTEGER NOT NULL DEFAULT 0,         -- Queue position (lower = higher priority)
    status          public.waitlist_status NOT NULL DEFAULT 'waiting',
    offered_at      TIMESTAMPTZ,                        -- When the offer was sent
    expires_at      TIMESTAMPTZ,                        -- 10-minute acceptance window (FR-5)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.waitlist IS 'Virtual waitlist queue. Entries auto-promoted when reservations are cancelled (FR-5).';
COMMENT ON COLUMN public.waitlist.position IS 'Queue position. Lower number = higher priority. VIP bumping handled via admin manual control.';
COMMENT ON COLUMN public.waitlist.expires_at IS '10-minute acceptance window after offer. If expired, system moves to next person (FR-5).';

-- Blocked Dates table: Admin can close the restaurant for holidays (FR-8).
-- Prevents online search results from returning availability on these dates.
CREATE TABLE public.blocked_dates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocked_date    DATE NOT NULL UNIQUE,
    reason          TEXT,
    created_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.blocked_dates IS 'Admin-managed blocked dates for holidays. Online availability search skips these dates (FR-8).';

-- ------------------------------------------------------------
-- 2. Apply updated_at triggers to transactional tables
-- ------------------------------------------------------------

CREATE TRIGGER set_updated_at_reservations
    BEFORE UPDATE ON public.reservations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------
-- 3. Performance Indexes
-- ------------------------------------------------------------

-- Reservations: Frequently queried by date, status, and customer
CREATE INDEX idx_reservations_date_status
    ON public.reservations (reservation_date, status);

CREATE INDEX idx_reservations_customer_id
    ON public.reservations (customer_id);

CREATE INDEX idx_reservations_locked_until
    ON public.reservations (locked_until)
    WHERE locked_until IS NOT NULL;

-- Reservation-Tables: Queried when checking table availability
CREATE INDEX idx_reservation_tables_table_id
    ON public.reservation_tables (table_id);

CREATE INDEX idx_reservation_tables_reservation_id
    ON public.reservation_tables (reservation_id);

-- Waitlist: Queried by date/time and status for auto-promotion
CREATE INDEX idx_waitlist_date_status
    ON public.waitlist (desired_date, status);

CREATE INDEX idx_waitlist_customer_id
    ON public.waitlist (customer_id);

-- Blocked Dates: Queried during availability search
CREATE INDEX idx_blocked_dates_date
    ON public.blocked_dates (blocked_date);

-- Tables: Queried by status for floor plan rendering
CREATE INDEX idx_tables_status
    ON public.tables (status);

-- ============================================================
-- END OF MIGRATION 2
-- ============================================================
