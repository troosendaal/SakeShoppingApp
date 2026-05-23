import Link from "next/link";
import { Flame } from "lucide-react";
import { safeNextPath } from "@/lib/auth-redirect";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const dest = safeNextPath(next);

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div className="brand-mark">
            <Flame strokeWidth={2.25} />
          </div>
          <div>
            <h1 className="serif">
              saké<em>.</em>
            </h1>
          </div>
        </div>
        <p>Sign in with your password or a magic link.</p>
        {error && (
          <div
            style={{
              background: "var(--terracotta-soft)",
              border: "1px solid var(--terracotta)",
              color: "var(--ink)",
              borderRadius: 10,
              padding: "8px 12px",
              marginBottom: 16,
              fontSize: 12,
            }}
          >
            Sign-in failed: {decodeURIComponent(error)}
          </div>
        )}
        <LoginForm next={dest} />
        <div className="switch">
          New here?{" "}
          <Link href={`/signup${dest !== "/recipes" ? `?next=${encodeURIComponent(dest)}` : ""}`}>
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
