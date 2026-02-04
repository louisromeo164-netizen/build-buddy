-- Drop the view and recreate with security_invoker
DROP VIEW IF EXISTS public.platform_stats;

-- Recreate platform_stats view with security_invoker
CREATE VIEW public.platform_stats
WITH (security_invoker = on) AS
SELECT 
    (SELECT COUNT(*) FROM public.bookings) as total_bookings,
    (SELECT COUNT(*) FROM public.rides) as total_rides,
    (SELECT COUNT(*) FROM public.profiles) as total_users,
    COALESCE((SELECT SUM(platform_commission) FROM public.transactions WHERE status = 'completed'), 0) as total_commission,
    COALESCE((SELECT SUM(platform_commission) FROM public.transactions WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '7 days'), 0) as weekly_commission,
    COALESCE((SELECT SUM(platform_commission) FROM public.transactions WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '1 day'), 0) as daily_commission;