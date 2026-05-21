import Link from "next/link";
import { Flame, Mail } from "lucide-react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
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
        <p>Sign in with a magic link — no password needed.</p>
        <LoginForm />
        <div className="switch">
          New here? <Link href="/signup">Create an account</Link>
        </div>
      </div>
    </div>
  );
}
