-- Restrict profiles SELECT to own profile only
DROP POLICY "Users can view all profiles" ON public.profiles;

-- Users can only read their own full profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow authenticated users to see basic public info (name, avatar, role) of other users
-- via a secure view
CREATE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT user_id, full_name, avatar_url, role, created_at
FROM public.profiles;

-- Grant access on the view
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;