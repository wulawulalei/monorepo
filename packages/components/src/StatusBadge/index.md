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
    <StatusBadge status="success" text="已完成" showDot={false} />
  </AntdProvider>
);
```

## API

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `status` | 状态类型 | `'success' \| 'processing' \| 'default' \| 'error' \| 'warning'` | - |
| `text` | 状态文案，传空字符串时不显示 | `ReactNode` | 对应状态的中文默认文案 |
| `showDot` | 是否显示状态圆点；关闭后渲染为状态色标签 | `boolean` | `true` |
| `color` | 自定义状态色 | `string` | 与 `status` 相同 |

通用的 `className`、`style`、`title` 与事件属性会透传给根元素。
