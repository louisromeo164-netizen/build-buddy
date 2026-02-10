import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Ride, Profile, DriverDetails } from '@/lib/types';
import { RideCard } from '@/components/rides/RideCard';
import { Search, MapPin, TrendingUp } from 'lucide-react';

export default function PassengerHome() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentRides, setRecentRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRides = async () => {
      const { data, error } = await supabase
        .from('rides')
        .select(`
          *,
          driver_profile:profiles!rides_driver_id_fkey(user_id, full_name, avatar_url, role),
          driver_details:driver_details!driver_details_user_id_fkey(*)
        `)
        .eq('status', 'available')
        .gt('available_seats', 0)
        .gte('departure_time', new Date().toISOString())
        .order('departure_time', { ascending: true })
        .limit(5);

      if (!error && data) {
        // Transform the data to match our Ride type
        const transformedRides = data.map((ride: any) => ({
          ...ride,
          driver_profile: Array.isArray(ride.driver_profile) 
            ? ride.driver_profile[0] 
            : ride.driver_profile,
          driver_details: Array.isArray(ride.driver_details) 
            ? ride.driver_details[0] 
            : ride.driver_details,
        })) as Ride[];
        setRecentRides(transformedRides);
      }
      setLoading(false);
    };

    fetchRides();
  }, []);

  const handleSearch = () => {
    navigate('/passenger/search', { state: { query: searchQuery } });
  };

  return (
    <AppLayout title={`Hi, ${profile?.full_name?.split(' ')[0] || 'there'}!`}>
      <div className="space-y-6">
        {/* Search Section */}
        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-0">
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4">Where are you going?</h2>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search destination..."
                  className="pl-10 bg-background"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch}>
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Popular Routes */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-medium">Popular Routes</h3>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {['Kampala → Entebbe', 'Kampala → Jinja', 'Kampala → Mukono'].map((route) => (
              <Button
                key={route}
                variant="outline"
                size="sm"
                className="whitespace-nowrap"
                onClick={() => {
                  const [from, to] = route.split(' → ');
                  navigate('/passenger/search', { state: { from, to } });
                }}
              >
                {route}
              </Button>
            ))}
          </div>
        </div>

        {/* Available Rides */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Available Rides</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/passenger/search')}>
              View All
            </Button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="h-40" />
                </Card>
              ))}
            </div>
          ) : recentRides.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No rides available right now</p>
                <p className="text-sm text-muted-foreground mt-1">Check back soon!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentRides.map((ride) => (
                <RideCard
                  key={ride.id}
                  ride={ride}
                  showBookButton
                  onBook={() => navigate(`/passenger/book/${ride.id}`)}
                  onView={() => navigate(`/passenger/ride/${ride.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
