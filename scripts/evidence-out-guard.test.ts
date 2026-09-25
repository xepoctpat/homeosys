import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import { describe, it } from "node:test";
import {
  evidenceDirPair,
  isCommittedEvidencePath,
  resolveEvidenceOutDir,
} from "./evidence-out-guard.ts";

const repo = resolve("/tmp/homeosys-fake-root");
const { evidenceRoot, smokeRoot } = evidenceDirPair(repo);

describe("evidence out-dir write guard", () => {
  it("treats evidence/ and evidence/m2 as committed", () => {
    assert.equal(isCommittedEvidencePath(evidenceRoot, evidenceRoot, smokeRoot), true);
    assert.equal(isCommittedEvidencePath(join(evidenceRoot, "m2"), evidenceRoot, smokeRoot), true);
    assert.equal(isCommittedEvidencePath(join(evidenceRoot, "m5", "x"), evidenceRoot, smokeRoot), true);
  });

  it("allows evidence/_smoke and children", () => {
    assert.equal(isCommittedEvidencePath(smokeRoot, evidenceRoot, smokeRoot), false);
    assert.equal(isCommittedEvidencePath(join(smokeRoot, "m2"), evidenceRoot, smokeRoot), false);
  });

  it("allows paths outside evidence/", () => {
    assert.equal(isCommittedEvidencePath(join(repo, "tmp-out"), evidenceRoot, smokeRoot), false);
  });

  it("resolveEvidenceOutDir defaults to _smoke without --write", () => {
    assert.equal(
      resolveEvidenceOutDir({ writeCommitted: false, evidenceRoot, smokeRoot }),
      smokeRoot,
    );
  });

  it("resolveEvidenceOutDir defaults to evidence/ with --write", () => {
    assert.equal(
      resolveEvidenceOutDir({ writeCommitted: true, evidenceRoot, smokeRoot }),
      evidenceRoot,
    );
  });

  it("refuses --out evidence/m2 without --write", () => {
    assert.throws(
      () =>
        resolveEvidenceOutDir({
          outDir: join(evidenceRoot, "m2"),
          writeCommitted: false,
          evidenceRoot,
          smokeRoot,
        }),
      /Refusing to write committed evidence/,
    );
  });

  it("allows --out evidence/m2 with --write", () => {
    const out = resolveEvidenceOutDir({
      outDir: join(evidenceRoot, "m2"),
      writeCommitted: true,
      evidenceRoot,
      smokeRoot,
    });
    assert.equal(out, resolve(join(evidenceRoot, "m2")));
  });

  it("allows --out evidence/_smoke without --write", () => {
    const out = resolveEvidenceOutDir({
      outDir: smokeRoot,
      writeCommitted: false,
      evidenceRoot,
      smokeRoot,
    });
    assert.equal(out, resolve(smokeRoot));
  });
});
