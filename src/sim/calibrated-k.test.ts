import assert from "node:assert/strict";
import test from "node:test";
import {
  K_CALIBRATION_META,
  K_CALIBRATION_METHOD,
  PROTOCOL_CALIBRATED_K,
} from "./calibrated-k.ts";

test("PROTOCOL_CALIBRATED_K matches frozen unregulated percentile recipe", () => {
  assert.equal(K_CALIBRATION_METHOD, "m2-unregulated-positive-p05-p95-floorceil-3dp");
  assert.deepEqual([...K_CALIBRATION_META.sourceStudyConditions], ["baseline", "envNoControl"]);
  assert.deepEqual([...K_CALIBRATION_META.excludedStudyConditions], ["homeostatic", "ultrastable"]);
  const { positiveP05, positiveP95 } = K_CALIBRATION_META.empirical;
  assert.equal(PROTOCOL_CALIBRATED_K.densityMin, Math.floor(positiveP05 * 1000) / 1000);
  assert.equal(PROTOCOL_CALIBRATED_K.densityMax, Math.ceil(positiveP95 * 1000) / 1000);
  assert.ok(PROTOCOL_CALIBRATED_K.densityMin < PROTOCOL_CALIBRATED_K.densityMax);
  assert.ok(PROTOCOL_CALIBRATED_K.densityMin > 0);
});
