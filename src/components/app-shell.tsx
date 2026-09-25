import { useCallback, useEffect, useRef, useState } from "react";
import { ControlPanel } from "@/components/control-panel";
import { FieldCanvas } from "@/components/field-canvas";
import { MetricsBar } from "@/components/metrics-bar";
import { FieldAudio } from "@/sim/audio";
import { SimEngine } from "@/sim/engine";
import {
  observeOperator,
  type AgentResult,
  type OperatorAction,
  type OperatorEvent,
} from "@/lib/agents";
import {
  DEFAULT_SETTINGS,
  normalizeSimSettings,
  PRESETS,
  STUDY_CONDITIONS,
  type Metrics,
  type PaintMode,
  type PresetId,
  type SimSettings,
  type StudyConditionId,
} from "@/sim/types";
import {
  RESEARCH_DEFAULT_REPEATS,
  clampRepeats,
  captureProtocol,
  downloadResearchExport,
  runBatchAsync,
  settingsFromProtocol,
  type ResearchProtocol,
  type ResearchRunSummary,
} from "@/sim/research-mode";

const STORAGE_KEY = "homeostat.v1";
interface Persisted {
  speed: number;
  settings: SimSettings;
  paintMode: PaintMode;
  brush: number;
  showHeat: boolean;
  showEnergy: boolean;
  muted: boolean;
  preset: PresetId;
}

function loadPersisted(): Partial<Persisted> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<Persisted>;
  } catch {
    return {};
  }
}

function worldSettingsForPreset(current: SimSettings, preset: PresetId): SimSettings {
  const found = PRESETS.find((item) => item.id === preset);
  return {
    ...current,
    environment: found?.settings.environment ?? DEFAULT_SETTINGS.environment,
    climate: found?.settings.climate ?? DEFAULT_SETTINGS.climate,
    seasonRate: found?.settings.seasonRate ?? DEFAULT_SETTINGS.seasonRate,
    seasonAmp: found?.settings.seasonAmp ?? DEFAULT_SETTINGS.seasonAmp,
    energyRichness: found?.settings.energyRichness ?? DEFAULT_SETTINGS.energyRichness,
    metabolicHeat: found?.settings.metabolicHeat ?? DEFAULT_SETTINGS.metabolicHeat,
    noise: found?.settings.noise ?? DEFAULT_SETTINGS.noise,
  };
}

