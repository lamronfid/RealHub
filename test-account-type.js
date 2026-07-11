const { createClient } = require('@supabase/supabase-js');
const url = 'https://zszvynkxmgzkprsesgaw.supabase.co';
const key = 'sb_publishable_EMwTGm3bIzDIDLMuRD17ZA_fXTcuMjL';
const supabase = createClient(url, key);

async function check() {
  console.log('--- Verificando columna account_type en agent_profiles ---');
  const { data, error } = await supabase.from('agent_profiles').select('account_type').limit(1);
  if (error) {
    console.error('❌ Error:', error.message, 'Código:', error.code);
  } else {
    console.log('✅ La columna account_type existe en la base de datos!');
  }
}

check();
