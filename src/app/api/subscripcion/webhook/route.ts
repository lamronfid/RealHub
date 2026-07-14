import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function sha1(data: string): string {
  return crypto.createHash('sha1').update(data).digest('hex');
}

// Initialize Supabase Admin client with Service Role Key to bypass RLS policies in Webhooks
// Falls back to a placeholder key during build time to prevent evaluation failures
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key-for-build'
);

export async function POST(request: Request) {
  try {
    const body = await request.text();
    let bodyJson: any;

    try {
      bodyJson = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: 'Cuerpo de petición no es JSON válido.' }, { status: 400 });
    }

    const resultList = bodyJson.resultado;
    if (!resultList || !Array.isArray(resultList)) {
      return NextResponse.json({ error: 'Falta la lista de resultados de Pagopar.' }, { status: 400 });
    }

    const privateKey = process.env.PAGOPAR_PRIVATE_KEY || '';

    if (!privateKey) {
      return NextResponse.json({ error: 'Clave privada de Pagopar no configurada.' }, { status: 500 });
    }

    console.log(`Procesando webhook de Pagopar con ${resultList.length} transacciones...`);

    for (const item of resultList) {
      const idPedidoComercio = item.id_pedido_comercio;
      const pagado = item.pagado;
      const monto = Number(item.monto);
      const tokenRecibido = item.token;

      // 1. Recalculate signature: sha1(privateKey + idPedidoComercio + monto)
      const tokenCalculado = sha1(privateKey + idPedidoComercio + String(monto));

      if (tokenCalculado !== tokenRecibido) {
        console.error(`Firma inválida detectada para el pedido: ${idPedidoComercio}. Se esperaba ${tokenCalculado} pero se recibió ${tokenRecibido}`);
        continue; // Skip invalid webhook items
      }

      console.log(`Pedido ${idPedidoComercio} verificado correctamente. Estado pagado: ${pagado}, Monto: ${monto}`);

      if (pagado) {
        // Try parsing the new format: RH_${userId}_${timestamp}
        let userId: string | null = null;
        let isShortId = false;

        if (idPedidoComercio.includes('_')) {
          const parts = idPedidoComercio.split('_');
          if (parts[0] === 'RH' && parts[1]) {
            userId = parts[1];
          }
        } else {
          // Fallback backward compatibility for older hyphenated format: RH-<userIdPrefix>-<timestamp>
          const parts = idPedidoComercio.split('-');
          if (parts[0] === 'RH' && parts[1]) {
            userId = parts[1];
            isShortId = true;
          }
        }

        if (userId) {
          let targetUser: { id: string; subscription_tier: string } | null = null;

          if (isShortId) {
            // Backward compatibility lookup via prefix LIKE match
            const { data: users, error: searchError } = await supabaseAdmin
              .from('agent_profiles')
              .select('id, subscription_tier')
              .like('id', `${userId}%`);

            if (!searchError && users && users.length > 0) {
              targetUser = users[0];
            }
          } else {
            // Safe, exact match using full UUID
            const { data: profile, error: searchError } = await supabaseAdmin
              .from('agent_profiles')
              .select('id, subscription_tier')
              .eq('id', userId)
              .single();

            if (!searchError && profile) {
              targetUser = profile;
            }
          }

          if (!targetUser) {
            console.error(`No se encontró ningún agente en Supabase para el ID/prefijo de pedido: ${userId}`);
            continue;
          }

          const targetUserId = targetUser.id;

          // 3. Map amount paid directly to plan tier
          // Entrada: 110.000 / 1.050.000 Gs. -> 'standard'
          // Pro: 220.000 / 2.100.000 Gs. -> 'pro'
          // Elite: 730.000 / 7.000.000 Gs. -> 'elite'
          let tier = 'standard';
          if (monto === 220000 || monto === 2100000) {
            tier = 'pro';
          } else if (monto === 730000 || monto === 7000000) {
            tier = 'elite';
          }

          console.log(`Activando plan '${tier}' para el usuario ${targetUserId} en Supabase...`);

          // 4. Update the agent profile in Supabase securely
          const { error: updateError } = await supabaseAdmin
            .from('agent_profiles')
            .update({
              subscription_tier: tier,
              is_verified: tier === 'elite', // Elite automatically gets verification badge
            })
            .eq('id', targetUserId);

          if (updateError) {
            console.error(`Error al actualizar perfil para el usuario ${targetUserId}:`, updateError.message);
          } else {
            console.log(`Suscripción activada con éxito para ${targetUserId}.`);
            
            // Insert real-time notification
            const planNames: Record<string, string> = {
              standard: 'Entrada',
              pro: 'Pro',
              elite: 'Élite'
            };
            const planName = planNames[tier] || 'Premium';

            const { error: notifError } = await supabaseAdmin
              .from('notifications')
              .insert({
                user_id: targetUserId,
                title: '¡Suscripción Activada! 🎉',
                body: `Tu cuenta ha sido actualizada con éxito al plan ${planName}. ¡Gracias por confiar en RealHub!`,
                type: 'system',
                read: false,
                link: '/perfil'
              });

            if (notifError) {
              console.error(`Error al insertar notificación para el usuario ${targetUserId}:`, notifError.message);
            } else {
              console.log(`Notificación de pago enviada para el usuario ${targetUserId}.`);
            }
          }
        }
      }
    }

    // Pagopar expects a successful JSON response
    return NextResponse.json({ respuesta: true, mensaje: 'Notificación procesada con éxito.' });
  } catch (error: any) {
    console.error('Error procesando webhook de Pagopar:', error);
    return NextResponse.json({ error: error.message || 'Error del servidor en el webhook.' }, { status: 500 });
  }
}
