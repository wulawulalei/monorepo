// 基于约定式提交（conventional commits）为每个包生成 CHANGELOG.md。
//
// 设计为紧接在 `changeset version` 之后运行（见 package.json 里的
// `version-packages` / `release` 脚本）：此时 changesets 已经把各包的
// package.json 版本号改好，我们只为这些刚升版的包重新生成 changelog，并把新的
// release 段落追加到文件顶部。
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

interface PackageManifest {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
}

interface WorkspacePackage {
  dirName: string;
  packageDir: string;
  packageJsonPath: string;
  packageName: string;
  currentPkg: PackageManifest;
}

interface VersionSection {
  sectionStart: number;
  contentStart: number;
  sectionEnd: number;
  sectionContent: string;
}

interface Commit {
  committerTimestamp?: string;
}

const repoRoot = path.resolve(__dirname, '..');
const packagesDir = path.join(repoRoot, 'packages');
const materialComponentsName = '@xzy18/material-components';

// 读取并解析 JSON 文件。
function readJson<T = unknown>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 定位指定版本段落的起止位置，便于检查或补充已有内容。
function findVersionSection(
  content: string,
  version: string,
): VersionSection | null {
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
function hasVersionSection(changelogPath: string, version: string): boolean {
  if (!fs.existsSync(changelogPath)) {
    return false;
  }

  const content = fs.readFileSync(changelogPath, 'utf8');
  return Boolean(findVersionSection(content, version));
}

// semver 预发布版本形如 0.0.2-alpha.0（主版本号后带 `-`），正式版本不含 `-`。
function isPrereleaseVersion(version: string): boolean {
  return version.includes('-');
}

// 读取 HEAD 上已提交的文件内容；文件尚未纳入版本控制时返回 null。
function getPreviousFileContent(relativePath: string): string | null {
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

// 当工作区版本号与 HEAD 上提交的版本号不一致时，才需要为该包生成 changelog。
function getChangedPackages(): WorkspacePackage[] {
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
      const currentPkg = readJson<PackageManifest>(packageJsonPath);
      const previousContent = getPreviousFileContent(relativePackageJsonPath);
      const previousPkg = previousContent
        ? (JSON.parse(previousContent) as PackageManifest)
        : null;

      if (!previousPkg || previousPkg.version !== currentPkg.version) {
        // 预发布版本跳过，等转到正式版本时再统一生成一次。
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
    .filter((item): item is WorkspacePackage => item !== null);
}

// 在标题前和文件末尾补齐空行，避免新生成的 commit 列表与旧内容粘连。
function normalizeChangelogSpacing(filePath: string): void {
  const content = fs.readFileSync(filePath, 'utf8');
  const normalizedContent = `${content
    .replace(/([^\n])\n(?=#{1,6}\s)/g, '$1\n\n')
    .replace(/\n+$/, '')}\n\n`;

  if (content !== normalizedContent) {
    fs.writeFileSync(filePath, normalizedContent);
  }
}

// 读取 HEAD 上指定包的 package.json，用于计算本次内部依赖的版本变化。
function getPreviousPackage(relativePath: string): PackageManifest | null {
  const previousContent = getPreviousFileContent(relativePath);
  return previousContent
    ? (JSON.parse(previousContent) as PackageManifest)
    : null;
}

// 建立包名到包目录的映射，避免依赖包目录名与包名不一致时无法匹配。
function getWorkspacePackages(): Map<string, WorkspacePackage> {
  const entries = fs
    .readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry): [string, WorkspacePackage] | null => {
      const packageDir = path.join(packagesDir, entry.name);
      const packageJsonPath = path.join(packageDir, 'package.json');

      if (!fs.existsSync(packageJsonPath)) {
        return null;
      }

      const packageJson = readJson<PackageManifest>(packageJsonPath);
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
    .filter((entry): entry is [string, WorkspacePackage] => entry !== null);

  return new Map(entries);
}

// 只汇总 material-components 直接依赖的子包版本变化。
function getMaterialComponentsDependencyChanges(
  pkg: WorkspacePackage,
): string[] {
  if (pkg.packageName !== materialComponentsName) {
    return [];
  }

  const changes: string[] = [];
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
function appendDependencyChanges(
  changelogPath: string,
  version: string,
  changes: string[],
): void {
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

// 读取流内容，用于把新生成的 changelog 段落拼到已有文件前面。
async function readStream(stream: Readable): Promise<string> {
  let content = '';
  for await (const chunk of stream) {
    content += chunk.toString();
  }
  return content;
}

// 生成单个包最新一次 release 的 changelog 段落。
async function generateChangelog(pkg: WorkspacePackage): Promise<string> {
  // 这些依赖只提供 ESM 入口，必须在 ESM 环境里动态加载，避免 tsx 的 CJS 桥接误判。
  const [{ default: createPreset }, { default: createChangelog }] =
    await Promise.all([
      import('conventional-changelog-conventionalcommits'),
      import('conventional-changelog'),
    ]);
  const preset = await createPreset();
  const stream = createChangelog(
    {
      pkg: { path: pkg.packageJsonPath },
      tagPrefix: `${pkg.packageName}@`,
      releaseCount: 1,
      config: preset,
      cwd: repoRoot,
    },
    undefined,
    {
      path: pkg.packageDir,
      // 在原格式末尾追加 %ct，parser 会将其读取为 committerTimestamp。
      format:
        '%B%n-hash-%n%H%n-gitTags-%n%d%n-committerDate-%n%ci%n-committerTimestamp-%n%ct',
    },
    undefined,
    {
      // 分节内按提交时间倒序；缺字段时按 0 兜底。
      commitsSort: (left: Commit, right: Commit) =>
        (Number(right.committerTimestamp) || 0) -
        (Number(left.committerTimestamp) || 0),
    },
  ) as Readable;

  return readStream(stream);
}

// 把新段落前置到已有 changelog，同时兼容文件不存在的情况。
async function run(): Promise<void> {
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

    const generated = await generateChangelog(pkg);
    if (!generated) {
      continue;
    }

    const previousContent = fs.existsSync(changelogPath)
      ? fs.readFileSync(changelogPath, 'utf8')
      : '';
    fs.writeFileSync(changelogPath, `${generated}${previousContent}`);

    appendDependencyChanges(
      changelogPath,
      pkg.currentPkg.version,
      dependencyChanges,
    );
    normalizeChangelogSpacing(changelogPath);
  }
}

if (require.main === module) {
  run().catch((error: unknown) => {
    console.error(
      `生成变更日志失败：${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    process.exit(1);
  });
}

export { getMaterialComponentsDependencyChanges };
