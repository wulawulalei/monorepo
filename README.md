## DFZX Component Library Monorepo

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
