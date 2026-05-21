import Link from "next/link";
import { Flame } from "lucide-react";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
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
        <p>Create an account to start building recipes and shopping lists.</p>
        <SignupForm />
        <div className="switch">
          Already have an account? <Link href="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
