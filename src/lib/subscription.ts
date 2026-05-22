import { createClient } from './supabase/client';

export interface SubscriptionState {
  tier: string;
  isVerified: boolean;
}

export function getSubscriptionState(profile?: any): SubscriptionState {
  let tier = profile?.subscription_tier || 'free';
  let isVerified = profile?.is_verified || false;

  if (typeof window !== 'undefined') {
    const localTier = localStorage.getItem('realhub_subscription_tier');
    const localVerified = localStorage.getItem('realhub_is_verified');
    
    if (localTier) tier = localTier;
    if (localVerified) isVerified = localVerified === 'true';
  }

  // Force verified status for Elite tier
  if (tier === 'elite') {
    isVerified = true;
  }

  return { tier, isVerified };
}

export async function setSubscriptionState(tier: string, isVerified: boolean, userId?: string): Promise<boolean> {
  if (typeof window !== 'undefined') {
    localStorage.setItem('realhub_subscription_tier', tier);
    localStorage.setItem('realhub_is_verified', isVerified ? 'true' : 'false');
  }

  if (userId) {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('agent_profiles')
        .update({
          subscription_tier: tier,
          is_verified: isVerified
        })
        .eq('id', userId);
        
      if (error) {
        console.warn('Could not update database subscription (migration might not be applied yet):', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Error updating Supabase:', err);
      return false;
    }
  }
  return true;
}

export function clearSubscriptionState() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('realhub_subscription_tier');
    localStorage.removeItem('realhub_is_verified');
  }
}
