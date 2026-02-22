import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials in environment variables');
  }

  return createSupabaseClient(supabaseUrl, supabaseKey);
}

export async function getFilms() {
  const client = createClient();
  const { data, error } = await client
    .from('medialist')
    .select('*')
    .eq('type', 'film');

  if (error) throw error;
  return data || [];
}

export async function getFilmsForSourceRefresh(limit = 20) {
  const client = createClient();
  const { data, error } = await client
    .from('medialist')
    .select('*')
    .eq('type', 'film')
    .not('external_id', 'is', null)
    .order('sources_last_synced', { ascending: true, nullsFirst: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function updateFilm(id, updates) {
  const client = createClient();
  const { error } = await client
    .from('medialist')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
  return true;
}
