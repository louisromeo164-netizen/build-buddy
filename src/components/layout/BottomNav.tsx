import { NavLink, useLocation } from 'react-router-dom';
import { Home, Search, PlusCircle, Calendar, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

export function BottomNav() {
  const location = useLocation();
  const { profile } = useAuth();
  
  const isDriver = profile?.role === 'driver';
  const basePath = isDriver ? '/driver' : '/passenger';

  const driverLinks = [
    { to: '/driver', icon: Home, label: 'Home' },
    { to: '/driver/post-ride', icon: PlusCircle, label: 'Post Ride' },
    { to: '/driver/my-rides', icon: Calendar, label: 'My Rides' },
    { to: '/driver/profile', icon: User, label: 'Profile' },
  ];

  const passengerLinks = [
    { to: '/passenger', icon: Home, label: 'Home' },
    { to: '/passenger/search', icon: Search, label: 'Search' },
    { to: '/passenger/bookings', icon: Calendar, label: 'Bookings' },
    { to: '/passenger/profile', icon: User, label: 'Profile' },
  ];

  const links = isDriver ? driverLinks : passengerLinks;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t z-50">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {links.map((link) => {
          const isActive = location.pathname === link.to;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-4 py-2 text-xs transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <link.icon className={cn('w-5 h-5', isActive && 'text-primary')} />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
