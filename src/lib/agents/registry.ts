import { observeOperator } from "./operator-observer.ts";
import { triageSimulation } from "./simulation-triage.ts";
import type { AgentDefinition, SkillDefinition } from "./types.ts";

export const LOCAL_SKILLS: readonly SkillDefinition[] = [
  {
    id: "simulation-observer",
    name: "Simulation observer",
    description: "Reads a Homeostat metrics snapshot and identifies pressure points.",
    input: "simulation-metrics",
  },
  {
    id: "operator-observation",
    name: "Operator observation",
    description:
      "Reads bounded local UI events and identifies app-facing friction or runtime errors.",
    input: "operator-events",
  },
];

export const LOCAL_AGENTS: readonly AgentDefinition[] = [
  {
    id: "simulation-triage",
    name: "Simulation triage",
    description: "Explains whether the current field is stable, sparse, crowded, or collapsing.",
    skills: ["simulation-observer"],
    run: (context) => {
      if (!("metrics" in context)) throw new Error("Simulation triage requires simulation metrics");
      return triageSimulation(context);
    },
  },
  {
    id: "operator-observer",
    name: "Operator observer",
    description:
      "Reports interaction friction and runtime errors without controlling the simulation.",
    skills: ["operator-observation"],
    run: (context) => {
      if (context.kind !== "operator")
        throw new Error("Operator observer requires operator events");
      return observeOperator(context);
    },
  },
];

export function getLocalAgent(id: AgentDefinition["id"]): AgentDefinition {
  const agent = LOCAL_AGENTS.find((candidate) => candidate.id === id);
  if (!agent) throw new Error(`Unknown local agent: ${id}`);
  return agent;
}
