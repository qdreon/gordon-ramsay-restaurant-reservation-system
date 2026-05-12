-- ============================================================
-- MIGRATION 4: Seed Data -- Restaurant Tables
-- Gordon Ramsay Restaurant Reservation System
-- ============================================================
-- Run this after Migrations 000-003_1 (before 006).
-- Prerequisite: Base schema, RLS, and grants must already exist.
-- ============================================================
-- Inserts 15 restaurant tables with varying capacities:
--   - 4x 2-seat tables  (intimate dining)
--   - 6x 4-seat tables  (standard dining)
--   - 3x 6-seat tables  (group dining)
--   - 2x 8-seat tables  (large parties)
-- Total max capacity: 8 + 24 + 18 + 16 = 66 seats
--
-- Grid Layout (5 columns x 3 rows):
-- Row 0: T1(2) T2(2) T3(4) T4(4) T5(4)
-- Row 1: T6(2) T7(2) T8(4) T9(4) T10(4)
-- Row 2: T11(6) T12(6) T13(6) T14(8) T15(8)
-- ============================================================

INSERT INTO public.tables (table_number, capacity, status, position_x, position_y, is_combinable) VALUES
    -- Row 0: Front of house (2-seat and 4-seat)
    (1,  2, 'available', 0, 0, true),
    (2,  2, 'available', 1, 0, true),
    (3,  4, 'available', 2, 0, true),
    (4,  4, 'available', 3, 0, true),
    (5,  4, 'available', 4, 0, true),
    -- Row 1: Middle section (2-seat and 4-seat)
    (6,  2, 'available', 0, 1, true),
    (7,  2, 'available', 1, 1, true),
    (8,  4, 'available', 2, 1, true),
    (9,  4, 'available', 3, 1, true),
    (10, 4, 'available', 4, 1, true),
    -- Row 2: Back section (6-seat and 8-seat for large parties)
    (11, 6, 'available', 0, 2, true),
    (12, 6, 'available', 1, 2, true),
    (13, 6, 'available', 2, 2, true),
    (14, 8, 'available', 3, 2, true),
    (15, 8, 'available', 4, 2, true)
ON CONFLICT (table_number) DO UPDATE
SET
    capacity = EXCLUDED.capacity,
    status = EXCLUDED.status,
    position_x = EXCLUDED.position_x,
    position_y = EXCLUDED.position_y,
    is_combinable = EXCLUDED.is_combinable;

-- Now set adjacent_table_ids for table combination logic (FR-4).
-- Adjacent means physically next to each other on the grid.
-- We update after insert because we need the generated UUIDs.

-- Helper: Create a temp mapping of table_number -> UUID
DO $$
DECLARE
    t1  UUID; t2  UUID; t3  UUID; t4  UUID; t5  UUID;
    t6  UUID; t7  UUID; t8  UUID; t9  UUID; t10 UUID;
    t11 UUID; t12 UUID; t13 UUID; t14 UUID; t15 UUID;
BEGIN
    SELECT id INTO t1  FROM public.tables WHERE table_number = 1;
    SELECT id INTO t2  FROM public.tables WHERE table_number = 2;
    SELECT id INTO t3  FROM public.tables WHERE table_number = 3;
    SELECT id INTO t4  FROM public.tables WHERE table_number = 4;
    SELECT id INTO t5  FROM public.tables WHERE table_number = 5;
    SELECT id INTO t6  FROM public.tables WHERE table_number = 6;
    SELECT id INTO t7  FROM public.tables WHERE table_number = 7;
    SELECT id INTO t8  FROM public.tables WHERE table_number = 8;
    SELECT id INTO t9  FROM public.tables WHERE table_number = 9;
    SELECT id INTO t10 FROM public.tables WHERE table_number = 10;
    SELECT id INTO t11 FROM public.tables WHERE table_number = 11;
    SELECT id INTO t12 FROM public.tables WHERE table_number = 12;
    SELECT id INTO t13 FROM public.tables WHERE table_number = 13;
    SELECT id INTO t14 FROM public.tables WHERE table_number = 14;
    SELECT id INTO t15 FROM public.tables WHERE table_number = 15;

    -- Set adjacency (horizontal + vertical neighbors)
    UPDATE public.tables SET adjacent_table_ids = ARRAY[t2, t6]         WHERE table_number = 1;
    UPDATE public.tables SET adjacent_table_ids = ARRAY[t1, t3, t7]     WHERE table_number = 2;
    UPDATE public.tables SET adjacent_table_ids = ARRAY[t2, t4, t8]     WHERE table_number = 3;
    UPDATE public.tables SET adjacent_table_ids = ARRAY[t3, t5, t9]     WHERE table_number = 4;
    UPDATE public.tables SET adjacent_table_ids = ARRAY[t4, t10]        WHERE table_number = 5;
    UPDATE public.tables SET adjacent_table_ids = ARRAY[t1, t7, t11]    WHERE table_number = 6;
    UPDATE public.tables SET adjacent_table_ids = ARRAY[t2, t6, t8, t12] WHERE table_number = 7;
    UPDATE public.tables SET adjacent_table_ids = ARRAY[t3, t7, t9, t13] WHERE table_number = 8;
    UPDATE public.tables SET adjacent_table_ids = ARRAY[t4, t8, t10, t14] WHERE table_number = 9;
    UPDATE public.tables SET adjacent_table_ids = ARRAY[t5, t9, t15]    WHERE table_number = 10;
    UPDATE public.tables SET adjacent_table_ids = ARRAY[t6, t12]        WHERE table_number = 11;
    UPDATE public.tables SET adjacent_table_ids = ARRAY[t7, t11, t13]   WHERE table_number = 12;
    UPDATE public.tables SET adjacent_table_ids = ARRAY[t8, t12, t14]   WHERE table_number = 13;
    UPDATE public.tables SET adjacent_table_ids = ARRAY[t9, t13, t15]   WHERE table_number = 14;
    UPDATE public.tables SET adjacent_table_ids = ARRAY[t10, t14]       WHERE table_number = 15;
END $$;

-- ============================================================
-- END OF MIGRATION 4
-- ============================================================
