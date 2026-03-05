
-- Admin RPC to list all users with their roles and subscription status
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  email TEXT,
  phone_number TEXT,
  role TEXT,
  created_at TIMESTAMPTZ,
  has_active_subscription BOOLEAN,
  is_suspended BOOLEAN
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

  RETURN QUERY
  SELECT
    p.user_id,
    p.full_name,
    p.email,
    p.phone_number,
    p.role::text,
    p.created_at,
    COALESCE((
      SELECT TRUE FROM driver_subscriptions ds
      WHERE ds.driver_id = p.user_id AND ds.status = 'active' AND ds.expires_at > now()
      LIMIT 1
    ), FALSE) AS has_active_subscription,
    COALESCE((
      SELECT TRUE FROM user_suspensions us
      WHERE us.user_id = p.user_id AND us.is_active = true
      LIMIT 1
    ), FALSE) AS is_suspended
  FROM profiles p
  ORDER BY p.created_at DESC;
END;
$$;

-- Admin RPC to suspend a user
CREATE OR REPLACE FUNCTION public.admin_suspend_user(_target_user_id UUID, _reason TEXT DEFAULT 'Suspended by admin')
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  -- Deactivate any existing suspension first
  UPDATE user_suspensions SET is_active = false WHERE user_id = _target_user_id AND is_active = true;

  -- Insert new suspension
  INSERT INTO user_suspensions (user_id, suspended_by, reason, is_active)
  VALUES (_target_user_id, auth.uid(), _reason, true);
END;
$$;

-- Admin RPC to unsuspend a user
CREATE OR REPLACE FUNCTION public.admin_unsuspend_user(_target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  UPDATE user_suspensions SET is_active = false WHERE user_id = _target_user_id AND is_active = true;
END;
$$;

-- Admin RPC to cancel a ride
CREATE OR REPLACE FUNCTION public.admin_cancel_ride(_ride_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  -- Cancel all active bookings for this ride
  UPDATE bookings SET status = 'cancelled' WHERE ride_id = _ride_id AND status IN ('pending', 'confirmed');

  -- Cancel the ride
  UPDATE rides SET status = 'cancelled' WHERE id = _ride_id;
END;
$$;

-- Admin RPC to get detailed ride info with bookings
CREATE OR REPLACE FUNCTION public.admin_get_ride_bookings(_ride_id UUID)
RETURNS TABLE(
  booking_id UUID,
  passenger_name TEXT,
  seats_booked INTEGER,
  status TEXT,
  created_at TIMESTAMPTZ
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

  RETURN QUERY
  SELECT
    b.id,
    p.full_name,
    b.seats_booked,
    b.status::text,
    b.created_at
  FROM bookings b
  JOIN profiles p ON p.user_id = b.passenger_id
  WHERE b.ride_id = _ride_id
  ORDER BY b.created_at DESC;
END;
$$;
