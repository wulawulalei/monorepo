'use strict';

// 以下类型只描述脚本实际使用到的字段，避免额外安装 GitHub API 类型依赖。
interface CommitRecord {
  sha: string;
  commit: {
    message: string;
  };
}

interface ChangedFile {
  filename: string;
}

interface PullRequestRecord {
  number: number;
  html_url: string;
  body: string | null;
}

interface CompareResult {
  ahead_by: number;
  commits: CommitRecord[];
  files?: ChangedFile[];
}

interface GitHubClient {
  rest: {
    pulls: {
      list(params: Record<string, unknown>): Promise<{
        data: PullRequestRecord[];
      }>;
      update(params: Record<string, unknown>): Promise<unknown>;
      create(params: Record<string, unknown>): Promise<{
        data: PullRequestRecord;
      }>;
    };
    repos: {
      compareCommits(params: Record<string, unknown>): Promise<{
        data: CompareResult;
      }>;
    };
  };
}

interface ScriptContext {
  repo: {
    owner: string;
    repo: string;
  };
  ref: string;
}

interface ScriptCore {
  info(message: string): void;
  error(message: string): void;
  setFailed(message: string): void;
}

interface SyncOptions {
  github: GitHubClient;
  context: ScriptContext;
  core: ScriptCore;
}

// 自动 PR 使用固定标记识别，避免每次运行都产生无意义的描述差异。
const BODY_START_MARKER = '<!-- auto-create-pr:start -->';
const BODY_END_MARKER = '<!-- auto-create-pr:end -->';
const LEGACY_BODY_MARKER_PATTERN = /<!-- auto-create-pr:\d+ -->/;
const DEFAULT_TITLE = 'chore: 更新分支 {head}';
const MAX_TITLE_LENGTH = 256;
const PACKAGE_SCOPES = [
  { label: '`@xzy18/components`', path: 'packages/components/' },
  { label: '`@xzy18/hooks`', path: 'packages/hooks/' },
  { label: '`@xzy18/utils`', path: 'packages/utils/' },
  {
    label: '`@xzy18/material-components`',
    path: 'packages/material-components/',
  },
  { label: '`@xzy18/config`', path: 'packages/config/' },
];

// 提交主题可能为空或过长，统一转换为 GitHub 可接受的 PR 标题。
function normalizeTitle(message: string | undefined, head: string): string {
  const title = message?.split('\n')[0].trim();
  const fallback = DEFAULT_TITLE.replace('{head}', head);
  return (title || fallback).slice(0, MAX_TITLE_LENGTH);
}

// 提取单行提交主题，避免多行提交信息破坏 Markdown 列表。
function formatCommit(commit: CommitRecord): string {
  const message = commit.commit.message.split('\n')[0].trim() || '无提交主题';
  return `- ${message} (${commit.sha.slice(0, 7)})`;
}

// 生成自动维护的描述区块，区块之外的 PR 描述由人工自由维护。
function renderManagedBody({
  head,
  commits,
  changedFiles,
}: {
  head: string;
  commits: CommitRecord[];
  changedFiles: ChangedFile[];
}): string {
  let hasPackageChange = false;
  const impact = PACKAGE_SCOPES.map(({ label, path }) => {
    const count = changedFiles.filter((file) =>
      file.filename.startsWith(path),
    ).length;
    hasPackageChange ||= count > 0;
    const detail = count > 0 ? `（${count} 个文件）` : '';
    return `- [${count > 0 ? 'x' : ' '}] ${label}${detail}`;
  });

  impact.push(`- [${hasPackageChange ? ' ' : 'x'}] 仅文档、构建或仓库配置`);

  const changes = commits.map(formatCommit).join('\n');

  return [
    BODY_START_MARKER,
    '## 变更说明',
    '',
    `本 PR 由分支 \`${head}\` 的提交自动创建并保持更新。`,
    '',
    '## 提交内容',
    '',
    changes || '- 暂无提交',
    '',
    '## 影响范围',
    '',
    ...impact,
    '',
    '## 检查清单',
    '',
    '- [ ] 已补充或更新测试',
    '- [ ] 已创建对应的 changeset；无需发布时已说明原因',
    '- [ ] 本地已运行 `pnpm verify`',
    '- [ ] 文档与公开 API 变更保持同步',
    BODY_END_MARKER,
  ].join('\n');
}

// 只维护带自动标记的描述；人工 PR 返回 null，避免覆盖人工内容。
function mergeManagedBody(
  previousBody: string | null,
  managedBody: string,
): string | null {
  if (!previousBody) {
    return null;
  }

  const start = previousBody.indexOf(BODY_START_MARKER);
  const end =
    start === -1
      ? -1
      : previousBody.indexOf(BODY_END_MARKER, start + BODY_START_MARKER.length);

  if (start !== -1 && end !== -1) {
    return `${previousBody.slice(0, start)}${managedBody}${previousBody.slice(
      end + BODY_END_MARKER.length,
    )}`;
  }

  // 结束标记缺失时只重建开始标记之后的内容，保留人工写在前面说明。
  if (start !== -1) {
    return `${previousBody.slice(0, start)}${managedBody}`;
  }

  if (LEGACY_BODY_MARKER_PATTERN.test(previousBody)) {
    return managedBody;
  }

  return null;
}

async function syncPullRequest({
  github,
  context,
  core,
}: SyncOptions): Promise<void> {
  const base = 'master';
  const head = context.ref.replace(/^refs\/heads\//, '');

  const { data: existing } = await github.rest.pulls.list({
    owner: context.repo.owner,
    repo: context.repo.repo,
    state: 'open',
    base,
    head: `${context.repo.owner}:${head}`,
  });

  const { data: comparison } = await github.rest.repos.compareCommits({
    owner: context.repo.owner,
    repo: context.repo.repo,
    base,
    head,
  });

  if (comparison.ahead_by === 0) {
    core.info(`分支 ${head} 相对 ${base} 没有新提交，跳过 PR 同步。`);
    return;
  }

  const commits = [...comparison.commits].reverse();
  const changedFiles = comparison.files || [];
  const managedBody = renderManagedBody({ head, commits, changedFiles });

  if (existing.length > 0) {
    const pullRequest = existing[0];
    const body = mergeManagedBody(pullRequest.body, managedBody);

    if (body !== null && body !== pullRequest.body) {
      await github.rest.pulls.update({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: pullRequest.number,
        body,
      });
    } else {
      core.info(`PR #${pullRequest.number} 不是自动生成的描述，已保留原内容。`);
    }

    core.info(`已更新 PR：#${pullRequest.number} ${pullRequest.html_url}`);
    return;
  }

  const title = normalizeTitle(commits[0]?.commit.message, head);

  try {
    const { data: pullRequest } = await github.rest.pulls.create({
      owner: context.repo.owner,
      repo: context.repo.repo,
      base,
      head,
      title,
      body: managedBody,
    });

    core.info(`已创建 PR：#${pullRequest.number} ${pullRequest.html_url}`);
  } catch (error) {
    const status =
      typeof error === 'object' && error !== null && 'status' in error
        ? error.status
        : undefined;
    const message = error instanceof Error ? error.message : String(error);

    core.error(`创建 PR 失败：status=${status}；${message}`);
    if (status === 403) {
      core.setFailed(
        '创建 PR 被拒绝，请在仓库 Actions 设置中允许 GitHub Actions 创建 Pull Request。',
      );
      return;
    }
    throw error;
  }
}

module.exports = syncPullRequest;
