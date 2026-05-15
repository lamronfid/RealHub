import { createClient } from '@/lib/supabase/server';
import AgendaClient from './AgendaClient';

export default async function AgendaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch pending follow-ups and visits
  const { data: followUps } = await supabase
    .from('follow_ups')
    .select(`
      *,
      prospects(full_name, phone, transaction_type, currency, price_max),
      properties(title, photos)
    `)
    .eq('agent_id', user.id)
    .order('scheduled_at', { ascending: true });

  return (
    <div className="max-w-7xl mx-auto">
      <AgendaClient events={followUps || []} />
    </div>
  );
}
