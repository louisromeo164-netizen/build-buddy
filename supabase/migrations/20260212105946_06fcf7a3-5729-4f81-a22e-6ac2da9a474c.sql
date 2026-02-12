
-- 1. Restrict rides to authenticated users only (fixes rides_full_exposure)
DROP POLICY "Anyone can view available rides" ON rides;
CREATE POLICY "Authenticated users can view rides" ON rides
FOR SELECT TO authenticated
USING (true);

-- 2. Secure platform_stats view - revoke public access and create admin-only RPC
REVOKE SELECT ON platform_stats FROM anon;
REVOKE SELECT ON platform_stats FROM authenticated;

CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS TABLE(
  total_bookings bigint,
  total_rides bigint,
  total_users bigint,
  total_commission bigint,
  weekly_commission bigint,
  daily_commission bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;
  
  RETURN QUERY SELECT ps.total_bookings, ps.total_rides, ps.total_users, ps.total_commission, ps.weekly_commission, ps.daily_commission
  FROM platform_stats ps
  LIMIT 1;
END;
$$;

-- 3. Create storage bucket for avatars with proper RLS
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own avatar" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own avatar" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
