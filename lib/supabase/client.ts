import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client. Lazily instantiated so the app can build
// without env vars set; calling this before configuring Supabase will throw.
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase env vars not set. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local (or Vercel project settings).",
    );
  }
  return createBrowserClient(url, key);
}
