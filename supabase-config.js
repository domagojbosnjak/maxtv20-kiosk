const SUPABASE_URL = 'https://fhufpkclrfbncfkmyabe.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_HmWXpiWlpxUwg7RdSU9kpA_lsN9TKG-';
const SUPABASE_TABLE = 'maxtv20_prijave';
const PENDING_KEY = 'maxtv20_pending_entries';

let supabaseClient = null;
let syncInFlight = false;

// Lazily creates the Supabase client. Safe to call repeatedly - a prior
// success is reused, and a prior failure (e.g. no internet when the library
// was fetched) is retried next time we're actually online.
async function initSupabase() {
  if (supabaseClient) return true;
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL') return false;
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return true;
  } catch (e) {
    console.warn('Supabase knjiznica nije dostupna (vjerojatno nema interneta) - prijava ide u red za slanje.', e);
    return false;
  }
}

function getPendingEntries() {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'); }
  catch (e) { return []; }
}

function setPendingEntries(entries) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(entries));
}

async function insertRow(row) {
  const ready = supabaseClient || await initSupabase();
  if (!ready || !supabaseClient) return false;
  try {
    const { error } = await supabaseClient.from(SUPABASE_TABLE).insert(row);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('Insert u Supabase nije uspio - prijava ostaje u redu za kasnije slanje.', e);
    return false;
  }
}

// Called by app.js when a quiz/survey is completed. Tries Supabase right
// away; if that fails (offline, or Supabase momentarily unreachable), the
// entry is queued in localStorage and retried automatically by
// syncPendingEntries() as soon as connectivity is back - nothing is lost.
async function saveEntry(name, phone, tvProvider, internetProvider) {
  var row = {
    name: name,
    phone: phone,
    tv_provider: tvProvider,
    internet_provider: internetProvider,
    location: (typeof DEVICE_LOCATION !== 'undefined') ? DEVICE_LOCATION : ''
  };
  const ok = navigator.onLine ? await insertRow(row) : false;
  if (!ok) {
    const pending = getPendingEntries();
    pending.push(row);
    setPendingEntries(pending);
  }
  return true;
}

// Drains the offline queue into Supabase. Runs on the 'online' event, when
// the app becomes visible again, and every 60s as a safety net (some kiosk
// browsers don't fire 'online' reliably). Entries that still fail (e.g.
// connected to wifi but no real internet) stay queued for the next attempt.
async function syncPendingEntries() {
  if (syncInFlight) return;
  const pending = getPendingEntries();
  if (!pending.length || !navigator.onLine) return;
  syncInFlight = true;
  try {
    const remaining = [];
    for (const row of pending) {
      const ok = await insertRow(row);
      if (!ok) remaining.push(row);
    }
    setPendingEntries(remaining);
    if (pending.length && !remaining.length) {
      console.log('Sve zaostale prijave uspjesno poslane u Supabase.');
    }
  } finally {
    syncInFlight = false;
  }
}

window.addEventListener('online', syncPendingEntries);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') syncPendingEntries();
});
setInterval(syncPendingEntries, 60000);

initSupabase().then(syncPendingEntries);
