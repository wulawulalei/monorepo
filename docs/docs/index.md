---
title: 快速开始
order: 2

toc: content
---

## MaterialComponents

MaterialComponents 是基于 Ant Design 而开发的物料组件。这里后面添加

## 安装

当前 MaterialComponents 每一个组件都是一个独立的包，你需要在你的项目中安装对应的 npm 包并使用。

```shell
$ pnpm i @xzy18/xzy-materials --save
```

当前 MaterialComponents 提供了如下组件可直接使用：

- `npm i @xzy18/xzy-materials --save`

## 在项目中使用

每一个包都是一个独立的组件包，使用示例如下 ：

```tsx | pure
import React from "react";
import { ProForm, ProFormText } from "@xdf/xzy-materials";

export default () => {
  return (
    <ProForm
      onFinish={async (values) => {
        console.log(values);
      }}
    >
      <ProFormText name="name" label="姓名" />
    </ProForm>
  );
};
```
