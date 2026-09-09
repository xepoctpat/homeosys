import type { AgentFinding, AgentResult, OperatorAgentContext } from "./types.ts";

const TRACE_WINDOW = 24;

function finding(
  severity: AgentFinding["severity"],
  code: string,
  title: string,
  detail: string,
  suggestedAction?: string,
): AgentFinding {
  return { code, severity, title, detail, suggestedAction };
}

export function observeOperator({ events }: OperatorAgentContext): AgentResult {
  const recent = events.slice(-TRACE_WINDOW);
  const findings: AgentFinding[] = [];
  const runtimeErrors = recent.filter((event) => event.kind === "runtime-error");

  if (runtimeErrors.length > 0) {
    findings.push(
      finding(
        "critical",
        "runtime-error",
        "A runtime error was observed",
        runtimeErrors.at(-1)?.detail ?? "The app reported an uncaught runtime error.",
        "Capture the recent operator trace and fix the first failing action.",
      ),
    );
  }

  const actions = recent
    .filter((event) => event.kind === "action" && event.action)
    .map((event) => event.action as NonNullable<typeof event.action>);
  const repeated = [...new Set(actions)].find(
    (action) => actions.slice(-10).filter((candidate) => candidate === action).length >= 4,
  );
  if (repeated) {
    findings.push(
      finding(
        "warning",
        "repeated-action",
        "The operator is repeating one control",
        `"${repeated}" was used repeatedly in the latest interaction window.`,
        "Check whether the control gives clear feedback or fails to apply its change.",
      ),
    );
  }

  const recentActions = actions.slice(-12);
  if (recentActions.length >= 8 && new Set(recentActions).size >= 6) {
    findings.push(
      finding(
        "warning",
        "interaction-churn",
        "The control surface may be causing friction",
        "Many different controls were used in a short sequence without a stable pause.",
        "Review labels, feedback, and whether the active control state is obvious.",
      ),
    );
  }

  const summary = findings.some((item) => item.severity === "critical")
    ? "Operator-observer found a runtime problem."
    : findings.length > 0
      ? "Operator-observer found interaction patterns worth reviewing."
      : "No operator-facing problems observed.";

  return { agentId: "operator-observer", summary, findings };
}
