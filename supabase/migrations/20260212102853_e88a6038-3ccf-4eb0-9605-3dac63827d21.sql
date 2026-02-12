
-- 1. Add CHECK constraints for data integrity
ALTER TABLE bookings ADD CONSTRAINT positive_seats_booked CHECK (seats_booked > 0 AND seats_booked <= 8);
ALTER TABLE rides ADD CONSTRAINT valid_seats CHECK (available_seats >= 0 AND available_seats <= 8);

-- 2. Create trigger to atomically handle seat updates on booking INSERT
CREATE OR REPLACE FUNCTION public.handle_booking_seats()
RETURNS TRIGGER AS $$
DECLARE
  current_seats INTEGER;
  ride_status ride_status;
BEGIN
  -- Lock the ride row and get current state
  SELECT r.available_seats, r.status INTO current_seats, ride_status
  FROM rides r
  WHERE r.id = NEW.ride_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride not found';
  END IF;

  IF ride_status != 'available' THEN
    RAISE EXCEPTION 'Ride is not available for booking';
  END IF;

  IF current_seats < NEW.seats_booked THEN
    RAISE EXCEPTION 'Not enough seats available';
  END IF;

  -- Atomically update seats
  UPDATE rides
  SET available_seats = available_seats - NEW.seats_booked,
      status = CASE 
        WHEN available_seats - NEW.seats_booked = 0 THEN 'full'::ride_status
        ELSE 'available'::ride_status
      END
  WHERE id = NEW.ride_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER booking_seats_trigger
BEFORE INSERT ON bookings
FOR EACH ROW EXECUTE FUNCTION public.handle_booking_seats();

-- 3. Create trigger to restore seats on booking cancellation
CREATE OR REPLACE FUNCTION public.handle_booking_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
    UPDATE rides
    SET available_seats = available_seats + OLD.seats_booked,
        status = 'available'::ride_status
    WHERE id = OLD.ride_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER booking_cancellation_trigger
BEFORE UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION public.handle_booking_cancellation();

-- 4. Enhance booking INSERT RLS policy with server-side validation
DROP POLICY "Passengers can create bookings" ON bookings;
CREATE POLICY "Passengers can create valid bookings" ON bookings
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = passenger_id AND
  EXISTS (
    SELECT 1 FROM rides r
    WHERE r.id = ride_id
      AND r.status = 'available'
      AND r.available_seats >= seats_booked
      AND r.departure_time > now()
      AND r.driver_id != passenger_id
  )
);
