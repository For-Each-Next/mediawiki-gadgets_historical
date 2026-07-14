/**
 * Builds aggregate review score prose for video game stubs.
 */

import { trimValue } from "../shared/utils.ts";
import { formatText, getTextTemplate } from "../shared/text-templates.ts";
import { get as getTerminology } from "../terminologies";


/**
 * Builds aggregate review score sentence text.
 *
 * @param params - Aggregate score parameters.
 * @param params.metacriticPlatform - Metacritic platform.
 * @param params.metacriticScore - Metacritic score.
 * @param params.metacriticSourceTag - Metacritic source tag.
 * @param params.openCriticRecommend - OpenCritic
 * recommendation
 * rate.
 * @param params.openCriticSourceTag - OpenCritic source tag.
 * @returns Aggregate score sentence, or an empty string.
 */
export function buildAggScoresText(params: any): string {
    const clauses = [
        buildMetacriticClause(params),
        buildOpenCriticClause(params),
    ].filter(Boolean);

    if (clauses.length === 0) {
        return "";
    }

    return formatText("prose.sentence3", {
        clauses: clauses.join(getTextTemplate("prose.scoreSeparator")),
    });
}


/**
 * Builds Metacritic score text.
 *
 * @param params - Aggregate score parameters.
 * @param params.metacriticPlatform - Metacritic platform.
 * @param params.metacriticScore - Metacritic score.
 * @param params.metacriticSourceTag - Metacritic source tag.
 * @returns Metacritic clause, or an empty string.
 */
function buildMetacriticClause(params: any): string {
    const { platform, score } = normalizeMetacriticScoreParams(params);

    if (!hasDigit(score)) {
        return "";
    }

    return (
        formatText("prose.metacritic", { score }) +
        buildPlatformEditionText(platform) +
        (params.metacriticSourceTag || "")
    );
}


/**
 * Builds OpenCritic score text.
 *
 * @param params - Aggregate score parameters.
 * @param params.openCriticRecommend - OpenCritic
 * recommendation
 * rate.
 * @param params.openCriticSourceTag - OpenCritic source tag.
 * @returns OpenCritic clause, or an empty string.
 */
function buildOpenCriticClause(params: any): string {
    const score = trimValue(params.openCriticRecommend || "");

    if (!hasDigit(score)) {
        return "";
    }

    return (
        formatText("prose.openCritic", { score }) +
        (params.openCriticSourceTag || "")
    );
}


/**
 * Normalizes Metacritic score inputs.
 *
 * @param params - Aggregate score parameters.
 * @param params.metacriticPlatform - Metacritic platform.
 * @param params.metacriticScore - Metacritic score.
 * @returns Normalized platform and score values.
 */
function normalizeMetacriticScoreParams(params: any): any {
    const platform = trimValue(params.metacriticPlatform || "");
    const score = trimValue(params.metacriticScore || "");

    if (!hasDigit(score) && hasDigit(platform)) {
        return {
            platform: score,
            score: platform,
        };
    }

    return {
        platform,
        score,
    };
}


/**
 * Builds platform edition text for Metacritic.
 *
 * @param platform - Platform value.
 * @returns Platform edition text, or an empty string.
 */
function buildPlatformEditionText(platform: string): string {
    const label = getPlatformLabel(platform);

    if (label === "") {
        return "";
    }

    return formatText("prose.metacriticPlatformEdition", {
        label,
    });
}


/**
 * Gets an unlinked platform label.
 *
 * @param platform - Platform value.
 * @returns Unlinked platform label.
 */
function getPlatformLabel(platform: string): string {
    const value = trimValue(platform || "");

    if (value === "") {
        return "";
    }

    return getTerminology("platform", value, "name") || value;
}


/**
 * Checks whether a value contains at least one digit.
 *
 * @param value - Value to inspect.
 * @returns Whether the value contains a digit.
 */
function hasDigit(value: string): boolean {
    return /\d/u.test(value);
}
