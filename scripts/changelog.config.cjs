'use strict';

// conventionalcommits 预设默认按 scope + subject 排每个分节内的 commit。这里覆盖
// 它，改成按提交时间从新到旧排。同时额外保留完整的提交时间戳用于排序，因为核心的
// transform 会把 committerDate 截断成只剩年月日，精度不够。
module.exports = {
  gitRawCommitsOpts: {
    // 在原格式末尾追加 %ct（UNIX 秒级提交时间），parser 按 -字段名- 规则把它读成
    // committerTimestamp，而核心的 transform 只会动 committerDate、不会动这个字段。
    format:
      '%B%n-hash-%n%H%n-gitTags-%n%d%n-committerDate-%n%ci%n-committerTimestamp-%n%ct',
  },
  writerOpts: {
    // 分节内按提交时间倒序（最近的在前）；缺字段时按 0 兜底。
    commitsSort: (a, b) => {
      const timeA = Number(a.committerTimestamp) || 0;
      const timeB = Number(b.committerTimestamp) || 0;
      return timeB - timeA;
    },
  },
};
