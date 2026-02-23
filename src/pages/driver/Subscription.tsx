import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeError } from '@/lib/errorUtils';
import { MobileMoneyPayment } from '@/components/payments/MobileMoneyPayment';
import { Shield, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface Subscription {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  expires_at: string;
}

export default function Subscription() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);

  const fetchSubscription = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from('driver_subscriptions')
      .select('*')
      .eq('driver_id', user.id)
      .eq('status', 'active')
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setSubscription(data as Subscription | null);
    setLoading(false);
  };

  useEffect(() => {
    fetchSubscription();
  }, [user]);

  const isActive = subscription && new Date(subscription.expires_at) > new Date();
  const daysLeft = subscription ? differenceInDays(new Date(subscription.expires_at), new Date()) : 0;

  const handlePaymentSuccess = async (paymentId: string) => {
    if (!user) return;
    try {
      const { error } = await (supabase as any).from('driver_subscriptions').insert({
        driver_id: user.id,
        amount: 6000,
        status: 'active',
        payment_method: 'mobile_money',
        payment_reference: paymentId,
      });

      if (error) throw error;

      toast({ title: 'Subscription activated!', description: 'Your weekly subscription is now active.' });
      setShowPayment(false);
      fetchSubscription();
    } catch (error: any) {
      toast({ title: 'Error', description: sanitizeError(error), variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <AppLayout title="Subscription">
        <Card className="animate-pulse"><CardContent className="h-48" /></Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Subscription">
      <div className="space-y-4">
        {/* Status Card */}
        <Card className={isActive ? 'border-success/30' : 'border-destructive/30'}>
          <CardContent className="p-6 text-center">
            {isActive ? (
              <>
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-success" />
                <h3 className="text-lg font-semibold">Subscription Active</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Expires {format(new Date(subscription!.expires_at), 'MMM d, yyyy')}
                </p>
                <Badge variant={daysLeft <= 2 ? 'destructive' : 'default'} className="mt-2">
                  {daysLeft} days remaining
                </Badge>
                {daysLeft <= 2 && (
                  <p className="text-xs text-destructive mt-2 flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Renew soon to avoid service interruption
                  </p>
                )}
              </>
            ) : (
              <>
                <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-destructive" />
                <h3 className="text-lg font-semibold">No Active Subscription</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Subscribe to post rides and accept bookings
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Subscription Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Weekly Driver Plan
            </CardTitle>
            <CardDescription>Access all platform features for 7 days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Weekly fee</span>
              <span className="text-xl font-bold text-primary">UGX 6,000</span>
            </div>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-success" /> Post unlimited rides</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-success" /> Accept passenger bookings</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-success" /> Earn UGX 3,000 per passenger</li>
              <li className="flex items-center gap-2"><Clock className="w-4 h-4 text-muted-foreground" /> 7-day access period</li>
            </ul>

            {!showPayment ? (
              <Button className="w-full" onClick={() => setShowPayment(true)}>
                {isActive ? 'Renew Subscription' : 'Subscribe Now — UGX 6,000'}
              </Button>
            ) : null}
          </CardContent>
        </Card>

        {/* Payment Form */}
        {showPayment && (
          <MobileMoneyPayment
            amount={6000}
            paymentType="subscription"
            onSuccess={handlePaymentSuccess}
            onCancel={() => setShowPayment(false)}
          />
        )}
      </div>
    </AppLayout>
  );
}
