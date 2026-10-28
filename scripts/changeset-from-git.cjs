// 检测 Git 中有变更的 workspace 包，并生成标准 Changesets 文件。
// 版本号升级由 `changeset version` 执行（见 `version-packages`）。
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const packagesDir = path.join(repoRoot, 'packages');
const changesetDir = path.join(repoRoot, '.changeset');

const BUMPS = new Set(['patch', 'minor', 'major']);

/**
 * 读取 JSON 文件
 * @param {string} filePath - 文件路径
 * @returns {object} 解析后的 JSON 对象
 */
function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * 扫描 packages 目录，列出所有 workspace 包
 * @returns {{ packages: Map<string, string>, dirNameToDir: Map<string, string> }}
 *   packages: 相对路径 -> 包名（如 packages/components -> @xzy18/components）
 *   dirNameToDir: 目录名 -> 相对路径（如 components -> packages/components）
 */
function listWorkspacePackages() {
  if (!fs.existsSync(packagesDir)) {
    return new Map();
  }

  const packages = new Map();
  const dirNameToDir = new Map();

  for (const entry of fs.readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const packageDir = path.join(packagesDir, entry.name);
    const packageJsonPath = path.join(packageDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      continue;
    }

    const pkg = readJson(packageJsonPath);
    if (!pkg.name) {
      continue;
    }

    const relativeDir = path.relative(repoRoot, packageDir).replace(/\\/g, '/');
    packages.set(relativeDir, pkg.name);
    dirNameToDir.set(entry.name, relativeDir);
  }

  return { packages, dirNameToDir };
}

/**
 * 将用户输入的包名列表解析为包目录路径
 * 支持完整包名（@xzy18/components）或目录名（components）
 * @param {string[]} packageNames - 用户输入的包名列表
 * @param {Map<string, string>} packages - 所有 workspace 包
 * @param {Map<string, string>} dirNameToDir - 目录名到路径的映射
 * @returns {string[]} 解析后的包目录路径列表
 */
function resolvePackageNames(packageNames, packages, dirNameToDir) {
  const resolved = [];

  for (const name of packageNames) {
    // 先尝试完整包名匹配
    let found = false;
    for (const [dir, pkgName] of packages) {
      if (pkgName === name) {
        resolved.push(dir);
        found = true;
        break;
      }
    }

    // 再尝试目录名匹配
    if (!found && dirNameToDir.has(name)) {
      resolved.push(dirNameToDir.get(name));
      found = true;
    }

    if (!found) {
      const available = [...packages.values()].join(', ');
      console.error(`错误：未找到包 "${name}"。可用包：${available}`);
      process.exit(1);
    }
  }

  return [...new Set(resolved)].sort();
}

/**
 * 解析基准引用，优先使用 origin/<baseBranch>，其次本地分支
 * @param {string} baseBranch - 基准分支名
 * @returns {string} 解析后的 Git 引用
 */
function resolveBaseRef(baseBranch) {
  for (const candidate of [`origin/${baseBranch}`, baseBranch]) {
    try {
      execFileSync('git', ['rev-parse', '--verify', `${candidate}^{commit}`], {
        cwd: repoRoot,
        stdio: 'ignore',
      });
      return candidate;
    } catch {
      // 尝试下一个候选
    }
  }

  throw new Error(
    `无法解析基准引用。已尝试 origin/${baseBranch} 和 ${baseBranch}。` +
      '请使用 --base <ref> 指定一个存在的分支或提交。',
  );
}

/**
 * 执行 Git 命令并返回标准输出，失败时返回空字符串
 * @param {string[]} args - Git 命令参数
 * @returns {string} 命令输出
 */
