/* eslint-disable */

/**
 * Builds aggregate review score prose for video game stubs.
 */

import {
    FIELD_REFERENCE_DATA,
    getReferenceDefinition,
    trimValue,
} from "../shared/utils.js";
import { formatText, getTextTemplate } from "../shared/text-templates.js";

/**
 * Builds aggregate review score sentence text.
 *
 * @param {object} params - Aggregate score parameters.
 * @param {string} [params.metacriticPlatform] - Metacritic platform.
 * @param {string} [params.metacriticScore] - Metacritic score.
 * @param {string} [params.metacriticSourceTag] - Metacritic source tag.
 * @param {string} [params.openCriticRecommend] - OpenCritic recommendation rate.
 * @param {string} [params.openCriticSourceTag] - OpenCritic source tag.
 * @returns {string} Aggregate score sentence, or an empty string.
 */
export function buildAggScoresText(params) {
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
 * @param {object} params - Aggregate score parameters.
 * @param {string} [params.metacriticPlatform] - Metacritic platform.
 * @param {string} [params.metacriticScore] - Metacritic score.
 * @param {string} [params.metacriticSourceTag] - Metacritic source tag.
 * @returns {string} Metacritic clause, or an empty string.
 */
function buildMetacriticClause(params) {
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
 * @param {object} params - Aggregate score parameters.
 * @param {string} [params.openCriticRecommend] - OpenCritic recommendation rate.
 * @param {string} [params.openCriticSourceTag] - OpenCritic source tag.
 * @returns {string} OpenCritic clause, or an empty string.
 */
function buildOpenCriticClause(params) {
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
 * @param {object} params - Aggregate score parameters.
 * @param {string} [params.metacriticPlatform] - Metacritic platform.
 * @param {string} [params.metacriticScore] - Metacritic score.
 * @returns {object} Normalized platform and score values.
 */
function normalizeMetacriticScoreParams(params) {
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
 * @param {string} platform - Platform value.
 * @returns {string} Platform edition text, or an empty string.
 */
function buildPlatformEditionText(platform) {
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
 * @param {string} platform - Platform value.
 * @returns {string} Unlinked platform label.
 */
function getPlatformLabel(platform) {
    const value = trimValue(platform || "");

    if (value === "") {
        return "";
    }

    const reference = getReferenceDefinition(
        FIELD_REFERENCE_DATA.platforms || {},
        value,
    );

    if (reference == null) {
        return value;
    }

    return (
        reference.label ||
        reference.page?.label ||
        reference.page?.title ||
        value
    );
}

/**
 * Checks whether a value contains at least one digit.
 *
 * @param {string} value - Value to inspect.
 * @returns {boolean} Whether the value contains a digit.
 */
function hasDigit(value) {
    return /\d/u.test(value);
}
