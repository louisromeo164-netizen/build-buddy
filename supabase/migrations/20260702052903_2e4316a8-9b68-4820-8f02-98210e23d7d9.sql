
-- 1. user_roles: replace overly broad ALL policy with explicit admin-only INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. mobile_money_payments: prevent users from mutating status/refs on their own rows
DROP POLICY IF EXISTS "Users can update own payments" ON public.mobile_money_payments;
-- Users cannot update payments; only the service role / triggers may finalize them.
-- (No replacement policy = deny for authenticated users.)

-- 3. Lock down SECURITY DEFINER function execution.
-- Trigger-only functions: revoke from anon and authenticated (only owner/triggers invoke them).
REVOKE EXECUTE ON FUNCTION public.handle_booking_seats() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_booking_cancellation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_transaction_on_confirmation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Helper functions used inside RLS policies: authenticated needs EXECUTE, anon does not.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.driver_has_active_subscription(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.driver_has_active_subscription(uuid) TO authenticated;

-- Admin RPCs: authenticated may call (they enforce admin check internally), anon cannot.
REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_suspend_user(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_suspend_user(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_unsuspend_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_unsuspend_user(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_cancel_ride(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_cancel_ride(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_get_ride_bookings(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_ride_bookings(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_platform_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO authenticated;

-- 4. Avatars bucket: prevent unauthenticated listing/enumeration.
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

CREATE POLICY "Authenticated users can view avatars"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars');
