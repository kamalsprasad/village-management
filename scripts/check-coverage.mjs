#!/usr/bin/env node
/**
 * Tiered coverage gate for the Village Management System.
 *
 * Instead of a single global threshold, we enforce per-layer minimums:
 *   - Logic layer (utils, services, composables): 90%
 *   - Stores: 80%
 *   - Boot/router: 80%
 *   - Components: 50% (UI-heavy, harder to unit test)
 *   - Pages: not gated (covered by E2E)
 *
 * Reads coverage/coverage-summary.json (produced by `vitest run --coverage`
 * with the json-summary reporter).
 *
 * Exit code 0 if all layers meet their thresholds, 1 otherwise.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const COVERAGE_FILE = resolve(root, 'coverage', 'coverage-summary.json');

// Tiered thresholds (statements / branches / functions / lines)
// These are raised thresholds reflecting coverage gains from Phases 7A-7G.
// Target: Logic 90%+, Stores 80%, Boot/Router 90%+, Components 80%+.
// The Stores layer is still below its 80% target due to large farm-store
// (~3000 lines) and finance-store (~1700 lines) files that have only
// basic CRUD coverage. Current thresholds lock in existing coverage as a
// regression baseline; raise them as more store tests are added.
const LAYERS = [
  {
    name: 'Logic layer (utils, services, composables)',
    patterns: [/src\/utils\//, /src\/services\//, /src\/composables\//],
    // Current: ~97% statements. Target: 90% — achieved.
    thresholds: { statements: 95, branches: 85, functions: 95, lines: 95 },
  },
  {
    name: 'Stores',
    patterns: [/src\/stores\//, /src\/modules\/[^/]+\/stores\//],
    // Current: ~56% statements. Target: 80%.
    // Main gaps: farm-store (18%), finance-store (40%), storage-stores (34%).
    // Thresholds set just below current levels to prevent regression.
    thresholds: { statements: 55, branches: 35, functions: 50, lines: 55 },
  },
  {
    name: 'Boot & router',
    patterns: [/src\/boot\//, /src\/router\//],
    // Current: 100%. Target: 80% — achieved.
    thresholds: { statements: 95, branches: 90, functions: 95, lines: 95 },
  },
  {
    name: 'Components',
    patterns: [/src\/components\//],
    // Current: 100%. Target: 50% — achieved.
    thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
  },
];

const METRICS = ['statements', 'branches', 'functions', 'lines'];

function loadCoverage() {
  try {
    const raw = readFileSync(COVERAGE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`ERROR: Could not read coverage summary at ${COVERAGE_FILE}`);
    console.error('       Run `npm run test:coverage` first.');
    console.error(`       Detail: ${err.message}`);
    process.exit(2);
  }
}

function fileMatchesLayers(filePath, layers) {
  // Normalize Windows backslashes to forward slashes for regex matching
  const normalized = filePath.replace(/\\/g, '/');
  return layers.filter((layer) => layer.patterns.some((pattern) => pattern.test(normalized)));
}

function checkLayer(layer, files) {
  // Aggregate coverage for all files matching this layer's patterns.
  const totals = { total: 0, covered: 0 };
  const metricTotals = {};
  METRICS.forEach((m) => (metricTotals[m] = { total: 0, covered: 0 }));

  let fileCount = 0;
  for (const [filePath, fileCoverage] of Object.entries(files)) {
    // Skip the aggregate "total" key — only process actual file entries.
    if (filePath === 'total') continue;
    if (!fileMatchesLayers(filePath, [layer]).length) continue;
    fileCount++;
    METRICS.forEach((metric) => {
      const mc = fileCoverage[metric];
      if (mc) {
        metricTotals[metric].total += mc.total;
        metricTotals[metric].covered += mc.covered;
      }
    });
  }

  if (fileCount === 0) {
    console.log(`  ${layer.name}: no files found — skipped`);
    return true;
  }

  let passed = true;
  const results = [];
  METRICS.forEach((metric) => {
    const { total, covered } = metricTotals[metric];
    const pct = total === 0 ? 100 : (covered / total) * 100;
    const threshold = layer.thresholds[metric];
    const ok = pct >= threshold;
    if (!ok) passed = false;
    results.push(
      `    ${metric.padEnd(12)} ${pct.toFixed(2)}% (threshold ${threshold}%) ${ok ? 'PASS' : 'FAIL'}`,
    );
  });

  console.log(`  ${layer.name} (${fileCount} files): ${passed ? 'PASS' : 'FAIL'}`);
  results.forEach((r) => console.log(r));
  return passed;
}

function main() {
  console.log('\n=== Tiered Coverage Check ===\n');
  const coverage = loadCoverage();
  const files = coverage;

  let allPassed = true;
  for (const layer of LAYERS) {
    if (!checkLayer(layer, files)) allPassed = false;
  }

  console.log('\n=== Summary ===');
  if (allPassed) {
    console.log('  All layers met their coverage thresholds.\n');
    process.exit(0);
  } else {
    console.log('  One or more layers failed coverage thresholds.\n');
    process.exit(1);
  }
}

main();
