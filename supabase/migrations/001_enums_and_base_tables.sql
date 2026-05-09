-- ============================================================
-- MIGRATION 1: Enums & Base Tables (3NF)
-- Gordon Ramsay Restaurant Reservation System
-- ============================================================
-- Run this FIRST in: Supabase Dashboard -> SQL Editor -> New Query
-- ============================================================

-- ------------------------------------------------------------
-- 1. Custom Enum Types
-- ------------------------------------------------------------

-- Table status for the Admin Floor Plan color-coding (FR-7):
-- Green = available, Yellow = reserved, Red = occupied, Grey = dirty
CREATE TYPE public.table_status AS ENUM (
    'available',
    'reserved',
    'occupied',
    'dirty'
);

-- Reservation lifecycle state machine:
-- pending_payment -> confirmed -> seated -> completed
--                                       \-> no_show
--                 \-> cancelled
CREATE TYPE public.reservation_status AS ENUM (
    'pending_payment',
    'confirmed',
    'seated',
    'completed',
    'no_show',
    'cancelled'
);

-- Role-Based Access Control (SEC-1):
-- Distinguishes Customer and Restaurant Admin for RLS policies.
CREATE TYPE public.user_role AS ENUM (
    'customer',
    'admin'
);

-- Waitlist entry lifecycle
CREATE TYPE public.waitlist_status AS ENUM (
    'waiting',
    'offered',
    'accepted',
    'expired',
    'cancelled'
);

-- Menu item categories
CREATE TYPE public.menu_category AS ENUM (
    'starters',
    'mains',
    'desserts',
    'sides',
    'beverages'
);

-- ------------------------------------------------------------
-- 2. Base Tables (3NF -- No partial or transitive dependencies)
-- ------------------------------------------------------------

-- Users table: Linked to Supabase auth.users via UUID.
-- This is the central identity table; role determines RLS access.
CREATE TABLE public.users (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email           TEXT NOT NULL UNIQUE,
    full_name       TEXT NOT NULL,
    phone           TEXT,
    role            public.user_role NOT NULL DEFAULT 'customer',
    consent_given   BOOLEAN NOT NULL DEFAULT false,  -- RA 10173 (LEG-1)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),  -- DB-3: UTC storage
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()   -- DB-3: UTC storage
);

-- Add a comment explaining the table purpose
COMMENT ON TABLE public.users IS 'Central user identity table linked to auth.users. Role determines RLS access level.';
COMMENT ON COLUMN public.users.consent_given IS 'RA 10173 Data Privacy Act consent. Registration MUST NOT proceed without this set to true.';

-- Customers table: 3NF separation of customer-specific profile data.
-- Extends users with dietary info, CRM metrics, and staff notes.
CREATE TABLE public.customers (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    dietary_restrictions     TEXT,
    allergies               TEXT,
    vip_status              BOOLEAN NOT NULL DEFAULT false,
    total_visits            INTEGER NOT NULL DEFAULT 0,
    total_no_shows          INTEGER NOT NULL DEFAULT 0,
    staff_notes             TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.customers IS 'Customer-specific profile data (3NF). Extends users table with dietary info and CRM metrics.';
COMMENT ON COLUMN public.customers.total_visits IS 'Aggregated count of completed reservations. Updated via trigger or application logic.';
COMMENT ON COLUMN public.customers.total_no_shows IS 'Aggregated count of no-show reservations. Updated via trigger or application logic.';

-- Tables table: Represents physical restaurant tables for the floor plan.
-- position_x/y define placement on the Admin Floor Plan grid (FR-7).
-- adjacent_table_ids supports automatic table combination logic (FR-4).
CREATE TABLE public.tables (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_number        INTEGER NOT NULL UNIQUE,
    capacity            INTEGER NOT NULL CHECK (capacity > 0),
    status              public.table_status NOT NULL DEFAULT 'available',
    position_x          INTEGER NOT NULL DEFAULT 0,  -- Grid X coordinate for floor plan
    position_y          INTEGER NOT NULL DEFAULT 0,  -- Grid Y coordinate for floor plan
    is_combinable       BOOLEAN NOT NULL DEFAULT true,
    adjacent_table_ids  UUID[] DEFAULT '{}',  -- Array of adjacent table UUIDs for combination
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tables IS 'Physical restaurant tables. Status drives the Admin Floor Plan color-coding. Position defines grid placement.';
COMMENT ON COLUMN public.tables.adjacent_table_ids IS 'Array of UUIDs of physically adjacent tables. Used by the table combination algorithm (FR-4, max 12 pax).';

-- Menu table: Digital menu items displayed to customers and managed by admins.
CREATE TABLE public.menu (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    description     TEXT,
    price           DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    category        public.menu_category NOT NULL,
    image_url       TEXT,
    is_available    BOOLEAN NOT NULL DEFAULT true,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.menu IS 'Digital menu items. Read-only for customers, full CRUD for admins (FR-11).';

-- ------------------------------------------------------------
-- 3. Updated_at auto-update trigger function
-- ------------------------------------------------------------
-- Reusable trigger function: automatically sets updated_at to now()
-- on every UPDATE. Applied to all tables with an updated_at column.

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.handle_updated_at IS 'Reusable trigger function that auto-updates the updated_at column to current UTC timestamp on every row UPDATE.';

-- Apply the updated_at trigger to all base tables
CREATE TRIGGER set_updated_at_users
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_customers
    BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_tables
    BEFORE UPDATE ON public.tables
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_menu
    BEFORE UPDATE ON public.menu
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- END OF MIGRATION 1
-- ============================================================
