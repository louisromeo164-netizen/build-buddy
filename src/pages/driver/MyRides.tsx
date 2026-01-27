import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Ride } from '@/lib/types';
import { RideCard } from '@/components/rides/RideCard';
import { Car } from 'lucide-react';

export default function MyRides() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchRides = async () => {
      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('driver_id', user.id)
        .order('departure_time', { ascending: false });

      if (!error) {
        setRides((data as Ride[]) || []);
      }
      setLoading(false);
    };

    fetchRides();
  }, [user]);

  const activeRides = rides.filter(r => ['available', 'full'].includes(r.status));
  const pastRides = rides.filter(r => ['completed', 'cancelled'].includes(r.status));

  const EmptyState = ({ message }: { message: string }) => (
    <Card>
      <CardContent className="py-12 text-center">
        <Car className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );

  return (
    <AppLayout title="My Rides">
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="active">Active ({activeRides.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({pastRides.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Card key={i} className="h-32 animate-pulse" />)}
            </div>
          ) : activeRides.length === 0 ? (
            <EmptyState message="No active rides" />
          ) : (
            activeRides.map(ride => (
              <RideCard
                key={ride.id}
                ride={ride}
                showStatus
                onView={() => navigate(`/driver/ride/${ride.id}`)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Card key={i} className="h-32 animate-pulse" />)}
            </div>
          ) : pastRides.length === 0 ? (
            <EmptyState message="No past rides" />
          ) : (
            pastRides.map(ride => (
              <RideCard
                key={ride.id}
                ride={ride}
                showStatus
                onView={() => navigate(`/driver/ride/${ride.id}`)}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
