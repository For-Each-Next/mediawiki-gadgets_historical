/** Coordinates project-level repository validation. */

import {
    inspectWorkspacePackages,
    isGadgetPackage,
} from "../workspace/index.ts";
import { checkLicensing } from "./licensing.ts";
import { checkWorkspaceLockfile } from "./lockfile.ts";
import { checkMarkdownLines } from "./markdown.ts";
import { checkDiscoveredGadgetPackages } from "./packages.ts";
import { checkSourceBoundaries } from "./source-boundaries.ts";
import { checkToolingOutputs } from "./tooling-outputs.ts";

export interface RepositoryCheckResult {
    gadgetCount: number;
    markdownFileCount: number;
    problems: string[];
    sourceFileCount: number;
}

/** Runs all checks over one shared discovery model. */
export async function checkRepository(
    workspaceRoot: string,
): Promise<RepositoryCheckResult> {
    const discovery = await inspectWorkspacePackages(workspaceRoot);
    const gadgets = discovery.packages.filter(isGadgetPackage);
    const [packageResult, boundaries, markdown, licensing, lockfile, outputs] =
        await Promise.all([
            checkDiscoveredGadgetPackages(workspaceRoot, discovery, {
                checkCurrentLicenseMaps: false,
                includeDiscoveryProblems: false,
            }),
            checkSourceBoundaries(workspaceRoot, discovery),
            checkMarkdownLines(workspaceRoot),
            checkLicensing(workspaceRoot, gadgets),
            checkWorkspaceLockfile(workspaceRoot, discovery.packages),
            checkToolingOutputs(workspaceRoot),
        ]);
    return {
        gadgetCount: packageResult.gadgetCount,
        markdownFileCount: markdown.checkedCount,
        problems: [
            ...discovery.problems,
            ...packageResult.problems,
            ...boundaries.problems,
            ...markdown.problems,
            ...licensing,
            ...lockfile,
            ...outputs,
        ],
        sourceFileCount: boundaries.fileCount,
    };
}
