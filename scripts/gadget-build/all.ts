/** Builds one installable userscript from every workspace gadget. */

import { buildPlannedAggregate } from "./aggregate-build.ts";
import { loadWorkspaceBuildPlan } from "./build-plan.ts";

/** Builds the aggregate userscript from every gadget source package. */
export async function buildAllUserscript(
    workspaceRoot: string,
    now: Date = new Date(),
): Promise<void> {
    const plan = await loadWorkspaceBuildPlan(workspaceRoot, { now });
    await buildPlannedAggregate(plan);
}
