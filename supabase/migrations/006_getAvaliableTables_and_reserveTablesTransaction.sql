-- ============================================
-- Function: fn_get_available_tables
-- Purpose: Return available table(s) or adjacent table combinations that satisfy pax.
-- Inputs:
--   reservation_time TIMESTAMPTZ (UTC)
--   pax INT (1..12)
-- Output: JSON { status: 'ok'|'no_availability'|'error', table_ids: UUID[], total_capacity: INT, message: TEXT }
-- ============================================
CREATE OR REPLACE FUNCTION fn_get_available_tables(
  reservation_time TIMESTAMPTZ,
  pax INT
)
RETURNS JSON LANGUAGE plpgsql AS $$
DECLARE
  requested_date DATE := reservation_time::DATE;
  requested_end TIMESTAMPTZ := reservation_time + INTERVAL '2 hours';
  single_row RECORD;
  candidate_tables UUID[];
  candidate_capacity INT;
BEGIN
  -- Defensive checks
  IF pax IS NULL OR pax <= 0 THEN
    RETURN json_build_object('status','error','message','Invalid party size. Must be > 0.');
  END IF;
  IF pax > 12 THEN
    RETURN json_build_object('status','error','message','Party size exceeds maximum allowed (12 Pax).');
  END IF;

  WITH available_tables AS (
    SELECT t.id,
           t.capacity,
           t.adjacent_table_ids
    FROM public.tables t
    WHERE t.status = 'available'
      AND NOT EXISTS (
        SELECT 1
        FROM public.reservation_tables rt
        JOIN public.reservations r ON r.id = rt.reservation_id
        WHERE rt.table_id = t.id
          AND r.status IN ('pending_payment','confirmed','seated')
          AND r.reservation_date = requested_date
          AND tstzrange(r.start_time, r.end_time, '[)') &&
              tstzrange(reservation_time, requested_end, '[)')
      )
  ),
  single_table AS (
    SELECT id, capacity
    FROM available_tables
    WHERE capacity >= pax
    ORDER BY capacity ASC
    LIMIT 1
  ),
  combos AS (
    SELECT ARRAY[id] AS table_ids,
           capacity AS total_capacity,
           adjacent_table_ids
    FROM available_tables
    WHERE capacity < pax

    UNION ALL

    SELECT c.table_ids || t.id,
           c.total_capacity + t.capacity,
           t.adjacent_table_ids
    FROM combos c
    JOIN available_tables t ON t.id = ANY(c.adjacent_table_ids)
    WHERE t.id <> ALL(c.table_ids)
      AND c.total_capacity < pax
      AND cardinality(c.table_ids) < 5
  ),
  best_combo AS (
    SELECT table_ids, total_capacity
    FROM combos
    WHERE total_capacity >= pax
    ORDER BY total_capacity ASC, cardinality(table_ids) ASC
    LIMIT 1
  )
  SELECT id, capacity INTO single_row FROM single_table;

  IF FOUND THEN
    RETURN json_build_object(
      'status','ok',
      'table_ids', ARRAY[single_row.id]::UUID[],
      'total_capacity', single_row.capacity,
      'message','Single table assigned.'
    );
  END IF;

  SELECT table_ids, total_capacity INTO candidate_tables, candidate_capacity
  FROM best_combo;

  IF FOUND THEN
    RETURN json_build_object(
      'status','ok',
      'table_ids', candidate_tables,
      'total_capacity', candidate_capacity,
      'message','Adjacent table combination assigned.'
    );
  END IF;

  RETURN json_build_object('status','no_availability','table_ids', ARRAY[]::UUID[], 'total_capacity', 0, 'message','No availability for requested time and pax.');
END;
$$;


-- ============================================
-- Function: fn_reserve_tables_transaction
-- Purpose: Transactional reservation creation with row-level locking.
-- Inputs:
--   reservation_time TIMESTAMPTZ,
--   pax INT,
--   customer_id UUID,
--   requested_by UUID (auth.uid() or admin id)
-- Output: JSON { status: 'ok'|'conflict'|'no_availability'|'error', reservation_id: UUID|null, table_ids: UUID[]|null, payment_token: TEXT|null, message: TEXT }
-- Behavior:
--   - Calls fn_get_available_tables to obtain candidate table(s).
--   - Locks selected table rows FOR UPDATE; conflicts resolve within 1 second.
--   - Inserts reservation and reservation_tables rows.
--   - Sets locked_until 5 minutes ahead for the pending payment window.
-- ============================================
CREATE OR REPLACE FUNCTION fn_reserve_tables_transaction(
  reservation_time TIMESTAMPTZ,
  pax INT,
  customer_id UUID,
  requested_by UUID
)
RETURNS JSON LANGUAGE plpgsql AS $$
DECLARE
  requested_date DATE := reservation_time::DATE;
  requested_end TIMESTAMPTZ := reservation_time + INTERVAL '2 hours';
  avail JSON;
  table_ids UUID[];
  total_cap INT;
  new_reservation_id UUID := gen_random_uuid();
  payment_token TEXT := gen_random_uuid()::TEXT;
  t_uuid UUID;
