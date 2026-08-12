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
import { checkSourcePractices } from "./source-practices.ts";
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
    const checks = await Promise.all([
        checkDiscoveredGadgetPackages(workspaceRoot, discovery, {
            checkCurrentLicenseMaps: false,
            includeDiscoveryProblems: false,
        }),
        checkSourceBoundaries(workspaceRoot, discovery),
        checkSourcePractices(workspaceRoot, discovery),
        checkMarkdownLines(workspaceRoot),
        checkLicensing(workspaceRoot, gadgets),
        checkWorkspaceLockfile(workspaceRoot, discovery.packages),
        checkToolingOutputs(workspaceRoot),
    ]);
    const [
        packageResult,
        boundaries,
        practices,
        markdown,
        licensing,
        lockfile,
        outputs,
    ] = checks;
    const problems = checks.flatMap(readProblems);
    problems.unshift(...discovery.problems);
    return {
        gadgetCount: packageResult.gadgetCount,
        markdownFileCount: markdown.checkedCount,
        problems,
        sourceFileCount: boundaries.fileCount,
    };
}

/** Reads the common problem array from one check result. */
function readProblems(result: { problems: string[] } | string[]): string[] {
    return Array.isArray(result) ? result : result.problems;
}
