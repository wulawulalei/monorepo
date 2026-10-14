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
# bump versions
pnpm version-packages
# publish to npm (ensure you are logged in)
pnpm release
```

### Workspace layout

- `packages/components`: antd 二次封装的组件库（Button、Provider 等）
- `packages/hooks`: 通用 React hooks（如 useBoolean）
- `packages/utils`: 工具函数（如 cx）

### 代码生成器

`pnpm gen` 提供组件 / hook / 新包的脚手架，零外部依赖，脚本位于 `scripts/generators/`：

```bash
pnpm gen component ProTable --title "高级表格"   # 组件源码 + 文档页，并自动登记导出
pnpm gen hook useLoading                       # hooks/src/useLoading/{index.ts,index.md}
pnpm gen package icons                         # 新包，并自动补 tsconfig paths / dumi alias
pnpm gen                                       # 查看帮助
```

- 名字风格随意：`pro-table`、`ProTable`、`pro_table` 都会归一成 `ProTable`；hook 统一为 `use` 前缀驼峰（`boolean` / `use-boolean` → `useBoolean`）。
- 组件与 hook 都是「文件夹 + `index.ts` + `index.md`」结构；文档 `order` 取同级最大值 +1，默认排在最后。`group` 默认：组件 «基础»、hook «状态»，可用 `--group` 覆盖。
- 组件文档路由在 `/components/*`，hook 文档路由在 `/hooks/*`，均由 `.dumirc.ts` 的 `resolve.atomDirs` 扫描生成。
- 目标文件已存在时报错退出，确认覆盖请加 `--force`；重复执行不会产生重复导出。
