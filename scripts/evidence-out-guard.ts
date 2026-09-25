import { join, resolve } from "node:path";

/** True if outDir is under committed evidence/ but not under evidence/_smoke. */
export function isCommittedEvidencePath(
  outDir: string,
  evidenceRoot: string,
  smokeRoot: string,
): boolean {
  const out = resolve(outDir);
  const root = resolve(evidenceRoot);
  const smoke = resolve(smokeRoot);
  const under = (base: string) =>
    out === base || out.startsWith(base + "/") || out.startsWith(base + "\\");
  if (under(smoke)) return false;
  return under(root);
}

export function resolveEvidenceOutDir(options: {
  outDir?: string;
  writeCommitted: boolean;
  evidenceRoot: string;
  smokeRoot: string;
}): string {
  const { evidenceRoot, smokeRoot, writeCommitted } = options;
  if (options.outDir === undefined) {
    return writeCommitted ? evidenceRoot : smokeRoot;
  }
  const out = resolve(options.outDir);
  if (!writeCommitted && isCommittedEvidencePath(out, evidenceRoot, smokeRoot)) {
    throw new Error(
      "Refusing to write committed evidence/ (including m2…m5 subpaths) without --write / --commit-artifacts (default is evidence/_smoke).",
    );
  }
  return out;
}

export function evidenceDirPair(repoRoot: string) {
  const evidenceRoot = join(repoRoot, "evidence");
  const smokeRoot = join(evidenceRoot, "_smoke");
  return { evidenceRoot, smokeRoot };
}
