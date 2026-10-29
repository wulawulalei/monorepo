// 基于约定式提交（conventional commits）为每个包生成 CHANGELOG.md。
//
// 设计为紧接在 `changeset version` 之后运行（见 package.json 里的
// `version-packages` / `version-and-tag` 脚本）：此时 changesets 已经把各包的
// package.json 版本号改好，我们只为这些刚升版的包重新生成 changelog，并把新的
// release 段落追加到文件顶部。
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const packagesDir = path.join(repoRoot, 'packages');
// 覆盖 preset 默认的组内排序，让 commit 按提交时间从新到旧排列（精确到秒）。
// 具体规则见该配置文件。
const changelogConfigPath = path.join(__dirname, 'changelog.config.cjs');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// semver 预发布版本形如 0.0.2-alpha.0（主版本号后带 `-`），正式版本不含 `-`。
// 非正式的预发布版本不生成 changelog。
function isPrereleaseVersion(version) {
  return version.includes('-');
}

// 读取 HEAD 上已提交的文件内容；如果该文件还没纳入版本控制（比如全新
// 的包），返回 null。
function getPreviousFileContent(relativePath) {
  try {
    return execFileSync('git', ['show', `HEAD:${relativePath}`], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

// 当某包工作区的版本号与 HEAD 上提交的版本号不一致时，才需要为它生成 changelog；
// 也就是说只有本次刚被 changesets 升版的包才会命中。
function getChangedPackages() {
  return fs
    .readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const packageDir = path.join(packagesDir, entry.name);
      const packageJsonPath = path.join(packageDir, 'package.json');

      if (!fs.existsSync(packageJsonPath)) {
        return null;
      }

      const relativePackageJsonPath = path.relative(repoRoot, packageJsonPath).replace(/\\/g, '/');
      const currentPkg = readJson(packageJsonPath);
      const previousContent = getPreviousFileContent(relativePackageJsonPath);
      const previousPkg = previousContent ? JSON.parse(previousContent) : null;

      if (!previousPkg || previousPkg.version !== currentPkg.version) {
        // 非正式（预发布）版本跳过：alpha/beta/rc 等不发变更日志，
        // 等转到正式版本时再统一生成一次即可。
        if (isPrereleaseVersion(currentPkg.version)) {
          console.log(`Skip ${currentPkg.name}@${currentPkg.version}: prerelease versions have no changelog.`);
          return null;
        }

        return {
          dirName: entry.name,
          packageDir,
          packageJsonPath,
          packageName: currentPkg.name,
        };
      }

      return null;
    })
    .filter(Boolean);
}

// 在标题前和文件末尾补齐空行，避免新生成的 commit 列表与旧内容粘连。
function normalizeChangelogSpacing(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const normalizedContent = `${content
    .replace(/([^\n])\n(?=#{1,6}\s)/g, '$1\n\n')
    .replace(/\n+$/, '')}\n\n`;

  if (content !== normalizedContent) {
    fs.writeFileSync(filePath, normalizedContent);
  }
}

function run() {
  const changedPackages = getChangedPackages();

  if (changedPackages.length === 0) {
    console.log('No version-bumped packages found.');
    return;
  }

  for (const pkg of changedPackages) {
    const changelogPath = path.join(pkg.packageDir, 'CHANGELOG.md');

    // 参数说明：
    //   --config        我们的排序覆盖配置（组内按时间从新到旧）
    //   -p              使用 conventionalcommits 预设（按 feat/fix/perf… 分节）
    //   -i + -s         读取已有的 CHANGELOG.md，并原地写回同一个文件
    //   -k              从这个 package.json 读取当前版本号
    //   -t              只识别当前包的发布 tag，避免从最早提交开始统计
    //   --commit-path   只统计改动了该包目录的 commit
    // 注意：release count 默认为 1，所以只生成并前置最新一次 release 的段落；
    // 若要重建整份文件，需在这里加上 `-r 0`。
    execFileSync(
      'pnpm',
      [
        'exec',
        'conventional-changelog',
        '--config',
        changelogConfigPath,
        '-p',
        'conventionalcommits',
        '-i',
        changelogPath,
        '-s',
        '-k',
        pkg.packageJsonPath,
        '-t',
        `${pkg.packageName}@`,
        '--commit-path',
        pkg.packageDir,
      ],
      {
        cwd: repoRoot,
        stdio: 'inherit',
      }
    );

    normalizeChangelogSpacing(changelogPath);
  }
}

run();
