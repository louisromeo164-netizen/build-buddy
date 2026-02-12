
-- 1. Remove passenger INSERT access on transactions
DROP POLICY "System can insert transactions" ON transactions;

-- 2. Create automated trigger to insert transactions on booking confirmation
CREATE OR REPLACE FUNCTION public.handle_transaction_on_confirmation()
RETURNS TRIGGER AS $$
DECLARE
  v_ride rides%ROWTYPE;
BEGIN
  -- Only fire when status changes to 'confirmed'
  IF OLD.status IS DISTINCT FROM 'confirmed' AND NEW.status = 'confirmed' THEN
    -- Get the ride details
    SELECT * INTO v_ride FROM rides WHERE id = NEW.ride_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Ride not found for booking';
    END IF;

    -- Insert transaction with validated business-rule amounts
    INSERT INTO transactions (
      booking_id,
      passenger_id,
      driver_id,
      seats_count,
      total_amount,
      driver_amount,
      platform_commission,
      status
    ) VALUES (
      NEW.id,
      NEW.passenger_id,
      v_ride.driver_id,
      NEW.seats_booked,
      v_ride.fare_per_seat * NEW.seats_booked,           -- total = fare × seats
      (v_ride.fare_per_seat - 1000) * NEW.seats_booked,  -- driver gets fare - 1000 per seat
      1000 * NEW.seats_booked,                            -- platform gets 1000 per seat
      'completed'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER transaction_on_booking_confirmation
AFTER UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION public.handle_transaction_on_confirmation();
