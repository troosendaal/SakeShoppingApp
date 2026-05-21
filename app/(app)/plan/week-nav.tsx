"use client";

import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { addDays, isoDate, parseIsoDate, startOfWeek } from "@/lib/date-utils";

export function WeekNav({
  weekStart,
  weekLabel,
  weekNumber,
  isCurrentWeek,
}: {
  weekStart: string;
  weekLabel: string;
  weekNumber: number;
  isCurrentWeek: boolean;
}) {
  const router = useRouter();
  const start = parseIsoDate(weekStart);

  function go(weekStartIso: string) {
    router.push(`/plan?week=${weekStartIso}`);
  }

  return (
    <div className="week-nav">
      <button
        type="button"
        className="week-nav-btn"
        onClick={() => go(isoDate(addDays(start, -7)))}
        aria-label="Previous week"
      >
        <ChevronLeft />
      </button>
      <div>
        <span className="week-label serif">
          Week {weekNumber} · <em>{weekLabel}</em>
        </span>
        {isCurrentWeek && <span className="week-sub">· this week</span>}
      </div>
      <button
        type="button"
        className="week-nav-btn"
        onClick={() => go(isoDate(addDays(start, 7)))}
        aria-label="Next week"
      >
        <ChevronRight />
      </button>
      <button
        type="button"
        className="week-nav-btn"
        onClick={() => go(isoDate(startOfWeek(new Date())))}
        title="Today"
        aria-label="Today"
      >
        <Calendar />
      </button>
    </div>
  );
}
