/** Builds aggregate source from an already validated workspace plan. */

import {
    createAggregateMetadata,
    resolveAggregateConfig,
    uniqueSorted,
} from "./aggregate-config.ts";
import {
    planAggregateOutput,
    prepareAggregateOutput,
    writeAggregateOutput,
} from "./aggregate-output.ts";
import { buildAggregatePrograms } from "./aggregate-programs.ts";
import type { WorkspaceBuildPlan } from "./types.ts";
import type { OutputCleanupPlan } from "./retired-output.ts";
import { formatAllUserscript } from "./userscript.ts";

/** Formats and writes an aggregate from a workspace plan. */
export async function buildPlannedAggregate(
    plan: WorkspaceBuildPlan,
): Promise<string> {
    const userscript = await generatePlannedAggregate(plan);
    return writePlannedAggregate(plan, userscript);
}

/** Generates the aggregate payload without mutating build output. */
export async function generatePlannedAggregate(
    plan: WorkspaceBuildPlan,
): Promise<string> {
    const config = resolveAggregateConfig(plan.gadgets);
    const programs = await buildAggregatePrograms(plan.gadgets);
    const metadata = createAggregateMetadata(plan.gadgets, plan.context.now);
    const notices = uniqueSorted(
        plan.gadgets.flatMap((gadget) => gadget.notices),
    );
    return formatAllUserscript(programs, metadata, config, notices);
}

/** Cleans aggregate paths and writes an already generated payload. */
export async function writePlannedAggregate(
    plan: WorkspaceBuildPlan,
    userscript: string,
    cleanupPlan?: OutputCleanupPlan,
): Promise<string> {
    const cleanup =
        cleanupPlan ?? (await planAggregateOutput(plan.outputRoot));
    await prepareAggregateOutput(plan.outputRoot, cleanup);
    return writeAggregateOutput(plan.outputRoot, userscript);
}
