/** Resolves settings for the aggregate artifact. */

import { compareText } from "#workspace/files";
import type {
    AggregateUserscriptConfig,
    GadgetBuildPlan,
    UserscriptMetadata,
} from "./types.ts";
import { parseMatchPattern } from "./userscript.ts";

const DEFAULT_GRANTS = ["none"];
const DEFAULT_MATCHES = ["*://*/*"];

/** Creates the metadata identity owned by the aggregate build. */
export function createAggregateMetadata(
    plans: GadgetBuildPlan[],
    now: Date,
): UserscriptMetadata {
    return {
        author: uniqueSorted(plans.map((plan) => plan.metadata.author)).join(
            ", ",
        ),
        description: "Run every MediaWiki gadget in this workspace.",
        license: formatAggregateLicense(plans),
        name: "mediawiki-gadgets",
        version: formatBuildVersion(now),
    };
}

/** Resolves header settings shared by every embedded gadget. */
export function resolveAggregateConfig(
    plans: GadgetBuildPlan[],
): AggregateUserscriptConfig {
    validateMatchPatterns(plans);
    return {
        grant: requireCommonGrants(plans),
        match: uniqueSorted(plans.flatMap(getPlanMatches)),
        name: "MediaWiki Gadgets",
        runAt: requireCommonTextSetting(plans, "run-at", "document-idle"),
        sandbox: requireCommonTextSetting(plans, "sandbox", "raw"),
    };
}

/** Validates every package match before workspace output is written. */
function validateMatchPatterns(plans: GadgetBuildPlan[]): void {
    for (const plan of plans) {
        for (const pattern of getPlanMatches(plan)) {
            parseMatchPattern(pattern, plan.metadata.name);
        }
    }
}

/** Resolves one effective gadget match list. */
export function getPlanMatches(plan: GadgetBuildPlan): string[] {
    const matches = plan.config.userscript?.match ?? [];
    return matches.length === 0 ? DEFAULT_MATCHES : matches;
}

/** Returns unique values in stable lexical order. */
export function uniqueSorted(values: string[]): string[] {
    return [...new Set(values)].toSorted(compareText);
}

/** Combines package license values for the aggregate userscript. */
function formatAggregateLicense(plans: GadgetBuildPlan[]): string {
    const licenses = uniqueSorted(plans.map((plan) => plan.metadata.license));
    if (licenses.length === 1) {
        return licenses[0]!;
    }
    return licenses.map((license) => `(${license})`).join(" AND ");
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
    const value = readTextSetting(plans[0]!, field, fallback);
    for (const plan of plans.slice(1)) {
        if (readTextSetting(plan, field, fallback) !== value) {
            throwIncompatibleSetting(field, plans[0]!, plan);
        }
    }
    return value;
}

/** Reads one effective single-value userscript setting. */
function readTextSetting(
    plan: GadgetBuildPlan,
    field: "run-at" | "sandbox",
    fallback: string,
): string {
    return field === "run-at"
        ? (plan.config.userscript?.runAt ?? fallback)
        : (plan.config.userscript?.sandbox ?? fallback);
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
