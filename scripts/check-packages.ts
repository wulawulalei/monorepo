import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

interface PackageManifest {
  name: string;
  version: string;
  private?: boolean;
  type?: string;
  repository?: {
    type?: string;
    url?: string;
    directory?: string;
  };
  bugs?: {
    url?: string;
  };
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  exports?: Record<string, ExportTarget | string>;
  main?: string;
  module?: string;
  types?: string;
}

interface ExportTarget {
  import?: { types?: string; default?: string };
  require?: { types?: string; default?: string };
  types?: string;
  default?: string;
}

interface EsmPackageManifest {
  type?: string;
}

interface PackageItem {
  dir: string;
  dirName: string;
  manifest: PackageManifest;
  tarball?: string;
  packedManifest?: PackageManifest;
}

interface RunOptions {
  cwd?: string;
  stdio?: ('ignore' | 'pipe' | 'inherit')[];
  env?: Record<string, string>;
}

const repoRoot = path.resolve(__dirname, '..');
const packagesDir = path.join(repoRoot, 'packages');
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

const expectedExports: Record<string, string[]> = {
  '@xzy18/components': ['AntdProvider', 'Button'],
  '@xzy18/config': ['eslint', 'prettier'],
  '@xzy18/hooks': ['useBoolean', 'useDebouncedValue'],
  '@xzy18/material-components': [
    'AntdProvider',
    'Button',
    'clamp',
    'cx',
    'useBoolean',
    'useDebouncedValue',
  ],
  '@xzy18/utils': ['clamp', 'cx'],
};

function run(
  command: string,
  args: string[],
  options: RunOptions = {},
): string {
  try {
    return execFileSync(command, args, {
      cwd: options.cwd || repoRoot,
      encoding: 'utf8',
      stdio: options.stdio || ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...options.env },
    });
  } catch (caughtError) {
    const error = caughtError as Error & {
      stdout?: Buffer | string;
      stderr?: Buffer | string;
    };
    // execFileSync 默认只把退出码放进 message，补充命令输出才能定位失败。
    const commandOutput = [error.stdout, error.stderr]
      .filter(Boolean)
      .map((value) => value.toString().trim())
      .filter(Boolean)
      .join('\n');
    if (commandOutput && !error.message.includes(commandOutput)) {
      error.message = `${error.message}\n${commandOutput}`;
    }
    throw error;
  }
}

function readJson<T = unknown>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function linkDependency(
  searchDirs: string[],
  dependencyName: string,
  consumerModules: string,
): void {
  const destination = path.join(consumerModules, dependencyName);
  if (fs.existsSync(destination)) {
    return;
  }

  const source = searchDirs
    .map((dir) => path.join(dir, 'node_modules', dependencyName))
    .find((candidate) => fs.existsSync(candidate));

  assert(source, `消费测试缺少依赖 ${dependencyName}，请先运行 pnpm install`);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.symlinkSync(
    fs.realpathSync(source),
    destination,
    process.platform === 'win32' ? 'junction' : 'dir',
  );
}

function readTarJson<T = unknown>(tarball: string, filePath: string): T {
  return JSON.parse(
    run('tar', ['-xOf', tarball, `package/${filePath}`]).trim(),
  ) as T;
}

function listPackages(): PackageItem[] {
  return fs
    .readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const packageDir = path.join(packagesDir, entry.name);
      const manifestPath = path.join(packageDir, 'package.json');
      if (!fs.existsSync(manifestPath)) {
        return null;
      }

      const manifest = readJson<PackageManifest>(manifestPath);
      return manifest.private
        ? null
        : {
            dir: packageDir,
            dirName: entry.name,
            manifest,
          };
    })
    .filter((item): item is PackageItem => item !== null)
    .sort((left, right) =>
      left.manifest.name.localeCompare(right.manifest.name),
    );
}

