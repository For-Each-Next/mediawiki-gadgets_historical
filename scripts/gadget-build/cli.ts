/**
 * Runs one gadget build from the current workspace package.
 */

import { buildGadget } from "./index.ts";

await buildGadget(process.cwd());