BEGIN
  IF pax IS NULL OR pax <= 0 OR pax > 12 THEN
    RETURN json_build_object('status','error','message','Invalid party size. Must be between 1 and 12.');
  END IF;
  IF customer_id IS NULL THEN
    RETURN json_build_object('status','error','message','customer_id is required.');
  END IF;

  avail := fn_get_available_tables(reservation_time, pax);

  IF avail->>'status' IS NULL THEN
    RETURN json_build_object('status','error','message','Availability function returned unexpected result.');
  END IF;

  IF (avail->>'status') = 'no_availability' THEN
    RETURN json_build_object('status','no_availability','message','No tables available for requested time/pax.');
  END IF;

  IF (avail->>'status') = 'error' THEN
    RETURN json_build_object('status','error','message', avail->>'message');
  END IF;

  SELECT ARRAY(SELECT jsonb_array_elements_text(to_jsonb(avail->'table_ids')))::UUID[] INTO table_ids;
  total_cap := (avail->>'total_capacity')::INT;

  IF array_length(table_ids,1) IS NULL THEN
    RETURN json_build_object('status','error','message','No table ids returned by availability function.');
  END IF;

  SET LOCAL statement_timeout = '1000';

  FOR t_uuid IN SELECT unnest(table_ids) ORDER BY 1 LOOP
    PERFORM 1 FROM public.tables WHERE id = t_uuid FOR UPDATE;

    IF EXISTS (
      SELECT 1
      FROM public.reservation_tables rt
      JOIN public.reservations r ON r.id = rt.reservation_id
      WHERE rt.table_id = t_uuid
        AND r.status IN ('pending_payment','confirmed','seated')
        AND r.reservation_date = requested_date
        AND tstzrange(r.start_time, r.end_time, '[)') &&
            tstzrange(reservation_time, requested_end, '[)')
    ) THEN
      RETURN json_build_object('status','conflict','message','Concurrent reservation conflict detected. Try again.');
    END IF;
  END LOOP;

  INSERT INTO public.reservations (
    id,
    customer_id,
    reservation_date,
    start_time,
    end_time,
    party_size,
    status,
    deposit_amount,
    payment_token,
    locked_until,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    new_reservation_id,
    customer_id,
    requested_date,
    reservation_time,
    requested_end,
    pax,
    'pending_payment',
    0.00,
    payment_token,
    now() + INTERVAL '5 minutes',
    requested_by,
    now(),
    now()
  );

  INSERT INTO public.reservation_tables (reservation_id, table_id)
  SELECT new_reservation_id, t_id
  FROM unnest(table_ids) AS t_id;

  UPDATE public.tables
  SET status = 'reserved'
  WHERE id = ANY(table_ids);

  RETURN json_build_object(
    'status','ok',
    'reservation_id', new_reservation_id,
    'table_ids', table_ids,
    'total_capacity', total_cap,
    'payment_token', payment_token,
    'message','Reservation created in pending payment state. Lock expires in 5 minutes.'
  );
EXCEPTION
  WHEN query_canceled THEN
    RETURN json_build_object('status','conflict','message','Could not acquire table lock within 1 second. Please retry.');
  WHEN others THEN
    RETURN json_build_object('status','error','message', SQLERRM);
END;
$$;


-- ============================================
-- Function: fn_release_expired_pending_reservations
-- Purpose: Release pending reservations whose 5-minute payment deadline has passed.
-- Output: JSON { status: 'ok'|'error', expired_count: INT, expired_reservation_ids: UUID[], message: TEXT }
-- Behavior:
--   - Frees table rows by setting status back to available.
--   - Cancels expired pending_payment reservations.
--   - Returns a summary for cron or background callers.
-- ============================================
CREATE OR REPLACE FUNCTION fn_release_expired_pending_reservations()
RETURNS JSON LANGUAGE plpgsql AS $$
DECLARE
  expired_ids UUID[];
  expired_count INT;
BEGIN
  SELECT ARRAY_AGG(id) INTO expired_ids
  FROM public.reservations
  WHERE status = 'pending_payment'
    AND locked_until IS NOT NULL
    AND locked_until < now();

  IF expired_ids IS NULL THEN
    RETURN json_build_object('status','ok','expired_count',0,'expired_reservation_ids', ARRAY[]::UUID[],'message','No expired reservations to release.');
  END IF;

  UPDATE public.tables
  SET status = 'available'
  WHERE id IN (
    SELECT table_id FROM public.reservation_tables WHERE reservation_id = ANY(expired_ids)
  )
  AND status = 'reserved';

  UPDATE public.reservations
  SET status = 'cancelled',
      locked_until = NULL,
      payment_token = NULL,
      updated_at = now()
  WHERE id = ANY(expired_ids);

  expired_count := array_length(expired_ids, 1);
  RETURN json_build_object('status','ok','expired_count', expired_count,'expired_reservation_ids', expired_ids,'message','Released expired pending reservations and freed tables.');
EXCEPTION
  WHEN others THEN
    RETURN json_build_object('status','error','message', SQLERRM);
END;
$$;
