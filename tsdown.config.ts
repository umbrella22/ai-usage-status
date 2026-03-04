import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/extension.ts"],
  format: "cjs",
  outDir: "dist",
  clean: true,
  sourcemap: false,
  minify: true,
  external: ["vscode"],
  platform: "node",
  target: "node18",
});
