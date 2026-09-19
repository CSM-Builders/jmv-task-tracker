import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ListChecks,
  TrendingUp,
} from "lucide-react";

interface StatsGridProps {
  stats: {
    total: number;
    dueToday: number;
    completed: number;
    overdue: number;
    completionRate: number;
  };
}

export function StatsGrid({ stats }: StatsGridProps) {
  const cards = [
    { label: "Total tasks", value: stats.total, icon: ListChecks },
    { label: "Due today", value: stats.dueToday, icon: CalendarClock },
    { label: "Completed", value: stats.completed, icon: CheckCircle2 },
    { label: "Overdue", value: stats.overdue, icon: AlertTriangle },
  ];

  return (
    <section
      className="grid grid-cols-2 gap-3 xl:grid-cols-5"
      aria-label="Task statistics"
    >
      {cards.map(({ label, value, icon: Icon }) => (
        <article key={label} className="surface-card rounded-2xl p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-[var(--muted-foreground)]">
              {label}
            </span>
            <Icon
              size={19}
              className="text-[var(--primary)]"
              aria-hidden="true"
            />
          </div>
          <strong className="font-display mt-3 block text-3xl leading-none md:text-4xl">
            {value}
          </strong>
        </article>
      ))}
      <article className="surface-card col-span-2 rounded-2xl p-4 md:p-5 xl:col-span-1">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-bold text-[var(--muted-foreground)]">
            Completion
          </span>
          <TrendingUp
            size={19}
            className="text-[var(--accent)]"
            aria-hidden="true"
          />
        </div>
        <div className="mt-3 flex items-end gap-3">
          <strong className="font-display text-3xl leading-none md:text-4xl">
            {stats.completionRate}%
          </strong>
          <div
            className="mb-1 h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-raised)]"
            aria-label={`${stats.completionRate}% complete`}
            role="progressbar"
            aria-valuenow={stats.completionRate}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-[image:var(--primary-gradient)]"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
        </div>
      </article>
    </section>
  );
}
