import Link from "next/link";
import { Flame } from "lucide-react";
import { ForgotPasswordForm } from "./forgot-form";

export default function ForgotPasswordPage() {
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
        <p>
          Enter your email and we'll send you a link to set a new password.
        </p>
        <ForgotPasswordForm />
        <div className="switch">
          Remembered it? <Link href="/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
