/* eslint-disable jsdoc/no-missing-syntax */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { minify } from "terser";

const sourcePath = "index.js";

await mkdir("dist", { recursive: true });

const source = await readFile(sourcePath, "utf8");
const { code } = await minify(source, {
  compress: {
    passes: 2,
  },
  format: {
    comments: false,
  },
  mangle: true,
});

if (code == null) {
  throw new Error("Terser did not return minified code.");
}

await writeFile("dist/create_vg_stub.js", source);
await writeFile("dist/create_vg_stub.min.js", code);
