---
title: ts
# group:
#   title: 基础
#   order: 1
order: 4
---

## TypeScript

1. TypeScript 是 JavaScript 的超集。
2. 它对 JS 进行了扩展，向 JS 中引入了类型的概念，并添加了许多新的特性。
3. TS 代码需要通过编译器编译为 JS，然后再交由 JS 解析器执行。
4. TS 完全兼容 JS，换言之，任何的 JS 代码都可以直接当成 JS 使用。
5. 相较于 JS 而言，TS 拥有了静态类型，更加严格的语法，更强大的功能；TS 可以在代码执行前就完成代码的检查，减小了运行时异常的出现的几率；TS 代码可以编译为任意版本的 JS 代码，可有效解决不同 JS 运行环境的兼容问题；同样的功能，TS 的代码量要大于 JS，但由于 TS 的代码结构更加清晰，变量类型更加明确，在后期代码的维护中 TS 却远远胜于 JS。

## 类型声明

```
let 变量: 类型;

let 变量: 类型 = 值;

function fn(参数: 类型, 参数: 类型): 类型{
    ...
}
在属性名后面加?表示属性是可选的
[propName: string]: any 表示任意类型的属性
```

- 类型

  |  类型   |       例子        |              描述               |
  | :-----: | :---------------: | :-----------------------------: |
  | number  |    1, -33, 2.5    |            任意数字             |
  | string  | 'hi', "hi", `hi`  |           任意字符串            |
  | boolean |    true、false    |      布尔值 true 或 false       |
  | 字面量  |      其本身       |  限制变量的值就是该字面量的值   |
  |   any   |        \*         |            任意类型             |
  | unknown |        \*         |         类型安全的 any          |
  |  void   | 空值（undefined） |   没有返回值（或 undefined）    |
  |  never  |      没有值       |   不能是任何值，主要用来报错    |
  | object  |  {name:'孙悟空'}  |         任意的 JS 对象          |
  |  array  |      [1,2,3]      |          任意 JS 数组           |
  |  tuple  |       [4,5]       | 元素，TS 新增类型，固定长度数组 |
  |  enum   |    enum{A, B}     |       枚举，TS 中新增类型       |

  unkown 类型的值也不能将值赋给 any 和 unkown 之外的类型变量

  变量没有声明类型默认为 any

  断言：手动指定一个值的类型（值 as 类型 /<类型>值）

  ## 枚举

  枚举一旦定义就不可改变

  1. 数字枚举

  ```
  enum device {
      phone,
      notebook,
      desktop
  }
  console.log(device.phone) // 0，1，2
  ```

  - 只要定义了枚举对象，默认不赋值，那么当前的枚举对象里面第一个的值从 0 开始一次递增

  - 枚举递增只会看当前值的前一个枚举成员是否有值，有的话后面一次递增
  - 数字枚举存在反向映射，也就是 key 和 value 可以相互访问

## 编译

- 使用 tsc 对 ts 文件进行编译：tsc xxx.ts
- 自动编译 ts 文件： tsc xxx.ts -w

- 自动编译整个项目的 ts 文件

  - 如果直接使用 tsc 指令，则可以自动将当前项目下的所有 ts 文件编译为 js 文件。

  - 但是能直接使用 tsc 命令的前提时，要先在项目根目录下创建一个 ts 的配置文件 tsconfig.json

  - tsconfig.json 是一个 JSON 文件，添加配置文件后，只需 tsc 命令即可完成对整个项目的编译

  - 路径：\*\*表示任意目录

    \*表示任意文件

