const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
const forceDemoMode = process.env.NEXT_PUBLIC_FORCE_DEMO_MODE === "1";

export function getSupabaseConfig() {
  if (forceDemoMode || !url || !publishableKey) return null;
  return { url, publishableKey };
}

export const isSupabaseConfigured = Boolean(
  !forceDemoMode && url && publishableKey,
);
