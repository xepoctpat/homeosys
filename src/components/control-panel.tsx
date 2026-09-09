import { useState, type CSSProperties, type ReactNode } from "react";
import {
  Droplets,
  Eraser,
  Pause,
  Pencil,
  Play,
  Redo,
  Shuffle,
  StepForward,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { PRESETS, type PaintMode, type PresetId, type SimSettings } from "@/sim/types";

type TabId = "run" | "paint" | "world" | "loops";

interface ControlPanelProps {
  running: boolean;
  speed: number;
  settings: SimSettings;
  paintMode: PaintMode;
  brush: number;
  showHeat: boolean;
  showEnergy: boolean;
  muted: boolean;
  preset: PresetId;
  onToggleRun: () => void;
  onStep: () => void;
  onSpeed: (v: number) => void;
  onSettings: (partial: Partial<SimSettings>) => void;
  onPaintMode: (m: PaintMode) => void;
  onBrush: (n: number) => void;
  onShowHeat: (v: boolean) => void;
  onShowEnergy: (v: boolean) => void;
  onMuted: (v: boolean) => void;
  onSeed: (preset: PresetId) => void;
  onClear: () => void;
  onRefit: () => void;
}

function Row({
  label,
  value,
  hint,
  children,
}: {
  label: string;
  value?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="block space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-fg">{label}</span>
        {value ? <span className="font-mono text-xs tabular-nums text-muted">{value}</span> : null}
      </div>
      {hint ? <p className="text-xs leading-relaxed text-subtle">{hint}</p> : null}
      {children}
    </div>
  );
}

function RangeInput({
  value,
  min,
  max,
  step,
  label,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  label: string;
  onChange: (v: number) => void;
}) {
  const progress = ((value - min) / Math.max(0.0001, max - min)) * 100;
  return (
    <Slider
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={label}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ "--range-progress": `${progress}%` } as CSSProperties}
      className="homeostat-range h-9 w-full cursor-pointer appearance-none bg-transparent"
    />
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="min-w-0">
        <div className="text-sm text-fg">{label}</div>
        {description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-subtle">{description}</p>
        ) : null}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={`${label}: ${checked ? "on" : "off"}`}
      />
    </div>
  );
}

const TABS: { id: TabId; label: string }[] = [
  { id: "run", label: "Run" },
  { id: "paint", label: "Paint" },
  { id: "world", label: "World" },
  { id: "loops", label: "Loops" },
];

const PAINT_HINT: Record<PaintMode, string> = {
  life: "Draw living cells onto the field.",
  erase: "Wipe cells back to empty ground.",
  regulator: "Plant a cell that holds order around it.",
  energy: "Feed the soil so nearby life can last.",
};

