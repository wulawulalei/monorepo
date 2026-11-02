// 检测 Git 中有变更的 workspace 包，并生成标准 Changesets 文件。
// 版本号升级由 `changeset version` 执行（见 `version-packages`）。
import { humanId } from 'human-id';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

interface PackageManifest {
  name?: string;
  version: string;
}

interface WorkspacePackages {
  packages: Map<string, string>;
  dirNameToDir: Map<string, string>;
}

interface ParsedArgs {
  bump: string | null;
  dryRun: boolean;
  packages: string[] | null;
  help: boolean;
}

type Bump = 'patch' | 'minor' | 'major';

const repoRoot = path.resolve(__dirname, '..');
const packagesDir = path.join(repoRoot, 'packages');
const changesetDir = path.join(repoRoot, '.changeset');

const BUMPS = new Set<Bump>(['patch', 'minor', 'major']);

// 读取并解析 JSON 文件。
function readJson<T = unknown>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

// 扫描 packages 目录，返回相对路径到包名、目录名到相对路径的映射。
function listWorkspacePackages(): WorkspacePackages {
  const packages = new Map<string, string>();
  const dirNameToDir = new Map<string, string>();

  if (!fs.existsSync(packagesDir)) {
    return { packages, dirNameToDir };
  }

  for (const entry of fs.readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const packageDir = path.join(packagesDir, entry.name);
    const packageJsonPath = path.join(packageDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      continue;
    }

    const pkg = readJson<PackageManifest>(packageJsonPath);
    if (!pkg.name) {
      continue;
    }

    const relativeDir = path.relative(repoRoot, packageDir).replace(/\\/g, '/');
    packages.set(relativeDir, pkg.name);
    dirNameToDir.set(entry.name, relativeDir);
  }

  return { packages, dirNameToDir };
}

// 将用户输入的包名或目录名解析为包目录路径，去重后排序。
function resolvePackageNames(
  packageNames: string[],
  packages: Map<string, string>,
  dirNameToDir: Map<string, string>,
): string[] {
  const resolved: string[] = [];

  for (const name of packageNames) {
    let dir: string | undefined;

    for (const [candidateDir, packageName] of packages) {
      if (packageName === name) {
        dir = candidateDir;
        break;
      }
    }

    dir ??= dirNameToDir.get(name);

    if (!dir) {
      const available = [...packages.values()].join(', ');
      console.error(`错误：未找到包 "${name}"。可用包：${available}`);
      process.exit(1);
    }

    resolved.push(dir);
  }

  return [...new Set(resolved)].sort();
}

// 执行 Git 命令并返回标准输出，失败时返回空字符串。
function runGit(args: string[]): string {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return '';
  }
}

// 查找指定包最近的正式版 release tag，排除 alpha、beta 等预发布版本。
function findLatestReleaseTag(packageName: string): string | null {
  const output = runGit([
    'tag',
    '--sort=-creatordate',
    '-l',
    `${packageName}@*`,
  ]);

  for (const tag of output.split('\n').filter(Boolean)) {
    const version = tag.split('@').pop();
    if (version && !version.includes('-')) {
      return tag;
    }
  }

  return null;
}

// 优先匹配当前版本号对应的 tag，找不到时回退到最近的正式版 tag。
function findReleaseTagForPackage(
  packageName: string,
  currentVersion: string,
): string | null {
  const exactTag = runGit([
    'tag',
    '-l',
    `${packageName}@${currentVersion}`,
  ]).trim();

  return exactTag || findLatestReleaseTag(packageName);
}

