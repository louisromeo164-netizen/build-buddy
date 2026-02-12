
-- 1. Add length constraints for user-generated content (fixes input_notes_xss)
ALTER TABLE rides ADD CONSTRAINT rides_notes_max_length CHECK (char_length(notes) <= 500);
ALTER TABLE ratings ADD CONSTRAINT ratings_comment_max_length CHECK (char_length(comment) <= 1000);

-- 2. Restrict driver_details visibility (fixes info_driver_details)
-- Only visible to: the driver themselves, passengers with bookings for that driver's rides, or admins
DROP POLICY "Anyone can view driver details" ON driver_details;

CREATE POLICY "Users can view relevant driver details" ON driver_details
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM rides r
    WHERE r.driver_id = driver_details.user_id
      AND (
        r.status = 'available'
        OR EXISTS (
          SELECT 1 FROM bookings b
          WHERE b.ride_id = r.id
            AND b.passenger_id = auth.uid()
            AND b.status IN ('pending', 'confirmed', 'completed')
        )
      )
  )
);
