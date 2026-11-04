import fs from 'node:fs';

interface SizeLimitResult {
  name: string;
  size: number;
}

const [currentPath, basePath, reportPath, changedPackages] =
  process.argv.slice(2);

if (!currentPath || !basePath || !reportPath || !changedPackages) {
  throw new Error(
    '用法：pnpm exec tsx scripts/size-limit-report.ts <当前结果> <基线结果> <报告文件> <变更包名>',
  );
}

function readResults(filePath: string): SizeLimitResult[] {
  const results: unknown = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(results)) {
    throw new Error(`体积测量失败：${filePath}`);
  }
  return results as SizeLimitResult[];
}

function formatBytes(value: number): string {
  const absolute = Math.abs(value);
  if (absolute < 1000) {
    return `${value} B`;
  }
  return `${(value / 1000).toFixed(2).replace(/\.?0+$/, '')} kB`;
}

function formatDelta(value: number): string {
  if (value === 0) {
    return '0 B';
  }
  return `${value > 0 ? '+' : '-'}${formatBytes(Math.abs(value))}`;
}

function formatPercent(value: number, base: number): string {
  if (base === 0) {
    return value === 0 ? '0%' : '新增';
  }
  const percent = ((value - base) / base) * 100;
  const sign = percent > 0 ? '+' : '';
  return `${sign}${percent.toFixed(2).replace(/\.?0+$/, '')}%`;
}

const changedPackageNames = new Set(
  changedPackages
    .split(/\r?\n|,/)
    .map((name) => name.trim())
    .filter(Boolean),
);
const currentByName = new Map(
  readResults(currentPath).map((result) => [result.name, result]),
);
const baseByName = new Map(
  readResults(basePath).map((result) => [result.name, result]),
);
const measuredPackages = [...changedPackageNames].filter(
  (name) => currentByName.has(name) || baseByName.has(name),
);

if (measuredPackages.length === 0) {
  console.log('变更包不在体积测量清单中，跳过包体积报告。');
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, 'has_report=false\n', 'utf8');
  }
  process.exit(0);
}

const rows = measuredPackages.map((name) => {
  const baseSize = baseByName.get(name)?.size ?? 0;
  const currentSize = currentByName.get(name)?.size ?? 0;
  const delta = currentSize - baseSize;

  return `| \`${name}\` | ${formatBytes(baseSize)} | ${formatBytes(
    currentSize,
  )} | ${formatDelta(delta)} (${formatPercent(currentSize, baseSize)}) |`;
});

const report = [
  '<!-- size-limit-report -->',
  '## 包体积报告',
  '',
  '| 包 | 目标分支 gzip 体积 | PR gzip 体积 | 变化 |',
  '| --- | ---: | ---: | ---: |',
  ...rows,
].join('\n');

fs.writeFileSync(reportPath, `${report}\n`, 'utf8');

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, 'has_report=true\n', 'utf8');
}

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${report}\n`, 'utf8');
}

console.log(report);
