import assert from "node:assert/strict";
import { test } from "node:test";
import { disturbanceWindowCopy } from "./disturbance-window.ts";
import { PROVISIONAL_SCHEDULE } from "./types.ts";

test("disturbanceWindowCopy describes pulse / sustained / idle", () => {
  const pulse = { ...PROVISIONAL_SCHEDULE, id: "pulse" as const, startGen: 50, duration: 25 };
  const active = disturbanceWindowCopy(pulse, 60, 0.55);
  assert.match(active, /Pulse:/);
  assert.match(active, /active while gen ∈ \[50, 75\)/);
  assert.match(active, /\bactive\b/);
  assert.match(active, /w=0\.55 now/);

  const idle = disturbanceWindowCopy(pulse, 10, 0);
  assert.match(idle, /idle \(outside window\)/);

  const sustainedOpen = {
    ...PROVISIONAL_SCHEDULE,
    id: "sustained" as const,
    startGen: 50,
    duration: 0,
  };
  const open = disturbanceWindowCopy(sustainedOpen, 80, 0.4);
  assert.match(open, /open-ended \(duration=0\)/);
  assert.match(open, /from startGen=50/);
  assert.match(open, /\bactive\b/);

  const none = disturbanceWindowCopy({ ...PROVISIONAL_SCHEDULE, id: "none" }, 10, 0);
  assert.match(none, /idle \(no disturbance schedule\)/);
});

test("disturbanceWindowCopy notes pulse startGen >= generationLimit caveat", () => {
  const pulse = { id: "pulse" as const, startGen: 50, duration: 25, amplitude: 0.55 };
  const copy = disturbanceWindowCopy(pulse, 10, 0, 40);
  assert.match(copy, /startGen=50/);
  assert.match(copy, /generationLimit=40/);
  assert.match(copy, /never opens/);
  const ok = disturbanceWindowCopy(pulse, 10, 0, 200);
  assert.equal(ok.includes("never opens"), false);
});
