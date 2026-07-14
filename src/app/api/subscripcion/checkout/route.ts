import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

function sha1(data: string): string {
  return crypto.createHash('sha1').update(data).digest('hex');
}

// Map plans and cycles to price in PYG (Guaraníes)
const PRICE_MAP: Record<string, Record<'monthly' | 'annual', number>> = {
  entrada: {
    monthly: 110000,    // ~15 USD
    annual: 1050000,   // ~144 USD (12 USD/mo)
  },
  pro: {
    monthly: 220000,    // ~30 USD
    annual: 2100000,   // ~288 USD (24 USD/mo)
  },
  elite: {
    monthly: 730000,    // ~100 USD
    annual: 7000000,   // ~960 USD (80 USD/mo)
  },
};

const PLAN_NAMES: Record<string, string> = {
  entrada: 'Plan Entrada',
  pro: 'Plan Pro',
  elite: 'Plan Élite',
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Auth check
    if (!user) {
      return NextResponse.json({ error: 'No autorizado. Inicie sesión.' }, { status: 401 });
    }

    const body = await request.json();
    const { plan, cycle } = body as { plan: string; cycle: 'monthly' | 'annual' };

    if (!plan || !cycle) {
      return NextResponse.json({ error: 'Falta plan o ciclo de facturación.' }, { status: 400 });
    }

    // 2. Validate price in PYG
    const montoTotal = PRICE_MAP[plan]?.[cycle];
    if (!montoTotal) {
      return NextResponse.json({ error: 'Plan o ciclo no válido.' }, { status: 400 });
    }

    // 3. Load user profile details for Pagopar invoice info
    const { data: profile } = await supabase
      .from('agent_profiles')
      .select('full_name, phone')
      .eq('id', user.id)
      .single();

    const pagadorNombre = profile?.full_name || 'Agente RealHub';
    const pagadorTelefono = profile?.phone || '0981123456';

    // 4. Determine Pagopar Endpoint environment
    const isProduction = process.env.PAGOPAR_ENV === 'production';
    const pagoparApiUrl = isProduction 
      ? 'https://api.pagopar.com/api/transaccion/1.1/iniciar-transaccion' 
      : 'https://api-staging.pagopar.com/api/transaccion/1.1/iniciar-transaccion';
    const pagoparPayUrl = isProduction
      ? 'https://www.pagopar.com/pagar'
      : 'https://staging.pagopar.com/pagar';

    const publicKey = process.env.PAGOPAR_PUBLIC_KEY || '';
    const privateKey = process.env.PAGOPAR_PRIVATE_KEY || '';

    if (!publicKey || !privateKey) {
      return NextResponse.json({ 
        error: 'Las credenciales de Pagopar (PAGOPAR_PUBLIC_KEY, PAGOPAR_PRIVATE_KEY) no están configuradas en el servidor.',
        code: 'PAGOPAR_NOT_CONFIGURED'
      }, { status: 500 });
    }

    // Create unique commercial order ID
    // Format: RH_${userId}_${timestamp}
    // We use underscores because UUIDs contain hyphens. This lets us extract the full UUID securely in the webhook.
    const idPedidoComercio = `RH_${user.id}_${Date.now()}`;
    const planName = PLAN_NAMES[plan] || 'Suscripción RealHub';
    const descripcion = `${planName} (${cycle === 'annual' ? 'Anual' : 'Mensual'})`;

    // 5. Calculate token_recaudacion (SHA1 of privateKey + idPedidoComercio + montoTotal)
    // Important: montoTotal must be converted to float/string representation
    const tokenRecaudacion = sha1(privateKey + idPedidoComercio + String(montoTotal));

    // 6. Build Pagopar transaction payload
    const payload = {
      token: publicKey,
      token_recaudacion: tokenRecaudacion,
      pedido: {
        monto_total: montoTotal,
        tipo_pedido: 'VENTA-COMERCIO',
        id_pedido_comercio: idPedidoComercio,
        descripcion: descripcion,
        compras: [
          {
            codigo: `${plan}-${cycle}`,
            nombre: descripcion,
            cantidad: 1,
            precio: montoTotal,
            interes_cuota: 0,
          },
        ],
        pagador: {
          nombre: pagadorNombre,
          email: user.email,
          telefono: pagadorTelefono,
          tipo_documento: 'CI',
          ci: '1234567', // Placeholder if not defined in profile
          direccion: 'Asunción, Paraguay',
          direccion_referencia: '',
        },
      },
    };

    console.log('Sending transaction to Pagopar:', pagoparApiUrl);

    // 7. Request token/hash from Pagopar
    const res = await fetch(pagoparApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok || !data.respuesta) {
      const errorMsg = data.resultado || data.mensaje || `HTTP error ${res.status}`;
      throw new Error(errorMsg);
    }

    // 8. Redirect user using the hash
    const hash = data.resultado.hash;
    const redirectUrl = `${pagoparPayUrl}/${hash}`;

    return NextResponse.json({ url: redirectUrl });
  } catch (error: any) {
    console.error('Error creating Pagopar checkout transaction:', error);
    return NextResponse.json({ error: error.message || 'Error al iniciar transacción de Pagopar.' }, { status: 500 });
  }
}
