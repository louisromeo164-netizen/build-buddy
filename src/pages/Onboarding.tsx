import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/lib/types';
import { User, Phone, Car } from 'lucide-react';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone_number: z.string().min(10, 'Please enter a valid phone number').max(15),
});

const driverSchema = profileSchema.extend({
  car_make: z.string().min(2, 'Car make is required'),
  car_model: z.string().min(1, 'Car model is required'),
  car_color: z.string().optional(),
  license_plate: z.string().min(3, 'License plate is required'),
  seats_available: z.coerce.number().min(1).max(8),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type DriverFormData = z.infer<typeof driverSchema>;

export default function Onboarding() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const role = (location.state?.role as UserRole) || 'passenger';
  const isDriver = role === 'driver';

  const form = useForm<DriverFormData>({
    resolver: zodResolver(isDriver ? driverSchema : profileSchema),
    defaultValues: {
      full_name: '',
      phone_number: '',
      car_make: '',
      car_model: '',
      car_color: '',
      license_plate: '',
      seats_available: 4,
    },
  });

  const onSubmit = async (data: DriverFormData | ProfileFormData) => {
    if (!user) {
      toast({ title: 'Error', description: 'Please sign in first', variant: 'destructive' });
      navigate('/');
      return;
    }

    setIsLoading(true);
    try {
      // Create profile
      const { error: profileError } = await supabase.from('profiles').insert({
        user_id: user.id,
        full_name: data.full_name,
        phone_number: data.phone_number,
        email: user.email,
        role: role,
      });

      if (profileError) throw profileError;

      // If driver, create driver details
      if (isDriver && 'car_make' in data) {
        const { error: driverError } = await supabase.from('driver_details').insert({
          user_id: user.id,
          car_make: data.car_make,
          car_model: data.car_model,
          car_color: data.car_color || null,
          license_plate: data.license_plate,
          seats_available: data.seats_available,
        });

        if (driverError) throw driverError;
      }

      await refreshProfile();
      toast({ title: 'Profile created!', description: 'Welcome to RideShare!' });
      navigate(isDriver ? '/driver' : '/passenger');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create profile',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-lg animate-fade-in">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-accent flex items-center justify-center mb-4">
            {isDriver ? <Car className="w-8 h-8 text-primary" /> : <User className="w-8 h-8 text-primary" />}
          </div>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>
            {isDriver ? 'Tell us about yourself and your vehicle' : 'Tell us a bit about yourself'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="John Doe" className="pl-10" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="+256 700 000 000" className="pl-10" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isDriver && (
                <>
                  <div className="border-t pt-4 mt-6">
                    <h3 className="font-medium mb-4 flex items-center gap-2">
                      <Car className="w-4 h-4" />
                      Vehicle Information
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="car_make"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Car Make</FormLabel>
                          <FormControl>
                            <Input placeholder="Toyota" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="car_model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model</FormLabel>
                          <FormControl>
                            <Input placeholder="Corolla" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="car_color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Color (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="White" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="license_plate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>License Plate</FormLabel>
                          <FormControl>
                            <Input placeholder="UAB 123X" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="seats_available"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Available Seats</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={8} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? 'Creating profile...' : 'Complete Setup'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
