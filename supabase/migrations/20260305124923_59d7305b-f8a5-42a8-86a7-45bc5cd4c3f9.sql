
-- Create driver_subscriptions table
CREATE TABLE public.driver_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL DEFAULT 6000,
  status TEXT NOT NULL DEFAULT 'active',
  payment_method TEXT,
  payment_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days')
);

ALTER TABLE public.driver_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers view own subscriptions" ON public.driver_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = driver_id);

CREATE POLICY "Drivers insert own subscriptions" ON public.driver_subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Admins view all subscriptions" ON public.driver_subscriptions
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Create driver_has_active_subscription function
CREATE OR REPLACE FUNCTION public.driver_has_active_subscription(_driver_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.driver_subscriptions
    WHERE driver_id = _driver_id
      AND status = 'active'
      AND expires_at > now()
  );
$$;

-- Create mobile_money_payments table
CREATE TABLE public.mobile_money_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  payment_type TEXT NOT NULL,
  reference_id UUID,
  provider TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  transaction_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mobile_money_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payments" ON public.mobile_money_payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own payments" ON public.mobile_money_payments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own payments" ON public.mobile_money_payments
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins view all payments" ON public.mobile_money_payments
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
