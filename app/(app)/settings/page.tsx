import { getLocale } from "next-intl/server";
import { isSupabaseConfigured } from "@/components/configure-banner";
import { getCategoriesWithPrefs, getMyProfile } from "@/lib/db/settings";
import type { Locale } from "@/lib/db/recipe-types";
import { getCurrentUser } from "@/lib/user";
import { errorMessage } from "@/lib/errors";
import { CategorySort } from "./category-sort";
import { ProfileSection } from "./profile-section";
import { SignOutButton } from "./sign-out-button";

export default async function SettingsPage() {
  const locale = ((await getLocale()) as Locale) ?? "en";
  const user = await getCurrentUser();

  if (!isSupabaseConfigured()) {
    return (
      <>
        <Header />
        <div
          style={{
            background: "var(--bg-paper)",
            border: "1px dashed var(--line)",
            borderRadius: 12,
            padding: 14,
            fontSize: 13,
            color: "var(--ink-soft)",
          }}
        >
          Connect Supabase to enable settings. See README.md.
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Header />
        <div style={{ fontSize: 14, color: "var(--ink-soft)" }}>
          Not signed in.{" "}
          <a href="/login" style={{ color: "var(--terracotta)" }}>
            Sign in →
          </a>
        </div>
      </>
    );
  }

  let profile: Awaited<ReturnType<typeof getMyProfile>> = null;
  let categories: Awaited<ReturnType<typeof getCategoriesWithPrefs>> = [];
  let loadError: string | null = null;
  try {
    [profile, categories] = await Promise.all([
      getMyProfile(),
      getCategoriesWithPrefs(),
    ]);
  } catch (err) {
    console.error("[settings] load failed:", err);
    loadError = errorMessage(err);
  }

  return (
    <>
      <Header />

      {loadError && (
        <div
          style={{
            background: "var(--terracotta-soft)",
            border: "1px solid var(--terracotta)",
            color: "var(--ink)",
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          Couldn't load settings: {loadError}
        </div>
      )}

      {profile && (
        <ProfileSection
          initialDisplayName={profile.display_name}
          initialLanguage={profile.preferred_language}
          initialUnitSystem={profile.preferred_unit_system}
          email={user.email}
        />
      )}

      {categories.length > 0 && (
        <CategorySort initialCategories={categories} locale={locale} />
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <SignOutButton />
      </div>
    </>
  );
}

function Header() {
  return (
    <div className="page-head">
      <div>
        <h2>
          Settings<em>.</em>
        </h2>
        <p>Profile, language, units, and how your shopping list is sorted.</p>
      </div>
    </div>
  );
}
