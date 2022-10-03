import type { RollupOptions } from "rollup";
import typescript from "@rollup/plugin-typescript";

const config: RollupOptions = {
  input: "./src/graph.ts",
  output: [
    {
      file: "build/index.cjs",
      format: "cjs",
    },
    {
      file: "build/index.js",
      format: "esm",
    },
  ],
  plugins: [typescript()],
};

export default config;
