const { createClient } = require('@supabase/supabase-js');
const url = 'https://zszvynkxmgzkprsesgaw.supabase.co';
const key = 'sb_publishable_EMwTGm3bIzDIDLMuRD17ZA_fXTcuMjL';
const supabase = createClient(url, key);

async function printAll() {
  console.log('--- Listando todos los perfiles de agentes ---');
  const { data, error } = await supabase.from('agent_profiles').select('*');
  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }
  console.log(`Total perfiles encontrados: ${data.length}`);
  data.forEach((p, i) => {
    console.log(`[${i+1}] ID: ${p.id} | Email: ${p.email} | Nombre: ${p.full_name} | Rol: ${p.role} | Tier: ${p.subscription_tier}`);
  });
}

printAll();
