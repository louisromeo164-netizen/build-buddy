import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import DriverAuth from "./pages/auth/DriverAuth";
import PassengerAuth from "./pages/auth/PassengerAuth";
import Onboarding from "./pages/Onboarding";
import DriverHome from "./pages/driver/DriverHome";
import PostRide from "./pages/driver/PostRide";
import MyRides from "./pages/driver/MyRides";
import PassengerHome from "./pages/passenger/PassengerHome";
import SearchRides from "./pages/passenger/SearchRides";
import BookRide from "./pages/passenger/BookRide";
import MyBookings from "./pages/passenger/MyBookings";
import Profile from "./pages/Profile";

const queryClient = new QueryClient();

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: 'driver' | 'passenger' }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!profile) {
    return <Navigate to="/onboarding" replace />;
  }

  if (role && profile.role !== role) {
    return <Navigate to={profile.role === 'driver' ? '/driver' : '/passenger'} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={
        user && profile ? (
          <Navigate to={profile.role === 'driver' ? '/driver' : '/passenger'} replace />
        ) : (
          <Index />
        )
      } />
      <Route path="/auth/driver" element={<DriverAuth />} />
      <Route path="/auth/passenger" element={<PassengerAuth />} />
      <Route path="/onboarding" element={<Onboarding />} />

      {/* Driver routes */}
      <Route path="/driver" element={
        <ProtectedRoute role="driver"><DriverHome /></ProtectedRoute>
      } />
      <Route path="/driver/post-ride" element={
        <ProtectedRoute role="driver"><PostRide /></ProtectedRoute>
      } />
      <Route path="/driver/my-rides" element={
        <ProtectedRoute role="driver"><MyRides /></ProtectedRoute>
      } />
      <Route path="/driver/profile" element={
        <ProtectedRoute role="driver"><Profile /></ProtectedRoute>
      } />

      {/* Passenger routes */}
      <Route path="/passenger" element={
        <ProtectedRoute role="passenger"><PassengerHome /></ProtectedRoute>
      } />
      <Route path="/passenger/search" element={
        <ProtectedRoute role="passenger"><SearchRides /></ProtectedRoute>
      } />
      <Route path="/passenger/book/:id" element={
        <ProtectedRoute role="passenger"><BookRide /></ProtectedRoute>
      } />
      <Route path="/passenger/bookings" element={
        <ProtectedRoute role="passenger"><MyBookings /></ProtectedRoute>
      } />
      <Route path="/passenger/profile" element={
        <ProtectedRoute role="passenger"><Profile /></ProtectedRoute>
      } />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
