import { Area, AreaChart, ResponsiveContainer } from "recharts";
import type { Metrics } from "@/sim/types";
import { cn } from "@/lib/utils";

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function MetricsBar({ metrics, running }: { metrics: Metrics | null; running: boolean }) {
  const history =
    metrics?.popHistory.map((pop, i) => ({
      i,
      pop,
    })) ?? [];

  const cells: { label: string; value: string; hideOnSmall?: boolean; title?: string }[] = [
    { label: "Gen", value: metrics ? fmt(metrics.generation) : "—" },
    { label: "Pop", value: metrics ? fmt(metrics.population) : "—" },
    { label: "Density", value: metrics ? pct(metrics.density) : "—" },
    { label: "In K", value: metrics ? (metrics.inK ? "yes" : "no") : "—" },
    { label: "Time in K", value: metrics ? pct(metrics.timeInKFraction) : "—" },
    {
      label: "Outside Σ",
      value: metrics ? metrics.cumulativeDistanceOutsideK.toFixed(3) : "—",
      hideOnSmall: true,
      title: "Cumulative density distance outside provisional K",
    },
    {
      label: "K dens",
      value: metrics
        ? `${(metrics.densityMin * 100).toFixed(0)}–${(metrics.densityMax * 100).toFixed(0)}% provisional`
        : "—",
      hideOnSmall: true,
      title: "Provisional K density interval (not calibrated)",
    },
    { label: "Viability", value: metrics ? metrics.viability.toFixed(2) : "—" },
    { label: "Setpoint", value: metrics ? pct(metrics.setpoint) : "—", hideOnSmall: true },
    { label: "Rule", value: metrics ? metrics.rule : "—" },
    { label: "Seed", value: metrics ? String(metrics.seedKey >>> 0) : "—", hideOnSmall: true },
    {
      label: "Schedule",
      value: metrics ? metrics.scheduleId : "—",
      hideOnSmall: true,
      title: "Active disturbance schedule id",
    },
    {
      label: "w",
      value: metrics ? metrics.w.toFixed(2) : "—",
      hideOnSmall: true,
      title: "Current disturbance w(t)",
    },
  ];

  return (
    <div className="flex items-center gap-3 border-t border-border bg-surface px-3 py-2 sm:px-4">
      <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-4 overflow-x-auto">
        {cells.map((c) => (
          <div
            key={c.label}
            className={cn("shrink-0", c.hideOnSmall && "hidden sm:block")}
            title={c.title}
          >
            <div className="text-xs tracking-wide text-subtle">{c.label}</div>
            <div className="font-mono text-sm tabular-nums text-fg">{c.value}</div>
          </div>
        ))}
        <div className="no-scrollbar hidden min-w-0 flex-1 items-center gap-1.5 overflow-x-auto lg:flex">
          <span className="shrink-0 text-xs text-subtle">{running ? "Loops" : "Idle"}</span>
          {metrics?.loops.map((loop) => (
            <span
              key={loop.id}
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 font-mono text-xs tabular-nums",
                loop.active ? "bg-accent/20 text-accent" : "bg-raised text-subtle",
              )}
              title={loop.note || loop.label}
            >
              {loop.label}
            </span>
          ))}
          {metrics && metrics.adaptations > 0 ? (
            <span className="shrink-0 rounded-full bg-fg/10 px-2 py-0.5 font-mono text-xs text-fg">
              {metrics.adaptations} adapted
            </span>
          ) : null}
        </div>
      </div>
      <div className="hidden h-8 w-36 shrink-0 sm:block">
        {history.length > 2 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <Area
                type="monotone"
                dataKey="pop"
                stroke="var(--color-accent)"
                fill="var(--color-accent)"
                fillOpacity={0.16}
                strokeWidth={1.5}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full rounded-sm bg-raised" />
        )}
      </div>
    </div>
  );
}
