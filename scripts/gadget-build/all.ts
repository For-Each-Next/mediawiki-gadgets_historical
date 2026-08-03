/** Builds one installable userscript from every workspace gadget. */

import { readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { bundleSource } from "./bundle.ts";
import { ensureBuildDirectory } from "./output.ts";
import { loadGadgetBuildPlan } from "./package.ts";
import type {
    GadgetBuildPlan,
    UserscriptConfig,
    UserscriptMetadata,
    UserscriptProgram,
} from "./types.ts";
import { formatAllUserscript } from "./userscript.ts";

const ALL_OUTPUT_DIRECTORY = "mediawiki-gadgets";
const ALL_OUTPUT_FILENAME = "mediawiki_gadgets.user.js";
const DEFAULT_GRANTS = ["none"];
const DEFAULT_MATCHES = ["*://*/*"];

/**
 * Builds the aggregate userscript from every gadget source package.
 *
 * @param workspaceRoot - Repository root containing `src/` and `dist/`.
 * @param now - Shared build timestamp source.
 */
export async function buildAllUserscript(
    workspaceRoot: string,
    now: Date = new Date(),
): Promise<void> {
    const plans = await loadWorkspaceBuildPlans(workspaceRoot, now);
    const outputRoot = resolveAllOutputRoot(workspaceRoot, plans);
    const config = resolveAllUserscriptConfig(plans);
    const programs = await buildPrograms(plans);
    const metadata = createAllMetadata(plans, now);
    const userscript = await formatAllUserscript(programs, metadata, config);
    await writeAllUserscript(outputRoot, userscript);
}

/** Loads every deployable package plan in stable package-name order. */
async function loadWorkspaceBuildPlans(
    workspaceRoot: string,
    now: Date,
): Promise<GadgetBuildPlan[]> {
    const packageRoots = await findGadgetPackageRoots(workspaceRoot);
    if (packageRoots.length === 0) {
        throw new Error("The workspace does not contain any gadget packages.");
    }
    const plans = await Promise.all(
        packageRoots.map((root) => loadGadgetBuildPlan(root, now)),
    );
    return plans.toSorted((left, right) =>
        compareText(left.metadata.name, right.metadata.name),
    );
}

/** Finds packages that declare the shared gadget build contract. */
async function findGadgetPackageRoots(
    workspaceRoot: string,
): Promise<string[]> {
    const sourceRoot = resolve(workspaceRoot, "src");
    const entries = await readdir(sourceRoot, { withFileTypes: true });
    const directories = entries
        .filter((entry) => entry.isDirectory())
        .toSorted((left, right) => compareText(left.name, right.name));
    const candidates = await Promise.all(
        directories.map(async (entry) => {
            const root = resolve(sourceRoot, entry.name);
            return (await declaresGadgetBuild(root)) ? root : null;
        }),
    );
    return candidates.filter((root): root is string => root != null);
}

/** Checks whether one source package opts into gadget builds. */
async function declaresGadgetBuild(packageRoot: string): Promise<boolean> {
    try {
        const source = await readFile(
            resolve(packageRoot, "package.json"),
            "utf8",
        );
        const metadata = JSON.parse(source) as unknown;
        return isRecord(metadata) && metadata.gadgetBuild != null;
    } catch (error) {
        if (hasErrorCode(error, "ENOENT")) {
            return false;
        }
        throw error;
    }
}

/** Requires packages to use this workspace's shared `dist/` root. */
function resolveAllOutputRoot(
    workspaceRoot: string,
    plans: GadgetBuildPlan[],
): string {
    const outputRoot = resolve(workspaceRoot, "dist");
    for (const plan of plans) {
        const packageName = basename(resolve(plan.packageRoot));
        const packageOutput = resolve(
            plan.packageRoot,
            plan.config.outputDirectory,
        );
        if (
            packageName !== plan.metadata.name ||
            packageOutput !== outputRoot
        ) {
            throw new Error(
                `${plan.metadata.name} must use its package directory and ` +
                    "the shared workspace dist directory.",
            );
        }
    }
    return outputRoot;
}

/** Bundles packages separately to retain package-scoped defines. */
async function buildPrograms(
    plans: GadgetBuildPlan[],
): Promise<UserscriptProgram[]> {
    const sources = await Promise.all(plans.map((plan) => bundleSource(plan)));
    return plans.map((plan, index) => ({
        matches: getPlanMatches(plan),
        name: plan.metadata.name,
        source: sources[index]!,
    }));
}

/** Creates the metadata identity owned by the aggregate build. */
function createAllMetadata(
    plans: GadgetBuildPlan[],
    now: Date,
): UserscriptMetadata {
    return {
        author: uniqueSorted(plans.map((plan) => plan.metadata.author)).join(
            ", ",
        ),
        description: "Run every MediaWiki gadget in this workspace.",
        name: "mediawiki-gadgets",
        version: formatBuildVersion(now),
    };
}

/** Resolves header settings shared by every embedded gadget. */
function resolveAllUserscriptConfig(
    plans: GadgetBuildPlan[],
): UserscriptConfig {
    return {
        grant: requireCommonGrants(plans),
        match: uniqueSorted(plans.flatMap(getPlanMatches)),
        name: "MediaWiki Gadgets",
        runAt: requireCommonTextSetting(plans, "run-at", "document-idle"),
        sandbox: requireCommonTextSetting(plans, "sandbox", "raw"),
    };
}

/** Resolves one effective gadget match list. */
function getPlanMatches(plan: GadgetBuildPlan): string[] {
    const matches = plan.config.userscript?.match ?? [];
    return matches.length === 0 ? DEFAULT_MATCHES : matches;
}

/** Requires gadgets to declare an equivalent userscript grant set. */
function requireCommonGrants(plans: GadgetBuildPlan[]): string[] {
    const first = normalizeGrants(plans[0]!);
    const signature = JSON.stringify(first);
    for (const plan of plans.slice(1)) {
        if (JSON.stringify(normalizeGrants(plan)) !== signature) {
            throwIncompatibleSetting("grant", plans[0]!, plan);
        }
    }
    return first;
}

/** Normalizes one package's userscript grants for comparison. */
function normalizeGrants(plan: GadgetBuildPlan): string[] {
    const grants = plan.config.userscript?.grant ?? DEFAULT_GRANTS;
    return uniqueSorted(grants);
}

/** Requires gadgets to share one single-value userscript setting. */
function requireCommonTextSetting(
    plans: GadgetBuildPlan[],
    field: "run-at" | "sandbox",
    fallback: string,
): string {
    const read = (plan: GadgetBuildPlan): string =>
        field === "run-at"
            ? (plan.config.userscript?.runAt ?? fallback)
            : (plan.config.userscript?.sandbox ?? fallback);
    const value = read(plans[0]!);
    for (const plan of plans.slice(1)) {
        if (read(plan) !== value) {
            throwIncompatibleSetting(field, plans[0]!, plan);
        }
    }
    return value;
}

/** Reports two incompatible gadget userscript settings. */
function throwIncompatibleSetting(
    field: string,
    first: GadgetBuildPlan,
    second: GadgetBuildPlan,
): never {
    throw new Error(
        `Cannot combine ${first.metadata.name} and ${second.metadata.name}: ` +
            `userscript ${field} values differ.`,
    );
}

/** Writes only the aggregate after the complete build succeeds. */
async function writeAllUserscript(
    outputRoot: string,
    userscript: string,
): Promise<void> {
    const outputDirectory = resolve(outputRoot, ALL_OUTPUT_DIRECTORY);
    const outputPath = resolve(outputDirectory, ALL_OUTPUT_FILENAME);
    await ensureBuildDirectory(outputRoot, "Shared output root");
    await ensureBuildDirectory(outputDirectory, "Aggregate output directory");
    await rm(outputPath, { force: true });
    await writeFile(outputPath, userscript);
}

/** Formats a UTC timestamp as an ordered userscript version. */
function formatBuildVersion(now: Date): string {
    const date = [
        now.getUTCFullYear(),
        now.getUTCMonth() + 1,
        now.getUTCDate(),
    ];
    const time = [now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()]
        .map((value) => String(value).padStart(2, "0"))
        .join("");
    const milliseconds = String(now.getUTCMilliseconds()).padStart(3, "0");
    return [...date, time, milliseconds].join(".");
}

/** Returns unique values in stable lexical order. */
function uniqueSorted(values: string[]): string[] {
    return [...new Set(values)].toSorted(compareText);
}

/** Compares text by code-unit order for reproducible builds. */
function compareText(left: string, right: string): number {
    if (left === right) {
        return 0;
    }
    return left < right ? -1 : 1;
}

/** Checks whether parsed JSON is an object record. */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value != null && !Array.isArray(value);
}

/** Checks an unknown error for one Node error code. */
function hasErrorCode(error: unknown, code: string): boolean {
    return (
        typeof error === "object" &&
        error != null &&
        "code" in error &&
        error.code === code
    );
}
