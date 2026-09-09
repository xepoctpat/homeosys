import { useLayoutEffect, useRef } from "react";
import type { SimEngine } from "@/sim/engine";
import type { PaintMode, PresetId } from "@/sim/types";

interface FieldCanvasProps {
  engine: SimEngine;
  running: boolean;
  speed: number;
  paintMode: PaintMode;
  brush: number;
  showHeat: boolean;
  showEnergy: boolean;
  initialPreset: PresetId;
  onMetrics: () => void;
  onUnlock: () => void;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "").trim();
  const n = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16,
  );
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  const u = Math.max(0, Math.min(1, t));
  return [
    Math.round(a[0] + (b[0] - a[0]) * u),
    Math.round(a[1] + (b[1] - a[1]) * u),
    Math.round(a[2] + (b[2] - a[2]) * u),
  ];
}

function measureBox(el: HTMLElement): { w: number; h: number } {
  const rect = el.getBoundingClientRect();
  return {
    w: Math.max(el.clientWidth, rect.width, 0),
    h: Math.max(el.clientHeight, rect.height, 0),
  };
}

function fallbackBox(): { w: number; h: number } {
  const vw = window.visualViewport?.width ?? window.innerWidth ?? 960;
  const vh = window.visualViewport?.height ?? window.innerHeight ?? 640;
  return {
    w: Math.max(480, Math.floor(vw * 0.62)),
    h: Math.max(320, Math.floor(vh * 0.55)),
  };
}

