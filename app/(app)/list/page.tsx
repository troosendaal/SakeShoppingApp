import { AlertCircle, Check, MessageSquare, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { ConfigureBanner, isSupabaseConfigured } from "@/components/configure-banner";

type Item = {
  emoji: string;
  name: string;
  source: string;
  merged?: boolean;
  qty: string;
  unit: string;
  stepper?: boolean;
  urgent?: boolean;
  note?: string;
  done?: boolean;
};

type Group = { emoji: string; name: string; items: Item[] };

const GROUPS: Group[] = [
  {
    emoji: "🥬",
    name: "Fruit & Vegetables",
    items: [
      {
        emoji: "🍋",
        name: "Lemons",
        source: "Pasta al limone",
        qty: "3",
        unit: "whole",
        stepper: true,
        urgent: true,
        note: "Get the unwaxed ones if available",
      },
      {
        emoji: "🧅",
        name: "Onions",
        source: "3 recipes · EN+NL+FR",
        merged: true,
        qty: "5",
        unit: "whole",
      },
      {
        emoji: "🥕",
        name: "Carrots",
        source: "Thai curry",
        qty: "3",
        unit: "whole",
        done: true,
      },
    ],
  },
  {
    emoji: "🥛",
    name: "Dairy",
    items: [
      {
        emoji: "🧀",
        name: "Parmesan",
        source: "Pasta + risotto",
        qty: "200",
        unit: "g",
        note: "Reggiano if they have it, otherwise grana padano",
      },
      {
        emoji: "🥚",
        name: "Eggs",
        source: "",
        qty: "8",
        unit: "whole",
        stepper: true,
        urgent: true,
      },
    ],
  },
  {
    emoji: "🧼",
    name: "Household",
    items: [
      {
        emoji: "🧻",
        name: "Toilet paper",
        source: "ad-hoc",
        qty: "1",
        unit: "pack",
        note: "The recycled brand we usually buy",
      },
    ],
  },
];

export default function ListPage() {
  const t = useTranslations();
  const showBanner = !isSupabaseConfigured();

  return (
    <>
      <div className="page-head">
        <div>
          <h2>
            {t("pages.list.title")} <em>{t("pages.list.titleEm")}</em>
          </h2>
          <p>{t("pages.list.subtitle")}</p>
        </div>
      </div>

      {showBanner && <ConfigureBanner message={t("common.configureSupabase")} />}

      <div className="quick-add">
        <div className="quick-add-row">
          <input placeholder="Add an item…" />
          <div className="qa-mode-toggle">
            <button type="button" className="active">
              {t("common.single")}
            </button>
            <button type="button">{t("common.bulkPaste")}</button>
          </div>
          <button type="button" className="btn btn-primary">
            <Plus /> {t("common.add")}
          </button>
        </div>
      </div>

      <div className="list-main">
        {GROUPS.map((group) => (
          <div key={group.name} className="list-group">
            <div className="group-head">
              <h4 className="serif">
                <span className="em">{group.emoji}</span> {group.name}{" "}
                <span className="count">{group.items.length}</span>
              </h4>
            </div>
            {group.items.map((item, i) => (
              <div
                key={i}
                className={`list-item${item.urgent ? " urgent" : ""}${item.done ? " done" : ""}`}
              >
                <div className="check">
                  <Check />
                </div>
                <div className="item-icon">{item.emoji}</div>
                <div className="item-main">
                  <div className="item-row">
                    <span className="item-name">{item.name}</span>
                    {item.urgent && (
                      <span className="urgent-flag">
                        <AlertCircle /> {t("common.urgent")}
                      </span>
                    )}
                    {item.source && (
                      <span className={`item-source${item.merged ? " merged" : ""}`}>
                        {item.source}
                      </span>
                    )}
                  </div>
                  {item.note ? (
                    <div className="note">
                      <MessageSquare /> {item.note}
                    </div>
                  ) : (
                    <button type="button" className="note-add">
                      <Plus /> {t("common.addNote")}
                    </button>
                  )}
                </div>
                <div className="qty-cell">
                  {item.stepper ? (
                    <>
                      <div className="qty-stepper">
                        <button type="button">−</button>
                        <span className="num serif">{item.qty}</span>
                        <button type="button">+</button>
                      </div>
                      <span
                        style={{ fontSize: 11, color: "var(--ink-soft)", fontStyle: "italic" }}
                      >
                        {item.unit}
                      </span>
                    </>
                  ) : (
                    <span className="qty-display serif">
                      {item.qty} <span className="unit">{item.unit}</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
