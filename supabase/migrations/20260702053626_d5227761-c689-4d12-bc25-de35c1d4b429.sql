
-- 1) BOOKING PAYMENT BYPASS ---------------------------------------------------

-- Force new bookings to start in 'pending' status
DROP POLICY IF EXISTS "Passengers can create valid bookings" ON public.bookings;
CREATE POLICY "Passengers can create valid bookings"
ON public.bookings FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = passenger_id
  AND status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.rides r
    WHERE r.id = bookings.ride_id
      AND r.status = 'available'
      AND r.available_seats >= bookings.seats_booked
      AND r.departure_time > now()
      AND r.driver_id <> bookings.passenger_id
  )
);

-- Restrict status transitions on UPDATE
DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;
CREATE POLICY "Passengers can cancel own bookings"
ON public.bookings FOR UPDATE TO authenticated
USING (auth.uid() = passenger_id)
WITH CHECK (auth.uid() = passenger_id AND status = 'cancelled');

CREATE POLICY "Drivers can manage bookings on own rides"
ON public.bookings FOR UPDATE TO authenticated
USING (
  auth.uid() IN (SELECT driver_id FROM public.rides WHERE id = ride_id)
)
WITH CHECK (
  auth.uid() IN (SELECT driver_id FROM public.rides WHERE id = ride_id)
  AND status IN ('confirmed', 'completed', 'cancelled')
);

-- Trigger-side enforcement: a booking may only reach 'confirmed' if a
-- matching mobile_money_payment with status='completed' exists, OR the
-- current user is the ride's driver marking a cash booking as confirmed.
CREATE OR REPLACE FUNCTION public.enforce_booking_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id uuid;
  v_has_payment boolean;
BEGIN
  IF OLD.status IS DISTINCT FROM 'confirmed' AND NEW.status = 'confirmed' THEN
    SELECT driver_id INTO v_driver_id FROM public.rides WHERE id = NEW.ride_id;

    SELECT EXISTS (
      SELECT 1 FROM public.mobile_money_payments p
      WHERE p.booking_id = NEW.id
        AND p.status = 'completed'
    ) INTO v_has_payment;

    IF NOT v_has_payment AND auth.uid() IS DISTINCT FROM v_driver_id THEN
      RAISE EXCEPTION 'Booking cannot be confirmed without a completed payment';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_booking_status_transition() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_booking_status_transition ON public.bookings;
CREATE TRIGGER enforce_booking_status_transition
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_status_transition();

-- 2) USER SUSPENSIONS TABLE ---------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_suspensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suspended_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_suspensions TO authenticated;
GRANT ALL ON public.user_suspensions TO service_role;

ALTER TABLE public.user_suspensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view suspensions"
ON public.user_suspensions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own suspension"
ON public.user_suspensions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert suspensions"
ON public.user_suspensions FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update suspensions"
ON public.user_suspensions FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete suspensions"
ON public.user_suspensions FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_user_suspensions_active
  ON public.user_suspensions(user_id) WHERE is_active = true;

CREATE TRIGGER update_user_suspensions_updated_at
BEFORE UPDATE ON public.user_suspensions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) RATINGS PARTICIPATION ENFORCEMENT ---------------------------------------

DROP POLICY IF EXISTS "Users can rate after ride" ON public.ratings;
CREATE POLICY "Users can rate after completed ride"
ON public.ratings FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = rater_id
  AND (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.rides r ON r.id = b.ride_id
      WHERE b.ride_id = ratings.ride_id
        AND b.passenger_id = auth.uid()
        AND b.status = 'completed'
        AND r.driver_id = ratings.rated_user_id
    )
    OR EXISTS (
      SELECT 1 FROM public.rides r
      JOIN public.bookings b ON b.ride_id = r.id
      WHERE r.id = ratings.ride_id
        AND r.driver_id = auth.uid()
        AND b.passenger_id = ratings.rated_user_id
        AND b.status = 'completed'
    )
  )
);
