/**
 * Collects source URLs and provides shared citation fetching.
 */

import { getArticleSourceFields } from "../../domain/article";
import {
    buildCiteTemplateFromParts,
    parseCiteTemplate,
    sortCitationParams,
} from "../../../shared/cite";
import type { CitationStore } from "./citation-store.ts";
import {
    buildNameSourceReferenceKey,
    splitSourceUrls,
    trimFieldValue,
} from "../../shared/form-values.ts";

const NAME_GROUP_KEYS = ["localizedNames", "officialNames", "commonNames"];

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
    return Promise.all(
        getEnteredSourceReferenceFields(form).map(
            async function callback(field) {
                return {
                    citation:
                        getManagedCitation(form, field.sourceUrl) ||
                        (await citationStore.fetch(field.sourceUrl)),
                    key: field.key,
                    sourceUrl: field.sourceUrl,
                };
            },
        ),
    );
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
 *
 */
export async function prepareManagedCitationRows(
    form: any,
    citationStore: CitationStore,
    options: any = {},
): Promise<Array<any>> {
    const hasExistingRows = Array.isArray(form.citationRows);
    const existingRows = hasExistingRows ? form.citationRows : [];
    const refetchSourceUrls = new Set(
        (options.refetchSourceUrls || []).map(trimFieldValue),
    );

    const context = { citationStore, existingRows, refetchSourceUrls };
    const rows = await Promise.all(
        getEnteredSourceUrls(form).map(
            async function callback(sourceUrl, index) {
                return await prepareManagedCitationRow(
                    sourceUrl,
                    index,
                    context,
                );
            },
        ),
    );

    return rows;
}

/** Prepares one editable managed citation row. */
async function prepareManagedCitationRow(sourceUrl, index, context) {
    const shouldRefetch = context.refetchSourceUrls.has(sourceUrl);
    let generatedCitation;

    if (shouldRefetch) {
        generatedCitation = await context.citationStore.refetch(sourceUrl);
    } else {
        generatedCitation = await context.citationStore.fetch(sourceUrl);
    }
    const generated = parseCiteTemplate(generatedCitation);
    const existing = context.existingRows.find(
        (row) => trimFieldValue(row.sourceUrl) === sourceUrl,
    );
    const generatedParams = generated.params;
    const params = selectManagedCitationParams(existing, generated);
    let template = generated.template;

    if (trimFieldValue(existing?.template)) {
        template = existing.template;
    }

    return {
        generatedParams,
        index: index + 1,
        modified: existing?.modified === true,
        params,
        sourceUrl,
        template,
    };
}

/** Selects generated or user-modified citation parameters. */
function selectManagedCitationParams(existing, generated): Array<any> {
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
    return [
        ...getArticleSourceFields().flatMap(function callback(field) {
            return splitSourceUrls(form[field.sourceKey]).map(
                function callback(sourceUrl) {
                    return {
                        ...field,
                        sourceUrl,
                    };
                },
            );
        }),
        ...getEnteredNameSourceReferenceFields(form),
    ];
}

/**
 * Gets all unique source URLs currently entered in the form.
 *
 * @param form - Dialog form values.
 * @returns Unique source URLs.
 */
export function getEnteredSourceUrls(form: any): Array<string> {
    return [
        ...new Set(
            getEnteredSourceReferenceFields(form)
                .map((field) => trimFieldValue(field.sourceUrl))
                .filter(Boolean),
        ),
    ];
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

    const row = form.citationRows.find(
        (item) => trimFieldValue(item.sourceUrl) === trimFieldValue(sourceUrl),
    );

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
    return NAME_GROUP_KEYS.flatMap(function callback(key) {
        return (form[key] || [])
            .flatMap(function callback(row, index) {
                return splitSourceUrls(row.sourceUrl).map(
                    function callback(sourceUrl) {
                        return {
                            key: buildNameSourceReferenceKey(key, index),
                            name: row.name,
                            sourceUrl,
                        };
                    },
                );
            })
            .filter(function callback(field) {
                return (
                    Boolean(trimFieldValue(field.name)) &&
                    Boolean(trimFieldValue(field.sourceUrl))
                );
            });
    });
}