// 收集指定包自上次 release 以来的变更路径，包含工作区和未跟踪文件。
function collectChangedPathsForPackage(
  packageName: string,
  packageDir: string,
): string[] {
  const pkg = readJson<PackageManifest>(
    path.join(repoRoot, packageDir, 'package.json'),
  );
  const releaseTag = findReleaseTagForPackage(packageName, pkg.version);

  if (!releaseTag) {
    return runGit(['ls-files', packageDir]).split('\n').filter(Boolean);
  }

  const sources = [
    runGit(['diff', '--name-only', `${releaseTag}..HEAD`, '--', packageDir]),
    runGit(['diff', '--name-only', '--', packageDir]),
    runGit(['diff', '--cached', '--name-only', '--', packageDir]),
    runGit(['ls-files', '--others', '--exclude-standard', packageDir]),
  ];

  const paths = new Set<string>();
  for (const output of sources) {
    for (const line of output.split('\n')) {
      const trimmed = line.trim().replace(/\\/g, '/');
      if (trimmed) {
        paths.add(trimmed);
      }
    }
  }

  return [...paths];
}

// 解析命令行参数，支持 --bump、--packages、--dry-run 与帮助选项。
function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {
    bump: null,
    dryRun: false,
    packages: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '-h' || arg === '--help') {
      args.help = true;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--bump') {
      args.bump = argv[++index] ?? null;
    } else if (arg.startsWith('--bump=')) {
      args.bump = arg.slice('--bump='.length);
    } else if (arg === '--packages' || arg === '-p') {
      args.packages = (argv[++index] || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    } else if (arg.startsWith('--packages=')) {
      args.packages = arg
        .slice('--packages='.length)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  if (args.bump && !BUMPS.has(args.bump as Bump)) {
    console.error(
      `错误：无效的 --bump 值 "${args.bump}"。可选值：patch, minor, major`,
    );
    process.exit(1);
  }

  return args;
}

// 打印帮助信息。
function printHelp(): void {
  console.log(`用法：pnpm exec tsx scripts/changeset-from-git.ts [选项]

从 Git 检测有变更的 workspace 包并生成 .changeset 文件。

选项：
  --bump <patch|minor|major>   版本升级类型（默认：patch）
  --packages <names>           逗号分隔的包名列表，跳过自动检测
                               （如 "@xzy18/components,@xzy18/utils"）。
                               支持完整包名或目录名。
  --dry-run                    只打印结果，不写入文件
  -h, --help                   显示帮助`);
}

// 构建 changeset 文件内容（frontmatter + 描述）。
function buildChangesetContent(
  affectedPackages: Array<[string, string]>,
  bump: Bump,
): string {
  const lines = ['---'];
  for (const [, packageName] of affectedPackages) {
    lines.push(`"${packageName}": ${bump}`);
  }
  lines.push('---', '', '根据 Git 变更自动生成的 changeset。', '');
  return lines.join('\n');
}

// 生成与官方 @changesets/cli 风格一致的随机文件名。
function changesetFileName(): string {
  return `${humanId({ separator: '-', capitalize: false })}.md`;
}

// 解析参数、检测变更并生成 changeset 文件。
function run(): void {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const bump = (args.bump || 'patch') as Bump;
  const { packages, dirNameToDir } = listWorkspacePackages();

  const affectedDirs = args.packages
    ? resolvePackageNames(args.packages, packages, dirNameToDir)
    : [...packages.keys()]
        .filter((dir) => {
          const packageName = packages.get(dir);
          return packageName
            ? collectChangedPathsForPackage(packageName, dir).length > 0
            : false;
        })
        .sort();

  const affectedPackages: Array<[string, string]> = affectedDirs.map((dir) => {
    const packageName = packages.get(dir);
    if (!packageName) {
      throw new Error(`未找到目录 ${dir} 对应的包名`);
    }
    return [dir, packageName];
  });

  console.log(`Bump: ${bump}`);

  if (affectedPackages.length === 0) {
    console.log('未找到有变更的包，无需写入。');
    return;
  }

  console.log('受影响的包：');
  for (const [dir, name] of affectedPackages) {
    console.log(`  ${name} (${dir})`);
  }

  const content = buildChangesetContent(affectedPackages, bump);

  if (args.dryRun) {
    console.log('');
    console.log('[dry-run] 将创建以下 changeset：');
    console.log(content);
    return;
  }

  fs.mkdirSync(changesetDir, { recursive: true });
  const filePath = path.join(changesetDir, changesetFileName());
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`已创建 ${path.relative(repoRoot, filePath)}`);
}

run();
