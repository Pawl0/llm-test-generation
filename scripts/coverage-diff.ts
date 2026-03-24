import fs from 'fs';

interface CoverageTotal {
  statements: { pct: number };
  branches: { pct: number };
  functions: { pct: number };
  lines: { pct: number };
}

function loadTotal(summaryPath: string): CoverageTotal {
  const raw = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
  return raw.total as CoverageTotal;
}

const before = loadTotal('coverage-before/coverage-summary.json');
const after  = loadTotal('coverage/coverage-summary.json');

const metrics = ['statements', 'branches', 'functions', 'lines'] as const;

console.log('\n📊 Coverage Delta\n');
console.log('Metric        Before   After    Δ');
console.log('──────────────────────────────────');

for (const m of metrics) {
  const b = before[m].pct;
  const a = after[m].pct;
  const delta = (a - b).toFixed(1);
  const sign = a > b ? '+' : '';
  const icon = a >= 80 ? '✅' : a >= 60 ? '⚠️ ' : '❌';
  console.log(`${icon} ${m.padEnd(12)} ${String(b).padStart(5)}%  ${String(a).padStart(5)}% ${sign}${delta}%`);
}
