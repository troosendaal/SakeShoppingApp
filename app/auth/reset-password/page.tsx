import { Flame } from "lucide-react";
import { ResetPasswordForm } from "./reset-form";

export default function ResetPasswordPage() {
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
        <p>Pick a new password and you'll be signed in.</p>
        <ResetPasswordForm />
      </div>
    </div>
  );
}
