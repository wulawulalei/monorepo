'use strict';

// 组件源码模板：与 packages/components 现有风格保持一致，并预置中文备注供后续填充
function componentIndex(name) {
  return `import React, { ReactNode } from "react";

export type ${name}Props = {
  /** 子节点内容 */
  children?: ReactNode;
};

/**
 * ${name} 组件
 *
 * TODO: 补充 ${name} 的功能说明、props 说明与典型用法
 */
export const ${name}: React.FC<${name}Props> = ({ children }) => {
  return <div>{children}</div>;
};
`;
}

// 组件文档模板：frontmatter 会被 dumi 解析成侧边栏分组与排序
function componentDoc({ name, title, group, order, importName }) {
  return `---
title: ${title}
group:
  title: ${group}
  order: ${order}
order: ${order}
---

## 何时使用

${name} 组件。

## 代码演示

\`\`\`tsx
import React from "react";
import { ${name} } from "${importName}";

export default () => <${name} />;
\`\`\`
`;
}

// hook 模板：写入 packages/hooks/src/<name>/index.ts，与组件的"文件夹 + index"结构保持一致
function hookSource(name) {
  return `import { useCallback, useState } from "react";

/**
 * ${name} —— 布尔状态 hook 模板
 *
 * 默认返回 value / setTrue / setFalse / toggle / setValue，
 * 请按实际业务改写返回值与副作用。
 */
export function ${name}(initial = false) {
  /** 当前布尔值 */
  const [value, setValue] = useState<boolean>(initial);
  /** 置为 true */
  const setTrue = useCallback(() => setValue(true), []);
  /** 置为 false */
  const setFalse = useCallback(() => setValue(false), []);
  /** 在 true / false 之间取反 */
  const toggle = useCallback(() => setValue((v) => !v), []);
  return { value, setTrue, setFalse, toggle, setValue };
}
`;
}

// hook 文档模板：frontmatter 决定 dumi 侧边栏分组与排序，API 表格需手工维护
// （dumi 的 atomId 只识别同名的 .tsx/.jsx，hook 是 .ts，无法自动生成 props 表）
function hookDoc({ name, title, group, order, importName }) {
  return `---
title: ${title}
group:
  title: ${group}
  order: ${order}
order: ${order}
---

## 何时使用

TODO: 说明 ${name} 的适用场景与注意事项。

## 代码演示

\`\`\`tsx
import React from "react";
import { ${name} } from "${importName}";

export default () => {
  const result = ${name}();

  return <pre>{JSON.stringify(result, null, 2)}</pre>;
};
\`\`\`

## API

请在此补充参数说明与返回值说明。
`;
}

// 新包 package.json 模板：字段与现有包保持一致（注意 files 只声明实际会产出的目录）
function packageJson({ name, packageName, description }) {
  const manifest = {
    name: packageName,
    version: '0.0.0',
    private: false,
    description,
    license: 'MIT',
    module: 'es/index.js',
    main: 'lib/index.js',
    types: 'lib/index.d.ts',
    files: ['lib', 'es'],
    scripts: {
      build: 'father build',
      prepack: 'pnpm build',
    },
    devDependencies: {
      father: '^4.6.8',
      typescript: '^5.6.3',
    },
    publishConfig: {
      access: 'public',
    },
    sideEffects: false,
  };
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

// 新包 father 配置：仅继承仓库根配置，保持"配置只在根目录维护一份"
function fatherRc() {
  return `import { defineConfig } from "father";

export default defineConfig({
  extends: "../../father.config.ts",
});
`;
}

// 新包入口文件：只留注释与空导出，避免出现无意义的占位实现
function packageIndex(name) {
  return `// ${name} 的公共 API 出口
//
// 约定：
// 1. 只在这里导出需要对外暴露的成员，内部实现建议拆到同目录的独立文件；
// 2. 新增导出后记得创建 changeset：pnpm changeset

export {};
`;
}

module.exports = {
  componentIndex,
  componentDoc,
  hookSource,
  hookDoc,
  packageJson,
  fatherRc,
  packageIndex,
};
