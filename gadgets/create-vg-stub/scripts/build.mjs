import { mkdir, readFile, writeFile } from "node:fs/promises";

const sourcePath = "index.js";

await mkdir("dist", { recursive: true });

const source = await readFile(sourcePath, "utf8");

await writeFile("dist/create_vg_stub.js", source);
await writeFile("dist/create_vg_stub.min.js", source.trim());
