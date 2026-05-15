const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => { 
  const parts = line.split('='); 
  if(parts.length >= 2) acc[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/['"]/g, ''); 
  return acc; 
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

supabase.from('properties').select('*').then(res => console.log(JSON.stringify(res, null, 2)));
