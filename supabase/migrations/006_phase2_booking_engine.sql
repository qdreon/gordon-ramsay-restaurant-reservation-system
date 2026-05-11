-- ============================================================
-- MIGRATION 6: Phase 2 Core Booking Engine RPCs
-- Gordon Ramsay Restaurant Reservation System
-- ============================================================
-- Provides:
--   1) Availability search with table combination logic (FR-4)
--   2) Concurrency-safe reservation lock with SELECT ... FOR UPDATE (PR-2)
--   3) Expired pending-payment release function (FR-3)
-- ============================================================

-- ------------------------------------------------------------
-- 1. Availability RPC: single-table + adjacent combinations
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.find_available_table_options(
  p_reservation_date DATE,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_party_size INTEGER
)
RETURNS TABLE (
  table_ids UUID[],
  table_numbers INTEGER[],
  total_capacity INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_party_size < 1 OR p_party_size > 12 THEN
    RAISE EXCEPTION 'Party size must be between 1 and 12.'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.blocked_dates
    WHERE blocked_date = p_reservation_date
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH available_tables AS (
    SELECT t.id, t.table_number, t.capacity, t.is_combinable, t.adjacent_table_ids
    FROM public.tables t
    WHERE t.status = 'available'
      AND NOT EXISTS (
        SELECT 1
        FROM public.reservation_tables rt
        JOIN public.reservations r ON r.id = rt.reservation_id
        WHERE rt.table_id = t.id
          AND r.status IN ('pending_payment', 'confirmed', 'seated')
          AND (
            r.status <> 'pending_payment'
            OR (r.locked_until IS NOT NULL AND r.locked_until > now())
          )
          AND NOT (r.end_time <= p_start_time OR r.start_time >= p_end_time)
      )
  ),
  singles AS (
    SELECT
      ARRAY[t.id]::UUID[] AS table_ids,
      ARRAY[t.table_number]::INTEGER[] AS table_numbers,
      t.capacity AS total_capacity
    FROM available_tables t
  ),
  pairs AS (
    SELECT
      ARRAY[a.id, b.id]::UUID[] AS table_ids,
      ARRAY[a.table_number, b.table_number]::INTEGER[] AS table_numbers,
      (a.capacity + b.capacity) AS total_capacity
    FROM available_tables a
    JOIN available_tables b
      ON (
        b.id = ANY(a.adjacent_table_ids)
        OR a.id = ANY(b.adjacent_table_ids)
      )
     AND a.id < b.id
    WHERE a.is_combinable = true
      AND b.is_combinable = true
  ),
  triples AS (
    SELECT
      ARRAY[a.id, b.id, c.id]::UUID[] AS table_ids,
      ARRAY[a.table_number, b.table_number, c.table_number]::INTEGER[] AS table_numbers,
      (a.capacity + b.capacity + c.capacity) AS total_capacity
    FROM available_tables a
    JOIN available_tables b
      ON (
        b.id = ANY(a.adjacent_table_ids)
        OR a.id = ANY(b.adjacent_table_ids)
      )
     AND a.id < b.id
    JOIN available_tables c
      ON (
        c.id = ANY(b.adjacent_table_ids)
        OR b.id = ANY(c.adjacent_table_ids)
      )
     AND b.id < c.id
    WHERE a.is_combinable = true
      AND b.is_combinable = true
      AND c.is_combinable = true
      AND c.id <> a.id
  ),
  options AS (
    SELECT * FROM singles
    UNION ALL
    SELECT * FROM pairs
    UNION ALL
    SELECT * FROM triples
  )
  SELECT o.table_ids, o.table_numbers, o.total_capacity
  FROM options o
  WHERE o.total_capacity >= p_party_size
  ORDER BY o.total_capacity ASC, cardinality(o.table_ids) ASC, o.table_numbers ASC;
END;
$$;

COMMENT ON FUNCTION public.find_available_table_options(DATE, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER)
IS 'Returns available table options for a timeslot, including adjacent combinations for large parties (max 12 pax).';

-- ------------------------------------------------------------
-- 2. Concurrency lock RPC (PR-2): reserve tables for checkout
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_pending_reservation_lock(
  p_customer_id UUID,
  p_table_ids UUID[],
  p_reservation_date DATE,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_party_size INTEGER,
  p_special_requests TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS TABLE (
  reservation_id UUID,
  locked_until TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table_id UUID;
  v_reservation_id UUID;
  v_locked_until TIMESTAMPTZ := now() + interval '5 minutes';
BEGIN
  IF p_party_size < 1 OR p_party_size > 12 THEN
    RAISE EXCEPTION 'Party size must be between 1 and 12.'
      USING ERRCODE = '22023';
  END IF;

  IF p_table_ids IS NULL OR cardinality(p_table_ids) = 0 THEN
    RAISE EXCEPTION 'At least one table must be selected.'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.blocked_dates
    WHERE blocked_date = p_reservation_date
  ) THEN
    RAISE EXCEPTION 'Selected date is blocked for reservations.'
      USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('lock_timeout', '1s', true);

  -- Lock all selected table rows in a deterministic order.
  FOR v_table_id IN
    SELECT tid FROM unnest(p_table_ids) AS tid ORDER BY tid
  LOOP
    PERFORM 1
    FROM public.tables t
    WHERE t.id = v_table_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Table % does not exist.', v_table_id
        USING ERRCODE = '22023';
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM public.tables
    WHERE id = ANY(p_table_ids)
      AND status <> 'available'
  ) THEN
    RAISE EXCEPTION 'One or more selected tables are not available.'
      USING ERRCODE = '55P03';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.reservation_tables rt
    JOIN public.reservations r ON r.id = rt.reservation_id
    WHERE rt.table_id = ANY(p_table_ids)
      AND r.status IN ('pending_payment', 'confirmed', 'seated')
      AND (
        r.status <> 'pending_payment'
        OR (r.locked_until IS NOT NULL AND r.locked_until > now())
      )
      AND NOT (r.end_time <= p_start_time OR r.start_time >= p_end_time)
  ) THEN
    RAISE EXCEPTION 'Selected tables are no longer available for the requested time slot.'
      USING ERRCODE = '55P03';
  END IF;

  INSERT INTO public.reservations (
    customer_id,
    reservation_date,
    start_time,
    end_time,
    party_size,
    status,
    special_requests,
    locked_until,
    created_by
  )
  VALUES (
    p_customer_id,
    p_reservation_date,
    p_start_time,
    p_end_time,
    p_party_size,
    'pending_payment',
    p_special_requests,
    v_locked_until,
    p_created_by
  )
  RETURNING id INTO v_reservation_id;

  INSERT INTO public.reservation_tables (reservation_id, table_id)
  SELECT v_reservation_id, tid
  FROM unnest(p_table_ids) AS tid;

  UPDATE public.tables
  SET status = 'reserved'
  WHERE id = ANY(p_table_ids);

  RETURN QUERY SELECT v_reservation_id, v_locked_until;
