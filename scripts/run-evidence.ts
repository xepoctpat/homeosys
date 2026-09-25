#!/usr/bin/env tsx
/**
 * Headless evidence ladder runner (M2–M5) + C3 M2 ladder-factor sweep.
 *
 * Usage:
 *   npm run evidence
 *   npm run evidence -- --n 2
 *   npm run evidence -- --write
 *   npm run evidence -- --milestones m2,m4 --write
 *   npm run evidence -- --sweep-m2
 *   npm run evidence -- --sweep-m2 --sweep-axes studyCondition,controllerMode --n 1
 *
 * Default output: evidence/_smoke/ (gitignored) so smoke runs do not clobber
 * committed evidence/m2…m5 artifacts. Pass --write / --commit-artifacts to
 * refresh the committed tree (or --out DIR for an explicit path).
 * Observational only — not scientific closure.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  armProtocolMeta,
  EVIDENCE_DEFAULT_N,
  EVIDENCE_GRIDS,
  exportArmCsv,
  exportArmJsonl,
  runEvidenceMatrix,
  validateEvidenceMatrix,
  type EvidenceGrid,
  type EvidenceMilestone,
} from "../src/sim/evidence-matrix.ts";
import {
  M2_LADDER_SWEEP_AXES,
  assertM2SweepSpec,
  resolveM2SweepGrids,
  runM2LadderSweep,
  type M2LadderSweepAxis,
} from "../src/sim/m2-ladder-sweep.ts";
import { evidenceDirPair, resolveEvidenceOutDir } from "./evidence-out-guard.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

const { evidenceRoot: committedEvidenceDir, smokeRoot: smokeEvidenceDir } = evidenceDirPair(repoRoot);

function parseArgs(argv: string[]) {
  let n: number | undefined;
  let outDir: string | undefined;
  let milestones: EvidenceMilestone[] | undefined;
  let csv = true;
  let writeCommitted = false;
  let sweepM2 = false;
  let sweepAxes: M2LadderSweepAxis[] | undefined;
  let sweepGrids: EvidenceGrid[] | undefined;
  let sweepCols: number | undefined;
  let sweepRows: number | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--n" && argv[i + 1]) {
      n = Number(argv[++i]);
    } else if (a === "--out" && argv[i + 1]) {
      outDir = resolve(repoRoot, argv[++i]);
    } else if (a === "--milestones" && argv[i + 1]) {
      milestones = argv[++i].split(",").map((s) => s.trim()) as EvidenceMilestone[];
    } else if (a === "--no-csv") {
      csv = false;
    } else if (a === "--write" || a === "--commit-artifacts") {
      writeCommitted = true;
    } else if (a === "--sweep-m2") {
      sweepM2 = true;
    } else if (a === "--sweep-axes" && argv[i + 1]) {
      sweepAxes = argv[++i].split(",").map((s) => s.trim()) as M2LadderSweepAxis[];
    } else if (a === "--sweep-grids" && argv[i + 1]) {
      const ids = argv[++i].split(",").map((s) => s.trim());
      const grids: EvidenceGrid[] = [];
      for (const id of ids) {
        const known = EVIDENCE_GRIDS.find((g) => g.id === id);
        if (!known) {
          console.error(
            `Unknown sweep grid "${id}". Known: ${EVIDENCE_GRIDS.map((g) => g.id).join(", ")}`,
          );
          process.exit(2);
        }
        grids.push(known);
      }
      sweepGrids = grids;
    } else if (a === "--sweep-cols" && argv[i + 1]) {
      sweepCols = Number(argv[++i]);
    } else if (a === "--sweep-rows" && argv[i + 1]) {
      sweepRows = Number(argv[++i]);
    } else if (a === "--help" || a === "-h") {
      console.log(
        "Usage: tsx scripts/run-evidence.ts [--n N] [--out DIR] [--milestones m2,m3,m4,m5] [--write|--commit-artifacts] [--no-csv]\n" +
          "       tsx scripts/run-evidence.ts --sweep-m2 [--sweep-axes AXIS,...] [--sweep-grids 48x36,72x54] [--n N] [--out DIR] [--write]\n" +
          "       Cheap single-grid smoke: --sweep-grids 48x36  OR  --sweep-cols 48 --sweep-rows 36\n" +
          `Default out: evidence/_smoke (gitignored). Sweep axes allowlist: ${M2_LADDER_SWEEP_AXES.join(", ")}.\n` +
          `Default sweep grids: ${EVIDENCE_GRIDS.map((g) => g.id).join(", ")} (dual).\n` +
          "Continuous gains (homeoGain/climate/…) refused. Observational ≠ closure; M6 gated.",
      );
      process.exit(0);
    }
  }
  try {
    outDir = resolveEvidenceOutDir({
      outDir,
      writeCommitted,
      evidenceRoot: committedEvidenceDir,
      smokeRoot: smokeEvidenceDir,
    });
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(2);
  }
  return { n, outDir, milestones, csv, writeCommitted, sweepM2, sweepAxes, sweepGrids, sweepCols, sweepRows };
}

function folderReadme(milestone: EvidenceMilestone | "m2-sweep"): string {
  return `# Evidence ${milestone.toUpperCase()}

Observational batch artifacts from \`npm run evidence\`.

- Protocol metadata is the first JSONL line (prefix \`# \`).
- Eng scaffolding ≠ scientific closure.
- Protocol-calibrated observational K; no life / autopoiesis claims.
- Smoke default: \`npm run evidence\` → \`evidence/_smoke/\`. Refresh committed: \`npm run evidence -- --write\`.
`;
}

function runLadder(args: ReturnType<typeof parseArgs>) {
  const validated = validateEvidenceMatrix();
  if (!validated.ok) {
    console.error("evidence matrix invalid:", validated.error);
    process.exit(1);
  }

  console.log(
    `Running evidence matrix n=${args.n ?? EVIDENCE_DEFAULT_N} milestones=${(args.milestones ?? ["m2", "m3", "m4", "m5"]).join(",")} → ${args.outDir}`,
  );

  const started = Date.now();
  const results = runEvidenceMatrix({
    n: args.n,
    milestones: args.milestones,
    collectSeries: false,
    onArm: (arm, index, total) => {
      const meta = armProtocolMeta(arm);
      console.log(`[${index + 1}/${total}] ${meta.armId} n=${meta.n} … ok`);
    },
  });

  const topReadme = `# Homeosys evidence artifacts

Generated by \`npm run evidence\` / \`tsx scripts/run-evidence.ts\`.

## Important

- **Engineering scaffolding ≠ scientific closure.** These runs are observational exports of the M2–M5 ladder.
- **Protocol-calibrated observational K** (densityMin/densityMax from unregulated M2 baseline+envNoControl; see \`src/sim/calibrated-k.ts\`). Not scientific closure.
- **No life / autopoiesis / cognition claims.**
- Default CLI writes \`evidence/_smoke/\` (gitignored). Committed \`evidence/{m2..m5}\` only with \`--write\`.

## Layout

- \`m2/\` — baseline / env-no-control / homeostatic (shared pulse schedule; grids 48×36 + 72×54)
- \`m3/\` — homeostatic vs ultrastable (shared sustained schedule; both grids); UltraEpisodeLog aggregates in summaries
- \`m4/\` — SetpointError vs ViabilityBand (\`abControllerProtocols\`; both grids)
- \`m5/\` — Central | Local | Coordinated | Coordinated α=0 ablation (\`abcOrganizationProtocols\`; both grids). VSM = hypothesis only.

Seed strategy: fixed explicit \`EVIDENCE_SEED_KEYS\` list (N=20) in \`src/sim/evidence-matrix.ts\` — no silent seedKey+i.

See \`docs/evidence/README.md\` for full reproduce notes.
`;

  mkdirSync(args.outDir, { recursive: true });
  writeFileSync(join(args.outDir, "README.md"), topReadme, "utf8");

  for (const arm of results) {
    const dir = join(args.outDir, arm.arm.milestone);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "README.md"), folderReadme(arm.arm.milestone), "utf8");
    const stem = arm.arm.id;
    writeFileSync(join(dir, `${stem}.jsonl`), exportArmJsonl(arm), "utf8");
    if (args.csv) {
      writeFileSync(join(dir, `${stem}.csv`), exportArmCsv(arm), "utf8");
    }
  }

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`Wrote ${results.length} arms under ${args.outDir} in ${elapsed}s`);
}

function runSweep(args: ReturnType<typeof parseArgs>) {
  const expandAxes = args.sweepAxes ?? (["studyCondition"] as M2LadderSweepAxis[]);
  try {
    assertM2SweepSpec({ expandAxes });
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(2);
  }
  const sweepSpec = {
    expandAxes,
    grids: args.sweepGrids,
    cols: args.sweepCols,
    rows: args.sweepRows,
  };
  const grids = resolveM2SweepGrids(sweepSpec);
  console.log(
    `Running M2 ladder-factor sweep expandAxes=${expandAxes.join(",")} grids=${grids.map((g) => g.id).join(",")} n=${args.n ?? 1} → ${args.outDir}`,
  );
  const started = Date.now();
  const results = runM2LadderSweep({
    ...sweepSpec,
    n: args.n ?? 1,
    collectSeries: false,
    onArm: (arm, index, total) => {
      const meta = armProtocolMeta(arm);
      console.log(`[${index + 1}/${total}] ${meta.armId} n=${meta.n} … ok`);
    },
  });

  const topReadme = `# Homeosys M2 ladder-factor sweep (C3)

Generated by \`npm run evidence -- --sweep-m2\`.

- **Ladder factors only:** studyCondition / controllerMode / organizationMode / coordCouplingAlpha / schedule.
- Continuous gains (\`homeoGain\`, climate, …) refused as sweep axes (stamped in ThetaV0 only).
- **Observational ≠ scientific closure.** M6 HARD-GATED. No E1 eng platform.
- Default expand: \`studyCondition\` only (cheap smoke). Thick matrix: \`--sweep-axes organizationMode,coordCouplingAlpha,schedule,controllerMode\` (studyCondition stays homeostatic).
- Default grids: dual \`${EVIDENCE_GRIDS.map((g) => g.id).join(", ")}\`. Override: \`--sweep-grids 48x36\` or \`--sweep-cols/--sweep-rows\`.
- Write-guard unchanged: default \`evidence/_smoke/\`.
`;

  const dir = join(args.outDir, "m2-sweep");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(args.outDir, "README.md"), topReadme, "utf8");
  writeFileSync(join(dir, "README.md"), folderReadme("m2-sweep"), "utf8");

  for (const arm of results) {
    const stem = arm.arm.id;
    writeFileSync(join(dir, `${stem}.jsonl`), exportArmJsonl(arm), "utf8");
    if (args.csv) {
      writeFileSync(join(dir, `${stem}.csv`), exportArmCsv(arm), "utf8");
    }
  }

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log(
    `Wrote ${results.length} M2 sweep arms (grids=${grids.map((g) => g.id).join(",")}) under ${dir} in ${elapsed}s`,
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.sweepM2) {
    runSweep(args);
  } else {
    runLadder(args);
  }
}

main();
