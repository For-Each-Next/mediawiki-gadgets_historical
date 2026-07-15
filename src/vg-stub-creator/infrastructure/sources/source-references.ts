/**
 * Collects source URLs and provides shared citation fetching.
 */

import { getArticleSourceFields } from "#stub/article";
import type { CitationStore } from "#stub/sources/citation-store.ts";
import { buildNameSourceReferenceKey } from "#stub/wiki";
import { cite, wikitext } from "#shared";
const { buildCiteTemplateFromParts, parseCiteTemplate, sortCitationParams } =
    cite;
const { splitSourceUrls, trimValue } = wikitext;

const NAME_GROUP_KEYS = ["localizedNames", "officialNames", "commonNames"];

interface ManagedCitationRow {
    modified: boolean;
    params: unknown[];
    sourceUrl: string;
    template: string;
}

interface ManagedCitationContext {
    citationStore: CitationStore;
    existingRows: ManagedCitationRow[];
    refetchSourceUrls: Set<string>;
}

/**
 * Fetches named citation data for all entered source URLs.
 *
 * @param form - Dialog form values.
 * @param citationStore - Citation fetch/cache store.
 * @returns Source reference data.
 */
export async function fetchSourceReferences(
    form: any,
    citationStore: CitationStore,
): Promise<Array<any>> {
    const result = Promise.all(
        getEnteredSourceReferenceFields(form).map(
            async function callback(field) {
                const result = {
                    citation:
                        getManagedCitation(form, field.sourceUrl) ||
                        (await citationStore.fetch(field.sourceUrl)),
                    key: field.key,
                    sourceUrl: field.sourceUrl,
                };
                return result;
            },
        ),
    );
    return result;
}

/**
 * Handles prepare managed citation rows.
 *
 * Prepares editable citation rows for all currently entered source
 * URLs.
 *
 * @param form - Dialog form values.
 * @param citationStore - Citation fetch/cache store.
 * @param options - Citation preparation options.
 * @param options.refetchSourceUrls - Source URLs to
 * re-fetch.
 * @returns Managed citation rows.
 */
export async function prepareManagedCitationRows(
    form: any,
    citationStore: CitationStore,
    options: any = {},
): Promise<Array<any>> {
    const hasExistingRows = Array.isArray(form.citationRows);
    let existingRows: ManagedCitationRow[] = [];

    if (hasExistingRows) {
        existingRows = form.citationRows;
    }
    const refetchSourceUrls = new Set<string>(
        (options.refetchSourceUrls || []).map(trimValue),
    );

    const context = { citationStore, existingRows, refetchSourceUrls };
    const rows = await Promise.all(
        getEnteredSourceUrls(form).map(
            async function callback(sourceUrl, index) {
                const result = await prepareManagedCitationRow(
                    sourceUrl,
                    index,
                    context,
                );
                return result;
            },
        ),
    );

    return rows;
}

/**
 * Prepares one editable managed citation row.
 *
 * @param sourceUrl - Source URL.
 * @param index - Zero-based item index.
 * @param context - Operation context.
 * @returns Result when the function
 *   prepares one editable managed citation row.
 */
async function prepareManagedCitationRow(
    sourceUrl: string,
    index: number,
    context: ManagedCitationContext,
) {
    const shouldRefetch = context.refetchSourceUrls.has(sourceUrl);
    let generatedCitation: string;

    if (shouldRefetch) {
        generatedCitation = await context.citationStore.refetch(sourceUrl);
    } else {
        generatedCitation = await context.citationStore.fetch(sourceUrl);
    }
    const generated = parseCiteTemplate(generatedCitation);
    const existing = context.existingRows.find(function findExisting(row) {
        return trimValue(row.sourceUrl) === sourceUrl;
    });
    const generatedParams = generated.params;
    const params = selectManagedCitationParams(existing, generated);
    let template = generated.template;

    if (trimValue(existing?.template)) {
        template = existing.template;
    }

    const result = {
        generatedParams,
        index: index + 1,
        modified: existing?.modified === true,
        params,
        sourceUrl,
        template,
    };
    return result;
}

/**
 * Selects generated or user-modified citation parameters.
 *
 * @param existing - Existing value.
 * @param generated - Generated value.
 * @returns Generated or user-modified citation parameters.
 */
function selectManagedCitationParams(
    existing: { modified: boolean; template: string; params: unknown[] },
    generated: { params: unknown[]; template: string },
): Array<unknown> {
    if (existing?.modified !== true) {
        return generated.params;
    }
    const template = existing.template || generated.template;
    return sortCitationParams(existing.params || [], template);
}

/**
 * Gets all source reference fields with entered URLs.
 *
 * @param form - Dialog form values.
 * @returns Entered source fields.
 */
export function getEnteredSourceReferenceFields(form: any): Array<any> {
    const result = [
        ...getArticleSourceFields().flatMap(function callback(field) {
            const result = splitSourceUrls(form[field.sourceKey]).map(
                function callback(sourceUrl) {
                    const result = {
                        ...field,
                        sourceUrl,
                    };
                    return result;
                },
            );
            return result;
        }),
        ...getEnteredNameSourceReferenceFields(form),
    ];
    return result;
}

/**
 * Gets all unique source URLs currently entered in the form.
 *
 * @param form - Dialog form values.
 * @returns Unique source URLs.
 */
export function getEnteredSourceUrls(form: any): Array<string> {
    const result = [
        ...new Set(
            getEnteredSourceReferenceFields(form)
                .map((field) => trimValue(field.sourceUrl))
                .filter(Boolean),
        ),
    ];
    return result;
}

/**
 * Builds a managed citation for a source URL when the form has one.
 *
 * @param form - Dialog form values.
 * @param sourceUrl - Source URL.
 * @returns Managed citation wikitext, or empty string.
 */
function getManagedCitation(form: any, sourceUrl: string): string {
    if (!Array.isArray(form.citationRows)) {
        return "";
    }

    const row = form.citationRows.find(function findCitation(item: {
        sourceUrl: string;
    }) {
        return trimValue(item.sourceUrl) === trimValue(sourceUrl);
    });

    if (row == null) {
        return "";
    }

    return buildCiteTemplateFromParts(row);
}

/**
 * Gets source fields for localized name rows with entered URLs.
 *
 * @param form - Dialog form values.
 * @returns Entered localized-name source fields.
 */
export function getEnteredNameSourceReferenceFields(form: any): Array<any> {
    const result = NAME_GROUP_KEYS.flatMap(function callback(key) {
        const result = (form[key] || [])
            .flatMap(function callback(
                row: { sourceUrl: unknown; name: unknown },
                index: number,
            ) {
                const result = splitSourceUrls(row.sourceUrl).map(
                    function callback(sourceUrl) {
                        const result = {
                            key: buildNameSourceReferenceKey(key, index),
                            name: row.name,
                            sourceUrl,
                        };
                        return result;
                    },
                );
                return result;
            })
            .filter(function callback(field: {
                name: unknown;
                sourceUrl: unknown;
            }) {
                const result =
                    Boolean(trimValue(field.name)) &&
                    Boolean(trimValue(field.sourceUrl));
                return result;
            });
        return result;
    });
    return result;
}
