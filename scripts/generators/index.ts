import path from 'node:path';
import * as component from './commands/component';
import * as hook from './commands/hook';
import * as packageCommand from './commands/package';
import type { GeneratorArgs, GeneratorCommand, GeneratorFlags } from './types';
import * as utils from './utils';

const COMMANDS: Record<string, GeneratorCommand> = {
  component,
  hook,
  package: packageCommand,
};

// 脚本位于 <root>/scripts/generators/，以仓库根为工作目录，保证任意位置执行都一致
const REPO_ROOT = path.resolve(__dirname, '..', '..');

// 解析 CLI 参数：支持 --key value、--key=value、--flag 三种写法
function parseArgv(argv: string[]): GeneratorArgs {
  const positionals: string[] = [];
  const flags: GeneratorFlags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      positionals.push(token);
      continue;
    }
    const body = token.slice(2);
    const separator = body.indexOf('=');
    if (separator !== -1) {
      flags[body.slice(0, separator)] = body.slice(separator + 1);
      continue;
    }
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      flags[body] = next;
      i += 1;
    } else {
      flags[body] = true;
    }
  }
  return { positionals, flags };
}

// 打印可用命令与示例
function printHelp(): void {
  utils.log('xzy-materials 代码生成器');
  utils.log('');
  utils.log('用法：');
  Object.keys(COMMANDS).forEach((name) => {
    utils.log(`  ${COMMANDS[name].describe}`);
  });
  utils.log('');
  utils.log('示例：');
  utils.log('  pnpm gen component ProTable --title "高级表格"');
  utils.log('  pnpm gen hook useLoading');
  utils.log('  pnpm gen package icons');
  utils.log('  pnpm gen package config --no-material');
}

// 入口：解析参数并分发子命令，返回值作为进程退出码
function main(): number {
  const { positionals, flags } = parseArgv(process.argv.slice(2));
  const commandName = positionals.shift();

  if (!commandName || flags.help || commandName === 'help') {
    printHelp();
    return 0;
  }

  const command = COMMANDS[commandName];
  if (!command) {
    utils.fail(
      `未知命令 "${commandName}"，可用命令：${Object.keys(COMMANDS).join(
        ' / ',
      )}`,
    );
    return 1;
  }

  try {
    return command.run(
      { positionals, flags },
      { cwd: REPO_ROOT, root: REPO_ROOT },
    );
  } catch (error) {
    utils.fail(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

process.exitCode = main();
