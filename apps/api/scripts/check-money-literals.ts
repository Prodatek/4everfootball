/**
 * Phase 2 Definition of Done: "A CI grep test that fails the build if a
 * naira amount appears outside pricing.ts." No CI exists in this repo (see
 * the Phase 0 report), so — same as rebuild-from-events.ts — this ships as
 * a runnable script: `pnpm run check-money-literals` from apps/api.
 *
 * Heuristic: flags any `*Kobo` property/variable assigned a raw numeric
 * literal (not a reference to pricing.ts's exports) outside
 * packages/shared/src/pricing.ts and its apps/api/src/config/pricing.ts
 * re-export. Test files (*.spec.ts) are exempt — a test exercising a code
 * path with an arbitrary amount isn't "pricing" anything, it's not the risk
 * this check exists for.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const REPO_ROOT = join(__dirname, '../../..');
const SCAN_ROOTS = [join(REPO_ROOT, 'apps/api/src')];
const EXEMPT_FILES = [
  join(REPO_ROOT, 'packages/shared/src/pricing.ts'),
  join(REPO_ROOT, 'apps/api/src/config/pricing.ts'),
];

// e.g. `priceKobo: 100_000`, `amountKobo = 7500000`, `feeKobo:250000` — a
// *Kobo identifier immediately followed by `:` or `=` and then a digit,
// which only happens when a literal is being assigned (a reference like
// `priceKobo: someVar.priceKobo` or `priceKobo: PLAYER_REGISTRATION...`
// never has a digit right there).
const MONEY_LITERAL_PATTERN = /\b\w*Kobo\w*\s*[:=]\s*\d/g;

interface Finding {
  file: string;
  line: number;
  snippet: string;
}

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, files);
    } else if (entry.endsWith('.ts') && !entry.endsWith('.spec.ts')) {
      files.push(full);
    }
  }
  return files;
}

function main() {
  const findings: Finding[] = [];

  for (const root of SCAN_ROOTS) {
    for (const file of walk(root)) {
      if (EXEMPT_FILES.includes(file)) continue;

      const content = readFileSync(file, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        MONEY_LITERAL_PATTERN.lastIndex = 0;
        if (MONEY_LITERAL_PATTERN.test(line)) {
          findings.push({
            file: relative(REPO_ROOT, file),
            line: index + 1,
            snippet: line.trim(),
          });
        }
      });
    }
  }

  if (findings.length === 0) {
    console.log('OK — no money literals found outside pricing.ts.');
    return;
  }

  console.error(`FAILED — ${findings.length} money literal(s) found outside pricing.ts:`);
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line}: ${f.snippet}`);
  }
  process.exitCode = 1;
}

main();
