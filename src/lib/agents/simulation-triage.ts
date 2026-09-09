import type { AgentFinding, AgentResult, SimulationAgentContext } from "./types.ts";

function finding(
  severity: AgentFinding["severity"],
  code: string,
  title: string,
  detail: string,
  suggestedAction?: string,
): AgentFinding {
  return { code, severity, title, detail, suggestedAction };
}

export function triageSimulation({ metrics }: SimulationAgentContext): AgentResult {
  const findings: AgentFinding[] = [];

  if (metrics.population === 0 || metrics.viability < 0.08) {
    findings.push(
      finding(
        "critical",
        "collapse",
        "The field is close to collapse",
        "Very little viable life remains, so the current rule and climate are not sustaining the field.",
        "Reseed the current world or increase available energy.",
      ),
    );
  } else if (metrics.density < 0.04) {
    findings.push(
      finding(
        "warning",
        "sparse",
        "The field is running sparse",
        "Population is below four percent of the available cells.",
        "Try the Garden preset or raise the homeostatic correction strength.",
      ),
    );
  }

  if (metrics.density > 0.42) {
    findings.push(
      finding(
        "warning",
        "crowded",
        "The field is overcrowded",
        "A dense field is likely to consume its local energy faster than it can recover.",
        "Try the Ice line or Dust preset, or reduce the target density.",
      ),
    );
  }

  if (metrics.meanEnergy < 0.18 && metrics.population > 0) {
    findings.push(
      finding(
        "warning",
        "energy-low",
        "Energy reserves are low",
        "Living cells are competing for a nearly exhausted substrate.",
        "Increase available energy or pause to inspect the current climate.",
      ),
    );
  }

  const activeLoops = metrics.loops.filter((loop) => loop.active);
  if (activeLoops.length > 0) {
    findings.push(
      finding(
        "info",
        "feedback-active",
        `${activeLoops.length} feedback loop${activeLoops.length === 1 ? "" : "s"} active`,
        activeLoops.map((loop) => loop.label).join(", "),
      ),
    );
  }

  const critical = findings.some((item) => item.severity === "critical");
  const warning = findings.some((item) => item.severity === "warning");
  const summary = critical
    ? "Intervention recommended: the field is losing viability."
    : warning
      ? "The field is viable but under pressure."
      : "The field is within a stable operating range.";

  return { agentId: "simulation-triage", summary, findings };
}
