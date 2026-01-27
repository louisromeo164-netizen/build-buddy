import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Users, Car, Star } from 'lucide-react';
import { Ride } from '@/lib/types';

interface RideCardProps {
  ride: Ride;
  onBook?: () => void;
  onView?: () => void;
  showBookButton?: boolean;
  showStatus?: boolean;
}

export function RideCard({ ride, onBook, onView, showBookButton = false, showStatus = false }: RideCardProps) {
  const departureTime = new Date(ride.departure_time);
  const isAvailable = ride.status === 'available' && ride.available_seats > 0;

  return (
    <Card className="hover:shadow-md transition-shadow animate-fade-in">
      <CardContent className="p-4">
        {/* Route */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <div className="w-0.5 h-8 bg-border" />
            <div className="w-3 h-3 rounded-full bg-secondary" />
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">From</p>
              <p className="font-medium">{ride.pickup_location}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">To</p>
              <p className="font-medium">{ride.destination}</p>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{format(departureTime, 'MMM d, h:mm a')}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{ride.available_seats} seats</span>
          </div>
          <Badge variant={isAvailable ? 'default' : 'secondary'}>
            UGX {ride.fare_per_seat.toLocaleString()}
          </Badge>
        </div>

        {/* Driver info */}
        {ride.driver_profile && (
          <div className="flex items-center gap-3 py-3 border-t">
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
              <Car className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{ride.driver_profile.full_name}</p>
              {ride.driver_details && (
                <p className="text-xs text-muted-foreground">
                  {ride.driver_details.car_make} {ride.driver_details.car_model}
                  {ride.driver_details.car_color && ` • ${ride.driver_details.car_color}`}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Star className="w-4 h-4 fill-warning text-warning" />
              <span>4.8</span>
            </div>
          </div>
        )}

        {/* Status */}
        {showStatus && (
          <div className="mt-3">
            <Badge
              variant={
                ride.status === 'available' ? 'default' :
                ride.status === 'completed' ? 'secondary' :
                ride.status === 'cancelled' ? 'destructive' : 'outline'
              }
            >
              {ride.status.charAt(0).toUpperCase() + ride.status.slice(1)}
            </Badge>
          </div>
        )}

        {/* Actions */}
        {(showBookButton || onView) && (
          <div className="flex gap-2 mt-4">
            {onView && (
              <Button variant="outline" className="flex-1" onClick={onView}>
                View Details
              </Button>
            )}
            {showBookButton && isAvailable && onBook && (
              <Button className="flex-1" onClick={onBook}>
                Book Ride
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
