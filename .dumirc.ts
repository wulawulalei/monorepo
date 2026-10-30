import { defineConfig } from "dumi";
import { resolve } from "path";

export default defineConfig({
  themeConfig: {
    name: "许哈哈",
    footer: false,
    nav: [
      { title: "首页", link: "/" },
      { title: "文档", link: "/docs" },
      { title: "组件", link: "/components" },
      { title: "Hooks", link: "/hooks" },
    ],
  },
  outputPath: "docs-dist",
  exportStatic: {},
  base: "/monorepo/",
  publicPath: "/monorepo/",
  resolve: {
    // type 会经 pluralize 变成路由前缀：component -> /components，hook -> /hooks
    atomDirs: [
      { type: "component", dir: "packages/components/src" },
      { type: "hook", dir: "packages/hooks/src" },
    ],
  },
  extraRemarkPlugins: [
    () => {
      return (_tree: any, file: any) => {
        // ensure frontmatter exists
        file.data = file.data || {};
        file.data.frontmatter = file.data.frontmatter || {};
        // force toc to 'content' for all pages
        file.data.frontmatter.toc = "content";
      };
    },
  ],
  alias: {
    "@xzy18/components": resolve(__dirname, "packages/components/src"),
    "@xzy18/hooks": resolve(__dirname, "packages/hooks/src"),
    "@xzy18/utils": resolve(__dirname, "packages/utils/src"),
    "@xzy18/material-components": resolve(
      __dirname,
      "packages/material-components/src",
    ),
  },
});