export function ControlPanel(props: ControlPanelProps) {
  const {
    running,
    speed,
    settings,
    paintMode,
    brush,
    showHeat,
    showEnergy,
    muted,
    preset,
    onToggleRun,
    onStep,
    onSpeed,
    onSettings,
    onPaintMode,
    onBrush,
    onShowHeat,
    onShowEnergy,
    onMuted,
    onSeed,
    onClear,
    onRefit,
  } = props;

  const [tab, setTab] = useState<TabId>("run");
  const activePreset = PRESETS.find((p) => p.id === preset);

  const modes: { id: PaintMode; label: string; icon: typeof Pencil }[] = [
    { id: "life", label: "Life", icon: Pencil },
    { id: "erase", label: "Erase", icon: Eraser },
    { id: "regulator", label: "Regulator", icon: Zap },
    { id: "energy", label: "Energy", icon: Droplets },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-surface">
      <div className="flex shrink-0 gap-2 px-5 pt-5 pb-4">
        <Button className="flex-1" onClick={onToggleRun} aria-label={running ? "Pause" : "Run"}>
          {running ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
          {running ? "Pause" : "Run"}
        </Button>
        <Button variant="secondary" size="icon" onClick={onStep} aria-label="Step one generation">
          <StepForward className="size-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={() => onMuted(!muted)}
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </Button>
      </div>

      <div className="grid shrink-0 grid-cols-4 gap-1 px-5 pb-4">
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "h-10 rounded-md text-sm font-medium transition-colors duration-150",
                on ? "bg-raised text-fg" : "text-muted hover:text-fg",
              )}
              aria-pressed={on}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain no-scrollbar px-5 pb-6">
        {tab === "run" ? (
          <div className="space-y-5">
            <Row
              label="Speed"
              value={`${speed.toFixed(0)} /s`}
              hint="How many generations tick each second."
            >
              <RangeInput
                min={1}
                max={40}
                step={1}
                value={speed}
                label="Speed"
                onChange={onSpeed}
              />
            </Row>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="secondary" onClick={() => onSeed(preset)}>
                <Shuffle className="size-4" />
                Reseed
              </Button>
              <Button variant="secondary" onClick={onClear}>
                Clear
              </Button>
              <Button variant="outline" onClick={onRefit} aria-label="Fit grid to view">
                <Redo className="size-4" />
                Fit
              </Button>
            </div>
            <p className="text-xs leading-relaxed text-subtle">
              Starts on the seeded pattern. Press Run to let the loops take over.
            </p>
          </div>
        ) : null}

        {tab === "paint" ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-2">
              {modes.map((m) => {
                const Icon = m.icon;
                const on = paintMode === m.id;
                return (
                  <Button
                    key={m.id}
                    variant={on ? "accent" : "secondary"}
                    size="sm"
                    onClick={() => onPaintMode(m.id)}
                    aria-pressed={on}
                  >
                    <Icon className="size-4" />
                    {m.label}
                  </Button>
                );
              })}
            </div>
            <p className="text-xs leading-relaxed text-subtle">{PAINT_HINT[paintMode]}</p>
            <Row label="Brush size" value={String(brush)} hint="How wide each stroke is, in cells.">
              <RangeInput
                min={0}
                max={6}
                step={1}
                value={brush}
                label="Brush size"
                onChange={onBrush}
              />
            </Row>
            <p className="text-xs leading-relaxed text-subtle">
              Drag on the field to draw. Pause first if you want a still canvas.
            </p>
          </div>
        ) : null}

        {tab === "world" ? (
          <div className="space-y-5">
            <div>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => {
                  const on = preset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      title={p.blurb}
                      onClick={() => onSeed(p.id)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-sm transition-colors duration-150",
                        on ? "bg-accent text-accent-fg" : "bg-raised text-muted hover:text-fg",
                      )}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
              {activePreset ? (
                <p className="mt-2 text-xs leading-relaxed text-subtle">{activePreset.blurb}</p>
              ) : null}
            </div>
            <ToggleRow
              label="Climate shapes survival"
              description="Heat, energy, and season decide who lives."
              checked={settings.environment}
              onCheckedChange={(v) => onSettings({ environment: v })}
            />
            <Row
              label="Climate tilt"
              value={settings.climate.toFixed(2)}
              hint="Higher tilts the north colder and the south hotter."
            >
              <RangeInput
                min={0}
                max={1}
                step={0.01}
                value={settings.climate}
                label="Climate tilt"
                onChange={(v) => onSettings({ climate: v })}
              />
            </Row>
            <Row
              label="Season speed"
              value={settings.seasonRate.toFixed(2)}
              hint="How quickly summer and winter cycle."
            >
              <RangeInput
                min={0}
                max={1}
                step={0.01}
                value={settings.seasonRate}
                label="Season speed"
                onChange={(v) => onSettings({ seasonRate: v })}
              />
            </Row>
            <Row
              label="Season strength"
              value={settings.seasonAmp.toFixed(2)}
              hint="How harsh the swing between summer and winter is."
            >
              <RangeInput
                min={0}
                max={1}
                step={0.01}
                value={settings.seasonAmp}
                label="Season strength"
                onChange={(v) => onSettings({ seasonAmp: v })}
              />
            </Row>
            <Row
              label="Available energy"
              value={settings.energyRichness.toFixed(2)}
              hint="How much the soil can feed."
            >
              <RangeInput
                min={0}
                max={1}
                step={0.01}
                value={settings.energyRichness}
                label="Available energy"
                onChange={(v) => onSettings({ energyRichness: v })}
              />
            </Row>
            <Row
              label="Metabolic heat"
              value={settings.metabolicHeat.toFixed(2)}
              hint="How much living cells warm their neighbors."
            >
              <RangeInput
                min={0}
                max={1}
                step={0.01}
                value={settings.metabolicHeat}
                label="Metabolic heat"
                onChange={(v) => onSettings({ metabolicHeat: v })}
              />
            </Row>
            <Row
              label="Random flicker"
              value={settings.noise.toFixed(2)}
              hint="Chance a cell appears or dies for no reason."
            >
              <RangeInput
                min={0}
                max={1}
                step={0.01}
                value={settings.noise}
                label="Random flicker"
                onChange={(v) => onSettings({ noise: v })}
              />
            </Row>
            <div className="space-y-3">
              <ToggleRow
                label="Heat overlay"
                description="Tint the field by temperature."
                checked={showHeat}
                onCheckedChange={onShowHeat}
              />
              <ToggleRow
                label="Energy overlay"
                description="Tint the field by how well-fed the soil is."
                checked={showEnergy}
                onCheckedChange={onShowEnergy}
              />
            </div>
          </div>
        ) : null}

        {tab === "loops" ? (
          <div className="space-y-5">
            <ToggleRow
              label="Self-regulation"
              description="The field watches itself and acts when things drift."
              checked={settings.cybernetics}
              onCheckedChange={(v) => onSettings({ cybernetics: v })}
            />
            <Row
              label="Correction strength"
              value={settings.homeoGain.toFixed(2)}
              hint="How hard it restocks empty ground or thins a crowd."
            >
              <RangeInput
                min={0}
                max={1}
                step={0.01}
                value={settings.homeoGain}
                label="Correction strength"
                onChange={(v) => onSettings({ homeoGain: v })}
              />
            </Row>
            <ToggleRow
              label="Auto target density"
              description="The target density tracks what this world can actually hold."
              checked={settings.autoSetpoint}
              onCheckedChange={(v) => onSettings({ autoSetpoint: v })}
            />
            {!settings.autoSetpoint ? (
              <Row
                label="Target density"
                value={`${(settings.setpoint * 100).toFixed(0)}%`}
                hint="How full the field should stay."
              >
                <RangeInput
                  min={0.04}
                  max={0.4}
                  step={0.01}
                  value={settings.setpoint}
                  label="Target density"
                  onChange={(v) => onSettings({ setpoint: v })}
                />
              </Row>
            ) : null}
            <div className="space-y-3">
              <ToggleRow
                label="Rewrite rules when stuck"
                description="If the world freezes or dies, try a new birth/survive rule."
                checked={settings.ultraEnabled}
                onCheckedChange={(v) => onSettings({ ultraEnabled: v })}
              />
              <ToggleRow
                label="Stir sameness"
                description="If everything looks alike, inject a little noise."
                checked={settings.varietyEnabled}
                onCheckedChange={(v) => onSettings({ varietyEnabled: v })}
              />
              <ToggleRow
                label="Protect established life"
                description="Long-lived clusters are harder to kill."
                checked={settings.autoEnabled}
                onCheckedChange={(v) => onSettings({ autoEnabled: v })}
              />
              <ToggleRow
                label="Drift the target"
                description="The target itself slowly drifts, so the controller never settles."
                checked={settings.observerEnabled}
                onCheckedChange={(v) => onSettings({ observerEnabled: v })}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
