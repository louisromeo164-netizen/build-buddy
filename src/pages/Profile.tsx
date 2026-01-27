import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { User, Mail, Phone, Car, Star, LogOut, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DriverDetails } from '@/lib/types';

export default function Profile() {
  const { profile, signOut, user } = useAuth();
  const navigate = useNavigate();
  const [driverDetails, setDriverDetails] = useState<DriverDetails | null>(null);

  useEffect(() => {
    if (profile?.role === 'driver' && user) {
      supabase
        .from('driver_details')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => setDriverDetails(data as DriverDetails | null));
    }
  }, [profile, user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (!profile) {
    return (
      <AppLayout title="Profile">
        <Card>
          <CardContent className="py-12 text-center">
            <p>Loading profile...</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Profile">
      <div className="space-y-4">
        {/* Profile Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center">
                <User className="w-10 h-10 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{profile.full_name}</h2>
                <Badge variant="secondary" className="mt-1">
                  {profile.role === 'driver' ? 'Driver' : 'Passenger'}
                </Badge>
                <div className="flex items-center gap-1 mt-2">
                  <Star className="w-4 h-4 fill-warning text-warning" />
                  <span className="text-sm">4.8 rating</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {profile.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <span>{profile.email}</span>
              </div>
            )}
            {profile.phone_number && (
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <span>{profile.phone_number}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vehicle Info (Drivers only) */}
        {profile.role === 'driver' && driverDetails && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Vehicle Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Car className="w-5 h-5 text-muted-foreground" />
                <span>
                  {driverDetails.car_color} {driverDetails.car_make} {driverDetails.car_model}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 text-center text-xs font-bold text-muted-foreground">
                  #
                </span>
                <span>{driverDetails.license_plate}</span>
              </div>
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-muted-foreground" />
                <span>{driverDetails.seats_available} seats available</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start" disabled>
            <Settings className="w-4 h-4 mr-3" />
            Edit Profile (Coming Soon)
          </Button>
          <Button
            variant="destructive"
            className="w-full justify-start"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-3" />
            Sign Out
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
