/**
 * database.types.ts
 * ------------------
 * TypeScript Type Definitions for the Supabase Database Schema
 *
 * Purpose:
 *   Provides compile-time type safety for all database interactions.
 *   These types mirror the PostgreSQL schema exactly and are used
 *   by the service layer (Repository Pattern) to ensure type-safe
 *   queries and responses.
 *
 * Naming Convention:
 *   - Type aliases for enums: PascalCase (e.g., TableStatus)
 *   - Row interfaces: PascalCase + "Row" suffix (e.g., UserRow)
 *   - Insert types: PascalCase + "Insert" suffix (e.g., UserInsert)
 *   - Update types: PascalCase + "Update" suffix (e.g., UserUpdate)
 *
 * Principle: Single Source of Truth -- if the DB schema changes,
 *   update this file and TypeScript will flag all affected code.
 */

// ============================================================
// 1. Enum Types (mirrors PostgreSQL enums)
// ============================================================

/**
 * Table status for Admin Floor Plan color-coding (FR-7).
 * Green = available, Yellow = reserved, Red = occupied, Grey = dirty.
 */
export type TableStatus = 'available' | 'reserved' | 'occupied' | 'dirty';

/**
 * Reservation lifecycle state machine:
 * pending_payment -> confirmed -> seated -> completed
 *                                        \-> no_show
 *                  \-> cancelled
 */
export type ReservationStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'seated'
  | 'completed'
  | 'no_show'
  | 'cancelled';

/**
 * Role-Based Access Control (SEC-1).
 * Determines RLS policy access level.
 */
export type UserRole = 'customer' | 'admin';

/**
 * Waitlist entry lifecycle.
 * waiting -> offered -> accepted | expired
 *                    \-> cancelled
 */
export type WaitlistStatus =
  | 'waiting'
  | 'offered'
  | 'accepted'
  | 'expired'
  | 'cancelled';

/**
 * Menu item categories for the digital menu.
 */
export type MenuCategory =
  | 'starters'
  | 'mains'
  | 'desserts'
  | 'sides'
  | 'beverages';

// ============================================================
// 2. Row Types (what you GET from the database)
// ============================================================

/** Represents a row from the public.users table. */
export interface UserRow {
  id: string;                    // UUID, references auth.users
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  consent_given: boolean;        // RA 10173 (LEG-1)
  created_at: string;            // ISO 8601 UTC string
  updated_at: string;            // ISO 8601 UTC string
}

