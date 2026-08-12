/** Produces the scoped minified program used by MediaWiki artifacts. */

import { minify } from "terser";
import { bundleSource } from "./bundle.ts";
import type { GadgetBuildPlan } from "./types.ts";

/** Bundles and minifies one gadget for on-wiki publication. */
export async function createMinifiedBundle(
    plan: GadgetBuildPlan,
): Promise<string> {
    const source = await bundleSource(plan, { minifyText: true });
    const result = await minify(source, {
        ecma: 2024,
        compress: { ecma: 2024, passes: 2 },
        format: { comments: false, ecma: 2024 },
        mangle: true,
    });
    if (result.code == null) {
        throw new Error("Terser did not return minified code.");
    }
    return wrapModernGadgetProgram(result.code, plan.config.globalName);
}

/** Places strict mode and a modern binding inside an async IIFE. */
function wrapModernGadgetProgram(source: string, globalName: string): string {
    const strictDirective = `"use strict";`;
    const unscopedSource = source.startsWith(strictDirective)
        ? source.slice(strictDirective.length)
        : source;
    const generatedPrefix = `var ${globalName}=`;
    if (!unscopedSource.startsWith(generatedPrefix)) {
        throw new Error("Minified bundle did not use the expected IIFE form.");
    }
    const bundleExpression = unscopedSource.slice(generatedPrefix.length);
    return (
        `(async function(){"use strict";const ${globalName}=` +
        `${bundleExpression}})();`
    );
}
