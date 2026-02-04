-- Create admin role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table for admin access control
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create transactions table for commission tracking
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
    passenger_id UUID NOT NULL,
    driver_id UUID NOT NULL,
    total_amount INTEGER NOT NULL DEFAULT 4000,
    driver_amount INTEGER NOT NULL DEFAULT 3000,
    platform_commission INTEGER NOT NULL DEFAULT 1000,
    seats_count INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'refunded')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for transactions
CREATE POLICY "Users can view own transactions"
ON public.transactions
FOR SELECT
USING (auth.uid() = passenger_id OR auth.uid() = driver_id);

CREATE POLICY "Admins can view all transactions"
ON public.transactions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert transactions"
ON public.transactions
FOR INSERT
WITH CHECK (auth.uid() = passenger_id);

-- Trigger for updated_at on transactions
CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create platform_stats view for admin dashboard
CREATE VIEW public.platform_stats AS
SELECT 
    COUNT(DISTINCT b.id) as total_bookings,
    COUNT(DISTINCT r.id) as total_rides,
    COUNT(DISTINCT p.id) as total_users,
    COALESCE(SUM(t.platform_commission), 0) as total_commission,
    COALESCE(SUM(CASE WHEN t.created_at >= NOW() - INTERVAL '7 days' THEN t.platform_commission ELSE 0 END), 0) as weekly_commission,
    COALESCE(SUM(CASE WHEN t.created_at >= NOW() - INTERVAL '1 day' THEN t.platform_commission ELSE 0 END), 0) as daily_commission
FROM public.bookings b
FULL OUTER JOIN public.rides r ON true
FULL OUTER JOIN public.profiles p ON true
LEFT JOIN public.transactions t ON t.status = 'completed';