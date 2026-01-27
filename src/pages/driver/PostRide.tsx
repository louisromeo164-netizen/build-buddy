import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { MapPin, CalendarIcon, Clock, Users, Banknote } from 'lucide-react';

const rideSchema = z.object({
  pickup_location: z.string().min(3, 'Please enter pickup location'),
  destination: z.string().min(3, 'Please enter destination'),
  departure_date: z.date({ required_error: 'Please select a date' }),
  departure_time: z.string().min(1, 'Please select a time'),
  available_seats: z.coerce.number().min(1, 'At least 1 seat required').max(8),
  notes: z.string().optional(),
});

type RideFormData = z.infer<typeof rideSchema>;

export default function PostRide() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RideFormData>({
    resolver: zodResolver(rideSchema),
    defaultValues: {
      pickup_location: '',
      destination: '',
      departure_time: '',
      available_seats: 3,
      notes: '',
    },
  });

  const onSubmit = async (data: RideFormData) => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Combine date and time
      const [hours, minutes] = data.departure_time.split(':');
      const departureTime = new Date(data.departure_date);
      departureTime.setHours(parseInt(hours), parseInt(minutes));

      const { error } = await supabase.from('rides').insert({
        driver_id: user.id,
        pickup_location: data.pickup_location,
        destination: data.destination,
        departure_time: departureTime.toISOString(),
        available_seats: data.available_seats,
        fare_per_seat: 4000, // Fixed fare
        notes: data.notes || null,
        status: 'available',
      });

      if (error) throw error;

      toast({ title: 'Ride posted!', description: 'Passengers can now book your ride.' });
      navigate('/driver/my-rides');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to post ride',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout title="Post a Ride">
      <Card>
        <CardHeader>
          <CardTitle>Share Your Journey</CardTitle>
          <CardDescription>
            Post your ride and let passengers join you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Route */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="pickup_location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pickup Location</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-primary" />
                          <Input placeholder="e.g., Kampala Central" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="destination"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destination</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-secondary-foreground" />
                          <Input placeholder="e.g., Entebbe Airport" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="departure_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, 'MMM d') : 'Pick date'}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="departure_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input type="time" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Seats */}
              <FormField
                control={form.control}
                name="available_seats"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Available Seats</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input type="number" min={1} max={8} className="pl-10" {...field} />
                      </div>
                    </FormControl>
                    <FormDescription>How many passengers can you take?</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Fare Info */}
              <div className="flex items-center gap-3 p-4 rounded-lg bg-accent/50">
                <Banknote className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Fixed Fare: UGX 4,000</p>
                  <p className="text-sm text-muted-foreground">Per passenger, cash payment</p>
                </div>
              </div>

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any special instructions or details..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? 'Posting...' : 'Post Ride'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
