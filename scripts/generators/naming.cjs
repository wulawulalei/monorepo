'use strict';

// 各种写法统一切成单词：
//   "pro-table"  -> ["pro", "table"]
//   "ProTable"   -> ["Pro", "Table"]
//   "HTMLParser" -> ["HTML", "Parser"]
//   "use_boolean" -> ["use", "boolean"]
function toWords(input) {
  return String(input || '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
}

function capitalize(word) {
  if (!word) return '';
  // 全大写缩写（HTML、ID、URL）保持原样，避免变成 Html / Id / Url
  if (word.length > 1 && word === word.toUpperCase()) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// 组件名 / 类型名：pro-table -> ProTable
function toPascalCase(input) {
  return toWords(input).map(capitalize).join('');
}

// 目录名 / 包名：ProTable -> pro-table
function toKebabCase(input) {
  return toWords(input)
    .map((word) => word.toLowerCase())
    .join('-');
}

// 变量名 / 文件名：ProTable -> proTable
function toCamelCase(input) {
  const pascal = toPascalCase(input);
  return pascal ? pascal.charAt(0).toLowerCase() + pascal.slice(1) : '';
}

// hook 名统一成 use + PascalCase：
//   boolean / useBoolean / use-boolean -> useBoolean
function toHookName(input) {
  const words = toWords(input);
  if (words.length > 0 && words[0].toLowerCase() === 'use') words.shift();
  const pascal = words.map(capitalize).join('');
  return pascal ? `use${pascal}` : null;
}

module.exports = {
  toWords,
  capitalize,
  toPascalCase,
  toKebabCase,
  toCamelCase,
  toHookName,
};
