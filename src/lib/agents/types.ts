import type { Metrics, PresetId, SimSettings } from "@/sim/types";

export type AgentId = "simulation-triage";
export type SkillId = "simulation-observer";
export type TriageSeverity = "info" | "warning" | "critical";

export interface AgentContext {
  metrics: Metrics;
  settings?: SimSettings;
  preset?: PresetId;
}

export interface AgentFinding {
  code: string;
  severity: TriageSeverity;
  title: string;
  detail: string;
  suggestedAction?: string;
}

export interface AgentResult {
  agentId: AgentId;
  summary: string;
  findings: AgentFinding[];
}

export interface SkillDefinition {
  id: SkillId;
  name: string;
  description: string;
  input: "simulation-metrics";
}

export interface AgentDefinition {
  id: AgentId;
  name: string;
  description: string;
  skills: readonly SkillId[];
  run(context: AgentContext): AgentResult;
}
