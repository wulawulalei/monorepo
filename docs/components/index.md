---
title: 组件总览
order: 1
toc: content
---

## 组件总览

`@xzy18/components` 是基于 [Ant Design](https://ant.design) 二次封装的 React 组件库，每个组件一个目录，可直接按需引入。

| 组件 | 说明 |
| --- | --- |
| `Button` | 基于 antd `Button` 的封装，新增 `success` 状态 |
| `AntdProvider` | 全局主题配置，统一 antd 主题与 `prefixCls` 前缀 |

## 代码演示

```tsx
import React from "react";
import { AntdProvider, Button } from "@xzy18/components";

export default () => (
  <AntdProvider>
    <Button>默认按钮</Button>
    <Button success>成功按钮</Button>
  </AntdProvider>
);
```

## 使用方式

组件通过 `peerDependencies` 声明对 `antd` / `react` / `react-dom` 的依赖，使用方需自行安装：

```shell
$ pnpm i @xzy18/components antd react react-dom
```

建议在应用入口用 `AntdProvider` 包裹一次，即可获得统一的主题与类名前缀：

```tsx | pure
import React from "react";
import { AntdProvider } from "@xzy18/components";

export default function App({ children }) {
  return <AntdProvider>{children}</AntdProvider>;
}
```

组件源码位于 `packages/components/src` 下，每个组件包含 `index.tsx` 与 `index.md`；新增组件可使用 `pnpm gen component <Name>`，详见 [faq](/docs/faq)。