export function FieldCanvas({
  engine,
  running,
  speed,
  paintMode,
  brush,
  showHeat,
  showEnergy,
  initialPreset,
  onMetrics,
  onUnlock,
}: FieldCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const envRef = useRef<HTMLCanvasElement | null>(null);
  const runningRef = useRef(running);
  const speedRef = useRef(speed);
  const modeRef = useRef(paintMode);
  const brushRef = useRef(brush);
  const heatRef = useRef(showHeat);
  const energyRef = useRef(showEnergy);
  const painting = useRef(false);

  runningRef.current = running;
  speedRef.current = speed;
  modeRef.current = paintMode;
  brushRef.current = brush;
  heatRef.current = showHeat;
  energyRef.current = showEnergy;

  useLayoutEffect(() => {
    const canvasNode = canvasRef.current;
    const wrapNode = wrapRef.current;
    if (!canvasNode || !wrapNode) return;

    const ctxNode = canvasNode.getContext("2d", { alpha: false }) ?? canvasNode.getContext("2d");
    if (!ctxNode) return;

    const envNode = envRef.current ?? document.createElement("canvas");
    envRef.current = envNode;
    const envCtxNode = envNode.getContext("2d", { alpha: false }) ?? envNode.getContext("2d");
    if (!envCtxNode) return;

    const gfx = {
      wrap: wrapNode,
      canvas: canvasNode,
      ctx: ctxNode,
      env: envNode,
      envCtx: envCtxNode,
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let bootRaf = 0;
    let last = performance.now();
    let acc = 0;
    let cssW = 1;
    let cssH = 1;
    let lastMetrics = 0;
    let fittedReal = false;
    const theme = readTheme();

    function readTheme() {
      const s = getComputedStyle(document.documentElement);
      const pick = (name: string, fb: string) => {
        const v = s.getPropertyValue(name).trim();
        return v || fb;
      };
      return {
        bg: hexToRgb(pick("--color-bg", "#090a0c")),
        accent: hexToRgb(pick("--color-accent", "#8aa394")),
        fg: hexToRgb(pick("--color-fg", "#e8e6dc")),
        cold: hexToRgb(pick("--color-heat-cold", "#1a2830")),
        hot: hexToRgb(pick("--color-heat-hot", "#3a2a1c")),
        energyLow: hexToRgb(pick("--color-energy-low", "#111b24")),
        energyHigh: hexToRgb(pick("--color-energy-high", "#c3a85d")),
      };
    }

    function snapShown() {
      const { alive, shown } = engine;
      for (let i = 0; i < shown.length; i++) {
        if (alive[i]) shown[i] = 1;
      }
    }

    function seedAt(w: number, h: number) {
      engine.fitTo(Math.max(w, 320), Math.max(h, 240));
      engine.seed(initialPreset);
      snapShown();
      onMetrics();
    }

    function applyBitmap(w: number, h: number) {
      cssW = Math.max(1, w);
      cssH = Math.max(1, h);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      gfx.canvas.width = Math.max(1, Math.floor(cssW * dpr));
      gfx.canvas.height = Math.max(1, Math.floor(cssH * dpr));
      gfx.canvas.style.width = "100%";
      gfx.canvas.style.height = "100%";
      gfx.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function resize() {
      const box = measureBox(gfx.wrap);
      const laidOut = box.w >= 32 && box.h >= 32;
      const size = laidOut ? box : fallbackBox();
      applyBitmap(laidOut ? box.w : size.w, laidOut ? box.h : size.h);

      if (engine.cols === 0) {
        seedAt(size.w, size.h);
        if (laidOut) fittedReal = true;
        return;
      }

      if (laidOut && !fittedReal && engine.generation === 0) {
        fittedReal = true;
        const nextCols = Math.max(48, Math.min(220, Math.floor(box.w / 6.5)));
        const nextRows = Math.max(36, Math.min(180, Math.floor(box.h / 6.5)));
        if (Math.abs(nextCols - engine.cols) > 10 || Math.abs(nextRows - engine.rows) > 10) {
          seedAt(box.w, box.h);
        }
      }
    }

    function cellFromEvent(ev: PointerEvent) {
      const rect = gfx.canvas.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      const cw = cssW / Math.max(1, engine.cols);
      const ch = cssH / Math.max(1, engine.rows);
      return { cx: Math.floor(x / cw), cy: Math.floor(y / ch) };
    }

    function paintAt(ev: PointerEvent) {
      const { cx, cy } = cellFromEvent(ev);
      engine.paint(cx, cy, modeRef.current, brushRef.current);
    }

    const onDown = (ev: PointerEvent) => {
      onUnlock();
      painting.current = true;
      gfx.canvas.setPointerCapture(ev.pointerId);
      paintAt(ev);
    };
    const onMove = (ev: PointerEvent) => {
      if (!painting.current) return;
      paintAt(ev);
    };
    const onUp = (ev: PointerEvent) => {
      painting.current = false;
      try {
        gfx.canvas.releasePointerCapture(ev.pointerId);
      } catch {
        /* ignore */
      }
    };

    gfx.canvas.addEventListener("pointerdown", onDown);
    gfx.canvas.addEventListener("pointermove", onMove);
    gfx.canvas.addEventListener("pointerup", onUp);
    gfx.canvas.addEventListener("pointercancel", onUp);

    function render() {
      const { bg, accent, fg, cold, hot, energyLow, energyHigh } = theme;
      gfx.ctx.fillStyle = `rgb(${bg[0]},${bg[1]},${bg[2]})`;
      gfx.ctx.fillRect(0, 0, cssW, cssH);

      const { cols, rows } = engine;
      if (cols === 0 || rows === 0) return;

      const cellW = cssW / cols;
      const cellH = cssH / rows;

      if (heatRef.current || energyRef.current) {
        if (gfx.env.width !== cols || gfx.env.height !== rows) {
          gfx.env.width = cols;
          gfx.env.height = rows;
        }
        const img = gfx.envCtx.createImageData(cols, rows);
        const data = img.data;
        const { heat, energy } = engine;
        for (let i = 0; i < cols * rows; i++) {
          let c = bg;
          if (heatRef.current) c = mix(cold, hot, heat[i]);
          c = mix(bg, c, heatRef.current ? 0.82 : 0);
          if (energyRef.current) {
            const energyColor = mix(energyLow, energyHigh, energy[i]);
            c = mix(c, energyColor, heatRef.current ? 0.5 : 0.82);
          }
          const o = i * 4;
          data[o] = c[0];
          data[o + 1] = c[1];
          data[o + 2] = c[2];
          data[o + 3] = 255;
        }
        gfx.envCtx.putImageData(img, 0, 0);
        gfx.ctx.imageSmoothingEnabled = true;
        gfx.ctx.drawImage(gfx.env, 0, 0, cssW, cssH);
      }

      gfx.ctx.imageSmoothingEnabled = false;
      const gap = cellW >= 7 ? 0.18 : cellW >= 4 ? 0.12 : 0;
      const shown = engine.shown;
      const kind = engine.kind;
      const tenure = engine.tenure;

      for (let y = 0; y < rows; y++) {
        const py = y * cellH;
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          const a = shown[i];
          if (a < 0.04) continue;
          const px = x * cellW;
          const isReg = kind[i] === 1;
          const age = tenure[i] / 255;
          const rgb = isReg ? mix(accent, fg, 0.55) : mix(accent, fg, 0.22 + age * 0.28);
          gfx.ctx.globalAlpha = Math.min(1, a);
          const insetX = cellW * gap * 0.5;
          const insetY = cellH * gap * 0.5;
          const w = Math.max(0.6, cellW - insetX * 2);
          const h = Math.max(0.6, cellH - insetY * 2);
          const rad = Math.min(w, h) * (cellW >= 8 ? 0.22 : 0.12);
          roundRect(gfx.ctx, px + insetX, py + insetY, w, h, rad);
          gfx.ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
          gfx.ctx.fill();
          if (isReg && cellW >= 5) {
            gfx.ctx.globalAlpha = Math.min(1, a * 0.9);
            gfx.ctx.strokeStyle = `rgb(${fg[0]},${fg[1]},${fg[2]})`;
            gfx.ctx.lineWidth = Math.max(0.6, cellW * 0.08);
            roundRect(gfx.ctx, px + insetX, py + insetY, w, h, rad);
            gfx.ctx.stroke();
          }
        }
      }
      gfx.ctx.globalAlpha = 1;

      for (const p of engine.pulses) {
        const t = p.age / p.life;
        const r = Math.max(cellW, cellH) * (2 + t * 18);
        gfx.ctx.beginPath();
        gfx.ctx.arc((p.x + 0.5) * cellW, (p.y + 0.5) * cellH, r, 0, Math.PI * 2);
        gfx.ctx.strokeStyle = `rgba(${accent[0]},${accent[1]},${accent[2]},${(1 - t) * 0.35})`;
        gfx.ctx.lineWidth = 1.25;
        gfx.ctx.stroke();
      }
    }

    function loop(now: number) {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const box = measureBox(gfx.wrap);
      if (
        box.w >= 32 &&
        box.h >= 32 &&
        (Math.abs(box.w - cssW) > 1 || Math.abs(box.h - cssH) > 1)
      ) {
        resize();
      }
      if (runningRef.current && engine.cols > 0) {
        acc += dt;
        const interval = 1 / Math.max(0.5, speedRef.current);
        let steps = 0;
        while (acc >= interval && steps < 10) {
          engine.step();
          acc -= interval;
          steps++;
        }
        if (steps > 0 && now - lastMetrics > 80) {
          lastMetrics = now;
          onMetrics();
        }
      } else {
        acc = 0;
      }
      engine.advanceDisplay(dt, reduced);
      render();
      raf = requestAnimationFrame(loop);
    }

    const onWinResize = () => {
      resize();
      render();
    };

    const ro = new ResizeObserver(() => {
      resize();
      render();
    });
    ro.observe(gfx.wrap);
    window.addEventListener("resize", onWinResize);
    window.visualViewport?.addEventListener("resize", onWinResize);

    resize();
    if (engine.cols === 0) {
      const fb = fallbackBox();
      seedAt(fb.w, fb.h);
    }
    snapShown();
    render();

    const boxNow = measureBox(gfx.wrap);
    if (boxNow.w < 32 || boxNow.h < 32) {
      let tries = 0;
      const boot = () => {
        resize();
        render();
        const next = measureBox(gfx.wrap);
        if ((next.w < 32 || next.h < 32) && tries++ < 120) {
          bootRaf = requestAnimationFrame(boot);
        }
      };
      bootRaf = requestAnimationFrame(boot);
    }

    void document.fonts?.ready?.then(() => {
      resize();
      render();
    });

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(bootRaf);
      ro.disconnect();
      window.removeEventListener("resize", onWinResize);
      window.visualViewport?.removeEventListener("resize", onWinResize);
      gfx.canvas.removeEventListener("pointerdown", onDown);
      gfx.canvas.removeEventListener("pointermove", onMove);
      gfx.canvas.removeEventListener("pointerup", onUp);
      gfx.canvas.removeEventListener("pointercancel", onUp);
    };
  }, [engine, onMetrics, onUnlock, initialPreset]);

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0 h-full min-h-0 w-full min-w-0 overflow-hidden bg-bg"
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full max-h-full max-w-full touch-none"
        aria-label="Cellular field"
      />
      {(showHeat || showEnergy) && (
        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-white/10 bg-black/55 px-2.5 py-1.5 text-[10px] font-medium tracking-wide text-white/75 backdrop-blur-sm">
          {showHeat && (
            <span className="flex items-center gap-1.5">
              <i className="h-2 w-2 rounded-full bg-[#c46d43]" />
              heat: cold → hot
            </span>
          )}
          {showEnergy && (
            <span className="flex items-center gap-1.5">
              <i className="h-2 w-2 rounded-full bg-[#c3a85d]" />
              energy: low → rich
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  if (radius < 0.4) {
    ctx.rect(x, y, w, h);
    return;
  }
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
