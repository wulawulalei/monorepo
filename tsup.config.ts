import { defineConfig } from "tsup";
import type { Plugin } from "esbuild";
import fs from "fs";
import path from "path";

function getPeerExternals(): string[] {
  try {
    const pkgPath = path.resolve(process.cwd(), "package.json");
    const raw = fs.readFileSync(pkgPath, "utf-8");
    const pkg = JSON.parse(raw) as {
      peerDependencies?: Record<string, string>;
    };
    return Object.keys(pkg.peerDependencies || {});
  } catch {
    return [];
  }
}

export default defineConfig(() => {
  const external = getPeerExternals();
  const ignoreMdPlugin: Plugin = {
    name: "ignore-md",
    setup(build) {
      build.onResolve({ filter: /\.md$/ }, (args) => {
        return { path: args.path, namespace: "ignore-md" };
      });
      build.onLoad({ filter: /.*/, namespace: "ignore-md" }, () => {
        return { contents: 'export default ""', loader: "js" };
      });
    },
  };
  return {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    splitting: false,
    external,
    tsconfig: path.resolve(__dirname, "tsconfig.json"),
    esbuildPlugins: [ignoreMdPlugin],
  };
});
