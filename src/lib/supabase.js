import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function getChannel(channelName) {
  if (!supabase) return null;
  return supabase.channel(channelName);
}

export async function broadcastEvent(channel, event, payload) {
  if (!supabase) return;
  const ch = supabase.channel(channel);
  await ch.send({
    type: 'broadcast',
    event,
    payload,
  });
}
