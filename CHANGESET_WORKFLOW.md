# Changesets 完整工作流指南

本文档提供了在monorepo项目中使用Changesets进行版本管理和发布的完整工作流程。

## 已配置的包和工具

1. `@changesets/cli` - 核心命令行工具
2. `@changesets/git` - Git操作集成
3. `@changesets/changelog-git` - 基于Git提交生成变更日志

## 完整工作流程

### 1. 添加新的变更记录

```bash
# 交互式创建变更记录
pnpm changeset
```

在交互式界面中：
- 选择需要更新的包
- 为每个包选择版本更新类型（patch/minor/major）
- 编写变更描述

### 2. 更新版本号并创建Git标签

```bash
# 更新版本号并创建Git提交和标签
pnpm version-and-tag
```

这个命令会：
- 执行`changeset version`更新版本号
- 提交版本更新的文件
- 创建一个基于根项目版本的Git标签

### 3. 构建项目

```bash
# 构建所有包
pnpm build
```

### 4. 发布到npm

```bash
# 发布到npm
pnpm release
```

### 5. 推送Git变更

```bash
# 推送提交和标签到远程仓库
git push origin main --tags
```


## 注意事项

1. 确保已登录npm账户：`npm login`
2. 确保包在`package.json`中的`access`字段设置为正确的值
3. 发布前检查`.changeset/config.json`中的配置
4. 对于重要版本更新，建议先创建changeset并审核后再执行版本更新和发布

## 自动化工作流

在CI/CD环境中，可以组合使用这些命令来自动化发布流程，但建议在关键步骤添加人工审核。