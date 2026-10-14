'use strict';

const fs = require('fs');
const path = require('path');

const ESC = '\x1b[';
const style = {
  reset: `${ESC}0m`,
  red: `${ESC}31m`,
  green: `${ESC}32m`,
  yellow: `${ESC}33m`,
  cyan: `${ESC}36m`,
};

// 普通输出（stdout）
function log(message = '') {
  process.stdout.write(`${message}\n`);
}

// 信息提示
function info(message) {
  log(`${style.cyan}i${style.reset} ${message}`);
}

// 成功提示
function ok(message) {
  log(`${style.green}v${style.reset} ${message}`);
}

// 警告：不阻断流程，仅提示人工确认
function warn(message) {
  log(`${style.yellow}!${style.reset} ${message}`);
}

// 错误输出（stderr，便于 CI 区分）
function fail(message) {
  process.stderr.write(`${style.red}x${style.reset} ${message}\n`);
}

// 统一输出 posix 分隔符，保证 macOS / Windows 打印一致
function toPosix(target) {
  return target.split(path.sep).join('/');
}

// 相对仓库根的可读路径，用于日志展示
function relative(cwd, target) {
  return toPosix(path.relative(cwd, target));
}

// 读取并解析 JSON；解析失败返回 null 而不抛错，交给调用方降级处理
function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

// 判断相对路径是否存在（相对于 cwd）
function fileExists(relativePath, { cwd = process.cwd() } = {}) {
  return fs.existsSync(path.resolve(cwd, relativePath));
}

// 写入文件（必要时递归建目录）；已存在且未加 --force 时报错，避免误覆盖
function writeFile(relativePath, content, { force = false, cwd = process.cwd() } = {}) {
  const absolute = path.resolve(cwd, relativePath);
  if (fs.existsSync(absolute) && !force) {
    throw new Error(`${relative(cwd, absolute)} 已存在（如需覆盖请追加 --force）`);
  }
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content);
  ok(`写入 ${relative(cwd, absolute)}`);
  return absolute;
}

// 在包入口文件末尾追加一条导出；已存在则跳过，保证脚本可重复执行
function appendExport(relativeBarrel, exportName, source, { cwd = process.cwd() } = {}) {
  const absolute = path.resolve(cwd, relativeBarrel);
  const line = `export { ${exportName} } from "${source}";`;
  if (!fs.existsSync(absolute)) {
    warn(`未找到入口文件 ${relativeBarrel}，请手动补充：${line}`);
    return false;
  }
  const content = fs.readFileSync(absolute, 'utf8');
  if (content.includes(line)) {
    info(`导出已存在，跳过 ${relativeBarrel}`);
    return false;
  }
  fs.writeFileSync(absolute, `${content.replace(/\s*$/, '')}\n${line}\n`);
  ok(`登记导出 ${relativeBarrel} -> ${line}`);
  return true;
}

// 从已有包的 name 推断 npm scope，例如 @xzy18
function detectScope(packagesDir, { cwd = process.cwd() } = {}) {
  const absolute = path.resolve(cwd, packagesDir);
  if (!fs.existsSync(absolute)) return null;
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const pkg = readJson(path.join(absolute, entry.name, 'package.json'));
    const match = pkg && typeof pkg.name === 'string' ? pkg.name.match(/^(@[^/]+)\//) : null;
    if (match) return match[1];
  }
  return null;
}

// 扫描目标目录下各子目录的 index.md，取其中最大的 order + 1，让新增条目默认排在最后
function nextDocOrder(docDir, { cwd = process.cwd() } = {}) {
  const absolute = path.resolve(cwd, docDir);
  let max = 0;
  if (fs.existsSync(absolute)) {
    for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const docPath = path.join(absolute, entry.name, 'index.md');
      if (!fs.existsSync(docPath)) continue;
      const match = fs.readFileSync(docPath, 'utf8').match(/^order:\s*(\d+)\s*$/m);
      if (match) max = Math.max(max, Number(match[1]));
    }
  }
  return max + 1;
}

