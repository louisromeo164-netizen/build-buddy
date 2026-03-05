import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useToast } from '@/hooks/use-toast';
import { sanitizeError } from '@/lib/errorUtils';
import {
  DollarSign, Users, Car, TrendingUp, LogOut, Calendar, MapPin, Shield,
  UserCheck, UserX, Ban, CheckCircle, XCircle, Eye, Search, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

interface PlatformStats {
  total_bookings: number;
  total_rides: number;
  total_users: number;
  total_commission: number;
  weekly_commission: number;
  daily_commission: number;
  total_subscription_revenue: number;
  active_drivers: number;
  inactive_drivers: number;
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

interface UserRecord {
  user_id: string;
  full_name: string;
  email: string | null;
  phone_number: string | null;
  role: string;
  created_at: string;
  has_active_subscription: boolean;
  is_suspended: boolean;
}

interface RideBooking {
  booking_id: string;
  passenger_name: string;
  seats_booked: number;
  status: string;
  created_at: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { toast } = useToast();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rides, setRides] = useState<RideWithDriver[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [rideSearch, setRideSearch] = useState('');

  // Dialog states
  const [suspendDialog, setSuspendDialog] = useState<{ open: boolean; user: UserRecord | null; reason: string }>({ open: false, user: null, reason: '' });
  const [cancelRideDialog, setCancelRideDialog] = useState<{ open: boolean; ride: RideWithDriver | null }>({ open: false, ride: null });
  const [bookingsDialog, setBookingsDialog] = useState<{ open: boolean; ride: RideWithDriver | null; bookings: RideBooking[] }>({ open: false, ride: null, bookings: [] });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    const [statsRes, txRes, ridesRes, usersRes] = await Promise.all([
      (supabase as any).rpc('get_platform_stats').single(),
      supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('rides').select('id, pickup_location, destination, departure_time, available_seats, status, driver_id').order('created_at', { ascending: false }).limit(50),
      (supabase as any).rpc('admin_list_users'),
    ]);

    if (statsRes.data) setStats(statsRes.data as PlatformStats);
    if (txRes.data) setTransactions(txRes.data as Transaction[]);
    if (usersRes.data) setUsers(usersRes.data as UserRecord[]);

    if (ridesRes.data) {
      const driverIds = [...new Set(ridesRes.data.map((r: any) => r.driver_id))].slice(0, 50);
      const { data: profiles } = await supabase.from('profiles_public').select('user_id, full_name').in('user_id', driverIds).limit(50);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      setRides(ridesRes.data.map((ride: any) => ({ ...ride, driver_profile: profileMap.get(ride.driver_id) || null })));
    }
    setLoading(false);
  };

  const handleSuspend = async () => {
    if (!suspendDialog.user) return;
    setActionLoading(true);
    try {
      const { error } = await (supabase as any).rpc('admin_suspend_user', {
        _target_user_id: suspendDialog.user.user_id,
        _reason: suspendDialog.reason || 'Suspended by admin',
      });
      if (error) throw error;
      toast({ title: 'User suspended', description: `${suspendDialog.user.full_name} has been suspended.` });
      setSuspendDialog({ open: false, user: null, reason: '' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: sanitizeError(err), variant: 'destructive' });
    }
    setActionLoading(false);
  };

  const handleUnsuspend = async (u: UserRecord) => {
    setActionLoading(true);
    try {
      const { error } = await (supabase as any).rpc('admin_unsuspend_user', { _target_user_id: u.user_id });
      if (error) throw error;
      toast({ title: 'User unsuspended', description: `${u.full_name} has been unsuspended.` });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: sanitizeError(err), variant: 'destructive' });
    }
    setActionLoading(false);
  };

  const handleCancelRide = async () => {
    if (!cancelRideDialog.ride) return;
    setActionLoading(true);
    try {
      const { error } = await (supabase as any).rpc('admin_cancel_ride', { _ride_id: cancelRideDialog.ride.id });
      if (error) throw error;
      toast({ title: 'Ride cancelled', description: 'The ride and its bookings have been cancelled.' });
      setCancelRideDialog({ open: false, ride: null });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: sanitizeError(err), variant: 'destructive' });
    }
    setActionLoading(false);
  };

  const handleViewBookings = async (ride: RideWithDriver) => {
    const { data } = await (supabase as any).rpc('admin_get_ride_bookings', { _ride_id: ride.id });
    setBookingsDialog({ open: true, ride, bookings: (data || []) as RideBooking[] });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.phone_number || '').includes(userSearch)
  );

  const filteredRides = rides.filter(r =>
    r.pickup_location.toLowerCase().includes(rideSearch.toLowerCase()) ||
    r.destination.toLowerCase().includes(rideSearch.toLowerCase()) ||
    (r.driver_profile?.full_name || '').toLowerCase().includes(rideSearch.toLowerCase())
  );

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading admin dashboard...</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-xl text-primary">dailyRoute Admin</h1>
            <p className="text-xs text-muted-foreground">Platform Management</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2"><DollarSign className="w-4 h-4" />Total Commission</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">UGX {(stats?.total_commission || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">All time earnings</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2"><TrendingUp className="w-4 h-4" />Weekly Commission</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">UGX {(stats?.weekly_commission || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2"><Shield className="w-4 h-4" />Subscription Revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">UGX {(stats?.total_subscription_revenue || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Driver subscriptions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2"><Users className="w-4 h-4" />Total Users</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.total_users || 0}</p>
              <p className="text-xs text-muted-foreground">Registered users</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2"><Car className="w-4 h-4" />Total Rides</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.total_rides || 0}</p>
              <p className="text-xs text-muted-foreground">Rides posted</p>
            </CardContent>
          </Card>
        </div>

        {/* Driver Activity */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-success/30">
            <CardContent className="p-4 flex items-center gap-4">
              <UserCheck className="w-8 h-8 text-success" />
              <div>
                <p className="text-2xl font-bold">{stats?.active_drivers || 0}</p>
                <p className="text-sm text-muted-foreground">Active Drivers</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-destructive/30">
            <CardContent className="p-4 flex items-center gap-4">
              <UserX className="w-8 h-8 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{stats?.inactive_drivers || 0}</p>
                <p className="text-sm text-muted-foreground">Inactive Drivers</p>
              </div>
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

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="rides">Rides</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>{users.length} registered users</CardDescription>
                  </div>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="pl-9" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredUsers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No users found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map(u => (
                          <TableRow key={u.user_id}>
                            <TableCell className="font-medium">{u.full_name}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {u.email && <div>{u.email}</div>}
                                {u.phone_number && <div className="text-muted-foreground">{u.phone_number}</div>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={u.role === 'driver' ? 'default' : 'secondary'}>{u.role}</Badge>
                              {u.role === 'driver' && (
                                <Badge variant={u.has_active_subscription ? 'default' : 'outline'} className="ml-1 text-xs">
                                  {u.has_active_subscription ? 'Subscribed' : 'No sub'}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {u.is_suspended ? (
                                <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                                  <Ban className="w-3 h-3" /> Suspended
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="flex items-center gap-1 w-fit text-success border-success/30">
                                  <CheckCircle className="w-3 h-3" /> Active
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">{format(new Date(u.created_at), 'MMM d, yyyy')}</TableCell>
                            <TableCell className="text-right">
                              {u.is_suspended ? (
                                <Button size="sm" variant="outline" onClick={() => handleUnsuspend(u)} disabled={actionLoading}>
                                  <CheckCircle className="w-3 h-3 mr-1" /> Unsuspend
                                </Button>
                              ) : (
                                <Button size="sm" variant="destructive" onClick={() => setSuspendDialog({ open: true, user: u, reason: '' })} disabled={actionLoading}>
                                  <Ban className="w-3 h-3 mr-1" /> Suspend
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rides Tab */}
          <TabsContent value="rides">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Ride Monitoring</CardTitle>
                    <CardDescription>All rides on the platform</CardDescription>
                  </div>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search rides..." value={rideSearch} onChange={e => setRideSearch(e.target.value)} className="pl-9" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredRides.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No rides found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Driver</TableHead>
                          <TableHead>Route</TableHead>
                          <TableHead>Departure</TableHead>
                          <TableHead>Seats</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRides.map(ride => (
                          <TableRow key={ride.id}>
                            <TableCell>{ride.driver_profile?.full_name || 'Unknown'}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <MapPin className="w-3 h-3 shrink-0" />
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
                              }>{ride.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button size="sm" variant="outline" onClick={() => handleViewBookings(ride)}>
                                <Eye className="w-3 h-3 mr-1" /> Bookings
                              </Button>
                              {ride.status === 'available' && (
                                <Button size="sm" variant="destructive" onClick={() => setCancelRideDialog({ open: true, ride })} disabled={actionLoading}>
                                  <XCircle className="w-3 h-3 mr-1" /> Cancel
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Commission earned from completed rides</CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No transactions yet.</p>
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
                      {transactions.map(tx => (
                        <TableRow key={tx.id}>
                          <TableCell>{format(new Date(tx.created_at), 'MMM d, yyyy')}</TableCell>
                          <TableCell>{tx.seats_count}</TableCell>
                          <TableCell>UGX {tx.total_amount.toLocaleString()}</TableCell>
                          <TableCell className="text-primary font-medium">UGX {tx.platform_commission.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>{tx.status}</Badge>
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

      {/* Suspend User Dialog */}
      <Dialog open={suspendDialog.open} onOpenChange={open => !open && setSuspendDialog({ open: false, user: null, reason: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend User</DialogTitle>
            <DialogDescription>
              Suspend <strong>{suspendDialog.user?.full_name}</strong>? They won't be able to use the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Input id="reason" placeholder="Reason for suspension..." value={suspendDialog.reason} onChange={e => setSuspendDialog(prev => ({ ...prev, reason: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialog({ open: false, user: null, reason: '' })}>Cancel</Button>
            <Button variant="destructive" onClick={handleSuspend} disabled={actionLoading}>
              {actionLoading ? 'Suspending...' : 'Suspend User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Ride Dialog */}
      <Dialog open={cancelRideDialog.open} onOpenChange={open => !open && setCancelRideDialog({ open: false, ride: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Ride</DialogTitle>
            <DialogDescription>
              This will cancel the ride and all its active bookings. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {cancelRideDialog.ride && (
            <div className="text-sm space-y-1">
              <p><strong>Route:</strong> {cancelRideDialog.ride.pickup_location} → {cancelRideDialog.ride.destination}</p>
              <p><strong>Departure:</strong> {format(new Date(cancelRideDialog.ride.departure_time), 'MMM d, yyyy HH:mm')}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelRideDialog({ open: false, ride: null })}>Keep Ride</Button>
            <Button variant="destructive" onClick={handleCancelRide} disabled={actionLoading}>
              {actionLoading ? 'Cancelling...' : 'Cancel Ride'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Bookings Dialog */}
      <Dialog open={bookingsDialog.open} onOpenChange={open => !open && setBookingsDialog({ open: false, ride: null, bookings: [] })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ride Bookings</DialogTitle>
            {bookingsDialog.ride && (
              <DialogDescription>
                {bookingsDialog.ride.pickup_location} → {bookingsDialog.ride.destination}
              </DialogDescription>
            )}
          </DialogHeader>
          {bookingsDialog.bookings.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No bookings for this ride.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Passenger</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookingsDialog.bookings.map(b => (
                  <TableRow key={b.booking_id}>
                    <TableCell>{b.passenger_name}</TableCell>
                    <TableCell>{b.seats_booked}</TableCell>
                    <TableCell>
                      <Badge variant={b.status === 'confirmed' ? 'default' : b.status === 'cancelled' ? 'destructive' : 'secondary'}>{b.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{format(new Date(b.created_at), 'MMM d, HH:mm')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