function runGit(args) {
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

/**
 * 收集基准引用到 HEAD 之间的所有变更路径
 * 包含已提交、已暂存、未暂存和未跟踪的文件
 * @param {string} baseRef - 基准引用（如 origin/master）
 * @returns {string[]} 变更文件路径列表
 */
function collectChangedPaths(baseRef) {
  const sources = [
    // 自基准分支分叉以来 HEAD 上的提交（两点语法：base..HEAD）。
    // 三点语法（base...HEAD）会找 merge-base，当 HEAD 已经在基准之上时会漏掉变更。
    runGit(['diff', '--name-only', `${baseRef}..HEAD`]),
    // 工作区中未暂存的变更
    runGit(['diff', '--name-only']),
    // 已暂存的变更
    runGit(['diff', '--cached', '--name-only']),
    // 未被忽略规则排除的未跟踪文件
    runGit(['ls-files', '--others', '--exclude-standard']),
  ];

  const paths = new Set();
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

/**
 * 根据变更路径列表找出受影响的包
 * @param {string[]} changedPaths - 变更文件路径列表
 * @param {Map<string, string>} packages - 所有 workspace 包
 * @returns {string[]} 受影响的包目录路径列表
 */
function findAffectedPackages(changedPaths, packages) {
  const affected = new Set();

  for (const changedPath of changedPaths) {
    if (!changedPath.startsWith('packages/')) {
      continue;
    }

    const rest = changedPath.slice('packages/'.length);
    const slashIndex = rest.indexOf('/');
    const packageDir = `packages/${
      slashIndex === -1 ? rest : rest.slice(0, slashIndex)
    }`;

    if (packages.has(packageDir)) {
      affected.add(packageDir);
    }
  }

  return [...affected].sort();
}

/**
 * 查找指定包最近的正式版 release tag（排除 alpha/beta 等预发布）
 * @param {string} packageName - 包名（如 @xzy18/components）
 * @returns {string|null} 最近的正式版 tag，如 @xzy18/components@0.0.1
 */
function findLatestReleaseTag(packageName) {
  // 获取该包的所有 tag，按创建时间从新到旧排序
  const output = runGit([
    'tag',
    '--sort=-creatordate',
    '-l',
    `${packageName}@*`,
  ]);
  const tags = output.split('\n').filter(Boolean);

  // 过滤掉预发布 tag（alpha、beta、rc 等）
  for (const tag of tags) {
    const version = tag.split('@').pop();
    if (!version.includes('-')) {
      return tag;
    }
  }

  return null;
}

/**
 * 查找指定包用于对比的 release tag
 * 优先匹配当前版本号，其次回退到最近的正式版 tag
 * @param {string} packageName - 包名
 * @param {string} currentVersion - 当前版本号（如 0.0.2）
 * @returns {string|null} 用于对比的 tag
 */
function findReleaseTagForPackage(packageName, currentVersion) {
  // 先尝试精确匹配当前版本号（如 @xzy18/components@0.0.2）
  const exactTag = runGit([
    'tag',
    '-l',
    `${packageName}@${currentVersion}`,
  ]).trim();
  if (exactTag) {
    return exactTag;
  }

  // 找不到就回退到最近的正式版 tag
  return findLatestReleaseTag(packageName);
}

/**
 * 收集指定包自上次 release 以来的变更路径
 * 包含已提交、已暂存、未暂存和未跟踪的文件
 * @param {string} packageName - 包名
 * @param {string} packageDir - 包目录路径（如 packages/components）
 * @returns {string[]} 变更文件路径列表
 */
function collectChangedPathsForPackage(packageName, packageDir) {
  const pkgJsonPath = path.join(repoRoot, packageDir, 'package.json');
  const pkg = readJson(pkgJsonPath);
  const currentVersion = pkg.version;

  const releaseTag = findReleaseTagForPackage(packageName, currentVersion);

  if (!releaseTag) {
    // 没有找到 release tag，把该包所有文件视为有变更
    const files = runGit(['ls-files', packageDir]);
    return files.split('\n').filter(Boolean);
  }

  const sources = [
    // 该包自上次 release tag 以来的变更
    runGit(['diff', '--name-only', `${releaseTag}..HEAD`, '--', packageDir]),
    // 该包工作区中未暂存的变更
    runGit(['diff', '--name-only', '--', packageDir]),
    // 该包已暂存的变更
    runGit(['diff', '--cached', '--name-only', '--', packageDir]),
    // 该包中未跟踪的文件
    runGit(['ls-files', '--others', '--exclude-standard', packageDir]),
  ];

  const paths = new Set();
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

/**
 * 解析命令行参数
 * @param {string[]} argv - process.argv.slice(2)
 * @returns {{ bump: string|null, base: string|null, dryRun: boolean, packages: string[]|null, help: boolean }}
 */
function parseArgs(argv) {
  const args = {
    bump: null,
    base: null,
    dryRun: false,
    packages: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '-h' || arg === '--help') {
      args.help = true;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--bump') {
      args.bump = argv[++i];
    } else if (arg.startsWith('--bump=')) {
      args.bump = arg.slice('--bump='.length);
    } else if (arg === '--base') {
      args.base = argv[++i];
    } else if (arg.startsWith('--base=')) {
      args.base = arg.slice('--base='.length);
    } else if (arg === '--packages' || arg === '-p') {
      args.packages = (argv[++i] || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (arg.startsWith('--packages=')) {
      args.packages = arg
        .slice('--packages='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  if (args.bump && !BUMPS.has(args.bump)) {
    console.error(
      `错误：无效的 --bump 值 "${args.bump}"。可选值：patch, minor, major`,
    );
    process.exit(1);
  }

  return args;
}

/**
 * 打印帮助信息
 */
function printHelp() {
  console.log(`用法：node scripts/changeset-from-git.cjs [选项]

从 Git 检测有变更的 workspace 包并生成 .changeset 文件。

选项：
  --bump <patch|minor|major>   版本升级类型（默认：patch）
  --base <ref>                 对比的基准引用（默认：config.baseBranch）
  --packages <names>           逗号分隔的包名列表，跳过自动检测
                               （如 "@xzy18/components,@xzy18/utils"）。
                               支持完整包名或目录名。
  --dry-run                    只打印结果，不写入文件
  -h, --help                   显示帮助`);
}

/**
 * 构建 changeset 文件内容（frontmatter + 描述）
 * @param {Array<[string, string]>} affectedPackages - 受影响的包列表
 * @param {string} bump - 版本升级类型（patch/minor/major）
 * @returns {string} changeset 文件内容
 */
function buildChangesetContent(affectedPackages, bump) {
  const lines = ['---'];
  for (const [, packageName] of affectedPackages) {
    lines.push(`"${packageName}": ${bump}`);
  }
  lines.push('---', '', '根据 Git 变更自动生成的 changeset。', '');
  return lines.join('\n');
}

/**
 * 生成 changeset 文件名，格式与官方 @changesets/cli 一致
 * 使用 human-id 生成"形容词-名词-动词"的随机名称
 * @returns {string} 文件名（如 tidy-adults-sip.md）
 */
function changesetFileName() {
  // 从 pnpm 的 content-addressable store 中解析 human-id（不是直接依赖）
  const humanIdPkgDir = fs
    .readdirSync(path.join(repoRoot, 'node_modules', '.pnpm'), {
      withFileTypes: true,
    })
    .find((d) => d.isDirectory() && d.name.startsWith('human-id@'));

  if (!humanIdPkgDir) {
    console.error(
      '错误：在 node_modules 中未找到 human-id。请运行 pnpm install。',
    );
    process.exit(1);
  }

  const { humanId } = require(path.join(
    repoRoot,
    'node_modules',
    '.pnpm',
    humanIdPkgDir.name,
    'node_modules',
    'human-id',
    'dist',
    'index.js',
  ));

  return `${humanId({ separator: '-', capitalize: false })}.md`;
}

/**
 * 主函数：解析参数、检测变更、生成 changeset 文件
 */
function run() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const bump = args.bump || 'patch';
  const { packages, dirNameToDir } = listWorkspacePackages();

  // 按包逐个检测变更，对比基准是各自的 release tag
  const affectedDirs = args.packages
    ? resolvePackageNames(args.packages, packages, dirNameToDir)
    : [...packages.keys()]
        .filter((dir) => {
          const pkgName = packages.get(dir);
          const changedPaths = collectChangedPathsForPackage(pkgName, dir);
          return changedPaths.length > 0;
        })
        .sort();

  const affectedPackages = affectedDirs.map((dir) => [dir, packages.get(dir)]);

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