const PATHS_ENTRY = /^(\s*)"(@[^"]+)":\s*\["packages\/([^"]+)\/src"\](,?)\s*$/;
const ALIAS_ENTRY = /^(\s*)"(@[^"]+)":\s*resolve\(__dirname,\s*"packages\/([^"]+)\/src"\),?\s*$/;

// 返回最后一个匹配的行号；找不到返回 -1
function findLastEntryIndex(lines, pattern) {
  let index = -1;
  lines.forEach((line, i) => {
    if (pattern.test(line)) index = i;
  });
  return index;
}

// tsconfig.json 是严格 JSON，插入点要处理末行逗号，并在写盘前用 JSON.parse 校验
function linkTsconfigPaths(pkgName, dirName, { cwd = process.cwd() } = {}) {
  const absolute = path.resolve(cwd, 'tsconfig.json');
  if (!fs.existsSync(absolute)) {
    warn('未找到 tsconfig.json，跳过 paths 注入');
    return;
  }
  const original = fs.readFileSync(absolute, 'utf8');
  if (original.includes(`"${pkgName}"`)) {
    info(`tsconfig.json 已包含 ${pkgName}，跳过`);
    return;
  }
  const lines = original.split('\n');
  const index = findLastEntryIndex(lines, PATHS_ENTRY);
  if (index === -1) {
    warn(`tsconfig.json 未匹配到 "@scope/pkg": ["packages/*/src"] 形式的别名，请手动补 ${pkgName}`);
    return;
  }
  const indent = lines[index].match(PATHS_ENTRY)[1];
  lines[index] = `${lines[index].replace(/,\s*$/, '')},`;
  lines.splice(index + 1, 0, `${indent}"${pkgName}": ["packages/${dirName}/src"]`);
  const updated = lines.join('\n');
  try {
    JSON.parse(updated);
  } catch {
    warn('tsconfig.json 注入后无法解析，已放弃改动，请手动补充 paths');
    return;
  }
  fs.writeFileSync(absolute, updated);
  ok(`更新 tsconfig.json -> "${pkgName}": ["packages/${dirName}/src"]`);
}

function linkDumircAlias(pkgName, dirName, { cwd = process.cwd() } = {}) {
  const absolute = path.resolve(cwd, '.dumirc.ts');
  if (!fs.existsSync(absolute)) {
    warn('未找到 .dumirc.ts，跳过 alias 注入');
    return;
  }
  const original = fs.readFileSync(absolute, 'utf8');
  if (original.includes(`"${pkgName}"`)) {
    info(`.dumirc.ts 已包含 ${pkgName}，跳过`);
    return;
  }
  const lines = original.split('\n');
  const index = findLastEntryIndex(lines, ALIAS_ENTRY);
  if (index === -1) {
    warn(`.dumirc.ts 未匹配到既有 alias 行，请手动补 ${pkgName}`);
    return;
  }
  const indent = lines[index].match(ALIAS_ENTRY)[1];
  lines.splice(index + 1, 0, `${indent}"${pkgName}": resolve(__dirname, "packages/${dirName}/src"),`);
  fs.writeFileSync(absolute, lines.join('\n'));
  ok(`更新 .dumirc.ts -> ${pkgName}`);
}

// 为新包补 tsconfig paths 与 dumi alias；锚点缺失时降级为提示，不阻断生成
function linkAliases(pkgName, dirName, { cwd = process.cwd() } = {}) {
  linkTsconfigPaths(pkgName, dirName, { cwd });
  linkDumircAlias(pkgName, dirName, { cwd });
}

module.exports = {
  log,
  info,
  ok,
  warn,
  fail,
  toPosix,
  relative,
  readJson,
  fileExists,
  writeFile,
  appendExport,
  detectScope,
  nextDocOrder,
  linkAliases,
};
