
-- 1. Restrict ratings to authenticated users only
DROP POLICY "Anyone can view ratings" ON ratings;
CREATE POLICY "Authenticated users can view ratings" ON ratings
FOR SELECT TO authenticated
USING (true);
