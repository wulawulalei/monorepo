---
title: useBoolean
group:
  title: 状态
  order: 1
order: 1
---

## 何时使用

管理布尔状态（开关、显隐、加载中……）时使用，省去在业务里反复写 `setState(true / false)`。

## 代码演示

```tsx
import React from "react";
import { useBoolean } from "@xzy18/hooks";

export default () => {
  const { value, setTrue, setFalse, toggle } = useBoolean(false);

  return (
    <div>
      <p>当前值：{String(value)}</p>
      <button onClick={toggle}>toggle</button>
      <button onClick={setTrue}>setTrue</button>
      <button onClick={setFalse}>setFalse</button>
    </div>
  );
};
```

## API

```ts
const { value, setTrue, setFalse, toggle, setValue } = useBoolean(initial);
```

### 参数

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| initial | 初始值 | `boolean` | `false` |

### 返回值

| 返回值 | 说明 | 类型 |
| --- | --- | --- |
| value | 当前布尔值 | `boolean` |
| setTrue | 置为 `true` | `() => void` |
| setFalse | 置为 `false` | `() => void` |
| toggle | 取反 | `() => void` |
| setValue | 直接设置 | `Dispatch<SetStateAction<boolean>>` |
