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
  PRESETS,
  type Metrics,
  type PaintMode,
  type PresetId,
  type SimSettings,
} from "@/sim/types";

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
    if (saved.settings) setSettings({ ...DEFAULT_SETTINGS, ...saved.settings });
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
      recordAction("change-setting", Object.keys(partial).join(", "));
      const next = { ...settingsRef.current, ...partial };
      settingsRef.current = next;
      engine.applySettings(next);
      setSettings(next);
      if (!running) {
        engine.step();
        engine.advanceDisplay(0.08, false);
        onMetrics();
      }
    },
    [engine, onMetrics, recordAction, running],
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
    engine.step();
    engine.advanceDisplay(0.08, false);
    onMetrics();
    audioRef.current?.blip("step");
  }, [engine, onMetrics, recordAction]);

  const applyPreset = useCallback(
    (id: PresetId) => {
      const next = worldSettingsForPreset(settingsRef.current, id);
      settingsRef.current = next;
      setPreset(id);
      recordAction("reseed", id);
      setSettings(next);
      engine.applySettings(next);
      engine.seed(id);
      onMetrics();
    },
    [engine, onMetrics, recordAction],
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
  }, [engine]);

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
        applyPreset(preset);
      } else if (e.code === "KeyC") {
        clear();
      } else if (e.code === "KeyM") {
        setMuted((m) => !m);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleRun, stepOnce, applyPreset, preset, clear]);

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
            onClear={clear}
            onRefit={refit}
          />
        </aside>
      </div>
    </div>
  );
}
