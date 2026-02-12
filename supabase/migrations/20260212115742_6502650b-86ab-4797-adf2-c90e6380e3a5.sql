-- Revoke direct access to platform_stats view from public roles
-- It should only be accessed via the admin-only get_platform_stats() RPC
REVOKE SELECT ON public.platform_stats FROM anon;
REVOKE SELECT ON public.platform_stats FROM authenticated;