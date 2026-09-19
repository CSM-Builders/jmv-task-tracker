const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

export function getSupabaseConfig() {
  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}

export const isSupabaseConfigured = Boolean(url && publishableKey);
