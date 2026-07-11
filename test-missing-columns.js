const { createClient } = require('@supabase/supabase-js');
const url = 'https://zszvynkxmgzkprsesgaw.supabase.co';
const key = 'sb_publishable_EMwTGm3bIzDIDLMuRD17ZA_fXTcuMjL';
const supabase = createClient(url, key);

const columnsToCheck = [
  'email',
  'role',
  'subscription_tier',
  'is_verified',
  'experience_years',
  'agency_office',
  'most_sold_types',
  'has_developments',
  'developments_details',
  'account_type'
];

async function check() {
  console.log('--- Verificando columnas de agent_profiles ---');
  for (const col of columnsToCheck) {
    const { error } = await supabase.from('agent_profiles').select(col).limit(1);
    if (error) {
      console.log(`❌ Column '${col}': MISSING (Error: ${error.message})`);
    } else {
      console.log(`✅ Column '${col}': EXISTS`);
    }
  }
}

check();
