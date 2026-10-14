---
title: faq
order: 2
toc: content
---

## 环境与依赖

### 为什么一定要用 pnpm？

项目使用 `pnpm workspace` 管理 `packages/*` 下的多个包，并在根目录声明了 `packageManager: pnpm@9.12.0`。npm 和 yarn 无法正确解析 workspace 的本地包引用，请先安装 pnpm：

```shell
$ npm i -g pnpm@9.12.0
```

### 安装依赖报错怎么办？

先删除锁文件并重新安装，确保锁文件与 `packageManager` 版本一致：

```shell
$ rm -rf node_modules pnpm-lock.yaml
$ pnpm install
```

### 支持什么 Node 版本？

依赖 `antd@5`、`dumi@2`、`father@4` 均要求 Node.js 18 及以上，建议使用 Node 18 / 20 LTS。

## 文档开发（dumi）

### 如何本地预览文档？

```shell
$ pnpm dev
```

默认通过 dumi 启动开发服务，浏览器访问终端输出的地址即可。文档页面由 `docs/` 和 `packages/components/src/**/index.md` 中的 Markdown 自动生成。

### 新增组件后为什么文档里看不到它？

dumi 通过 `.dumirc.ts` 中的 `resolve.atomDirs` 扫描组件目录：

```ts
resolve: {
  atomDirs: [{ type: "component", dir: "packages/components/src" }],
}
```

请确认组件代码位于 `packages/components/src` 下，并且在当前组件目录保留一个带 frontmatter（`title`）的 `index.md`。新增文件后需重启 `pnpm dev` 让 dumi 重新扫描。

### 文档里如何引用本地包？

`.dumirc.ts` 已配置源码目录别名，文档 demo 直接使用包名即可，无需先构建：

```tsx | pure
import { Button } from "@xzy18/components";
```

`@xzy18/components`、`@xzy18/hooks`、`@xzy18/utils` 均指向对应包的 `src`，修改源码后文档可即时热更新。

### 为什么所有页面都显示目录？

项目在 `extraRemarkPlugins` 中为每个页面强制注入了 `frontmatter.toc = "content"`，因此页面统一展示右侧目录，无需在单个文档里单独设置。

## 构建（father）

### 如何构建所有包？

```shell
$ pnpm build
```

根目录通过 turborepo 并发执行每个包内的 `father build`。father 依据 `father.config.ts` 输出两个产物目录：

- `es/`：ESM 产物（对应 `module` 字段）
- `lib/`：CJS 产物（对应 `main` 字段）

类型声明一同输出到对应目录，包内 `types` 字段指向 `lib/index.d.ts`。

### 如何新增一个包？

1. 在 `packages/` 下创建新目录。
2. 新增 `package.json`，参考现有包的 `scripts.build: "father build"`、`module/main/types/files` 和 `publishConfig.access: "public"` 字段。
3. 新增 `.fatherrc.ts` 并 `extends "../../father.config.ts"` 继承公共配置。
4. 在 `packages/<name>/src/index.ts` 导出公共 API。

`pnpm-workspace.yaml` 已使用 `packages/*` 通配，通常无需手工修改。

### 构建产物为什么没更新？

turborepo 会缓存 task 的产物。若产物目录未按预期刷新，先排查是否命中缓存，必要时清理：

```shell
$ pnpm turbo run build --force
```

## 版本与发布（changesets）

### 如何提交一次变更？

开发完成后创建 changeset：

```shell
$ pnpm changeset
```

按提示选择需要发布的包、版本类型（patch / minor / major）并填写变更说明。提交生成的 `.changeset/*.md` 到仓库即可。

### 如何发版本并发布到 npm？

```shell
$ pnpm version-packages   # 更新版本号并生成 CHANGELOG
$ pnpm build              # 重新构建产物
$ pnpm release            # changeset publish 发布到 npm
```

发布前需确认已登录且本地未提交的 changeset 已全部纳入本次版本更新。

### 发布失败常见原因？

- 未登录 npm：先执行 `npm login`。
- 权限不足：确认包为公开包，各 `package.json` 需配置 `publishConfig.access: "public"`。
- 分支不符：`.changeset/config.json` 中 `baseBranch` 为 `master`，需在对应分支执行发布。

### 变更日志如何生成？

`version-packages` 在 changeset 更新版本后触发 `pnpm changelog`，由 `scripts/run-changelog.cjs` 基于 conventional-changelog 为每个包生成 `CHANGELOG.md`。

仅正式版本会生成变更日志：当本次升到的是预发布版本（如 `0.0.2-alpha.0`）时，脚本会跳过该包，不会追加 changelog 段落；等转到正式版本（如 `0.0.2`）时再统一生成一次。

## 使用组件时的问题

### 为什么组件包不把 antd / react 打包进依赖？

组件包通过 `peerDependencies` 声明 `antd`、`react`、`react-dom`，由使用方提供实例，避免多份 React 或 antd 造成状态与上下文冲突。使用方项目中需自行安装对应版本：

```shell
$ pnpm i @xzy18/components antd react react-dom
```

### 组件需要 Provider 吗？

接入 antd 主题或 ConfigProvider 能力时，请使用库提供的 `AntdProvider` 包裹，例如：

```tsx | pure
import { AntdProvider, Button } from "@xzy18/components";

<AntdProvider>
  <Button success>按钮</Button>
</AntdProvider>;
```
