import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Booking, Ride, Profile, DriverDetails } from '@/lib/types';
import { MapPin, Clock, Users, Calendar, X } from 'lucide-react';

interface BookingWithRide extends Booking {
  ride: Ride & {
    driver_profile: Profile;
    driver_details: DriverDetails;
  };
}

export default function MyBookings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingWithRide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchBookings = async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          ride:rides(
            *,
            driver_profile:profiles!rides_driver_id_fkey(*),
            driver_details:driver_details!driver_details_user_id_fkey(*)
          )
        `)
        .eq('passenger_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const transformedBookings = data.map((booking: any) => ({
          ...booking,
          ride: {
            ...booking.ride,
            driver_profile: Array.isArray(booking.ride.driver_profile) 
              ? booking.ride.driver_profile[0] 
              : booking.ride.driver_profile,
            driver_details: Array.isArray(booking.ride.driver_details) 
              ? booking.ride.driver_details[0] 
              : booking.ride.driver_details,
          },
        })) as BookingWithRide[];
        setBookings(transformedBookings);
      }
      setLoading(false);
    };

    fetchBookings();
  }, [user]);

  const cancelBooking = async (booking: BookingWithRide) => {
    try {
      await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', booking.id);

      // Restore seats
      await supabase
        .from('rides')
        .update({ 
          available_seats: booking.ride.available_seats + booking.seats_booked,
          status: 'available'
        })
        .eq('id', booking.ride_id);

      setBookings(prev => prev.map(b => 
        b.id === booking.id ? { ...b, status: 'cancelled' } : b
      ));

      toast({ title: 'Booking cancelled' });
    } catch (error) {
      toast({ title: 'Failed to cancel', variant: 'destructive' });
    }
  };

  const activeBookings = bookings.filter(b => ['pending', 'confirmed'].includes(b.status));
  const pastBookings = bookings.filter(b => ['completed', 'cancelled'].includes(b.status));

  const BookingCard = ({ booking }: { booking: BookingWithRide }) => {
    const ride = booking.ride;
    const isPast = ['completed', 'cancelled'].includes(booking.status);

    return (
      <Card className="animate-fade-in">
        <CardContent className="p-4">
          {/* Status Badge */}
          <div className="flex justify-between items-start mb-3">
            <Badge
              variant={
                booking.status === 'confirmed' ? 'default' :
                booking.status === 'pending' ? 'secondary' :
                booking.status === 'cancelled' ? 'destructive' : 'outline'
              }
            >
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {booking.seats_booked} {booking.seats_booked === 1 ? 'seat' : 'seats'}
            </span>
          </div>

          {/* Route */}
          <div className="flex items-start gap-3 mb-3">
            <div className="flex flex-col items-center">
              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
              <div className="w-0.5 h-6 bg-border" />
              <div className="w-2.5 h-2.5 rounded-full bg-secondary" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="font-medium text-sm">{ride.pickup_location}</p>
              <p className="font-medium text-sm">{ride.destination}</p>
            </div>
          </div>

          {/* Details */}
          <div className="flex gap-4 text-sm text-muted-foreground mb-3">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{format(new Date(ride.departure_time), 'MMM d')}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{format(new Date(ride.departure_time), 'h:mm a')}</span>
            </div>
          </div>

          {/* Driver */}
          {ride.driver_profile && (
            <div className="flex items-center gap-3 pt-3 border-t text-sm">
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">{ride.driver_profile.full_name}</p>
                {ride.driver_details && (
                  <p className="text-xs text-muted-foreground">
                    {ride.driver_details.car_make} {ride.driver_details.car_model}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          {!isPast && (
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => cancelBooking(booking)}
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const EmptyState = ({ message }: { message: string }) => (
    <Card>
      <CardContent className="py-12 text-center">
        <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );

  return (
    <AppLayout title="My Bookings">
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="active">Upcoming ({activeBookings.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({pastBookings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Card key={i} className="h-40 animate-pulse" />)}
            </div>
          ) : activeBookings.length === 0 ? (
            <EmptyState message="No upcoming bookings" />
          ) : (
            activeBookings.map(booking => (
              <BookingCard key={booking.id} booking={booking} />
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Card key={i} className="h-40 animate-pulse" />)}
            </div>
          ) : pastBookings.length === 0 ? (
            <EmptyState message="No past bookings" />
          ) : (
            pastBookings.map(booking => (
              <BookingCard key={booking.id} booking={booking} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
