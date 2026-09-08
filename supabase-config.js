const SUPABASE_URL = 'https://iybodgndmwabjvmftlqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Ky-VAlQqBBomjKqGXGGx5Q__qvEu5OH';
const SUPABASE_TABLE = 'maxtv20_prijave';

let supabaseClient = null;

async function initSupabase() {
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL') {
    console.warn('Supabase nije konfiguriran - koristim localStorage kao fallback');
    return false;
  }
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return true;
  } catch (e) {
    console.error('Greska pri inicijalizaciji Supabase:', e);
    return false;
  }
}

async function saveEntry(name, phone, tvProvider, internetProvider) {
  var row = {
    name: name,
    phone: phone,
    tv_provider: tvProvider,
    internet_provider: internetProvider,
    location: (typeof DEVICE_LOCATION !== 'undefined') ? DEVICE_LOCATION : ''
  };
  if (supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from(SUPABASE_TABLE)
        .insert(row);
      if (error) throw error;
      return true;
    } catch (e) {
      console.error('Greska pri spremanju prijave:', e);
    }
  }
  const entries = JSON.parse(localStorage.getItem('maxtv20_entries') || '[]');
  row.created_at = new Date().toISOString();
  entries.push(row);
  localStorage.setItem('maxtv20_entries', JSON.stringify(entries));
  return true;
}

initSupabase();
