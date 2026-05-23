// Shared helper for safely resolving the post-auth destination.
//
// We pass `?next=<path>` through middleware → /login → magic-link email
// → /auth/callback so the user lands back on whatever protected page they
// originally tried to visit (or the invite token they clicked). The raw
// value is untrusted input — clamp it to a same-origin pathname to block
// open-redirect attacks.

const DEFAULT_DESTINATION = "/recipes";

export function safeNextPath(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_DESTINATION;
  // Must be a relative pathname starting with a single slash.
  // Reject protocol-relative URLs ("//evil.com/foo") and absolute URLs.
  if (!raw.startsWith("/")) return DEFAULT_DESTINATION;
  if (raw.startsWith("//")) return DEFAULT_DESTINATION;
  // Reject anything with control characters that could break HTTP headers
  // or smuggle a CRLF.
  for (let i = 0; i < raw.length; i++) {
    if (raw.charCodeAt(i) < 32) return DEFAULT_DESTINATION;
  }
  return raw;
}
