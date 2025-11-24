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
      { title: "学习文档", link: "/study" },
    ],
  },
  outputPath: "docs-dist",
  exportStatic: {},
  base: "/",
  publicPath: "/",
  resolve: {
    atomDirs: [{ type: "component", dir: "packages/components/src" }],
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
    "@xzy/components": resolve(__dirname, "packages/components/src"),
    "@xzy/hooks": resolve(__dirname, "packages/hooks/src"),
    "@xzy/utils": resolve(__dirname, "packages/utils/src"),
  },
});
