
-- Restrict ride deletion to only rides without active bookings
DROP POLICY "Drivers can delete own rides" ON public.rides;

CREATE POLICY "Drivers can delete rides without active bookings" ON public.rides
FOR DELETE TO authenticated
USING (
  auth.uid() = driver_id AND
  NOT EXISTS (
    SELECT 1 FROM bookings
    WHERE ride_id = rides.id
      AND status IN ('pending', 'confirmed')
  )
);
