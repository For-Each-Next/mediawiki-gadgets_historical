/**
 * Runs one gadget build from the current workspace package.
 */

import { buildGadget } from "./gadget-build/build.ts";

await buildGadget(process.cwd());
