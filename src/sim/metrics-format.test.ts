import assert from "node:assert/strict";
import { test } from "node:test";
import { buildMetricCells, fixed, fmt, pct } from "./metrics-format.ts";

test("fmt / pct / fixed return dash for non-finite values", () => {
  assert.equal(fmt(undefined), "—");
  assert.equal(fmt(null), "—");
  assert.equal(fmt(NaN), "—");
  assert.equal(fmt(Infinity), "—");
  assert.equal(fmt("12"), "—");
  assert.equal(fmt(42), "42");

  assert.equal(pct(undefined), "—");
  assert.equal(pct(0.165), "16.5%");

  assert.equal(fixed(undefined, 2), "—");
  assert.equal(fixed(1.2345, 2), "1.23");
});

test("buildMetricCells tolerates partial / odd metrics without throwing", () => {
  assert.doesNotThrow(() => buildMetricCells(null));
  assert.doesNotThrow(() => buildMetricCells({}));
  assert.doesNotThrow(() =>
    buildMetricCells({
      generation: undefined as unknown as number,
      population: undefined as unknown as number,
      density: undefined as unknown as number,
      inK: undefined as unknown as boolean,
      timeInKFraction: undefined as unknown as number,
      cumulativeDistanceOutsideK: undefined as unknown as number,
      densityMin: undefined as unknown as number,
      densityMax: undefined as unknown as number,
      viability: undefined as unknown as number,
      setpoint: undefined as unknown as number,
      w: undefined as unknown as number,
      ultraProbeCount: undefined as unknown as number,
      ultraKeptCount: undefined as unknown as number,
      ultraRevertedCount: undefined as unknown as number,
      stableEpisodeLength: undefined as unknown as number,
    }),
  );
  const cells = buildMetricCells({ generation: 10, population: 99 });
  assert.equal(cells.find((c) => c.label === "Gen")?.value, "10");
  assert.equal(cells.find((c) => c.label === "Pop")?.value, "99");
  assert.equal(cells.find((c) => c.label === "Density")?.value, "—");
  assert.equal(cells.find((c) => c.label === "Viability")?.value, "—");
  assert.equal(cells.find((c) => c.label === "w")?.value, "—");
});