export function AppShell() {
  const engineRef = useRef<SimEngine | null>(null);
  if (!engineRef.current) engineRef.current = new SimEngine();
  const engine = engineRef.current;
  const audioRef = useRef<FieldAudio | null>(null);
  if (!audioRef.current) audioRef.current = new FieldAudio();

  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(10);
  const [settings, setSettings] = useState<SimSettings>({ ...DEFAULT_SETTINGS });
  const [paintMode, setPaintMode] = useState<PaintMode>("life");
  const [brush, setBrush] = useState(1);
  const [showHeat, setShowHeat] = useState(true);
  const [showEnergy, setShowEnergy] = useState(true);
  const [muted, setMuted] = useState(false);
  const [preset, setPreset] = useState<PresetId>("homeostat");
  const [seedLocked, setSeedLocked] = useState(false);
  const [studyCondition, setStudyCondition] = useState<StudyConditionId | null>(null);
  const [researchArmed, setResearchArmed] = useState(false);
  const [researchProtocol, setResearchProtocol] = useState<ResearchProtocol | null>(null);
  const [researchRepeats, setResearchRepeats] = useState(RESEARCH_DEFAULT_REPEATS);
  const [researchBatchRunning, setResearchBatchRunning] = useState(false);
  const [researchBatchProgress, setResearchBatchProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);
  const [researchResults, setResearchResults] = useState<ResearchRunSummary[]>([]);
  const [researchHint, setResearchHint] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [layoutNonce, setLayoutNonce] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [operatorResult, setOperatorResult] = useState<AgentResult>(() =>
    observeOperator({ kind: "operator", events: [] }),
  );
  const operatorEventsRef = useRef<OperatorEvent[]>([]);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const recordOperatorEvent = useCallback((event: Omit<OperatorEvent, "timestamp">) => {
    const next = [...operatorEventsRef.current, { ...event, timestamp: Date.now() }].slice(-24);
    operatorEventsRef.current = next;
    setOperatorResult(observeOperator({ kind: "operator", events: next }));
  }, []);

  const recordAction = useCallback(
    (action: OperatorAction, detail?: string) =>
      recordOperatorEvent({ kind: "action", action, detail }),
    [recordOperatorEvent],
  );

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      recordOperatorEvent({
        kind: "runtime-error",
        detail: event.message || "Uncaught runtime error",
      });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      recordOperatorEvent({
        kind: "runtime-error",
        detail: event.reason instanceof Error ? event.reason.message : String(event.reason),
      });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [recordOperatorEvent]);

  useEffect(() => {
    const saved = loadPersisted();
    if (saved.speed) setSpeed(saved.speed);
    if (saved.settings) setSettings(normalizeSimSettings({ ...DEFAULT_SETTINGS, ...saved.settings }));
    if (saved.paintMode) setPaintMode(saved.paintMode);
    if (typeof saved.brush === "number") setBrush(saved.brush);
    if (typeof saved.showHeat === "boolean") setShowHeat(saved.showHeat);
    if (typeof saved.showEnergy === "boolean") setShowEnergy(saved.showEnergy);
    if (typeof saved.muted === "boolean") setMuted(saved.muted);
    if (saved.preset) setPreset(saved.preset);
    setHydrated(true);
  }, []);

  useEffect(() => {
    engine.applySettings(settings);
  }, [engine, settings]);

  useEffect(() => {
    audioRef.current?.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    if (!hydrated) return;
    const data: Persisted = {
      speed,
      settings,
      paintMode,
      brush,
      showHeat,
      showEnergy,
      muted,
      preset,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignore quota */
    }
  }, [hydrated, speed, settings, paintMode, brush, showHeat, showEnergy, muted, preset]);

  const lastAdapt = useRef(0);
  const lastLoop = useRef(false);

  const onMetrics = useCallback(() => {
    const snap = engine.snapshot();
    setMetrics(snap);
    if (snap.limitReached) setRunning(false);
    const audio = audioRef.current;
    if (audio) {
      audio.tick(snap.density, snap.viability);
      if (snap.adaptations > lastAdapt.current) audio.blip("adapt");
      lastAdapt.current = snap.adaptations;
      const any = snap.loops.some((l) => l.active);
      if (any && !lastLoop.current) audio.blip("loop");
      lastLoop.current = any;
    }
  }, [engine]);

  const onSettings = useCallback(
    (partial: Partial<SimSettings>) => {
      if (researchArmed) {
        setResearchHint("Protocol locked — Unlock on the Research tab to edit World/Loops settings.");
        return;
      }
      recordAction("change-setting", Object.keys(partial).join(", "));
      setStudyCondition(null);
      const next = normalizeSimSettings({ ...settingsRef.current, ...partial });
      settingsRef.current = next;
      engine.applySettings(next);
      setSettings(next);
      if (!running) {
        engine.step();
        engine.advanceDisplay(0.08, false);
        onMetrics();
      }
    },
    [engine, onMetrics, recordAction, researchArmed, running],
  );

  const onUnlock = useCallback(() => {
    audioRef.current?.unlock();
  }, []);

  const toggleRun = useCallback(() => {
    audioRef.current?.unlock();
    recordAction(running ? "pause" : "run");
    setRunning((r) => !r);
  }, [recordAction, running]);

  const stepOnce = useCallback(() => {
    audioRef.current?.unlock();
    recordAction("step");
    setRunning(false);
    if (!engine.limitReached()) {
      engine.step();
      engine.advanceDisplay(0.08, false);
      audioRef.current?.blip("step");
    }
    onMetrics();
  }, [engine, onMetrics, recordAction]);

  const applyPreset = useCallback(
    (id: PresetId) => {
      if (researchArmed) {
        setResearchHint("Protocol locked — Unlock on the Research tab to change world preset.");
        return;
      }
      const next = normalizeSimSettings(worldSettingsForPreset(settingsRef.current, id));
      settingsRef.current = next;
      setPreset(id);
      setStudyCondition(null);
      recordAction("reseed", id);
      setSettings(next);
      engine.applySettings(next);
      const key = seedLocked ? engine.seedKey : undefined;
      engine.seed(id, key);
      onMetrics();
    },
    [engine, onMetrics, recordAction, researchArmed, seedLocked],
  );

  const reseed = useCallback(() => {
    recordAction("reseed", preset);
    const key = seedLocked ? engine.seedKey : undefined;
    engine.seed(preset, key);
    onMetrics();
  }, [engine, onMetrics, preset, recordAction, seedLocked]);

  const applyStudyCondition = useCallback(
    (id: StudyConditionId) => {
      if (researchArmed) {
        setResearchHint("Protocol locked — Unlock on the Research tab to change study condition.");
        return;
      }
      const found = STUDY_CONDITIONS.find((item) => item.id === id);
      if (!found) return;
      const next = normalizeSimSettings({ ...settingsRef.current, ...found.settings });
      settingsRef.current = next;
      setStudyCondition(id);
      recordAction("change-setting", `study:${id}`);
      setSettings(next);
      engine.applySettings(next);
      // Reuse the current seed key so condition swaps stay comparable.
      engine.seed(preset, engine.seedKey);
      onMetrics();
    },
    [engine, onMetrics, preset, recordAction, researchArmed],
  );

  const onResearchRepeats = useCallback((n: number) => {
    setResearchRepeats(clampRepeats(n));
  }, []);

  const onLockResearchProtocol = useCallback(() => {
    const cols = Math.max(1, engine.cols || 64);
    const rows = Math.max(1, engine.rows || 48);
    const captured = captureProtocol({
      seedKey: engine.seedKey,
      studyCondition,
      settings: settingsRef.current,
      cols,
      rows,
      worldPreset: preset,
      repeats: researchRepeats,
    });
    if (!captured.ok) {
      setResearchHint(captured.error);
      return;
    }
    const protocol = { ...captured.protocol, repeats: clampRepeats(researchRepeats) };
    const next = settingsFromProtocol(protocol);
    settingsRef.current = next;
    setSettings(next);
    engine.applySettings(next);
    engine.seed(protocol.worldPreset, protocol.seedKey);
    setSeedLocked(true);
    setStudyCondition(protocol.studyCondition);
    setResearchProtocol(protocol);
    setResearchArmed(true);
    setResearchResults([]);
    setResearchBatchProgress(null);
    setResearchHint(
      "Protocol locked. Run batch uses this seed, condition, schedule, and generation limit.",
    );
    recordAction("change-setting", "research:lock");
    onMetrics();
  }, [engine, onMetrics, preset, recordAction, researchRepeats, studyCondition]);

  const onUnlockResearchProtocol = useCallback(() => {
    setResearchArmed(false);
    setResearchProtocol(null);
    setResearchBatchProgress(null);
    setResearchBatchRunning(false);
    setResearchHint("Unlocked — exploratory editing restored on Run / World / Loops.");
    recordAction("change-setting", "research:unlock");
  }, [recordAction]);

  const onRunResearchBatch = useCallback(async () => {
    if (!researchProtocol) {
      setResearchHint("Lock a protocol before Run batch.");
      return;
    }
    if (researchProtocol.generationLimit <= 0) {
      setResearchHint(
        "generationLimit must be > 0 for a research batch. Set it in World before locking.",
      );
      return;
    }
    const protocol: ResearchProtocol = {
      ...researchProtocol,
      repeats: clampRepeats(researchRepeats),
    };
    setResearchProtocol(protocol);
    setResearchBatchRunning(true);
    setResearchBatchProgress({ completed: 0, total: protocol.repeats });
    setResearchHint(null);
    setRunning(false);
    recordAction("change-setting", `research:batch:${protocol.repeats}`);
    try {
      const rows = await runBatchAsync(protocol, (progress) => {
        setResearchBatchProgress({ completed: progress.completed, total: progress.total });
      });
      setResearchResults(rows);
      setResearchHint(`Batch complete — ${rows.length} run summaries ready to export.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setResearchHint(message);
      setResearchResults([]);
    } finally {
      setResearchBatchRunning(false);
    }
  }, [recordAction, researchProtocol, researchRepeats]);

  const onExportResearch = useCallback(
    (format: "jsonl" | "csv") => {
      if (!researchProtocol || researchResults.length === 0) {
        setResearchHint("Run a batch before exporting.");
        return;
      }
      try {
        const name = downloadResearchExport(researchProtocol, researchResults, format);
        setResearchHint(`Downloaded ${name} to your browser download folder.`);
        recordAction("change-setting", `research:export:${format}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setResearchHint(message);
      }
    },
    [recordAction, researchProtocol, researchResults],
  );

  const clear = useCallback(() => {
    recordAction("clear");
    engine.clear();
    onMetrics();
  }, [engine, onMetrics, recordAction]);

  const refit = useCallback(() => {
    recordAction("fit");
    engine.cols = 0;
    setLayoutNonce((n) => n + 1);
  }, [engine, recordAction]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        toggleRun();
      } else if (e.code === "KeyN" || e.code === "ArrowRight") {
        e.preventDefault();
        stepOnce();
      } else if (e.code === "KeyR") {
        reseed();
      } else if (e.code === "KeyC") {
        clear();
      } else if (e.code === "KeyM") {
        setMuted((m) => !m);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleRun, stepOnce, reseed, clear]);

  useEffect(() => {
    const vis = () => {
      if (document.visibilityState === "visible") audioRef.current?.resume();
    };
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, []);

  return (
    <div className="@container flex h-dvh max-h-dvh min-h-0 w-full flex-col overflow-hidden bg-bg text-fg">
      <header className="flex shrink-0 items-end justify-between gap-4 border-b border-border bg-surface px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h1 className="text-lg font-medium tracking-tight text-fg sm:text-xl">Homeostat</h1>
          <p className="text-xs text-muted sm:text-sm">
            Cybernetic Game of Life · space to run · paint on the field
          </p>
        </div>
        <div className="hidden shrink-0 text-right sm:block">
          <div className="font-mono text-xs tabular-nums text-subtle">
            {metrics ? `${engine.cols}×${engine.rows}` : "fitting"}
          </div>
          <div className="font-mono text-sm tabular-nums text-accent">
            {running ? "running" : "paused"}
          </div>
          <div className="max-w-56 truncate text-xs text-subtle" title={operatorResult.summary}>
            {operatorResult.findings[0]?.title ?? "observer: clear"}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden sm:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="relative min-h-[12rem] min-w-0 flex-1 overflow-hidden">
            <div className="absolute inset-2 overflow-hidden rounded-xl bg-bg shadow-[0_0_0_1px_rgba(255,255,255,0.08)] sm:inset-3">
              <FieldCanvas
                key={layoutNonce}
                engine={engine}
                running={running}
                speed={speed}
                paintMode={paintMode}
                brush={brush}
                showHeat={showHeat}
                showEnergy={showEnergy}
                initialPreset={preset}
                onMetrics={onMetrics}
                onUnlock={onUnlock}
              />
            </div>
          </div>
          <MetricsBar metrics={metrics} running={running} />
        </div>

        <aside className="relative z-10 flex max-h-[46%] min-h-0 w-full shrink-0 flex-col overflow-hidden border-t border-border sm:max-h-none sm:h-full sm:w-[min(26rem,38%)] sm:border-l sm:border-t-0">
          <ControlPanel
            running={running}
            speed={speed}
            settings={settings}
            paintMode={paintMode}
            brush={brush}
            showHeat={showHeat}
            showEnergy={showEnergy}
            muted={muted}
            preset={preset}
            onToggleRun={toggleRun}
            onStep={stepOnce}
            onSpeed={(value) => {
              recordAction("change-setting", "speed");
              setSpeed(value);
            }}
            onSettings={onSettings}
            onPaintMode={(mode) => {
              recordAction("change-setting", `paint mode: ${mode}`);
              setPaintMode(mode);
            }}
            onBrush={(value) => {
              recordAction("change-setting", "brush");
              setBrush(value);
            }}
            onShowHeat={(value) => {
              recordAction("change-display", "heat overlay");
              setShowHeat(value);
            }}
            onShowEnergy={(value) => {
              recordAction("change-display", "energy overlay");
              setShowEnergy(value);
            }}
            onMuted={(value) => {
              recordAction("change-display", value ? "mute" : "unmute");
              setMuted(value);
            }}
            onSeed={applyPreset}
            onReseed={reseed}
            onClear={clear}
            onRefit={refit}
            seedKey={metrics?.seedKey ?? engine.seedKey}
            seedLocked={seedLocked}
            onSeedLocked={setSeedLocked}
            studyCondition={studyCondition}
            onStudyCondition={applyStudyCondition}
            metrics={metrics}
            researchArmed={researchArmed}
            researchProtocol={researchProtocol}
            researchRepeats={researchRepeats}
            onResearchRepeats={onResearchRepeats}
            onLockResearchProtocol={onLockResearchProtocol}
            onUnlockResearchProtocol={onUnlockResearchProtocol}
            onRunResearchBatch={() => {
              void onRunResearchBatch();
            }}
            researchBatchRunning={researchBatchRunning}
            researchBatchProgress={researchBatchProgress}
            researchResults={researchResults}
            onExportResearch={onExportResearch}
            researchHint={researchHint}
          />
        </aside>
      </div>
    </div>
  );
}
