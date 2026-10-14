'use strict';

const path = require('path');
const naming = require('../naming.cjs');
const templates = require('../templates.cjs');
const utils = require('../utils.cjs');

// hooks 包源码目录
const HOOKS_DIR = 'packages/hooks/src';
// hooks 包入口文件，新增 hook 需要在这里登记导出
const BARREL = 'packages/hooks/src/index.ts';

const describe = 'pnpm gen hook <name> [--title "中文名"] [--group 状态] [--force]';

// 生成 hook 目录（与组件保持一致：文件夹 + index.ts + index.md），并把导出追加到 hooks 包入口
function run({ positionals, flags }, { cwd }) {
  const name = naming.toHookName(positionals[0]);
  if (!name) {
    utils.fail('缺少 hook 名，例如：pnpm gen hook useLoading');
    return 1;
  }

  // 文档分组与组件一样由 frontmatter 控制；dumi 侧 hook 路由为 /hooks/<name>
  const group = typeof flags.group === 'string' ? flags.group : '状态';
  const order = utils.nextDocOrder(HOOKS_DIR, { cwd });
  const title = typeof flags.title === 'string' ? `${name} ${flags.title}` : name;
  const hooksPkg = utils.readJson(path.resolve(cwd, 'packages/hooks/package.json'));
  const importName = hooksPkg && hooksPkg.name ? hooksPkg.name : '@xzy18/hooks';

  utils.info(`生成 hook ${name}（分组 ${group}，order ${order}）`);
  try {
    utils.writeFile(path.join(HOOKS_DIR, name, 'index.ts'), templates.hookSource(name), {
      force: flags.force,
      cwd,
    });
    utils.writeFile(
      path.join(HOOKS_DIR, name, 'index.md'),
      templates.hookDoc({ name, title, group, order, importName }),
      { force: flags.force, cwd },
    );
  } catch (error) {
    utils.fail(error.message);
    return 1;
  }

  utils.appendExport(BARREL, name, `./${name}`, { cwd });
  utils.log('');
  utils.info(`目录结构与组件一致（${HOOKS_DIR}/${name}/index.ts），后续新增的类型、常量可以放在同一目录下。`);
  utils.info(`文档页已生成，dumi 的 atomDirs 已覆盖 ${HOOKS_DIR}，重启 pnpm dev 即可看到 /hooks 下的新页面。`);
  utils.info('模板默认是 boolean 态 hook，请按实际需求改写返回值与文档里的 API 说明。');
  return 0;
}

module.exports = { run, describe };
