import path from 'node:path';
import * as naming from '../naming';
import * as templates from '../templates';
import type { GeneratorArgs, GeneratorContext } from '../types';
import * as utils from '../utils';

const describe =
  'pnpm gen package <name> [--scope @xzy18] [--description "..."] [--no-material] [--force]';

// 生成新包骨架，并把包名注册进 tsconfig paths 与 dumi alias
function run(
  { positionals, flags }: GeneratorArgs,
  { cwd }: GeneratorContext,
): number {
  const dirName = naming.toKebabCase(positionals[0]);
  if (!dirName) {
    utils.fail('缺少包名，例如：pnpm gen package icons');
    return 1;
  }

  const scope =
    typeof flags.scope === 'string'
      ? flags.scope
      : utils.detectScope('packages', { cwd }) || '@xzy18';
  const packageName = `${scope}/${dirName}`;
  const packageDir = path.join('packages', dirName);
  const description =
    typeof flags.description === 'string'
      ? flags.description
      : `${packageName} for xzy-materials`;

  if (utils.fileExists(path.join(packageDir, 'package.json'), { cwd })) {
    utils.fail(`${packageDir}/package.json 已存在，请换个包名或先删除该目录`);
    return 1;
  }

  utils.info(`生成包 ${packageName}（${packageDir}）`);
  try {
    utils.writeFile(
      path.join(packageDir, 'package.json'),
      templates.packageJson({ packageName, description }),
      { force: Boolean(flags.force), cwd },
    );
    utils.writeFile(
      path.join(packageDir, '.fatherrc.ts'),
      templates.fatherRc(),
      { force: Boolean(flags.force), cwd },
    );
    utils.writeFile(
      path.join(packageDir, 'src/index.ts'),
      templates.packageIndex(packageName),
      {
        force: Boolean(flags.force),
        cwd,
      },
    );
  } catch (error) {
    utils.fail(error instanceof Error ? error.message : String(error));
    return 1;
  }

  utils.linkAliases(packageName, dirName, { cwd });
  if (flags['no-material']) {
    utils.info('已跳过 material-components 聚合（--no-material）');
  } else {
    utils.syncMaterialPackage(packageName, { cwd });
  }
  utils.log('');
  utils.info(
    `pnpm-workspace.yaml 使用 packages/* 通配，无需改动；在 ${packageDir}/src/index.ts 导出 API 后即可 pnpm build。`,
  );
  utils.info('发布前记得创建 changeset：pnpm changeset');
  return 0;
}

export { describe, run };
