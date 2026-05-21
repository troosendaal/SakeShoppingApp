// Supabase's PostgrestError is a plain object (`{ message, details, hint, code }`)
// and does NOT extend Error — so `err instanceof Error` is false. This helper
// extracts a useful message from any thrown value.
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (typeof err === "object" && err !== null) {
    const obj = err as Record<string, unknown>;
    const parts = [obj.message, obj.details, obj.hint, obj.code]
      .filter((x): x is string => typeof x === "string" && x.length > 0);
    if (parts.length > 0) return parts.join(" — ");
  }
  return "Unknown error";
}
