import type { RollupOptions } from "rollup";
import typescript from "@rollup/plugin-typescript";

const config: RollupOptions = {
  input: "./src/index.ts",
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
  plugins: [
    typescript({ exclude: ["build", "**/*.test.ts", "rollup.config.ts"] }),
  ],
};

export default config;
