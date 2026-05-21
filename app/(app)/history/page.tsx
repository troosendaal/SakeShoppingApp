import { Copy, Eye, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { ConfigureBanner, isSupabaseConfigured } from "@/components/configure-banner";

const HISTORY = [
  {
    month: "May",
    day: 11,
    title: "Week 20 list",
    sub: "5 recipes · 32 items · completed Sunday at 6:43 pm",
    bought: 32,
    skipped: 2,
  },
  {
    month: "May",
    day: 4,
    title: "Week 19 list",
    sub: "4 recipes · 28 items · completed Saturday at 11:22 am",
    bought: 28,
    skipped: 0,
  },
  {
    month: "Apr",
    day: 27,
    title: "Birthday weekend shop",
    sub: "2 recipes + party supplies · 41 items · completed Friday at 4:10 pm",
    bought: 39,
    skipped: 2,
  },
  {
    month: "Apr",
    day: 20,
    title: "Week 17 list",
    sub: "6 recipes · 35 items · completed Sunday at 5:15 pm",
    bought: 34,
    skipped: 1,
  },
];

export default function HistoryPage() {
  const t = useTranslations();
  const showBanner = !isSupabaseConfigured();

  return (
    <>
      <div className="page-head">
        <div>
          <h2>
            {t("pages.history.title")} <em>{t("pages.history.titleEm")}</em>
          </h2>
          <p>{t("pages.history.subtitle")}</p>
        </div>
        <div className="search">
          <Search />
          <input placeholder={t("common.search")} />
        </div>
      </div>

      {showBanner && <ConfigureBanner message={t("common.configureSupabase")} />}

      <div className="history-list">
        {HISTORY.map((h) => (
          <div key={`${h.month}-${h.day}`} className="history-card">
            <div className="date-block">
              <div className="month">{h.month}</div>
              <div className="day serif">{h.day}</div>
            </div>
            <div className="info">
              <h5 className="serif">{h.title}</h5>
              <p>{h.sub}</p>
            </div>
            <div className="stats">
              <div>
                <b className="serif">{h.bought}</b> bought
              </div>
              <div>
                <b className="serif">{h.skipped}</b> skipped
              </div>
            </div>
            <div className="actions">
              <button type="button" className="btn btn-secondary">
                <Copy /> {t("common.duplicate")}
              </button>
              <button type="button" className="btn btn-secondary" aria-label="View">
                <Eye />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
