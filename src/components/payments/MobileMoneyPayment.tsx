import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeError } from '@/lib/errorUtils';
import { Phone, Loader2, CheckCircle } from 'lucide-react';

interface MobileMoneyPaymentProps {
  amount: number;
  paymentType: 'booking' | 'subscription';
  referenceId?: string;
  onSuccess: (paymentId: string) => void;
  onCancel?: () => void;
}

export function MobileMoneyPayment({ amount, paymentType, referenceId, onSuccess, onCancel }: MobileMoneyPaymentProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [provider, setProvider] = useState<'mtn' | 'airtel'>('mtn');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<'input' | 'confirm' | 'success'>('input');

  const handlePayment = async () => {
    if (!user || !phoneNumber) return;

    // Basic phone validation for Uganda
    const cleanPhone = phoneNumber.replace(/\s/g, '');
    if (!/^(0[7][0-9]{8}|256[7][0-9]{8}|\+256[7][0-9]{8})$/.test(cleanPhone)) {
      toast({
        title: 'Invalid phone number',
        description: 'Please enter a valid Ugandan mobile number',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);
    try {
      // Create payment record
      const { data, error } = await (supabase as any)
        .from('mobile_money_payments')
        .insert({
          user_id: user.id,
          payment_type: paymentType,
          reference_id: referenceId || null,
          provider,
          phone_number: cleanPhone,
          amount,
          status: 'pending',
        })
        .select('id')
        .single();

      if (error) throw error;

      // Simulate mobile money prompt (sandbox mode)
      // In production, this would call the MTN/Airtel API
      setStep('confirm');

      // Simulate payment processing delay
      setTimeout(async () => {
        // Update payment status to completed (sandbox)
        await (supabase as any)
          .from('mobile_money_payments')
          .update({ status: 'completed', transaction_ref: `SIM-${Date.now()}` })
          .eq('id', data.id);

        setStep('success');
        toast({
          title: 'Payment successful!',
          description: `UGX ${amount.toLocaleString()} paid via ${provider === 'mtn' ? 'MTN MoMo' : 'Airtel Money'}`,
        });

        setTimeout(() => onSuccess(data.id), 1500);
      }, 3000);
    } catch (error: any) {
      toast({
        title: 'Payment failed',
        description: sanitizeError(error),
        variant: 'destructive',
      });
      setProcessing(false);
    }
  };

  if (step === 'success') {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="py-8 text-center">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-success" />
          <h3 className="text-lg font-semibold mb-1">Payment Successful!</h3>
          <p className="text-sm text-muted-foreground">
            UGX {amount.toLocaleString()} received via {provider === 'mtn' ? 'MTN MoMo' : 'Airtel Money'}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (step === 'confirm') {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
          <h3 className="text-lg font-semibold mb-2">Waiting for Payment</h3>
          <p className="text-sm text-muted-foreground mb-1">
            A payment prompt has been sent to <strong>{phoneNumber}</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            Please approve the payment of <strong>UGX {amount.toLocaleString()}</strong> on your phone.
          </p>
          <p className="text-xs text-muted-foreground mt-4 italic">
            (Sandbox mode — auto-confirming in a few seconds)
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Phone className="w-5 h-5" />
          Mobile Money Payment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center p-3 rounded-lg bg-accent/50">
          <p className="text-sm text-muted-foreground">Amount to pay</p>
          <p className="text-2xl font-bold text-primary">UGX {amount.toLocaleString()}</p>
        </div>

        <div className="space-y-2">
          <Label>Payment Provider</Label>
          <RadioGroup value={provider} onValueChange={(v) => setProvider(v as 'mtn' | 'airtel')} className="grid grid-cols-2 gap-3">
            <Label
              htmlFor="mtn"
              className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                provider === 'mtn' ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <RadioGroupItem value="mtn" id="mtn" />
              <div>
                <p className="font-medium text-sm">MTN MoMo</p>
                <p className="text-xs text-muted-foreground">Mobile Money</p>
              </div>
            </Label>
            <Label
              htmlFor="airtel"
              className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                provider === 'airtel' ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <RadioGroupItem value="airtel" id="airtel" />
              <div>
                <p className="font-medium text-sm">Airtel Money</p>
                <p className="text-xs text-muted-foreground">Airtel Uganda</p>
              </div>
            </Label>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            placeholder="e.g. 0771234567"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            type="tel"
          />
          <p className="text-xs text-muted-foreground">Enter the {provider === 'mtn' ? 'MTN' : 'Airtel'} number to charge</p>
        </div>

        <div className="flex gap-2">
          {onCancel && (
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            className="flex-1"
            onClick={handlePayment}
            disabled={!phoneNumber || processing}
          >
            {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Pay UGX {amount.toLocaleString()}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          🔒 Payments are secure and encrypted
        </p>
      </CardContent>
    </Card>
  );
}
