import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Ride } from '@/lib/types';
import { RideCard } from '@/components/rides/RideCard';
import { Search, MapPin, Filter } from 'lucide-react';

export default function SearchRides() {
  const navigate = useNavigate();
  const location = useLocation();
  const [from, setFrom] = useState(location.state?.from || '');
  const [to, setTo] = useState(location.state?.to || location.state?.query || '');
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const searchRides = async () => {
    setLoading(true);
    setSearched(true);

    let query = supabase
      .from('rides')
      .select(`
        *,
        driver_profile:profiles!rides_driver_id_fkey(user_id, full_name, avatar_url, role),
        driver_details:driver_details!driver_details_user_id_fkey(*)
      `)
      .eq('status', 'available')
      .gt('available_seats', 0)
      .gte('departure_time', new Date().toISOString())
      .order('departure_time', { ascending: true });

    if (from.trim()) {
      query = query.ilike('pickup_location', `%${from.trim()}%`);
    }
    if (to.trim()) {
      query = query.ilike('destination', `%${to.trim()}%`);
    }

    const { data, error } = await query;

    if (!error && data) {
      const transformedRides = data.map((ride: any) => ({
        ...ride,
        driver_profile: Array.isArray(ride.driver_profile) 
          ? ride.driver_profile[0] 
          : ride.driver_profile,
        driver_details: Array.isArray(ride.driver_details) 
          ? ride.driver_details[0] 
          : ride.driver_details,
      })) as Ride[];
      setRides(transformedRides);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (from || to) {
      searchRides();
    }
  }, []);

  return (
    <AppLayout title="Search Rides">
      <div className="space-y-4">
        {/* Search Form */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-primary" />
              <Input
                placeholder="From (e.g., Kampala)"
                className="pl-10"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-secondary-foreground" />
              <Input
                placeholder="To (e.g., Entebbe)"
                className="pl-10"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={searchRides} disabled={loading}>
              <Search className="w-4 h-4 mr-2" />
              {loading ? 'Searching...' : 'Search Rides'}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {searched && (
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              {rides.length} {rides.length === 1 ? 'ride' : 'rides'} found
            </p>

            {rides.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No rides match your search</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try different locations or check back later
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {rides.map((ride) => (
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
        )}
      </div>
    </AppLayout>
  );
}
