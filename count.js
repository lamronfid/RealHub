const { createClient } = require('@supabase/supabase-js');
const url = 'https://zszvynkxmgzkprsesgaw.supabase.co';
const key = 'sb_publishable_EMwTGm3bIzDIDLMuRD17ZA_fXTcuMjL';
const supabase = createClient(url, key);

async function check() {
  console.log('--- Conteo de Filas en Base de Datos ---');
  
  const { count: agents, error: apErr } = await supabase.from('agent_profiles').select('*', { count: 'exact', head: true });
  if (apErr) console.error('Error agent_profiles:', apErr.message);
  else console.log('Agentes en BD:', agents);

  const { count: props, error: plErr } = await supabase.from('properties').select('*', { count: 'exact', head: true });
  if (plErr) console.error('Error properties:', plErr.message);
  else console.log('Propiedades en BD:', props);

  const { count: prospects, error: prErr } = await supabase.from('prospects').select('*', { count: 'exact', head: true });
  if (prErr) console.error('Error prospects:', prErr.message);
  else console.log('Prospectos en BD:', prospects);
}

check();
