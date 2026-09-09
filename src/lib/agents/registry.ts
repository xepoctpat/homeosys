import { triageSimulation } from "./simulation-triage.ts";
import type { AgentDefinition, SkillDefinition } from "./types.ts";

export const LOCAL_SKILLS: readonly SkillDefinition[] = [
  {
    id: "simulation-observer",
    name: "Simulation observer",
    description: "Reads a Homeostat metrics snapshot and identifies pressure points.",
    input: "simulation-metrics",
  },
];

export const LOCAL_AGENTS: readonly AgentDefinition[] = [
  {
    id: "simulation-triage",
    name: "Simulation triage",
    description: "Explains whether the current field is stable, sparse, crowded, or collapsing.",
    skills: ["simulation-observer"],
    run: triageSimulation,
  },
];

export function getLocalAgent(id: AgentDefinition["id"]): AgentDefinition {
  const agent = LOCAL_AGENTS.find((candidate) => candidate.id === id);
  if (!agent) throw new Error(`Unknown local agent: ${id}`);
  return agent;
}
