/** Bundles gadget programs for the aggregate userscript. */

import { getPlanMatches } from "./aggregate-config.ts";
import { bundleSource } from "./bundle.ts";
import type { GadgetBuildPlan, UserscriptProgram } from "./types.ts";

/** Bundles packages separately to retain package-scoped defines. */
export async function buildAggregatePrograms(
    plans: GadgetBuildPlan[],
): Promise<UserscriptProgram[]> {
    const sources = await Promise.all(plans.map((plan) => bundleSource(plan)));
    return plans.map((plan, index) => ({
        matches: getPlanMatches(plan),
        name: plan.metadata.name,
        source: sources[index]!,
    }));
}
