import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { DollarSign, Users, Car, TrendingUp, LogOut, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';

interface PlatformStats {
  total_bookings: number;
  total_rides: number;
  total_users: number;
  total_commission: number;
  weekly_commission: number;
  daily_commission: number;
}

interface Transaction {
  id: string;
  booking_id: string;
  passenger_id: string;
  driver_id: string;
  total_amount: number;
  driver_amount: number;
  platform_commission: number;
  seats_count: number;
  status: string;
  created_at: string;
}

interface RideWithDriver {
  id: string;
  pickup_location: string;
  destination: string;
  departure_time: string;
  available_seats: number;
  status: string;
  driver_profile?: { full_name: string } | null;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rides, setRides] = useState<RideWithDriver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch stats via secure admin-only RPC
    const { data: statsData } = await supabase
      .rpc('get_platform_stats')
      .single();
    
    if (statsData) {
      setStats(statsData as PlatformStats);
    }

    // Fetch recent transactions
    const { data: txData } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (txData) {
      setTransactions(txData as Transaction[]);
    }

    // Fetch recent rides with driver info
    const { data: ridesData } = await supabase
      .from('rides')
      .select(`
        id,
        pickup_location,
        destination,
        departure_time,
        available_seats,
        status,
        driver_id
      `)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (ridesData) {
      // Fetch driver profiles separately
      const driverIds = [...new Set(ridesData.map(r => r.driver_id))].slice(0, 50);
      const { data: profiles } = await supabase
        .from('profiles_public')
        .select('user_id, full_name')
        .in('user_id', driverIds)
        .limit(50);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      const ridesWithDrivers = ridesData.map(ride => ({
        ...ride,
        driver_profile: profileMap.get(ride.driver_id) || null
      }));
      
      setRides(ridesWithDrivers);
    }

    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading admin dashboard...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-xl text-primary">dailyRoute Admin</h1>
            <p className="text-xs text-muted-foreground">Platform Management</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Total Commission
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">
                UGX {(stats?.total_commission || 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">All time earnings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Weekly Commission
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">
                UGX {(stats?.weekly_commission || 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total Users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.total_users || 0}</p>
              <p className="text-xs text-muted-foreground">Registered users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Car className="w-4 h-4" />
                Total Rides
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.total_rides || 0}</p>
              <p className="text-xs text-muted-foreground">Rides posted</p>
            </CardContent>
          </Card>
        </div>

        {/* Commission Breakdown */}
        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10">
          <CardHeader>
            <CardTitle>Commission Structure</CardTitle>
            <CardDescription>Fare breakdown per passenger</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-background rounded-lg">
                <p className="text-2xl font-bold">UGX 4,000</p>
                <p className="text-sm text-muted-foreground">Total Fare</p>
              </div>
              <div className="p-4 bg-background rounded-lg border">
                <p className="text-2xl font-bold text-secondary">UGX 3,000</p>
                <p className="text-sm text-muted-foreground">Driver Receives</p>
              </div>
              <div className="p-4 bg-background rounded-lg border">
                <p className="text-2xl font-bold text-primary">UGX 1,000</p>
                <p className="text-sm text-muted-foreground">Platform Commission</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for data tables */}
        <Tabs defaultValue="transactions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="rides">Recent Rides</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Commission earned from completed rides</CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No transactions yet. Commission will appear here when passengers complete rides.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Seats</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Commission</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell>{format(new Date(tx.created_at), 'MMM d, yyyy')}</TableCell>
                          <TableCell>{tx.seats_count}</TableCell>
                          <TableCell>UGX {tx.total_amount.toLocaleString()}</TableCell>
                          <TableCell className="text-primary font-medium">
                            UGX {tx.platform_commission.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>
                              {tx.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rides">
            <Card>
              <CardHeader>
                <CardTitle>Recent Rides</CardTitle>
                <CardDescription>All rides posted on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                {rides.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No rides posted yet.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Driver</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Departure</TableHead>
                        <TableHead>Seats</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rides.map((ride) => (
                        <TableRow key={ride.id}>
                          <TableCell>{ride.driver_profile?.full_name || 'Unknown'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <MapPin className="w-3 h-3" />
                              {ride.pickup_location} → {ride.destination}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(ride.departure_time), 'MMM d, HH:mm')}
                            </div>
                          </TableCell>
                          <TableCell>{ride.available_seats}</TableCell>
                          <TableCell>
                            <Badge variant={
                              ride.status === 'available' ? 'default' :
                              ride.status === 'completed' ? 'secondary' : 'destructive'
                            }>
                              {ride.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
