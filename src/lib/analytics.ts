'use client';

import { createClient } from '@/lib/supabase/client';

export async function logEvent(
  eventType: string,
  eventData: Record<string, any> = {},
  page?: string
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('analytics_events').insert({
      agent_id: user.id,
      event_type: eventType,
      event_data: eventData,
      page: page || (typeof window !== 'undefined' ? window.location.pathname : null),
    });
  } catch {
    // Silent fail — analytics should never break the app
  }
}