EXCEPTION
  WHEN lock_not_available OR deadlock_detected THEN
    RAISE EXCEPTION 'Unable to acquire reservation lock within 1 second.'
      USING ERRCODE = '55P03';
END;
$$;

COMMENT ON FUNCTION public.create_pending_reservation_lock(UUID, UUID[], DATE, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, TEXT, UUID)
IS 'Acquires row-level locks for selected tables, creates pending reservation, and sets a 5-minute checkout timeout.';

-- ------------------------------------------------------------
-- 3. Timeout rollback helper: release expired pending bookings
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.release_expired_pending_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_count INTEGER := 0;
BEGIN
  WITH expired AS (
    UPDATE public.reservations r
    SET status = 'cancelled',
        locked_until = NULL
    WHERE r.status = 'pending_payment'
      AND r.locked_until IS NOT NULL
      AND r.locked_until <= now()
    RETURNING r.id
  )
  SELECT COUNT(*) INTO v_expired_count
  FROM expired;

  UPDATE public.tables t
  SET status = 'available'
  WHERE t.id IN (
    SELECT DISTINCT rt.table_id
    FROM public.reservation_tables rt
    JOIN public.reservations r ON r.id = rt.reservation_id
    WHERE r.status = 'cancelled'
  )
    AND NOT EXISTS (
      SELECT 1
      FROM public.reservation_tables rt2
      JOIN public.reservations r2 ON r2.id = rt2.reservation_id
      WHERE rt2.table_id = t.id
        AND r2.status IN ('pending_payment', 'confirmed', 'seated')
        AND (
          r2.status <> 'pending_payment'
          OR (r2.locked_until IS NOT NULL AND r2.locked_until > now())
        )
    );

  RETURN v_expired_count;
END;
$$;

COMMENT ON FUNCTION public.release_expired_pending_reservations()
IS 'Cancels pending reservations whose 5-minute payment lock expired and frees affected tables.';

-- ------------------------------------------------------------
-- 4. Function permissions
-- ------------------------------------------------------------
REVOKE ALL ON FUNCTION public.find_available_table_options(DATE, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_pending_reservation_lock(UUID, UUID[], DATE, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_expired_pending_reservations() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.find_available_table_options(DATE, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_pending_reservation_lock(UUID, UUID[], DATE, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, TEXT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_expired_pending_reservations() TO authenticated, service_role;
