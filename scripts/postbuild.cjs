#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const packageDir = path.resolve(process.argv[2] || process.cwd());
const manifestPath = path.join(packageDir, 'package.json');
const esmManifestPath = path.join(packageDir, 'es', 'package.json');
const esmDir = path.join(packageDir, 'es');

if (!fs.existsSync(manifestPath)) {
  console.error(`未找到包清单：${manifestPath}`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// father 的 ESM 产物会保留无后缀的相对导入，浏览器打包器能解析，
// Node ESM 则要求明确文件或目录出口。这里在构建后统一补成 index.js。
function normalizeEsmSpecifiers(source) {
  return source.replace(
    /((?:from|import)\s*\(?\s*['"])(\.{1,2}\/[^'"]+)(['"])/g,
    (match, prefix, specifier, suffix) => {
      const target = path.resolve(esmDir, specifier);
      if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
        return `${prefix}${specifier.replace(/\/$/, '')}/index.js${suffix}`;
      }
      if (!path.extname(specifier) && fs.existsSync(`${target}.js`)) {
        return `${prefix}${specifier}.js${suffix}`;
      }
      return match;
    },
  );
}

function walkGeneratedFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return walkGeneratedFiles(entryPath);
    }
    return /\.(?:js|mjs|[cm]?ts)$/.test(entry.name) ? [entryPath] : [];
  });
}

for (const filePath of walkGeneratedFiles(esmDir)) {
  const source = fs.readFileSync(filePath, 'utf8');
  const normalized = normalizeEsmSpecifiers(source);
  if (normalized !== source) {
    fs.writeFileSync(filePath, normalized, 'utf8');
  }
}

// 条件导出统一指向根入口，确保现代解析器与旧字段得到相同 API。
manifest.exports = {
  '.': {
    import: {
      types: './es/index.d.ts',
      default: './es/index.js',
    },
    require: {
      types: './lib/index.d.ts',
      default: './lib/index.js',
    },
  },
  './package.json': './package.json',
};

// 保留 main、module、types，兼容尚未支持 exports 的旧工具。
manifest.main = 'lib/index.js';
manifest.module = 'es/index.js';
manifest.types = 'lib/index.d.ts';
manifest.type = 'commonjs';

fs.mkdirSync(path.dirname(esmManifestPath), { recursive: true });
fs.writeFileSync(
  manifestPath,
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8',
);
fs.writeFileSync(
  esmManifestPath,
  `${JSON.stringify({ type: 'module' }, null, 2)}\n`,
  'utf8',
);

console.log(
  `已同步 ${path.relative(process.cwd(), manifestPath)} 与 ${path.relative(
    process.cwd(),
    esmManifestPath,
  )}`,
);
