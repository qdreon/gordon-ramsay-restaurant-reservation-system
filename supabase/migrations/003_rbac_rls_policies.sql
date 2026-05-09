-- ============================================================
-- MIGRATION 3: RBAC, RLS Policies & Auth Trigger
-- Gordon Ramsay Restaurant Reservation System
-- ============================================================
-- Run this THIRD in Supabase SQL Editor.
-- Prerequisite: Migrations 1 & 2 must be run first.
-- ============================================================

-- 1. Helper Function: is_admin()
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Helper Function: get_customer_id()
CREATE OR REPLACE FUNCTION public.get_customer_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT id FROM public.customers
        WHERE user_id = auth.uid() LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. Auth Trigger: auto-create public.users + customers on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, phone, role, consent_given)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        'customer',
        COALESCE((NEW.raw_user_meta_data->>'consent_given')::boolean, false)
    );
    INSERT INTO public.customers (user_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Enable RLS on ALL tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;

-- 5. RLS: public.users
CREATE POLICY users_select_own ON public.users
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY users_update_own ON public.users
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY users_admin_all ON public.users
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 6. RLS: public.customers
CREATE POLICY customers_select_own ON public.customers
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY customers_insert_own ON public.customers
    FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY customers_update_own ON public.customers
    FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY customers_admin_all ON public.customers
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 7. RLS: public.tables
CREATE POLICY tables_select_authenticated ON public.tables
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY tables_admin_modify ON public.tables
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 8. RLS: public.menu (publicly readable)
CREATE POLICY menu_select_public ON public.menu
    FOR SELECT USING (true);
CREATE POLICY menu_admin_modify ON public.menu
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 9. RLS: public.reservations
CREATE POLICY reservations_select_own ON public.reservations
    FOR SELECT USING (customer_id = public.get_customer_id());
CREATE POLICY reservations_insert_own ON public.reservations
    FOR INSERT WITH CHECK (customer_id = public.get_customer_id());
CREATE POLICY reservations_update_own ON public.reservations
    FOR UPDATE
    USING (customer_id = public.get_customer_id())
    WITH CHECK (customer_id = public.get_customer_id());
CREATE POLICY reservations_admin_all ON public.reservations
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 10. RLS: public.reservation_tables
CREATE POLICY reservation_tables_select_own ON public.reservation_tables
    FOR SELECT USING (
        reservation_id IN (
            SELECT id FROM public.reservations
            WHERE customer_id = public.get_customer_id()
        )
    );
CREATE POLICY reservation_tables_insert_authenticated ON public.reservation_tables
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY reservation_tables_admin_all ON public.reservation_tables
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 11. RLS: public.waitlist
CREATE POLICY waitlist_select_own ON public.waitlist
    FOR SELECT USING (customer_id = public.get_customer_id());
CREATE POLICY waitlist_insert_own ON public.waitlist
    FOR INSERT WITH CHECK (customer_id = public.get_customer_id());
CREATE POLICY waitlist_update_own ON public.waitlist
    FOR UPDATE
    USING (customer_id = public.get_customer_id())
    WITH CHECK (customer_id = public.get_customer_id());
CREATE POLICY waitlist_admin_all ON public.waitlist
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 12. RLS: public.blocked_dates
CREATE POLICY blocked_dates_select_authenticated ON public.blocked_dates
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY blocked_dates_admin_modify ON public.blocked_dates
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- END OF MIGRATION 3
-- ============================================================
