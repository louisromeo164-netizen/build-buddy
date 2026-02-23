
DROP FUNCTION IF EXISTS public.get_platform_stats();

CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS TABLE(
  total_bookings bigint,
  total_rides bigint,
  total_users bigint,
  total_commission bigint,
  weekly_commission bigint,
  daily_commission bigint,
  total_subscription_revenue bigint,
  active_drivers bigint,
  inactive_drivers bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT count(*) FROM bookings)::bigint,
    (SELECT count(*) FROM rides)::bigint,
    (SELECT count(*) FROM profiles)::bigint,
    COALESCE((SELECT sum(platform_commission) FROM transactions WHERE status = 'completed'), 0)::bigint,
    COALESCE((SELECT sum(platform_commission) FROM transactions WHERE status = 'completed' AND created_at >= now() - interval '7 days'), 0)::bigint,
    COALESCE((SELECT sum(platform_commission) FROM transactions WHERE status = 'completed' AND created_at >= now() - interval '1 day'), 0)::bigint,
    COALESCE((SELECT sum(amount) FROM driver_subscriptions WHERE status = 'active'), 0)::bigint,
    (SELECT count(*) FROM driver_subscriptions WHERE status = 'active' AND expires_at > now())::bigint,
    (SELECT count(DISTINCT p.user_id) FROM profiles p WHERE p.role = 'driver' AND NOT EXISTS (
      SELECT 1 FROM driver_subscriptions ds WHERE ds.driver_id = p.user_id AND ds.status = 'active' AND ds.expires_at > now()
    ))::bigint;
END;
$$;
