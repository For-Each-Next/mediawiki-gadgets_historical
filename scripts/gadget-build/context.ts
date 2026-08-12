/** Resolves deterministic inputs shared by one build operation. */

import { resolve } from "node:path";
import type { BuildContext, BuildContextOptions } from "./types.ts";

/**
 * Freezes caller-controlled inputs for a complete build.
 *
 * @param options - Optional deterministic build inputs.
 * @returns A validated, immutable-by-convention build context.
 */
export function createBuildContext(
    options: BuildContextOptions = {},
): BuildContext {
    const now = new Date(options.now?.getTime() ?? Date.now());
    if (Number.isNaN(now.getTime())) {
        throw new TypeError("Build time must be a valid Date.");
    }
    return {
        buildTime: now.toISOString(),
        now,
        ...(options.outputRoot == null
            ? {}
            : { outputRoot: resolve(options.outputRoot) }),
    };
}
