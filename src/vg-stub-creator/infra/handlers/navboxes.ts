import { formatText } from "#me/domain/wiki.ts";
import {
    normalizeTitleKey,
    resolvePageTitles,
    stripNamespace,
} from "#me/infra/handlers/title-resolver.ts";
import { wikitext } from "#shared";
const { splitLookupFieldValues, trimValue, uniqueValues } = wikitext;

const TEMPLATE_NAMESPACE = "Template";

/**
 * Resolves the first existing navbox title for each series value.
 *
 * @param seriesNames - User-entered series
 * names.
 * @param options - API options.
 * @param options.fetcher - Fetch implementation.
 * @returns Existing template titles.
 */
export async function resolveNavboxTitles(
    seriesNames: string | Array<string>,
    options: any = {},
): Promise<Array<string>> {
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
            .map(function callback(plan) {
                return getFirstExistingTemplate(plan.candidates, resolutions);
            })
            .filter(Boolean),
    );

    return titles;
}

/**
 * Resolves reviewed navbox rows through conversion and redirects.
 *
 * @param values - Reviewed navbox rows.
 * @param options - API options.
 * @param options.fetcher - Fetch implementation.
 * @returns Resolved navbox rows.
 */
export async function resolveReviewedNavboxRows(
    values: Array<any | string>,
    options: any = {},
): Promise<Array<any>> {
    const rows = values.map(createReviewedNavboxRow);
    const titles = uniqueValues(rows.map((row) => row.title).filter(Boolean));

    if (titles.length === 0) {
        return rows;
    }

    const resolutions = await resolveTemplates(titles, options);

    const result = rows.map(function callback(row) {
        const resolution = resolutions[normalizeTemplateKey(row.title)];
        const title = resolution?.template || row.title;

        const result = {
            ...row,
            status: resolution?.exists ? "OK" : "Not exists",
            text: replaceTemplateTitle(row.text, title),
            title,
        };
        return result;
    });
    return result;
}

/**
 * Creates one normalized reviewed navbox row.
 *
 * @param value - Existing row or navbox wikitext.
 * @returns Reviewed navbox row.
 */
function createReviewedNavboxRow(value: any | string): any {
    const text = trimValue(value?.text ?? value);
    const title = getTemplateCallTitle(text);

    const result = {
        enabled: value?.enabled !== false,
        status: "",
        text,
        title,
    };
    return result;
}

/**
 * Gets a template title from a template call.
 *
 * @param text - Template call wikitext.
 * @returns Template title without namespace.
 */
function getTemplateCallTitle(text: string): string {
    const match = text.match(/^\{\{\s*(?:Template:)?([^|}]+).*?\}\}$/iu);

    return normalizeTemplateTitle(match?.[1] || text);
}

/**
 * Replaces a template call title while retaining its parameters.
 *
 * @param text - Template call wikitext.
 * @param title - Resolved template title.
 * @returns Updated template call.
 */
function replaceTemplateTitle(text: string, title: string): string {
    if (!text.trimStart().startsWith("{{")) {
        return title;
    }

    return text.replace(/^(\{\{\s*)(?:Template:)?([^|}]+)/iu, `$1${title}`);
}

/**
 * Builds series navbox lookup plans.
 *
 * @param seriesNames - User-entered series
 * names.
 * @returns Navbox lookup plans.
 */
function buildNavboxPlans(seriesNames: string | Array<string>): Array<any> {
    const result = getSeriesValues(seriesNames).map(function callback(series) {
        const result = {
            candidates: buildNavboxCandidates(series),
        };
        return result;
    });
    return result;
}

/**
 * Gets normalized series values for navbox lookup.
 *
 * @param seriesNames - User-entered series
 * names.
 * @returns Normalized series values.
 */
function getSeriesValues(seriesNames: string | Array<string>): Array<string> {
    let values: Array<string>;

    if (Array.isArray(seriesNames)) {
        values = seriesNames.flatMap(splitLookupFieldValues);
    } else {
        values = splitLookupFieldValues(seriesNames || "");
    }

    return uniqueValues(values.map(trimSeriesSuffix).filter(Boolean));
}

/**
 * Removes a redundant Chinese series suffix from one value.
 *
 * @param value - Raw series value.
 * @returns Series value without a trailing suffix.
 */
function trimSeriesSuffix(value: string): string {
    return trimValue(value).replace(/系列$/u, "");
}

/**
 * Builds navbox template candidates for one series.
 *
 * @param series - Series title.
 * @returns Candidate template titles without namespace.
 */
function buildNavboxCandidates(series: string): Array<string> {
    const result = [
        formatText("patterns.titleSeriesVideoGames", { title: series }),
        formatText("patterns.titleVideoGames", { title: series }),
        formatText("patterns.titleSeries", { title: series }),
        series,
    ];
    return result;
}

/**
 * Gets the first existing template from a candidate list.
 *
 * @param candidates - Candidate template titles.
 * @param resolutions - Resolutions keyed by template title.
 * @returns Existing resolved template title.
 */
function getFirstExistingTemplate(
    candidates: Array<string>,
    resolutions: any,
): string | undefined {
    const result = candidates
        .map((candidate) => resolutions[normalizeTemplateKey(candidate)])
        .find((resolution) => resolution?.exists)?.template;
    return result;
}

/**
 * Resolves template titles.
 *
 * @param templates - Template titles without namespace.
 * @param options - API options.
 * @returns Resolutions keyed by normalized template
 * title.
 */
async function resolveTemplates(
    templates: Array<string>,
    options: any,
): Promise<any> {
    const values = await resolvePageTitles(
        templates,
        {
            namespace: TEMPLATE_NAMESPACE,
            variantFallback: true,
        },
        options,
    );
    const resolutions = Object.fromEntries(
        (Object.entries(values) as Array<[string, any]>).map(
            function callback([key, resolution]) {
                const result = [
                    key,
                    {
                        ...resolution,
                        template: resolution.title,
                    },
                ];
                return result;
            },
        ),
    );

    return resolutions;
}

/**
 * Removes the template namespace from a title.
 *
 * @param template - Template title with or without namespace.
 * @returns Template title without namespace.
 */
function normalizeTemplateTitle(template: string): string {
    return stripNamespace(template, TEMPLATE_NAMESPACE);
}

/**
 * Normalizes a template title for lookup.
 *
 * @param template - Template title with or without namespace.
 * @returns Normalized template key.
 */
function normalizeTemplateKey(template: string): string {
    return normalizeTitleKey(template, TEMPLATE_NAMESPACE);
}
