'use strict';

const path = require('path');
const naming = require('../naming.cjs');
const templates = require('../templates.cjs');
const utils = require('../utils.cjs');

// 组件源码目录：dumi 的 atomDirs 也指向这里，新增组件会自动进入文档
const COMPONENTS_DIR = 'packages/components/src';
// 组件包入口文件，新增组件需要在这里登记导出
const BARREL = 'packages/components/src/index.ts';

const describe = 'pnpm gen component <Name> [--title "中文名"] [--group 基础] [--force]';

// 生成组件源码 + 文档页，并把导出追加到组件包入口
function run({ positionals, flags }, { cwd }) {
  const name = naming.toPascalCase(positionals[0]);
  if (!name) {
    utils.fail('缺少组件名，例如：pnpm gen component ProTable');
    return 1;
  }

  const group = typeof flags.group === 'string' ? flags.group : '基础';
  const order = utils.nextDocOrder(COMPONENTS_DIR, { cwd });
  const title = typeof flags.title === 'string' ? `${name} ${flags.title}` : name;
  const componentsPkg = utils.readJson(path.resolve(cwd, 'packages/components/package.json'));
  const importName = componentsPkg && componentsPkg.name ? componentsPkg.name : '@xzy18/components';
  const materialPkg = utils.readJson(path.resolve(cwd, utils.MATERIAL_PACKAGE_JSON));
  const docImportName = materialPkg && materialPkg.name ? materialPkg.name : importName;

  utils.info(`生成组件 ${name}（分组 ${group}，order ${order}）`);
  try {
    utils.writeFile(path.join(COMPONENTS_DIR, name, 'index.tsx'), templates.componentIndex(name), {
      force: flags.force,
      cwd,
    });
    utils.writeFile(
      path.join(COMPONENTS_DIR, name, 'index.md'),
      templates.componentDoc({ name, title, group, order, importName: docImportName }),
      { force: flags.force, cwd },
    );
  } catch (error) {
    utils.fail(error.message);
    return 1;
  }

  utils.appendExport(BARREL, name, `./${name}`, { cwd });
  utils.syncMaterialPackage(importName, { cwd });
  utils.log('');
  utils.info(`dumi 的 atomDirs 已覆盖 ${COMPONENTS_DIR}，重启 pnpm dev 即可看到新的文档页。`);
  return 0;
}

module.exports = { run, describe };
