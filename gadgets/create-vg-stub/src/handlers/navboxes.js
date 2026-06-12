/* eslint-disable */

/**
 * Resolves series navbox templates for generated video game stubs.
 */

import {
    splitLookupFieldValues,
    trimValue,
    uniqueValues,
} from "../shared/utils.js";
import { formatText } from "../shared/text-templates.js";
import {
    normalizeTitleKey,
    resolvePageTitles,
    stripNamespace,
} from "./title-resolver.js";

const TEMPLATE_NAMESPACE = "Template";

/**
 * Resolves the first existing navbox title for each series value.
 *
 * @param {string|Array<string>} seriesNames - User-entered series names.
 * @param {object} [options] - API options.
 * @param {Function} [options.fetcher] - Fetch implementation.
 * @returns {Promise<Array<string>>} Existing template titles.
 */
export async function resolveNavboxTitles(seriesNames, options = {}) {
    const plans = buildNavboxPlans(seriesNames);

    if (plans.length === 0) {
        return [];
    }

    const resolutions = await resolveTemplates(
        uniqueValues(plans.flatMap((plan) => plan.candidates)),
        options,
    );

    const titles = uniqueValues(
        plans
            .map((plan) =>
                getFirstExistingTemplate(plan.candidates, resolutions),
            )
            .filter(Boolean),
    );

    return titles;
}

/**
 * Resolves reviewed navbox rows through conversion and redirects.
 *
 * @param {Array<object|string>} values - Reviewed navbox rows.
 * @param {object} [options] - API options.
 * @param {Function} [options.fetcher] - Fetch implementation.
 * @returns {Promise<Array<object>>} Resolved navbox rows.
 */
export async function resolveReviewedNavboxRows(values, options = {}) {
    const rows = values.map(createReviewedNavboxRow);
    const titles = uniqueValues(rows.map((row) => row.title).filter(Boolean));

    if (titles.length === 0) {
        return rows;
    }

    const resolutions = await resolveTemplates(titles, options);

    return rows.map((row) => {
        const resolution = resolutions[normalizeTemplateKey(row.title)];
        const title = resolution?.template || row.title;

        return {
            ...row,
            status: resolution?.exists ? "OK" : "Not exists",
            text: replaceTemplateTitle(row.text, title),
            title,
        };
    });
}

/**
 * Creates one normalized reviewed navbox row.
 *
 * @param {object|string} value - Existing row or navbox wikitext.
 * @returns {object} Reviewed navbox row.
 */
function createReviewedNavboxRow(value) {
    const text = trimValue(value?.text ?? value);
    const title = getTemplateCallTitle(text);

    return {
        enabled: value?.enabled !== false,
        status: "",
        text,
        title,
    };
}

/**
 * Gets a template title from a template call.
 *
 * @param {string} text - Template call wikitext.
 * @returns {string} Template title without namespace.
 */
function getTemplateCallTitle(text) {
    const match = text.match(/^\{\{\s*(?:Template:)?([^|}]+).*?\}\}$/iu);

    return normalizeTemplateTitle(match?.[1] || text);
}

/**
 * Replaces a template call title while retaining its parameters.
 *
 * @param {string} text - Template call wikitext.
 * @param {string} title - Resolved template title.
 * @returns {string} Updated template call.
 */
function replaceTemplateTitle(text, title) {
    if (!text.trimStart().startsWith("{{")) {
        return title;
    }

    return text.replace(/^(\{\{\s*)(?:Template:)?([^|}]+)/iu, `$1${title}`);
}

/**
 * Builds series navbox lookup plans.
 *
 * @param {string|Array<string>} seriesNames - User-entered series names.
 * @returns {Array<object>} Navbox lookup plans.
 */
function buildNavboxPlans(seriesNames) {
    return getSeriesValues(seriesNames).map((series) => ({
        candidates: buildNavboxCandidates(series),
    }));
}

/**
 * Gets normalized series values for navbox lookup.
 *
 * @param {string|Array<string>} seriesNames - User-entered series names.
 * @returns {Array<string>} Normalized series values.
 */
function getSeriesValues(seriesNames) {
    const values = Array.isArray(seriesNames)
        ? seriesNames.flatMap(splitLookupFieldValues)
        : splitLookupFieldValues(seriesNames || "");

    return uniqueValues(values.map(trimSeriesSuffix).filter(Boolean));
}

/**
 * Removes a redundant Chinese series suffix from one value.
 *
 * @param {string} value - Raw series value.
 * @returns {string} Series value without a trailing suffix.
 */
function trimSeriesSuffix(value) {
    return trimValue(value).replace(/系列$/u, "");
}

/**
 * Builds navbox template candidates for one series.
 *
 * @param {string} series - Series title.
 * @returns {Array<string>} Candidate template titles without namespace.
 */
function buildNavboxCandidates(series) {
    return [
        formatText("patterns.titleSeriesVideoGames", { title: series }),
        formatText("patterns.titleVideoGames", { title: series }),
        formatText("patterns.titleSeries", { title: series }),
        series,
    ];
}

/**
 * Gets the first existing template from a candidate list.
 *
 * @param {Array<string>} candidates - Candidate template titles.
 * @param {object} resolutions - Resolutions keyed by template title.
 * @returns {string|undefined} Existing resolved template title.
 */
function getFirstExistingTemplate(candidates, resolutions) {
    return candidates
        .map((candidate) => resolutions[normalizeTemplateKey(candidate)])
        .find((resolution) => resolution?.exists)?.template;
}

/**
 * Resolves template titles.
 *
 * @param {Array<string>} templates - Template titles without namespace.
 * @param {object} options - API options.
 * @returns {Promise<object>} Resolutions keyed by normalized template title.
 */
async function resolveTemplates(templates, options) {
    const values = await resolvePageTitles(
        templates,
        {
            namespace: TEMPLATE_NAMESPACE,
        },
        options,
    );
    const resolutions = Object.fromEntries(
        Object.entries(values).map(([key, resolution]) => [
            key,
            {
                ...resolution,
                template: resolution.title,
            },
        ]),
    );

    return resolutions;
}

/**
 * Removes the template namespace from a title.
 *
 * @param {string} template - Template title with or without namespace.
 * @returns {string} Template title without namespace.
 */
function normalizeTemplateTitle(template) {
    return stripNamespace(template, TEMPLATE_NAMESPACE);
}

/**
 * Normalizes a template title for lookup.
 *
 * @param {string} template - Template title with or without namespace.
 * @returns {string} Normalized template key.
 */
function normalizeTemplateKey(template) {
    return normalizeTitleKey(template, TEMPLATE_NAMESPACE);
}
