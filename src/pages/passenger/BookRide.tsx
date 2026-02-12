import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Ride } from '@/lib/types';
import { MapPin, Clock, Users, Car, Star, Banknote, CheckCircle } from 'lucide-react';

export default function BookRide() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [seats, setSeats] = useState(1);

  useEffect(() => {
    const fetchRide = async () => {
      if (!id) return;

      const { data, error } = await supabase
        .from('rides')
        .select(`
          *,
          driver_profile:profiles!rides_driver_id_fkey(user_id, full_name, avatar_url, role),
          driver_details:driver_details!driver_details_user_id_fkey(*)
        `)
        .eq('id', id)
        .single();

      if (!error && data) {
        const transformedRide = {
          ...data,
          driver_profile: Array.isArray(data.driver_profile) 
            ? data.driver_profile[0] 
            : data.driver_profile,
          driver_details: Array.isArray(data.driver_details) 
            ? data.driver_details[0] 
            : data.driver_details,
        } as Ride;
        setRide(transformedRide);
      }
      setLoading(false);
    };

    fetchRide();
  }, [id]);

  const handleBook = async () => {
    if (!user || !ride) return;

    setBooking(true);
    try {
      const { error } = await supabase.from('bookings').insert({
        ride_id: ride.id,
        passenger_id: user.id,
        seats_booked: seats,
        status: 'pending',
      });

      if (error) throw error;

      // Seat updates are handled atomically by database trigger

      toast({
        title: 'Booking confirmed!',
        description: 'The driver will be notified of your booking.',
      });
      navigate('/passenger/bookings');
    } catch (error: any) {
      toast({
        title: 'Booking failed',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Book Ride">
        <Card className="animate-pulse">
          <CardContent className="h-64" />
        </Card>
      </AppLayout>
    );
  }

  if (!ride) {
    return (
      <AppLayout title="Book Ride">
        <Card>
          <CardContent className="py-12 text-center">
            <p>Ride not found</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const totalFare = ride.fare_per_seat * seats;

  return (
    <AppLayout title="Book Ride">
      <div className="space-y-4">
        {/* Route Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <div className="w-0.5 h-12 bg-border" />
                <div className="w-3 h-3 rounded-full bg-secondary" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Pickup</p>
                  <p className="font-medium">{ride.pickup_location}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Destination</p>
                  <p className="font-medium">{ride.destination}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{format(new Date(ride.departure_time), 'MMM d, h:mm a')}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>{ride.available_seats} seats left</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Driver Card */}
        {ride.driver_profile && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Your Driver</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center">
                  <Car className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{ride.driver_profile.full_name}</p>
                  {ride.driver_details && (
                    <p className="text-sm text-muted-foreground">
                      {ride.driver_details.car_color} {ride.driver_details.car_make} {ride.driver_details.car_model}
                    </p>
                  )}
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-4 h-4 fill-warning text-warning" />
                    <span className="text-sm">4.8 rating</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Booking Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Booking Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Number of seats</span>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setSeats(Math.max(1, seats - 1))}
                  disabled={seats <= 1}
                >
                  -
                </Button>
                <span className="w-8 text-center font-medium">{seats}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setSeats(Math.min(ride.available_seats, seats + 1))}
                  disabled={seats >= ride.available_seats}
                >
                  +
                </Button>
              </div>
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Fare per seat</span>
                <span>UGX {ride.fare_per_seat.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span className="text-primary">UGX {totalFare.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/50 text-sm">
              <Banknote className="w-4 h-4" />
              <span>Pay cash to the driver</span>
            </div>

            {ride.notes && (
              <div className="p-3 rounded-lg bg-muted text-sm">
                <p className="font-medium mb-1">Driver's note:</p>
                <p className="text-muted-foreground">{ride.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Button className="w-full" size="lg" onClick={handleBook} disabled={booking}>
          <CheckCircle className="w-4 h-4 mr-2" />
          {booking ? 'Booking...' : `Confirm Booking - UGX ${totalFare.toLocaleString()}`}
        </Button>
      </div>
    </AppLayout>
  );
}
