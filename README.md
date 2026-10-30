## Component Library Monorepo

Stack: pnpm + turborepo + changesets + dumi + antd + react

### Quickstart

1. Install deps (requires pnpm):

```bash
pnpm install
```

2. Dev docs (dumi) for the library:

```bash
pnpm dev
```

3. Build library:

```bash
pnpm build
```

4. Version and release with changesets:

```bash
# create a changeset
pnpm changeset
# bump versions, build, commit, publish, and push tags
pnpm release
```

`pnpm release` 会完成版本升级、CHANGELOG、构建、发布提交、npm 发布、tag 推送和文档部署。执行前需要保证工作区干净，并在 `~/.npmrc` 中配置具备 `@xzy18` 写权限的 npm Granular Access Token。

`master` 只能发布正式包并部署文档，`test` 只能发布 alpha 包且不更新正式文档。alpha 发布流程：

```bash
git switch test
pnpm alpha:enter
pnpm changeset
pnpm release
# 完成全部 alpha 版本后
pnpm alpha:exit
```

### Workspace layout

- `packages/material-components`: 汇总组件、Hooks 和工具函数的统一运行时入口
- `packages/components`: antd 二次封装的组件库（Button、Provider 等）
- `packages/hooks`: 通用 React hooks（如 useBoolean）
- `packages/utils`: 工具函数（如 cx）

外部项目安装统一入口：

```bash
pnpm add @xzy18/material-components
```

### 代码生成器

`pnpm gen` 提供组件 / hook / 新包的脚手架，零外部依赖，脚本位于 `scripts/generators/`：

```bash
pnpm gen component ProTable --title "高级表格"   # 组件、文档及统一入口
pnpm gen hook useLoading                       # Hook、文档及统一入口
pnpm gen package icons                         # 新包、别名及统一入口
pnpm gen package config --no-material           # 工具包不加入统一运行时入口
pnpm gen                                       # 查看帮助
```

- 名字风格随意：`pro-table`、`ProTable`、`pro_table` 都会归一成 `ProTable`；hook 统一为 `use` 前缀驼峰（`boolean` / `use-boolean` → `useBoolean`）。
- 组件与 hook 都是「文件夹 + `index.ts` + `index.md`」结构；文档 `order` 取同级最大值 +1，默认排在最后。`group` 默认：组件 «基础»、hook «状态»，可用 `--group` 覆盖。
- 组件文档路由在 `/components/*`，hook 文档路由在 `/hooks/*`，均由 `.dumirc.ts` 的 `resolve.atomDirs` 扫描生成。
- 运行时包默认加入 `@xzy18/material-components` 的依赖和统一出口；配置、CLI 等非运行时包请加 `--no-material`。
- `material-components` 使用 `workspace:*` 锁定同一发布批次的运行时子包；任一子包升版时，Changesets 会默认给聚合包补一个 patch，无需重复创建 changeset。
- 目标文件已存在时报错退出，确认覆盖请加 `--force`；重复执行不会产生重复导出。
