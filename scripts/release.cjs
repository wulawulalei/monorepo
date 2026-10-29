#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');

// 执行命令并将输出直接显示在终端。
function run(command, args, env = {}) {
  execFileSync(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: 'inherit',
  });
}

// 执行命令并返回去除首尾空白后的输出。
function output(command, args) {
  return execFileSync(command, args, {
    cwd: root,
    encoding: 'utf8',
  }).trim();
}

function git(args) {
  return output('git', args);
}

// 检查分支、工作区、changeset 和预发布状态。
function checkRelease() {
  const branch = git(['branch', '--show-current']);
  if (branch !== 'master' && branch !== 'test') {
    throw new Error(
      `仅支持在 master 或 test 分支发布，当前分支为 ${branch || '未知'}`,
    );
  }

  const alpha = branch === 'test';
  const status = git(['status', '--porcelain']);
  if (status) {
    throw new Error(`发布前请提交或清理工作区改动：\n${status}`);
  }

  const changesets = fs
    .readdirSync(path.join(root, '.changeset'))
    .filter((file) => file.endsWith('.md') && file !== 'README.md');
  if (changesets.length === 0) {
    throw new Error('没有待发布的 changeset，请先运行 pnpm changeset');
  }

  const preStatePath = path.join(root, '.changeset/pre.json');
  const preState = fs.existsSync(preStatePath)
    ? JSON.parse(fs.readFileSync(preStatePath, 'utf8'))
    : null;

  if (alpha && (preState?.mode !== 'pre' || preState.tag !== 'alpha')) {
    throw new Error('test 分支发布 alpha 前请先运行 pnpm alpha:enter');
  }
  if (!alpha && preState?.mode === 'pre') {
    throw new Error('master 分支只能发布正式包，请先运行 pnpm alpha:exit');
  }

  git(['remote', 'get-url', 'origin']);

  return { alpha, branch };
}

function getTags() {
  return git(['tag', '--list']).split('\n').filter(Boolean);
}

function main() {
  if (process.argv.length > 2) {
    throw new Error('release 命令不接受参数');
  }

  const { alpha, branch } = checkRelease();

  console.log(`[1/5] 在 ${branch} 分支更新版本和 CHANGELOG`);
  run('pnpm', ['version-packages']);

  console.log('[2/5] 构建全部包');
  run('pnpm', ['build']);

  console.log('[3/5] 提交版本改动');
  run('git', ['add', '--all']);
  if (!git(['diff', '--cached', '--name-only'])) {
    throw new Error('版本命令没有产生任何改动');
  }
  run('git', [
    'commit',
    '-m',
    alpha ? 'chore: release alpha packages' : 'chore: release packages',
  ]);

  const tagsBefore = getTags();

  console.log('[4/5] 发布到 npm');
  const publishArgs = ['exec', 'changeset', 'publish'];
  if (alpha) {
    publishArgs.push('--no-git-tag', '--tag', 'alpha');
  }

  try {
    run('pnpm', publishArgs, { CI: 'true' });
  } catch {
    throw new Error(
      'npm 发布失败，版本提交已保留在本地；修复后运行 pnpm exec changeset publish 继续',
    );
  }

  run('git', ['push', 'origin', 'HEAD']);

  const newTags = getTags().filter((tag) => !tagsBefore.includes(tag));
  if (newTags.length > 0) {
    run('git', ['push', 'origin', ...newTags]);
  }

  if (alpha) {
    console.log('[5/5] alpha 发布跳过文档部署');
  } else {
    console.log('[5/5] 发布文档');
    try {
      run('pnpm', ['release:docs']);
    } catch {
      throw new Error(
        'npm 包和版本提交已发布，但文档发布失败；修复后运行 pnpm release:docs',
      );
    }
  }

  console.log('发布完成');
}

try {
  main();
} catch (error) {
  console.error(`发布失败：${error.message}`);
  process.exit(1);
}
