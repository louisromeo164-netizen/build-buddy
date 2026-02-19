import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Car, Users, MapPin, Shield, Banknote } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
        <div className="container mx-auto px-4 py-16 relative bg-primary-foreground">
          <div className="text-center max-w-3xl mx-auto animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-accent px-4 py-2 rounded-full mb-6">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">dailyRoute Uganda</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              <span className="text-primary">dailyRoute</span>
              <br />Share Rides, Save Money
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Connect with drivers and passengers heading your way. 
              Safe, affordable rides at just UGX 4,000 per seat.
            </p>
          </div>
        </div>
      </div>

      {/* Role Selection */}
      <div className="container mx-auto px-4 py-12">
        <h2 className="text-2xl font-semibold text-center mb-8">How do you want to use dailyRoute?</h2>
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Driver Card */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-all hover:border-primary group animate-slide-up"
            onClick={() => navigate('/auth/driver')}>

            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-accent flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                <Car className="w-10 h-10 text-primary" />
              </div>
              <CardTitle className="text-xl">I'm a Driver</CardTitle>
              <CardDescription>
                Share your car and earn money on your daily commute
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Banknote className="w-4 h-4 text-primary" />
                <span>Earn UGX 4,000 per passenger</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary" />
                <span>Post rides on your route</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Shield className="w-4 h-4 text-primary" />
                <span>Verified passenger ratings</span>
              </div>
              <Button className="w-full mt-4" size="lg">
                Continue as Driver
              </Button>
            </CardContent>
          </Card>

          {/* Passenger Card */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-all hover:border-secondary group animate-slide-up"
            style={{ animationDelay: '0.1s' }}
            onClick={() => navigate('/auth/passenger')}>

            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-secondary/20 flex items-center justify-center mb-4 group-hover:bg-secondary/30 transition-colors">
                <Users className="w-10 h-10 text-secondary-foreground" />
              </div>
              <CardTitle className="text-xl">I'm a Passenger</CardTitle>
              <CardDescription>
                Find affordable rides to your destination
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Banknote className="w-4 h-4 text-secondary-foreground" />
                <span>Only UGX 4,000 per ride</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 text-secondary-foreground" />
                <span>Search by pickup & destination</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Shield className="w-4 h-4 text-secondary-foreground" />
                <span>Verified driver ratings</span>
              </div>
              <Button variant="secondary" className="w-full mt-4" size="lg">
                Continue as Passenger
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Features */}
      <div className="bg-muted/50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-semibold text-center mb-12">Why Choose dailyRoute?</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Banknote className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Affordable</h3>
              <p className="text-sm text-muted-foreground">
                Fixed fare of UGX 4,000 per ride. No surge pricing.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Safe & Trusted</h3>
              <p className="text-sm text-muted-foreground">
                Verified users with ratings and reviews.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Easy to Use</h3>
              <p className="text-sm text-muted-foreground">
                Find rides quickly with simple search and booking.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 dailyRoute Uganda. Safe rides, happy journeys.</p>
        </div>
      </footer>
    </div>);

};

export default Index;