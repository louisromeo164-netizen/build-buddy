export type UserRole = 'driver' | 'passenger';
export type RideStatus = 'available' | 'full' | 'completed' | 'cancelled';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  phone_number: string | null;
  email: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface DriverDetails {
  id: string;
  user_id: string;
  car_make: string;
  car_model: string;
  car_color: string | null;
  license_plate: string;
  seats_available: number;
  created_at: string;
  updated_at: string;
}

export interface Ride {
  id: string;
  driver_id: string;
  pickup_location: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  destination: string;
  destination_lat: number | null;
  destination_lng: number | null;
  departure_time: string;
  available_seats: number;
  fare_per_seat: number;
  status: RideStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  driver_profile?: Profile;
  driver_details?: DriverDetails;
}

export interface Booking {
  id: string;
  ride_id: string;
  passenger_id: string;
  seats_booked: number;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
  ride?: Ride;
  passenger_profile?: Profile;
}

export interface Rating {
  id: string;
  ride_id: string;
  rater_id: string;
  rated_user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}
