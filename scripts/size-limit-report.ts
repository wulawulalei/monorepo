import fs from 'node:fs';

interface SizeLimitResult {
  name: string;
  size: number;
  sizeLimit: number;
  passed: boolean;
}

const [currentPath, basePath, reportPath] = process.argv.slice(2);

if (!currentPath || !basePath || !reportPath) {
  throw new Error(
    '用法：pnpm exec tsx scripts/size-limit-report.ts <当前结果> <基线结果> <报告文件>',
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

const current = readResults(currentPath);
const base = readResults(basePath);
const baseByName = new Map(base.map((result) => [result.name, result]));
const failed = current.some((result) => !result.passed);

const rows = current.map((result) => {
  const baseResult = baseByName.get(result.name);
  const baseSize = baseResult?.size ?? 0;
  const delta = result.size - baseSize;
  const status = result.passed ? '通过' : '超限';

  return `| \`${result.name}\` | ${formatBytes(result.size)} | ${formatDelta(
    delta,
  )} (${formatPercent(result.size, baseSize)}) | ${formatBytes(
    result.sizeLimit,
  )} | ${status} |`;
});

const report = [
  '<!-- size-limit-report -->',
  '## 包体积报告',
  '',
  '| 包 | 当前 gzip 体积 | 较目标分支 | 体积预算 | 结果 |',
  '| --- | ---: | ---: | ---: | --- |',
  ...rows,
  '',
  failed
    ? '有包超过体积预算，请检查新增依赖或公开 API，并评估是否调整 `.size-limit.ts`。'
    : '所有包均在体积预算内。',
].join('\n');

fs.writeFileSync(reportPath, `${report}\n`, 'utf8');

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    `failed=${failed}\nreport_path=${reportPath}\n`,
    'utf8',
  );
}

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${report}\n`, 'utf8');
}

console.log(report);
