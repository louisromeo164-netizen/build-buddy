import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Ride, Booking } from '@/lib/types';
import { RideCard } from '@/components/rides/RideCard';
import { Car, Calendar, Users, TrendingUp, PlusCircle } from 'lucide-react';

export default function DriverHome() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [upcomingRides, setUpcomingRides] = useState<Ride[]>([]);
  const [stats, setStats] = useState({ totalRides: 0, totalPassengers: 0, activeRides: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Fetch upcoming rides
        const { data: rides } = await supabase
          .from('rides')
          .select('*')
          .eq('driver_id', user.id)
          .in('status', ['available', 'full'])
          .gte('departure_time', new Date().toISOString())
          .order('departure_time', { ascending: true })
          .limit(3);

        setUpcomingRides((rides as Ride[]) || []);

        // Fetch stats
        const { count: totalRides } = await supabase
          .from('rides')
          .select('*', { count: 'exact', head: true })
          .eq('driver_id', user.id);

        const { count: activeRides } = await supabase
          .from('rides')
          .select('*', { count: 'exact', head: true })
          .eq('driver_id', user.id)
          .in('status', ['available', 'full']);

        const { data: bookingsData } = await supabase
          .from('bookings')
          .select('seats_booked, ride_id')
          .eq('status', 'confirmed');

        // Filter bookings for this driver's rides
        const rideIds = (rides || []).map((r: Ride) => r.id);
        const passengerCount = (bookingsData || [])
          .filter((b: any) => rideIds.includes(b.ride_id))
          .reduce((acc: number, b: any) => acc + b.seats_booked, 0);

        setStats({
          totalRides: totalRides || 0,
          activeRides: activeRides || 0,
          totalPassengers: passengerCount,
        });
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  return (
    <AppLayout title={`Welcome, ${profile?.full_name?.split(' ')[0] || 'Driver'}!`}>
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.activeRides}</p>
              <p className="text-xs text-muted-foreground">Active Rides</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.totalPassengers}</p>
              <p className="text-xs text-muted-foreground">Passengers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.totalRides}</p>
              <p className="text-xs text-muted-foreground">Total Rides</p>
            </CardContent>
          </Card>
        </div>

        {/* Post New Ride CTA */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold mb-1">Share a Ride</h3>
                <p className="text-sm text-muted-foreground">Post your next journey</p>
              </div>
              <Button onClick={() => navigate('/driver/post-ride')}>
                <PlusCircle className="w-4 h-4 mr-2" />
                Post Ride
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Rides */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Upcoming Rides</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/driver/my-rides')}>
              View All
            </Button>
          </div>
          
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="h-32" />
                </Card>
              ))}
            </div>
          ) : upcomingRides.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Car className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No upcoming rides</p>
                <Button variant="link" onClick={() => navigate('/driver/post-ride')}>
                  Post your first ride
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {upcomingRides.map((ride) => (
                <RideCard
                  key={ride.id}
                  ride={ride}
                  showStatus
                  onView={() => navigate(`/driver/ride/${ride.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
