import { AlertCircle } from "lucide-react";

export function ConfigureBanner({ message }: { message: string }) {
  return (
    <div className="banner">
      <AlertCircle />
      <span>{message}</span>
    </div>
  );
}

export function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