/** Represents a row from the public.customers table. */
export interface CustomerRow {
  id: string;                    // UUID
  user_id: string;               // FK -> users.id
  dietary_restrictions: string | null;
  allergies: string | null;
  vip_status: boolean;
  total_visits: number;
  total_no_shows: number;
  staff_notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Represents a row from the public.tables table. */
export interface TableRow {
  id: string;                    // UUID
  table_number: number;
  capacity: number;
  status: TableStatus;
  position_x: number;            // Floor plan grid X coordinate
  position_y: number;            // Floor plan grid Y coordinate
  is_combinable: boolean;
  adjacent_table_ids: string[];  // UUID array for combination logic (FR-4)
  created_at: string;
  updated_at: string;
}

/** Represents a row from the public.menu table. */
export interface MenuRow {
  id: string;                    // UUID
  name: string;
  description: string | null;
  price: number;                 // DECIMAL(10,2) returned as number
  category: MenuCategory;
  image_url: string | null;
  is_available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** Represents a row from the public.reservations table. */
export interface ReservationRow {
  id: string;                    // UUID
  customer_id: string;           // FK -> customers.id
  reservation_date: string;      // DATE as ISO string (YYYY-MM-DD)
  start_time: string;            // TIMESTAMPTZ as ISO 8601 UTC string
  end_time: string;              // TIMESTAMPTZ as ISO 8601 UTC string
  party_size: number;            // 1-12 (FR-4 cap)
  status: ReservationStatus;
  special_requests: string | null;
  deposit_amount: number;        // DECIMAL(10,2) returned as number
  payment_token: string | null;  // Simulated token only (LEG-2, no raw PANs)
  locked_until: string | null;   // TIMESTAMPTZ for 5-min checkout timeout (PR-2)
  created_by: string | null;     // FK -> users.id (admin attribution for walk-ins)
  created_at: string;
  updated_at: string;
}

/** Represents a row from the public.reservation_tables junction table. */
export interface ReservationTableRow {
  id: string;                    // UUID
  reservation_id: string;        // FK -> reservations.id
  table_id: string;              // FK -> tables.id
}

/** Represents a row from the public.waitlist table. */
export interface WaitlistRow {
  id: string;                    // UUID
  customer_id: string;           // FK -> customers.id
  desired_date: string;          // DATE as ISO string
  desired_time: string;          // TIMESTAMPTZ as ISO 8601 UTC string
  party_size: number;            // 1-12
  position: number;              // Queue position (lower = higher priority)
  status: WaitlistStatus;
  offered_at: string | null;     // When the waitlist offer was sent
  expires_at: string | null;     // 10-minute acceptance window (FR-5)
  created_at: string;
}

/** Represents a row from the public.blocked_dates table. */
export interface BlockedDateRow {
  id: string;                    // UUID
  blocked_date: string;          // DATE as ISO string (YYYY-MM-DD)
  reason: string | null;
  created_by: string | null;     // FK -> users.id
  created_at: string;
}

// ============================================================
// 3. Insert Types (what you SEND to create a new row)
// ============================================================
// Omit auto-generated fields (id, created_at, updated_at)

/** Fields required to insert a new user (handled by auth trigger). */
export interface UserInsert {
  id: string;                    // Must match auth.users UUID
  email: string;
  full_name: string;
  phone?: string;
  role?: UserRole;               // Defaults to 'customer'
  consent_given: boolean;        // Required for RA 10173
}

/** Fields required to insert a new reservation. */
export interface ReservationInsert {
  customer_id: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  party_size: number;
  status?: ReservationStatus;    // Defaults to 'pending_payment'
  special_requests?: string;
  deposit_amount?: number;
  payment_token?: string;
  locked_until?: string;
  created_by?: string;
}

/** Fields required to join the waitlist. */
export interface WaitlistInsert {
  customer_id: string;
  desired_date: string;
  desired_time: string;
  party_size: number;
  position?: number;
}

/** Fields required to add a menu item. */
export interface MenuInsert {
  name: string;
  description?: string;
  price: number;
  category: MenuCategory;
  image_url?: string;
  is_available?: boolean;
  sort_order?: number;
}

/** Fields required to block a date. */
export interface BlockedDateInsert {
  blocked_date: string;
  reason?: string;
  created_by?: string;
}

// ============================================================
// 4. Update Types (Partial -- only fields being changed)
// ============================================================

/** Fields that can be updated on a user profile. */
export type UserUpdate = Partial<Pick<UserRow,
  'full_name' | 'phone' | 'role' | 'consent_given'
>>;

/** Fields that can be updated on a customer profile. */
export type CustomerUpdate = Partial<Pick<CustomerRow,
  'dietary_restrictions' | 'allergies' | 'vip_status' | 'staff_notes'
>>;

/** Fields that can be updated on a table. */
export type TableUpdate = Partial<Pick<TableRow,
  'capacity' | 'status' | 'position_x' | 'position_y' |
  'is_combinable' | 'adjacent_table_ids'
>>;

/** Fields that can be updated on a reservation. */
export type ReservationUpdate = Partial<Pick<ReservationRow,
  'status' | 'special_requests' | 'deposit_amount' |
  'payment_token' | 'locked_until'
>>;

/** Fields that can be updated on a waitlist entry. */
export type WaitlistUpdate = Partial<Pick<WaitlistRow,
  'position' | 'status' | 'offered_at' | 'expires_at'
>>;

/** Fields that can be updated on a menu item. */
export type MenuUpdate = Partial<Pick<MenuRow,
  'name' | 'description' | 'price' | 'category' |
  'image_url' | 'is_available' | 'sort_order'
>>;
