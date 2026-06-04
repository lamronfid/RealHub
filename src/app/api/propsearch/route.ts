import { NextRequest, NextResponse } from 'next/server';
import { runSearch } from '@/lib/propsearch-runner';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Authentication Check
    if (!user) {
      return NextResponse.json({ error: 'No autorizado. Inicie sesión.' }, { status: 401 });
    }

    // 2. Get User Profile and Subscription Limits
    const { data: profile, error: profileError } = await supabase
      .from('agent_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'No se pudo cargar el perfil del agente.' }, { status: 500 });
    }

    const adminEmails = ['lamronfidd@gmail.com', 'jonyocampos@gmail.com', 'lamronfid@gmail.com'];
    const isAdminOrOwner = 
      profile.role === 'admin' || 
      profile.role === 'superadmin' || 
      profile.role === 'owner' ||
      (user.email && adminEmails.includes(user.email.toLowerCase()));
    
    const tier = profile.subscription_tier || 'free';
    const searchesUsed = profile.scraper_searches_used || 0;

    // 3. Access Control Gates
    if (!isAdminOrOwner) {
      if (tier === 'free' || tier === 'standard') {
        return NextResponse.json({ 
          error: 'Función bloqueada. El Scraper requiere una suscripción Plan Pro o Plan Élite.',
          code: 'TIER_LOCKED'
        }, { status: 403 });
      }

      if (tier === 'pro' && searchesUsed >= 100) {
        return NextResponse.json({ 
          error: 'Límite mensual excedido. Has utilizado tus 100 búsquedas del Plan Pro.',
          code: 'LIMIT_EXCEEDED'
        }, { status: 403 });
      }
    }

    // 4. Run Search or Return Direct Credentials to Bypass 10s Timeout
    const body = await req.json();
    const apiUrl = process.env.PROPSEARCH_API_URL || process.env.PROPSEARCH_URL;

    if (apiUrl) {
      // Increment scraper_searches_used first
      const { error: updateError } = await supabase
        .from('agent_profiles')
        .update({ scraper_searches_used: searchesUsed + 1 })
        .eq('id', user.id);

      if (updateError) {
        console.warn('Error al actualizar el contador de búsquedas:', updateError.message);
      }

      return NextResponse.json({
        direct: true,
        apiUrl: apiUrl.replace(/\/$/, ''),
        apiSecret: process.env.PROPSEARCH_SECRET || ''
      });
    }

    // Local development child_process fallback
    const raw = await runSearch(body);
    const data = JSON.parse(raw);

    // Increment scraper_searches_used
    const { error: updateError } = await supabase
      .from('agent_profiles')
      .update({ scraper_searches_used: searchesUsed + 1 })
      .eq('id', user.id);

    if (updateError) {
      console.warn('Error al actualizar el contador de búsquedas:', updateError.message);
    }

    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Propsearch subprocess]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
