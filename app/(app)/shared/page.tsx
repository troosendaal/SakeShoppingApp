import Link from "next/link";
import { Eye, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ConfigureBanner, isSupabaseConfigured } from "@/components/configure-banner";
import { getMySharedLists } from "@/lib/db/sharing";
import { errorMessage } from "@/lib/errors";

export default async function SharedPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; reason?: string }>;
}) {
  const t = await getTranslations();
  const params = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <>
        <Header t={t} />
        <ConfigureBanner message={t("common.configureSupabase")} />
      </>
    );
  }

  let lists: Awaited<ReturnType<typeof getMySharedLists>> = [];
  let loadError: string | null = null;
  try {
    lists = await getMySharedLists();
  } catch (err) {
    console.error("[shared] load failed:", err);
    loadError = errorMessage(err);
  }

  return (
    <>
      <Header t={t} />

      <InviteBanner status={params.invite} reason={params.reason} />

      {loadError && <ErrorBox message={loadError} />}

      {lists.length === 0 && !loadError ? (
        <EmptyState />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {lists.map((s) => (
            <Link
              key={s.id}
              href={`/shared/${s.id}`}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--line)",
                borderRadius: 14,
                padding: "16px 22px",
                display: "flex",
                alignItems: "center",
                gap: 18,
                boxShadow: "var(--shadow)",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "var(--bg-paper)",
                  border: "1px solid var(--line)",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--ink-soft)",
                  flexShrink: 0,
                }}
              >
                <Users size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h5
                  className="serif"
                  style={{ fontSize: 17, fontWeight: 500, margin: "0 0 4px" }}
                >
                  {s.title}
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 10,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--ink-soft)",
                      background: "var(--bg-paper)",
                      border: "1px solid var(--line)",
                      padding: "2px 6px",
                      borderRadius: 5,
                      verticalAlign: "middle",
                    }}
                  >
                    {s.status}
                  </span>
                </h5>
                <p style={{ margin: 0, fontSize: 12, color: "var(--ink-soft)" }}>
                  Shared by <strong>{s.ownerName}</strong> · {s.memberCount}{" "}
                  member{s.memberCount === 1 ? "" : "s"} · {s.itemCount} item
                  {s.itemCount === 1 ? "" : "s"}
                </p>
              </div>
              <Eye size={16} color="var(--ink-soft)" />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function Header({ t }: { t: (k: string) => string }) {
  return (
    <div className="page-head">
      <div>
        <h2>
          {t("pages.shared.title")} <em>{t("pages.shared.titleEm")}</em>
        </h2>
        <p>{t("pages.shared.subtitle")}</p>
      </div>
    </div>
  );
}

function InviteBanner({
  status,
  reason,
}: {
  status?: string;
  reason?: string;
}) {
  if (!status) return null;
  if (status === "joined") {
    return (
      <div
        style={{
          background: "var(--olive-soft)",
          border: "1px solid var(--olive)",
          color: "var(--ink)",
          borderRadius: 10,
          padding: "10px 14px",
          marginBottom: 16,
          fontSize: 13,
        }}
      >
        ✓ Joined the list — it's now in your Shared with you section below.
      </div>
    );
  }
  if (status === "error") {
    return (
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
        Invite couldn't be accepted: {decodeURIComponent(reason ?? "unknown")}
      </div>
    );
  }
  return null;
}

function ErrorBox({ message }: { message: string }) {
  return (
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
      Couldn't load shared lists: {message}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--line)",
        borderRadius: 14,
        padding: 48,
        textAlign: "center",
        boxShadow: "var(--shadow)",
      }}
    >
      <Users size={32} color="var(--ink-soft)" />
      <h3
        className="serif"
        style={{ marginTop: 12, fontWeight: 400, fontSize: 22 }}
      >
        No shared lists yet
      </h3>
      <p style={{ color: "var(--ink-soft)", marginTop: 4, fontSize: 14 }}>
        When someone shares a list with you, it'll show up here. Ask them
        to send you an invite link.
      </p>
    </div>
  );
}
