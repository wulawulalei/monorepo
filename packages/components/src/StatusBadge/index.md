---
title: StatusBadge 状态徽标
group:
  title: 数据展示
  order: 2
order: 1
---

## 何时使用

用于展示任务、服务或数据的当前状态，默认提供中文状态文案。

## 代码演示

```tsx
import React from 'react';
import { AntdProvider, StatusBadge } from '@xzy18/components';

export default () => (
  <AntdProvider>
    <StatusBadge status="success" />
    <StatusBadge status="processing" />
    <StatusBadge status="warning" text="待确认" />
    <StatusBadge status="error" />
    <StatusBadge status="default" />
  </AntdProvider>
);
```

## API

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `status` | 状态类型 | `'success' \| 'processing' \| 'default' \| 'error' \| 'warning'` | - |
| `text` | 状态文案，传空字符串时不显示 | `ReactNode` | 对应状态的中文默认文案 |

其余属性透传给 antd 的 <a href="https://ant.design/components/badge-cn" target="_blank" rel="noreferrer">Badge</a>。