function prepareConsumer(packages: PackageItem[], consumerDir: string): void {
  const consumerModules = path.join(consumerDir, 'node_modules');
  fs.mkdirSync(consumerModules, { recursive: true });
  fs.writeFileSync(
    path.join(consumerDir, 'package.json'),
    `${JSON.stringify({ private: true, type: 'commonjs' }, null, 2)}\n`,
  );

  // 直接链接依赖以保留 pnpm 的真实目录结构。不能复制软链接目标，
  // 否则依赖的兄弟节点会丢失；Node 会沿真实路径解析完整依赖图。
  for (const dependencyName of [
    '@types/node',
    '@types/react',
    '@types/react-dom',
    'antd',
    'eslint',
    'prettier',
    'react',
    'react-dom',
    'typescript',
  ]) {
    linkDependency([repoRoot], dependencyName, consumerModules);
  }

  for (const item of packages) {
    const target = path.join(consumerModules, item.manifest.name);
    fs.mkdirSync(target, { recursive: true });
    assert(item.tarball, `${item.manifest.name} 尚未打包`);
    run('tar', ['-xzf', item.tarball, '-C', target, '--strip-components=1']);
  }

  for (const item of packages) {
    const dependencyNames = new Set([
      ...Object.keys(item.manifest.dependencies || {}),
      ...Object.keys(item.manifest.peerDependencies || {}),
    ]);

    for (const dependencyName of dependencyNames) {
      if (packages.some((pkg) => pkg.manifest.name === dependencyName)) {
        continue;
      }
      linkDependency([item.dir, repoRoot], dependencyName, consumerModules);
    }
  }
}

