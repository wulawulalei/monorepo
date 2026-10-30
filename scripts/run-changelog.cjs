// 基于约定式提交（conventional commits）为每个包生成 CHANGELOG.md。
//
// 设计为紧接在 `changeset version` 之后运行（见 package.json 里的
// `version-packages` / `release` 脚本）：此时 changesets 已经把各包的
// package.json 版本号改好，我们只为这些刚升版的包重新生成 changelog，并把新的
// release 段落追加到文件顶部。
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const packagesDir = path.join(repoRoot, 'packages');
const materialComponentsName = '@xzy18/material-components';
// 覆盖 preset 默认的组内排序，让 commit 按提交时间从新到旧排列（精确到秒）。
// 具体规则见该配置文件。
const changelogConfigPath = path.join(__dirname, 'changelog.config.cjs');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 定位指定版本段落的起止位置，便于检查或补充已有内容。
function findVersionSection(content, version) {
  const escapedVersion = escapeRegExp(version);
  const headerPattern = new RegExp(
    `^## (?:\\[${escapedVersion}\\]\\([^\\n]+\\)|${escapedVersion})(?: \\([^\\n]+\\))?$`,
    'm',
  );
  const header = headerPattern.exec(content);

  if (!header) {
    return null;
  }

  const sectionStart = header.index;
  const contentStart = sectionStart + header[0].length;
  const nextHeaderOffset = content.slice(contentStart).search(/^##\s/m);
  const sectionEnd =
    nextHeaderOffset === -1 ? content.length : contentStart + nextHeaderOffset;

  return {
    sectionStart,
    contentStart,
    sectionEnd,
    sectionContent: content.slice(contentStart, sectionEnd),
  };
}

// 检查当前版本是否已有 changelog 段落，避免重复执行时追加相同内容。
function hasVersionSection(changelogPath, version) {
  if (!fs.existsSync(changelogPath)) {
    return false;
  }

  const content = fs.readFileSync(changelogPath, 'utf8');
  return Boolean(findVersionSection(content, version));
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

      const relativePackageJsonPath = path
        .relative(repoRoot, packageJsonPath)
        .replace(/\\/g, '/');
      const currentPkg = readJson(packageJsonPath);
      const previousContent = getPreviousFileContent(relativePackageJsonPath);
      const previousPkg = previousContent ? JSON.parse(previousContent) : null;

      if (!previousPkg || previousPkg.version !== currentPkg.version) {
        // 非正式（预发布）版本跳过：alpha/beta/rc 等不发变更日志，
        // 等转到正式版本时再统一生成一次即可。
        if (isPrereleaseVersion(currentPkg.version)) {
          console.log(
            `Skip ${currentPkg.name}@${currentPkg.version}: prerelease versions have no changelog.`,
          );
          return null;
        }

        return {
          dirName: entry.name,
          packageDir,
          packageJsonPath,
          packageName: currentPkg.name,
          currentPkg,
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

// 读取 HEAD 上指定包的 package.json，用于计算本次内部依赖的版本变化。
function getPreviousPackage(relativePath) {
  const previousContent = getPreviousFileContent(relativePath);
  return previousContent ? JSON.parse(previousContent) : null;
}

// 建立包名到包目录的映射，避免依赖包目录名与包名不一致时无法匹配。
function getWorkspacePackages() {
  return new Map(
    fs
      .readdirSync(packagesDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => {
        const packageDir = path.join(packagesDir, entry.name);
        const packageJsonPath = path.join(packageDir, 'package.json');

        if (!fs.existsSync(packageJsonPath)) {
          return null;
        }

        const packageJson = readJson(packageJsonPath);
        return [
          packageJson.name,
          {
            dirName: entry.name,
            packageDir,
            packageJsonPath,
            packageName: packageJson.name,
            currentPkg: packageJson,
          },
        ];
      })
      .filter(Boolean),
  );
}

// 只汇总 material-components 直接依赖的子包版本变化。
function getMaterialComponentsDependencyChanges(pkg) {
  if (pkg.packageName !== materialComponentsName) {
    return [];
  }

  const changes = [];
  const workspacePackages = getWorkspacePackages();

  for (const dependencyName of Object.keys(pkg.currentPkg.dependencies || {})) {
    const dependencyPackage = workspacePackages.get(dependencyName);
    if (!dependencyPackage) {
      continue;
    }

    const previousDependencyPackage = getPreviousPackage(
      path
        .relative(repoRoot, dependencyPackage.packageJsonPath)
        .replace(/\\/g, '/'),
    );

    if (!previousDependencyPackage) {
      changes.push(
        `- 新增工作区依赖 ${dependencyName}@${dependencyPackage.currentPkg.version}`,
      );
      continue;
    }

    if (
      previousDependencyPackage.version !== dependencyPackage.currentPkg.version
    ) {
      changes.push(
        `- 更新工作区依赖 ${dependencyName} 至 ${dependencyPackage.currentPkg.version}`,
      );
    }
  }

  return changes;
}

// 在当前版本段落中补充内部依赖变化；已有相同说明时保持原样。
function appendDependencyChanges(changelogPath, version, changes) {
  if (changes.length === 0) {
    return;
  }

  const existingContent = fs.existsSync(changelogPath)
    ? fs.readFileSync(changelogPath, 'utf8')
    : '';
  const section = findVersionSection(existingContent, version);
  const pendingChanges = changes.filter(
    (change) => !existingContent.includes(change),
  );

  if (pendingChanges.length === 0) {
    return;
  }

  if (!section) {
    const releaseDate = new Date().toISOString().slice(0, 10);
    const newSection = `## ${version} (${releaseDate})\n\n### Patch Changes\n\n${pendingChanges.join(
      '\n',
    )}\n\n`;
    fs.writeFileSync(changelogPath, `${newSection}${existingContent}`);
    return;
  }

  const sectionContent = section.sectionContent.replace(/\s+$/, '');
  const subsection = sectionContent.includes('### Patch Changes')
    ? `\n${pendingChanges.join('\n')}`
    : `\n\n### Patch Changes\n\n${pendingChanges.join('\n')}`;
  const updatedContent = `${existingContent.slice(
    0,
    section.contentStart,
  )}${sectionContent}${subsection}\n\n${existingContent.slice(
    section.sectionEnd,
  )}`;
  fs.writeFileSync(changelogPath, updatedContent);
}

function run() {
  const changedPackages = getChangedPackages();

  if (changedPackages.length === 0) {
    console.log('No version-bumped packages found.');
    return;
  }

  for (const pkg of changedPackages) {
    const changelogPath = path.join(pkg.packageDir, 'CHANGELOG.md');
    const dependencyChanges = getMaterialComponentsDependencyChanges(pkg);

    // 当前版本已经生成过段落时直接跳过，保证脚本可以重复执行。
    if (hasVersionSection(changelogPath, pkg.currentPkg.version)) {
      appendDependencyChanges(
        changelogPath,
        pkg.currentPkg.version,
        dependencyChanges,
      );
      continue;
    }

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
      },
    );

    appendDependencyChanges(
      changelogPath,
      pkg.currentPkg.version,
      dependencyChanges,
    );
    normalizeChangelogSpacing(changelogPath);
  }
}

if (require.main === module) {
  run();
}

module.exports = {
  getMaterialComponentsDependencyChanges,
};
