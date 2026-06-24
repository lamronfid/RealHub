import { createClient } from '@/lib/supabase/server';
import MarketplaceClient from './MarketplaceClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MarketplacePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch all marketplace properties
  const { data: rawProperties, error: propError } = await supabase
    .from('properties')
    .select('*')
    .eq('visibility', 'marketplace')
    .order('marketplace_shared_at', { ascending: false });

  let properties = rawProperties || [];

  if (properties.length > 0) {
    const agentIds = properties.map(p => p.agent_id);
    const { data: profiles } = await supabase
      .from('agent_profiles')
      .select('id, full_name, avatar_url, phone, agency_name, subscription_tier, is_verified')
      .in('id', agentIds);

    properties = properties.map(p => ({
      ...p,
      agent_profiles: profiles?.find(profile => profile.id === p.agent_id) || null
    }));
  }

  // Fetch all marketplace prospects (PII-safe)
  const { data: rawProspects, error: prospError } = await supabase
    .from('prospects')
    .select('id, agent_id, transaction_type, price_min, price_max, currency, departments, cities, neighborhoods, property_types, rooms_min, rooms_max, bathrooms_min, bathrooms_max, garages_min, size_min, size_max, furnished_preference, amenities, notes, visibility, created_at')
    .eq('visibility', 'marketplace')
    .order('created_at', { ascending: false });

  let prospects = rawProspects || [];

  if (prospects.length > 0) {
    const agentIds = prospects.map(p => p.agent_id);
    const { data: profiles } = await supabase
      .from('agent_profiles')
      .select('id, full_name, avatar_url, phone, agency_name, subscription_tier, is_verified')
      .in('id', agentIds);

    prospects = prospects.map(p => ({
      ...p,
      agent_profiles: profiles?.find(profile => profile.id === p.agent_id) || null
    }));
  }

  if (propError || prospError) {
    const err = propError || prospError;
    return (
      <div className="p-8 text-center bg-red-50 text-red-600 rounded-2xl max-w-2xl mx-auto mt-20">
        <h2 className="font-bold text-xl mb-2">Error cargando el marketplace</h2>
        <p className="text-sm font-mono">{err?.message}</p>
      </div>
    );
  }

  return <MarketplaceClient properties={properties} prospects={prospects} currentAgentId={user.id} />;
}
