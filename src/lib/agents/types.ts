import type { Metrics, PresetId, SimSettings } from "@/sim/types";

export type AgentId = "simulation-triage" | "operator-observer";
export type SkillId = "simulation-observer" | "operator-observation";
export type TriageSeverity = "info" | "warning" | "critical";

export interface SimulationAgentContext {
  kind?: "simulation";
  metrics: Metrics;
  settings?: SimSettings;
  preset?: PresetId;
}

export type OperatorAction =
  | "run"
  | "pause"
  | "step"
  | "reseed"
  | "clear"
  | "fit"
  | "paint"
  | "change-tab"
  | "change-setting"
  | "change-display";

export interface OperatorEvent {
  kind: "action" | "runtime-error";
  action?: OperatorAction;
  detail?: string;
  timestamp: number;
}

export interface OperatorAgentContext {
  kind: "operator";
  events: readonly OperatorEvent[];
}

export type AgentContext = SimulationAgentContext | OperatorAgentContext;

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
  input: "simulation-metrics" | "operator-events";
}

export interface AgentDefinition {
  id: AgentId;
  name: string;
  description: string;
  skills: readonly SkillId[];
  run(context: AgentContext): AgentResult;
}
