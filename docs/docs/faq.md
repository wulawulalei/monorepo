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

### pnpm 和 npm / yarn 有什么区别？

核心差异在「依赖如何落盘」和「node_modules 的结构」两点上：

| 维度 | pnpm | npm / yarn（classic） |
| --- | --- | --- |
| 安装策略 | 全局内容寻址 store + 硬链接，同一版本只存一份 | 各自下载后再拷贝进 node_modules |
| node_modules 结构 | 严格嵌套 + 符号链接，只暴露 package.json 里声明过的依赖 | 扁平化提升，未声明的依赖也可能被 `import` 到 |
| workspace | 原生支持 `workspace:*`，发布时自动改写成实际版本号 | 有 workspaces，但本地引用需自行处理版本 |
| 磁盘占用 / 速度 | 更省磁盘，重复安装更快 | 占用更大，重复安装更慢 |
| 锁文件 | 单个 `pnpm-lock.yaml`，配合 `--frozen-lockfile` 可复现 | `package-lock.json` / `yarn.lock` |

对本项目来说，实际收益主要是：

- **拦截幽灵依赖**：扁平结构下能 `import` 一个没写进 `package.json` 的包（靠上层提升侥幸命中），换环境就会挂；pnpm 的严格结构会直接报错，逼着把依赖声明补全。
- **包间引用可靠**：需要互相依赖时用 `workspace:*` 指到本地源码，发布时再替换成真实版本，避免误装 npm 上的旧版本。
- **锁文件唯一**：CI 与本地共用一份 `pnpm-lock.yaml`，不会因为 npm/yarn 各写一个锁文件而产生漂移。

> 注意：包管理器不能混用。仓库里只维护 `pnpm-lock.yaml`，用 npm/yarn 安装会重新生成一套依赖树，进而出现「本地能跑、CI 挂掉」的问题。

### 为什么不用 lerna？

Lerna 解决的是三件事：多包依赖安装（`bootstrap`）、统一版本管理、发布。这三件事在本项目里已经由更单一、更现代的工具分别承担：

| 职责 | 本项目选型 | 相比 lerna |
| --- | --- | --- |
| 依赖安装与链接 | pnpm workspace | lerna 自己不装依赖，6.x 起把安装委托给 `npmClient`（npm/yarn/pnpm），等于还得再选一个包管理器 |
| 任务编排与缓存 | turborepo | `lerna run` 只是并发跑脚本，没有任务依赖图，也没有产物缓存；turbo 支持 `dependsOn` 与缓存（见 `turbo.json` 的 `outputs`） |
| 版本与发布 | changesets | lerna 的 fixed / locked 版本模式偏重；本项目要的是按包独立的 patch / minor / major + 自动 CHANGELOG + 预发布跳过，changesets 更贴合（见 `CHANGESET_WORKFLOW.md`） |

另外两点现实原因：

- **定位变化**：Lerna 6 起由 Nx 团队接管，官方已将其定位为维护模式并建议迁移到 Nx，新项目再引入 lerna 的收益有限。
- **依赖提升的老问题**：lerna 的 `bootstrap --hoist` 依赖符号链接与提升，容易出现幽灵依赖和版本不一致，与 pnpm 严格结构的方向相反。

所以本项目采用 `pnpm workspace + turborepo + changesets` 这套组合，各自只做一件事，且已是社区主流方案，无需再叠加 lerna。

## 新增包或者组件等

### 如何新增一个包？

推荐直接用生成器，它会创建 `package.json`、`.fatherrc.ts`、`src/index.ts`，并把新包注册进 `tsconfig.json` 的 `paths` 和 `.dumirc.ts` 的 `alias`：

```shell
$ pnpm gen package icons
```

也可以手工创建，步骤如下：

1. 在 `packages/` 下创建新目录。
2. 新增 `package.json`，参考现有包的 `scripts.build: "father build"`、`module/main/types/files` 和 `publishConfig.access: "public"` 字段。
3. 新增 `.fatherrc.ts` 并 `extends "../../father.config.ts"` 继承公共配置。
4. 在 `packages/<name>/src/index.ts` 导出公共 API。

`pnpm-workspace.yaml` 已使用 `packages/*` 通配，通常无需手工修改。

### 如何新增一个组件？

推荐用 `pnpm gen` 生成脚手架，一步到位：

```shell
$ pnpm gen component ProTable --title "高级表格"
```

它会创建 `packages/components/src/ProTable/{index.tsx,index.md}`，并把 `export { ProTable } from "./ProTable";` 追加到 `packages/components/src/index.ts`。文档 `order` 会自动取同级最大值 +1，`group` 默认 «基础»（可用 `--group` 覆盖）。若目标文件已存在，脚本会报错退出，确认覆盖请追加 `--force`。

同理还有 `pnpm gen hook useLoading`（hooks 包，结构与组件一致，同时产出 `index.ts` 与 `index.md`，文档路由为 `/hooks/*`）和 `pnpm gen package icons`（新包，会自动注册 `tsconfig.json` 的 `paths` 与 `.dumirc.ts` 的 `alias`）。不带参数执行 `pnpm gen` 可查看全部用法。

### 新增组件后为什么文档里看不到它？

dumi 通过 `.dumirc.ts` 中的 `resolve.atomDirs` 扫描组件与 hooks 目录：

```ts
resolve: {
  atomDirs: [
    { type: "component", dir: "packages/components/src" },
    { type: "hook", dir: "packages/hooks/src" },
  ],
}
```

`type` 会经 pluralize 变成路由前缀：`component` → `/components`，`hook` → `/hooks`。

请确认代码位于对应的 atomDirs 目录下，并且在当前目录保留一个带 frontmatter（`title`）的 `index.md`。新增文件后需重启 `pnpm dev` 让 dumi 重新扫描。

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

### 变更日志如何生成？

`version-packages` 在 changeset 更新版本后触发 `pnpm changelog`，由 `scripts/run-changelog.cjs` 基于 conventional-changelog 为每个包生成 `CHANGELOG.md`。

仅正式版本会生成变更日志：当本次升到的是预发布版本（如 `0.0.2-alpha.0`）时，脚本会跳过该包，不会追加 changelog 段落；等转到正式版本（如 `0.0.2`）时再统一生成一次。

## 使用组件时的问题

### 为什么组件包不把 antd / react 打包进依赖？

组件包通过 `peerDependencies` 声明 `antd`、`react`、`react-dom`，由使用方提供实例，避免多份 React 或 antd 造成状态与上下文冲突。使用方项目中需自行安装对应版本：

```shell
$ pnpm i @xzy18/components antd react react-dom
```
