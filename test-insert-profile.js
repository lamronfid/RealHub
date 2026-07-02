const { createClient } = require('@supabase/supabase-js');
const url = 'https://zszvynkxmgzkprsesgaw.supabase.co';
const key = 'sb_publishable_EMwTGm3bIzDIDLMuRD17ZA_fXTcuMjL';
const supabase = createClient(url, key);

async function check() {
  console.log('--- Intentando insertar perfil de prueba ---');
  // We use a dummy UUID. Note: since 'id' references auth.users(id), a dummy UUID might fail the foreign key check.
  // Wait! Let's check if foreign key constraint on auth.users(id) exists:
  // Yes, 'id UUID REFERENCES auth.users(id)'.
  // But wait, can we fetch a user from auth.users first?
  // We cannot easily fetch auth.users using the anon key.
  // But wait! Can we try to insert to see if we get a Foreign Key error or something else?
  const dummyId = '00000000-0000-0000-0000-000000000000';
  const { data, error } = await supabase
    .from('agent_profiles')
    .insert({
      id: dummyId,
      full_name: 'Test Dummy',
      email: 'dummy@test.com'
    })
    .select();

  if (error) {
    console.log('❌ Error obtenido:', error.message, 'Código:', error.code);
  } else {
    console.log('✅ Inserción exitosa:', data);
  }
}

check();
