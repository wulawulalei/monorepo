---
title: useDebouncedValue
group:
  title: 状态
  order: 1
order: 2
---

## 何时使用

需要在值停止变化一段时间后再执行搜索、校验或派生计算时使用。

## 代码演示

```tsx
import React, { useState } from "react";
import { useDebouncedValue } from "@xzy18/material-components";

export default () => {
  const [value, setValue] = useState("");
  const debouncedValue = useDebouncedValue(value, 500);

  return (
    <div>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="请输入内容"
      />
      <p>输入值：{value}</p>
      <p>防抖值：{debouncedValue}</p>
    </div>
  );
};
```

## API

```ts
const debouncedValue = useDebouncedValue(value, delay);
```

### 参数

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| value | 需要防抖的值 | `T` | - |
| delay | 延迟时间，单位为毫秒 | `number` | `200` |

### 返回值

| 返回值 | 说明 | 类型 |
| --- | --- | --- |
| debouncedValue | 延迟更新后的值 | `T` |