- 配置选项

  - include

    - 定义希望被编译文件所在的目录

    - 默认值：["\*\*/\*"]

    - 示例：

      - ```json
        "include":["src/**/*", "tests/**/*"]
        ```

      - 上述示例中，所有 src 目录和 tests 目录下的文件都会被编译

  - exclude

    - 定义需要排除在外的目录

    - 默认值：["node_modules", "bower_components", "jspm_packages"]

    - 示例：

      - ```json
        "exclude": ["./src/hello/**/*"]
        ```

      - 上述示例中，src 下 hello 目录下的文件都不会被编译

  - extends

    - 定义被继承的配置文件

    - 示例：

      - ```json
        "extends": "./configs/base"
        ```

      - 上述示例中，当前配置文件中会自动包含 config 目录下 base.json 中的所有配置信息

  - files

    - 指定被编译文件的列表，只有需要编译的文件少时才会用到

    - 示例：

      - ```json
        "files": [
            "core.ts",
            "sys.ts",
            "types.ts",
            "scanner.ts",
            "parser.ts",
            "utilities.ts",
            "binder.ts",
            "checker.ts",
            "tsc.ts"
          ]
        ```

      - 列表中的文件都会被 TS 编译器所编译

    - compilerOptions

      - 编译选项是配置文件中非常重要也比较复杂的配置选项

      - 在 compilerOptions 中包含多个子选项，用来完成对编译的配置

        - 项目选项

          - target

            - 设置 ts 代码编译的目标版本

            - 可选值：

              - ES3（默认）、ES5、ES6/ES2015、ES7/ES2016、ES2017、ES2018、ES2019、ES2020、ESNext

            - 示例：

              - ```json
                "compilerOptions": {
                    "target": "ES6"
                }
                ```

              - 如上设置，我们所编写的 ts 代码将会被编译为 ES6 版本的 js 代码

          - lib

            - 指定代码运行时所包含的库（宿主环境）

            - 可选值：

              - ES5、ES6/ES2015、ES7/ES2016、ES2017、ES2018、ES2019、ES2020、ESNext、DOM、WebWorker、ScriptHost ......

            - 示例：

              - ```json
                "compilerOptions": {
                    "target": "ES6",
                    "lib": ["ES6", "DOM"],
                    "outDir": "dist",
                    "outFile": "dist/aa.js"
                }
                ```

          - module

            - 设置编译后代码使用的模块化系统

            - 可选值：

              - CommonJS、UMD、AMD、System、ES2020、ESNext、None

            - 示例：

              - ```typescript
                "compilerOptions": {
                    "module": "CommonJS"
                }
                ```

          - outDir

            - 编译后文件的所在目录

            - 默认情况下，编译后的 js 文件会和 ts 文件位于相同的目录，设置 outDir 后可以改变编译后文件的位置

            - 示例：

              - ```json
                "compilerOptions": {
                    "outDir": "dist"
                }
                ```

              - 设置后编译后的 js 文件将会生成到 dist 目录

          - outFile

            - 将所有的文件编译为一个 js 文件

            - 默认会将所有的编写在全局作用域中的代码合并为一个 js 文件，如果 module 制定了 None、System 或 AMD 则会将模块一起合并到文件之中

            - 示例：

              - ```json
                "compilerOptions": {
                    "outFile": "dist/app.js"
                }
                ```

          - rootDir

            - 指定代码的根目录，默认情况下编译后文件的目录结构会以最长的公共目录为根目录，通过 rootDir 可以手动指定根目录

            - 示例：

              - ```json
                "compilerOptions": {
                    "rootDir": "./src"
                }
                ```

          - allowJs

            - 是否对 js 文件编译

          - checkJs

            - 是否对 js 文件进行检查

            - 示例：

              - ```json
                "compilerOptions": {
                    "allowJs": true,
                    "checkJs": true
                }
                ```

          - removeComments

            - 是否删除注释
            - 默认值：false

          - noEmit

            - 不对代码进行编译
            - 默认值：false

          - sourceMap

            - 是否生成 sourceMap
            - 默认值：false

        - 严格检查

          - strict
            - 启用所有的严格检查，默认值为 true，设置后相当于开启了所有的严格检查
          - alwaysStrict
            - 总是以严格模式对代码进行编译
          - noImplicitAny
            - 禁止隐式的 any 类型
          - noImplicitThis
            - 禁止类型不明确的 this
          - strictBindCallApply
            - 严格检查 bind、call 和 apply 的参数列表
          - strictFunctionTypes
            - 严格检查函数的类型
          - strictNullChecks
            - 严格的空值检查
          - strictPropertyInitialization
            - 严格检查属性是否初始化

        - 额外检查

          - noFallthroughCasesInSwitch
            - 检查 switch 语句包含正确的 break
          - noImplicitReturns
            - 检查函数没有隐式的返回值
          - noUnusedLocals
            - 检查未使用的局部变量
          - noUnusedParameters
            - 检查未使用的参数

        - 高级

          - allowUnreachableCode
            - 检查不可达代码
            - 可选值：
              - true，忽略不可达代码
              - false，不可达代码将引起错误
          - noEmitOnError
            - 有错误的情况下不进行编译
            - 默认值：false

## 面向对象

- 静态属性
  - 静态属性（方法），也称为类属性。使用静态属性无需创建实例，通过类即可直接使用（Array.isArray）
  - 静态属性（方法）使用 static 开头
- 只读属性（readonly）
  - 如果在声明属性时添加一个 readonly，则属性便成了只读属性无法修改
- TS 中属性具有三种修饰符

  - public（默认值）：可以在类、子类和实例对象中修改
  - protected ：可以在类、子类中修改
  - private ：可以在类中修改

- 抽象类（abstract）

  - 抽象类是专门用来被其他类所继承的类，它只能被其他类所继承不能用来创建实例
  - 使用 abstract 开头的方法叫做抽象方法，抽象方法没有方法体只能定义在抽象类中，继承抽象类时抽象方法必须要实现

- 接口（interface）
  - 接口的作用类似于抽象类，不同点在于接口中的所有方法和属性都是没有实值的，换句话说接口中的所有方法都是抽象方法。接口主要负责定义一个类的结构，接口可以去限制一个对象的接口，对象只有包含接口中定义的所有属性和方法时才能匹配接口。同时，可以让一个类去实现接口，实现接口时类中要保护接口中的所有属性。(implements)
- 泛型
  - 定义一个函数或类时，有些情况下无法确定其中要使用的具体类型（返回值、参数、属性的类型不能确定），此时泛型便能够发挥作用。
  - 可以为类型或者接口

## 总结：

ts 的文件中如果直接书写 js 语法的代码，那么在 html 文件中直接引入 ts 文件，在谷歌的浏览器中是可以直接使用的

如果 ts 文件中有了 ts 的语法代码，那么就需要把这个 ts 文件编译成 js 文件，在 html 文件中引入 js 的文件来使用

(tsc 文件的相对路径)

ts 文件中的函数中的形参，如果使用了某个类型进行修饰，那么最终在编译的 s 文件中是没有这个类型的

ts 文件中的变量使用的是 let 进行修饰，编译的 js 文件中的修饰符就变成了 var 了
