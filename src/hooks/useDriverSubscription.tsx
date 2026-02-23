import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useDriverSubscription() {
  const { user, profile } = useAuth();
  const [hasActiveSubscription, setHasActiveSubscription] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function check() {
      if (!user || profile?.role !== 'driver') {
        setHasActiveSubscription(null);
        setLoading(false);
        return;
      }

      const { data, error } = await (supabase as any)
        .rpc('driver_has_active_subscription', { _driver_id: user.id });

      setHasActiveSubscription(error ? false : data === true);
      setLoading(false);
    }

    check();
  }, [user, profile]);

  return { hasActiveSubscription, loading };
}
