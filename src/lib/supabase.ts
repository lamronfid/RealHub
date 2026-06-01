import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/** Anon client — safe to use in browser and server components for reads. */
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

/**
 * Service-role client — server-side only. Bypasses RLS.
 * Never expose SUPABASE_SERVICE_ROLE_KEY to the browser (no NEXT_PUBLIC_ prefix).
 * Falls back to the anon key in local dev if the service key is not set
 * (acceptable since local Supabase typically has RLS disabled anyway).
 */
export function createServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
