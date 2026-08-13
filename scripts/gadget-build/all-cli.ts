/** Builds one userscript containing every workspace gadget. */

import { buildAllUserscript } from "./all.ts";

await buildAllUserscript(process.cwd());
