/** Builds every distributable from one shared workspace plan. */

import { lstat, realpath } from "node:fs/promises";
import { dirname, parse, relative, resolve } from "node:path";
import { hasErrorCode } from "#workspace/metadata";
import { isOutsideRoot } from "#workspace/paths";
import {
    generatePlannedAggregate,
    writePlannedAggregate,
} from "./aggregate-build.ts";
import { planAggregateOutput } from "./aggregate-output.ts";
import { assertUniqueArtifactClaims } from "./artifacts.ts";
import { loadWorkspaceBuildPlan } from "./build-plan.ts";
import { generatePlannedGadget, writePlannedGadget } from "./build.ts";
import { planIndividualOutput } from "./individual-output.ts";
import type { OutputCleanupPlan } from "./retired-output.ts";
import type {
    BuildContextOptions,
    WorkspaceBuildPlan,
    WorkspaceBuildResult,
} from "./types.ts";

/** Builds all artifacts with one fixed context. */
export async function buildWorkspaceArtifacts(
    workspaceRoot: string,
    options: BuildContextOptions = {},
): Promise<WorkspaceBuildResult> {
    const plan = await loadWorkspaceBuildPlan(workspaceRoot, options);
    await assertSafeOutputRoot(plan);
    assertUniqueArtifactClaims(
        plan.gadgets.map((gadget) => ({
            outputName: gadget.config.outputName,
            owner: gadget.metadata.name,
        })),
    );
    const cleanup = await planWorkspaceCleanup(plan);
    const gadgetOutputs: string[] = [];
    for (const gadget of plan.gadgets) {
        gadgetOutputs.push(await generatePlannedGadget(gadget));
    }
    const aggregateOutput = await generatePlannedAggregate(plan);

    const artifactPaths: string[] = [];
    for (const [index, gadget] of plan.gadgets.entries()) {
        artifactPaths.push(
            await writePlannedGadget(
                gadget,
                plan.outputRoot,
                gadgetOutputs[index]!,
                cleanup.gadgets[index],
            ),
        );
    }
    artifactPaths.push(
        await writePlannedAggregate(plan, aggregateOutput, cleanup.aggregate),
    );
    return { artifactPaths, outputRoot: plan.outputRoot };
}

/** Validates every cleanup target before the first output mutation. */
async function planWorkspaceCleanup(plan: WorkspaceBuildPlan): Promise<{
    aggregate: OutputCleanupPlan;
    gadgets: OutputCleanupPlan[];
}> {
    const gadgets: OutputCleanupPlan[] = [];
    for (const gadget of plan.gadgets) {
        gadgets.push(await planIndividualOutput(gadget, plan.outputRoot));
    }
    return {
        aggregate: await planAggregateOutput(plan.outputRoot),
        gadgets,
    };
}

/** Rejects broad roots that are unsafe for owned-output cleanup. */
async function assertSafeOutputRoot(plan: WorkspaceBuildPlan): Promise<void> {
    const outputRoot = resolve(plan.outputRoot);
    const workspaceRoot = resolve(plan.workspaceRoot);
    const distRoot = resolve(workspaceRoot, "dist");
    const insideWorkspace = isInsideRoot(workspaceRoot, outputRoot);
    const insideDist = isInsideRoot(distRoot, outputRoot);
    const containsWorkspace = isInsideRoot(outputRoot, workspaceRoot);
    if (
        outputRoot === parse(outputRoot).root ||
        containsWorkspace ||
        (insideWorkspace && !insideDist)
    ) {
        throwUnsafeOutputRoot();
    }
    if (outputRoot !== distRoot && (await pathExists(outputRoot))) {
        throw new Error(
            "A custom workspace output directory must not already exist.",
        );
    }
    await assertRealOutputContainment(workspaceRoot, distRoot, outputRoot);
}

/** Rejects paths resolving into protected workspace source. */
async function assertRealOutputContainment(
    workspaceRoot: string,
    distRoot: string,
    outputRoot: string,
): Promise<void> {
    const existingAncestor = await findExistingAncestor(outputRoot);
    const [realWorkspace, realAncestor] = await Promise.all([
        realpath(workspaceRoot),
        realpath(existingAncestor),
    ]);
    const expectedRealDist = resolve(
        realWorkspace,
        relative(workspaceRoot, distRoot),
    );
    const suffix = relative(existingAncestor, outputRoot);
    const realOutput = resolve(realAncestor, suffix);
    const lexicalInsideWorkspace = isInsideRoot(workspaceRoot, outputRoot);
    const realInsideWorkspace = isInsideRoot(realWorkspace, realOutput);
    const realInsideDist = isInsideRoot(expectedRealDist, realOutput);
    if (
        (lexicalInsideWorkspace && !realInsideDist) ||
        (!lexicalInsideWorkspace && realInsideWorkspace)
    ) {
        throwUnsafeOutputRoot();
    }
}

/** Checks whether a target remains within a root path. */
function isInsideRoot(root: string, target: string): boolean {
    return !isOutsideRoot(relative(root, target));
}

/** Finds the nearest existing ancestor of a new output path. */
async function findExistingAncestor(path: string): Promise<string> {
    let candidate = path;
    while (!(await pathExists(candidate))) {
        const parent = dirname(candidate);
        if (parent === candidate) {
            return candidate;
        }
        candidate = parent;
    }
    return candidate;
}

/** Throws the shared unsafe-output diagnostic. */
function throwUnsafeOutputRoot(): never {
    throw new Error("Workspace build output must use an isolated directory.");
}

/** Checks whether an output path already has a filesystem entry. */
async function pathExists(path: string): Promise<boolean> {
    try {
        await lstat(path);
        return true;
    } catch (error) {
        if (hasErrorCode(error, "ENOENT")) {
            return false;
        }
        throw error;
    }
}