function assertExportTarget(
  files: Set<string>,
  target: string | undefined,
  label: string,
): void {
  assert(typeof target === 'string', `${label} 必须指向一个字符串路径`);
  const normalized = target.replace(/^\.\//, '');
  assert(files.has(normalized), `${label} 指向不存在的文件 ${target}`);
}

function verifyEsmSpecifiers(item: PackageItem, files: Set<string>): void {
  const esmFiles = [...files].filter(
    (file) => file.startsWith('es/') && /\.(?:js|mjs|d\.ts)$/.test(file),
  );
  const relativeSpecifierPattern =
    /\b(?:from\s*|import\s*\(?\s*)['"](\.[^'"]+)['"]/g;

  for (const file of esmFiles) {
    assert(item.tarball, `${item.manifest.name} 尚未打包`);
    const source = run('tar', ['-xOf', item.tarball, `package/${file}`]);

    for (const match of source.matchAll(relativeSpecifierPattern)) {
      const specifier = match[1];
      assert(
        path.posix.extname(specifier),
        `${item.manifest.name} 的 ${file} 相对引用 ${specifier} 缺少显式扩展名`,
      );

      const target = path.posix.normalize(
        path.posix.join(path.posix.dirname(file), specifier),
      );
      assert(
        files.has(target),
        `${item.manifest.name} 的 ${file} 相对引用 ${specifier} 指向 tarball 中不存在的文件`,
      );
    }
  }
}

function verifyManifest(item: PackageItem, files: Set<string>): void {
  const { manifest, packedManifest } = item;
  assert(packedManifest, `${manifest.name} 缺少打包后的 package.json`);

  assert(
    packedManifest.name === manifest.name,
    `${manifest.name} 打包后的包名不一致`,
  );
  assert(
    packedManifest.version === manifest.version,
    `${manifest.name} 打包后的版本不一致`,
  );
  assert(packedManifest.private !== true, `${manifest.name} 仍是 private 包`);
  assert(
    packedManifest.type === 'commonjs',
    `${manifest.name} 根包必须声明 type: commonjs`,
  );

  for (const section of [
    'dependencies',
    'optionalDependencies',
    'peerDependencies',
    'devDependencies',
  ]) {
    for (const [name, version] of Object.entries(
      packedManifest[section] || {},
    )) {
      assert(
        !String(version).startsWith('workspace:'),
        `${manifest.name} 的 ${section}.${name} 仍包含 workspace 协议`,
      );
    }
  }

  const rootExport = packedManifest.exports?.['.'];
  assert(
    rootExport && typeof rootExport === 'object',
    `${manifest.name} 缺少条件导出 "."`,
  );

  if (
    rootExport.import &&
    rootExport.require &&
    rootExport.import.default &&
    rootExport.require.default
  ) {
    assert(
      rootExport.import.default && rootExport.require.default,
      `${manifest.name} 必须同时提供 import 与 require 条件`,
    );
    assertExportTarget(
      files,
      rootExport.import.types,
      `${manifest.name} exports["."].import.types`,
    );
    assertExportTarget(
      files,
      rootExport.import.default,
      `${manifest.name} exports["."].import.default`,
    );
    assertExportTarget(
      files,
      rootExport.require.types,
      `${manifest.name} exports["."].require.types`,
    );
    assertExportTarget(
      files,
      rootExport.require.default,
      `${manifest.name} exports["."].require.default`,
    );
    if (packedManifest.main) {
      assert(
        packedManifest.main === rootExport.require.default.replace(/^\.\//, ''),
        `${manifest.name} 的 main 与 require 条件不一致`,
      );
    }
    if (packedManifest.module) {
      assert(
        packedManifest.module ===
          rootExport.import.default.replace(/^\.\//, ''),
        `${manifest.name} 的 module 与 import 条件不一致`,
      );
    }
    if (packedManifest.types && rootExport.require.types) {
      assert(
        packedManifest.types === rootExport.require.types.replace(/^\.\//, ''),
        `${manifest.name} 的 types 与 require.types 不一致`,
      );
    }
    if (rootExport.import.types?.endsWith('.d.mts')) {
      assert(
        rootExport.require.types?.endsWith('.d.ts'),
        `${manifest.name} 必须为 ESM 与 CommonJS 分别提供声明文件`,
      );
    }

    if (packedManifest.module?.startsWith('./es/')) {
      const esmPackage = readTarJson<EsmPackageManifest>(
        item.tarball,
        'es/package.json',
      );
      assert(
        esmPackage.type === 'module',
        `${manifest.name} 的 es/package.json 必须声明 type: module`,
      );
    }
  } else {
    assert(rootExport.types, `${manifest.name} 的条件导出 "." 缺少 types`);
    assertExportTarget(
      files,
      rootExport.types,
      `${manifest.name} exports["."].types`,
    );
    assertExportTarget(
      files,
      rootExport.default,
      `${manifest.name} exports["."].default`,
    );
  }

  assert(
    packedManifest.exports?.['./package.json'] === './package.json',
    `${manifest.name} 必须导出 package.json`,
  );
  assert(files.has('LICENSE'), `${manifest.name} 的 package 缺少 LICENSE`);

  const repository = packedManifest.repository;
  assert(
    repository &&
      typeof repository === 'object' &&
      typeof repository.url === 'string' &&
      repository.url.includes('github.com/wulawulalei/monorepo'),
    `${manifest.name} 的 package 缺少有效的 repository 元数据`,
  );
  assert(
    packedManifest.bugs &&
      typeof packedManifest.bugs === 'object' &&
      typeof packedManifest.bugs.url === 'string',
    `${manifest.name} 的 package 缺少 bugs 元数据`,
  );

  const invalidFiles = [...files].filter(
    (file) =>
      /(^|\/)(tests?|__tests?__)\//.test(file) ||
      /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file),
  );
  assert(
    invalidFiles.length === 0,
    `${manifest.name} 的 tarball 包含测试文件：${invalidFiles.join(', ')}`,
  );

  verifyEsmSpecifiers(item, files);
}

function runPublint(item: PackageItem): void {
  assert(item.tarball, `${item.manifest.name} 尚未打包`);
  run(pnpm, ['exec', 'publint', 'run', item.tarball, '--strict']);
}

function runRuntimeChecks(packages: PackageItem[], consumerDir: string): void {
  const exportsByPackage = Object.fromEntries(
    packages.map((item) => [
      item.manifest.name,
      expectedExports[item.manifest.name] || [],
    ]),
  );
  const payload = JSON.stringify(exportsByPackage);

  const cjsScript = path.join(consumerDir, 'consumer.cjs');
  fs.writeFileSync(
    cjsScript,
    `'use strict';
const expected = ${payload};
for (const [name, keys] of Object.entries(expected)) {
  const loaded = require(name);
  for (const key of keys) {
    if (!(key in loaded)) {
      throw new Error(name + ' 的 CommonJS 入口缺少 ' + key);
    }
  }
}
`,
  );
  run(process.execPath, [cjsScript]);

  const esmScript = path.join(consumerDir, 'consumer.mjs');
  fs.writeFileSync(
    esmScript,
    `const expected = ${payload};
for (const [name, keys] of Object.entries(expected)) {
  const loaded = await import(name);
  for (const key of keys) {
    if (!(key in loaded)) {
      throw new Error(name + ' 的 ESM 入口缺少 ' + key);
    }
  }
}
`,
  );
  run(process.execPath, [esmScript]);
}

function runTypeChecks(consumerDir: string): void {
  const source = `import {
  AntdProvider,
  Button,
  type ButtonProps,
} from "@xzy18/components";
import { eslint, prettier } from "@xzy18/config";
import { useBoolean, useDebouncedValue } from "@xzy18/hooks";
import {
  AntdProvider as UnifiedProvider,
  type ButtonProps as UnifiedButtonProps,
  clamp,
  cx,
  useBoolean as useUnifiedBoolean,
} from "@xzy18/material-components";
import { clamp as directClamp } from "@xzy18/utils";

const buttonProps: ButtonProps = { success: true };
const unifiedButtonProps: UnifiedButtonProps = { success: true };

void AntdProvider;
void Button;
void UnifiedProvider;
void buttonProps;
void unifiedButtonProps;
void clamp;
void cx;
void directClamp;
void useBoolean;
void useDebouncedValue;
void useUnifiedBoolean;
void eslint;
void prettier;
`;

  fs.writeFileSync(path.join(consumerDir, 'consumer.cts'), source);
  fs.writeFileSync(path.join(consumerDir, 'consumer.mts'), source);
  fs.writeFileSync(
    path.join(consumerDir, 'tsconfig.json'),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2020',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          strict: true,
          skipLibCheck: true,
          noEmit: true,
          lib: ['ES2020', 'DOM'],
        },
        include: ['consumer.cts', 'consumer.mts'],
      },
      null,
      2,
    )}\n`,
  );

  const typescriptCli = path.join(
    repoRoot,
    'node_modules',
    'typescript',
    'bin',
    'tsc',
  );
  run(process.execPath, [
    typescriptCli,
    '--project',
    path.join(consumerDir, 'tsconfig.json'),
  ]);
}

function main(): void {
  const packages = listPackages();
  assert(packages.length > 0, '没有找到可发布的包');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xzy-package-check-'));
  const consumerDir = path.join(tempDir, 'consumer');
  fs.mkdirSync(consumerDir, { recursive: true });

  try {
    for (const item of packages) {
      const packDir = path.join(tempDir, `pack-${item.dirName}`);
      fs.mkdirSync(packDir, { recursive: true });
      run(pnpm, ['pack', '--pack-destination', packDir], {
        cwd: item.dir,
        env: { npm_config_ignore_scripts: 'true' },
      });

      const tarballs = fs
        .readdirSync(packDir)
        .filter((file) => file.endsWith('.tgz'));
      assert(
        tarballs.length === 1,
        `${item.manifest.name} 打包后应只有一个 tarball`,
      );

      item.tarball = path.join(packDir, tarballs[0]);
      item.packedManifest = readTarJson<PackageManifest>(
        item.tarball,
        'package.json',
      );
      const files = new Set(
        run('tar', ['-tzf', item.tarball])
          .split('\n')
          .filter(Boolean)
          .map((file) => file.replace(/^package\//, '')),
      );

      verifyManifest(item, files);
      runPublint(item);
      console.log(`通过 ${item.manifest.name}@${item.manifest.version}`);
    }

    prepareConsumer(packages, consumerDir);
    runRuntimeChecks(packages, consumerDir);
    runTypeChecks(consumerDir);
    console.log(
      `发布消费验证完成：${packages.length} 个包，CJS / ESM / TypeScript 全部通过`,
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

try {
  main();
} catch (error) {
  console.error(
    `发布包校验失败：${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}
