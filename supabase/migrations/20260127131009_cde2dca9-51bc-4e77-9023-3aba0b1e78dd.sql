-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('driver', 'passenger');

-- Create enum for ride status
CREATE TYPE public.ride_status AS ENUM ('available', 'full', 'completed', 'cancelled');

-- Create enum for booking status
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

-- Profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  email TEXT,
  role user_role NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Driver details (additional info for drivers)
CREATE TABLE public.driver_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  car_make TEXT NOT NULL,
  car_model TEXT NOT NULL,
  car_color TEXT,
  license_plate TEXT NOT NULL,
  seats_available INTEGER NOT NULL DEFAULT 4,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Rides table (posted by drivers)
CREATE TABLE public.rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pickup_location TEXT NOT NULL,
  pickup_lat DOUBLE PRECISION,
  pickup_lng DOUBLE PRECISION,
  destination TEXT NOT NULL,
  destination_lat DOUBLE PRECISION,
  destination_lng DOUBLE PRECISION,
  departure_time TIMESTAMP WITH TIME ZONE NOT NULL,
  available_seats INTEGER NOT NULL,
  fare_per_seat INTEGER NOT NULL DEFAULT 4000,
  status ride_status NOT NULL DEFAULT 'available',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bookings table (passengers book rides)
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID REFERENCES public.rides(id) ON DELETE CASCADE NOT NULL,
  passenger_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  seats_booked INTEGER NOT NULL DEFAULT 1,
  status booking_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ride_id, passenger_id)
);

-- Ratings table
CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID REFERENCES public.rides(id) ON DELETE CASCADE NOT NULL,
  rater_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rated_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ride_id, rater_id, rated_user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Driver details policies
CREATE POLICY "Anyone can view driver details" ON public.driver_details FOR SELECT TO authenticated USING (true);
CREATE POLICY "Drivers can insert own details" ON public.driver_details FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Drivers can update own details" ON public.driver_details FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Rides policies
CREATE POLICY "Anyone can view available rides" ON public.rides FOR SELECT TO authenticated USING (true);
CREATE POLICY "Drivers can insert own rides" ON public.rides FOR INSERT TO authenticated WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "Drivers can update own rides" ON public.rides FOR UPDATE TO authenticated USING (auth.uid() = driver_id);
CREATE POLICY "Drivers can delete own rides" ON public.rides FOR DELETE TO authenticated USING (auth.uid() = driver_id);

-- Bookings policies
CREATE POLICY "Users can view own bookings" ON public.bookings FOR SELECT TO authenticated USING (auth.uid() = passenger_id OR auth.uid() IN (SELECT driver_id FROM public.rides WHERE id = ride_id));
CREATE POLICY "Passengers can create bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = passenger_id);
CREATE POLICY "Users can update own bookings" ON public.bookings FOR UPDATE TO authenticated USING (auth.uid() = passenger_id OR auth.uid() IN (SELECT driver_id FROM public.rides WHERE id = ride_id));

-- Ratings policies
CREATE POLICY "Anyone can view ratings" ON public.ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can rate after ride" ON public.ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = rater_id);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_driver_details_updated_at BEFORE UPDATE ON public.driver_details FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rides_updated_at BEFORE UPDATE ON public.rides FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Profile will be created during onboarding, not automatically
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;