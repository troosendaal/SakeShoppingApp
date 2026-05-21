import { LogOut, User } from "lucide-react";
import { getCurrentUser } from "@/lib/user";
import { SignOutButton } from "./sign-out-button";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <>
      <div className="page-head">
        <div>
          <h2>
            Settings<em>.</em>
          </h2>
          <p>Profile, language, units, categories & ingredients — full version coming in Phase 15.</p>
        </div>
      </div>

      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--line)",
          borderRadius: 14,
          padding: 24,
          boxShadow: "var(--shadow)",
          marginBottom: 20,
        }}
      >
        <h3 className="serif" style={{ margin: 0, fontWeight: 500, fontSize: 18 }}>
          <User
            size={16}
            style={{ display: "inline", verticalAlign: "middle", marginRight: 8 }}
          />
          Account
        </h3>
        {user ? (
          <dl style={{ marginTop: 16, fontSize: 14, color: "var(--ink-soft)" }}>
            <div style={{ display: "flex", gap: 16, padding: "8px 0" }}>
              <dt style={{ minWidth: 140 }}>Display name</dt>
              <dd style={{ margin: 0, color: "var(--ink)" }}>{user.displayName}</dd>
            </div>
            <div style={{ display: "flex", gap: 16, padding: "8px 0" }}>
              <dt style={{ minWidth: 140 }}>Email</dt>
              <dd style={{ margin: 0, color: "var(--ink)" }}>{user.email ?? "—"}</dd>
            </div>
            <div style={{ display: "flex", gap: 16, padding: "8px 0" }}>
              <dt style={{ minWidth: 140 }}>Preferred language</dt>
              <dd style={{ margin: 0, color: "var(--ink)" }}>
                {user.preferredLanguage.toUpperCase()}
              </dd>
            </div>
          </dl>
        ) : (
          <p style={{ marginTop: 12, color: "var(--ink-soft)", fontSize: 14 }}>
            Not signed in. <a href="/login" style={{ color: "var(--terracotta)" }}>Sign in →</a>
          </p>
        )}
      </div>

      {user && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <SignOutButton />
        </div>
      )}
    </>
  );
}
