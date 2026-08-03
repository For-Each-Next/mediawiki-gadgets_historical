/** Builds one userscript containing every workspace gadget. */

import { buildAllUserscript } from "./index.ts";

await buildAllUserscript(process.cwd());
