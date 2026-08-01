/**
 * Normalizes form data and flushes registered article modules.
 */

import {
    buildArticleProse,
    buildArticleRenderers,
} from "#gadget/domain/wiki.ts";
import { ARTICLE_MODULES } from "#gadget/domain/modules.ts";
import {
    createDataRecord,
    createDataValue,
    defineArticleModule,
} from "#gadget/domain/article-module.ts";
import type {
    ArticleForm,
    ArticleModuleContext,
    ArticleProcessorOptions,
    ProcessedArticleData,
    SourceReference,
    SourceTags,
} from "#gadget/domain/models.ts";
import {
    buildReferenceReuseTag,
    nameCitationReferences,
} from "#gadget/domain/reference-wikitext.ts";
import { wikitext } from "#shared/citation";
const { trimValue } = wikitext;

export {
    completeMetadataFieldValue,
    isCompletableMetadataField,
} from "#gadget/domain/data.ts";
export { ARTICLE_MODULES };
export { buildArticleProse };
export { createDataRecord, createDataValue, defineArticleModule };
export type {
    ArticleDataRecord,
    ArticleDataValue,
    ArticleForm,
    ArticleModule,
    ArticleModuleContext,
    ArticleModuleDefinition,
    ArticleProcessorOptions,
    AggregateScoreMetadata,
    AggregateScoreRecord,
    ProcessedArticleData,
    SourceReference,
    SourceTags,
} from "#gadget/domain/models.ts";

/**
 * Creates normalized article data and compatibility parameters.
 *
 * @param form - Raw dialog form values.
 * @param options - Processor options.
 * @param options.defaultName - Fallback article title.
 * @returns Normalized article data.
 */
export function createArticleData(
    form: ArticleForm,
    options: ArticleProcessorOptions = {},
): ProcessedArticleData {
    const sourceReferences = nameCitationReferences(
        form.sourceReferences || [],
    );
    const sourceTags = buildSourceReferenceTags(sourceReferences);
    const contextOptions = {
        ...options,
        rawForm: form,
    };
    const context = createModuleContext(
        sourceReferences,
        sourceTags,
        contextOptions,
    );
    const normalizedForm = normalizeForm(form, context);
    const mapCallback = function callback(
        module: (typeof ARTICLE_MODULES)[number],
    ) {
        const record = module.flush(normalizedForm, context);

        return [module.key, record];
    };
    const mappedValues = ARTICLE_MODULES.map(mapCallback);
    const records = Object.fromEntries(mappedValues);

    const processorInput = {
        form: normalizedForm,
        records,
        sourceReferences,
        sourceTags,
    };
    const articleData = buildArticleData(processorInput);

    return articleData;
}

/**
 * Formats one live form field through its owning article module.
 *
 * @param form - Current form values.
 * @param key - Form field key.
 * @param value - Raw field value.
 * @returns Canonical field value.
 */
export function formatArticleFormField(
    form: any,
    key: string,
    value: any,
): any {
    const findCallback = (item: (typeof ARTICLE_MODULES)[number]) =>
        item.fields.includes(key);
    const module = ARTICLE_MODULES.find(findCallback);

    if (module == null) {
        return trimValue(value);
    }

    return module.formatField(key, value, form);
}

/**
 * Checks whether a registered field accepts multiple list items.
 *
 * @param key - Form field key.
 * @returns Whether the field is a multi-item list.
 */
export function isArticleListField(key: string): boolean {
    const someCallbackA = (module: (typeof ARTICLE_MODULES)[number]) =>
        module.listFields.includes(key);
    return ARTICLE_MODULES.some(someCallbackA);
}

/**
 * Gets static source URL fields declared by registered article modules.
 *
 * @returns Source reference field definitions.
 */
export function getArticleSourceFields(): Array<any> {
    return ARTICLE_MODULES.flatMap((module) => module.sourceFields);
}

/**
 * Normalizes a form through every registered article module.
 *
 * @param form - Raw form values.
 * @param context - Shared module context.
 * @returns Fully normalized form.
 */
function normalizeForm(form: any, context: any): any {
    const reduceCallbackA = function callback(
        normalized: any,
        module: (typeof ARTICLE_MODULES)[number],
    ) {
        const result = {
            ...normalized,
            ...module.normalize(normalized, context),
        };
        return result;
    };
    const result = ARTICLE_MODULES.reduce(reduceCallbackA, { ...form });
    return result;
}

/**
 * Builds the complete processed article output.
 *
 * @param input - Processor input.
 * @param input.form - Fully normalized form.
 * @param input.records - Data records keyed by module name.
 * @param input.sourceReferences - Named source
 * references.
 * @param input.sourceTags - Source tags keyed by field.
 * @returns Processed article data.
 */
function buildArticleData(input: any): any {
    const { form, records, sourceReferences, sourceTags } = input;
    const prose = buildArticleProse(records, sourceTags);
    const renderers = buildArticleRenderers(records, sourceTags);
    const companyMetadata = buildCompanyOutputMetadata(records, prose);
    const platformSeriesMetadata = buildPlatformSeriesMetadata(records, prose);
    const yearGenreMetadata = buildYearGenreMetadata(records, prose);
    const data = {
        ...buildArticleFormOutput(form),
        additionalProseText: prose.fragments.sentence4,
        aggScoresText: prose.fragments.sentence3,
        companyMetadata,
        defaultSortText: renderers.defaultSort,
        form,
        infoboxText: renderers.infobox,
        leadNameText: prose.fragments.sentence1.s1a.titles,
        navboxText: renderers.navboxes,
        noteTaText: renderers.noteTa,
        platformSeriesMetadata,
        prose,
        records,
        renderers,
        sourceReferences,
        sourceTags,
        yearGenreMetadata,
    };

    return data;
}

/**
 * Builds company metadata with rendered prose.
 *
 * @param records - Records value.
 * @param prose - Prose value.
 * @returns Company metadata with rendered prose.
 */
function buildCompanyOutputMetadata(
    records: { companies: { metadata: Record<string, unknown> } },
    prose: { fragments: { sentence1: { s1b: string } } },
): Record<string, unknown> {
    const result = {
        ...records.companies.metadata,
        text: prose.fragments.sentence1.s1b,
    };
    return result;
}

/**
 * Builds platform and series output metadata.
 *
 * @param records - Records value.
 * @param prose - Prose value.
 * @returns Platform and series output metadata.
 */
function buildPlatformSeriesMetadata(
    records: {
        platform: {
            assumedCategories: unknown;
            metadata: { count: unknown };
            assumedStubTags: unknown;
        };
        series: { categoryPlans: unknown };
    },
    prose: { fragments: { sentence2: unknown } },
): unknown {
    const result = {
        categories: records.platform.assumedCategories,
        categoryPlans: records.series.categoryPlans,
        platformCount: records.platform.metadata.count,
        stubTags: records.platform.assumedStubTags,
        text: prose.fragments.sentence2,
    };
    return result;
}

/**
 * Builds year and genre output metadata.
 *
 * @param records - Records value.
 * @param prose - Prose value.
 * @returns Year and genre output metadata.
 */
function buildYearGenreMetadata(
    records: {
        genre: { assumedCategories: string[]; assumedStubTags: string[] };
        year: { assumedCategories: string[] };
    },
    prose: { fragments: { sentence1: { s1a: { yearGenre: unknown } } } },
): unknown {
    const result = {
        categories: [
            ...records.genre.assumedCategories,
            ...records.year.assumedCategories,
        ],
        stubTags: records.genre.assumedStubTags,
        text: prose.fragments.sentence1.s1a.yearGenre,
    };
    return result;
}

/**
 * Selects normalized form values exposed in article output.
 *
 * @param form - Form values.
 * @returns Normalized form values exposed in article output.
 */
function buildArticleFormOutput(form: {
    categoryRows: unknown;
    developers: unknown;
    publishers: unknown;
    englishName: unknown;
    genres: unknown;
    name: unknown;
    originalLanguage: unknown;
    originalName: unknown;
    platforms: unknown;
    year: unknown;
}): Record<string, unknown> {
    const result = {
        categoryRows: form.categoryRows,
        companies: {
            developers: form.developers,
            publishers: form.publishers,
        },
        englishName: form.englishName,
        genres: form.genres,
        name: form.name,
        originalLanguage: form.originalLanguage,
        originalName: form.originalName,
        platforms: form.platforms,
        year: form.year,
    };
    return result;
}

/**
 * Creates helpers shared by all article modules.
 *
 * @param sourceReferences - Named source references.
 * @param sourceTags - Source tags keyed by field.
 * @param options - Processor options.
 * @returns Shared part context.
 */
function createModuleContext(
    sourceReferences: Array<any>,
    sourceTags: any,
    options: any,
): any {
    const context = {
        defaultName: trimValue(options.defaultName),
        getCitations: getModuleCitations.bind(null, sourceReferences),
        joinSourceTags: joinModuleSourceTags.bind(null, sourceTags),
        rawForm: options.rawForm || {},
        sourceReferences,
        sourceTags,
    };

    return context;
}

/**
 * Gets citations matching exact keys or key prefixes.
 *
 * @param references - References value.
 * @param filters - Filters value.
 * @returns Citations matching exact keys or key prefixes.
 */
function getModuleCitations(
    references: Array<{ key: string }>,
    filters: { keys?: string[]; prefixes?: string[] } = {},
): Array<{ key: string }> {
    const keys = filters.keys || [];
    const prefixes = filters.prefixes || [];
    const boundCallbackA = matchesModuleCitation.bind(null, keys, prefixes);
    return references.filter(boundCallbackA);
}

/**
 * Checks whether one citation matches configured filters.
 *
 * @param keys - Keys value.
 * @param prefixes - Prefixes value.
 * @param reference - Reference value.
 * @returns Whether one citation matches configured filters.
 */
function matchesModuleCitation(
    keys: string[],
    prefixes: string[],
    reference: { key: string },
): boolean {
    const someCallback = (prefix: string) =>
        hasCitationPrefix(reference.key, prefix);
    const result = keys.includes(reference.key) || prefixes.some(someCallback);
    return result;
}

/**
 * Checks whether a citation key starts with one prefix.
 *
 * @param key - Lookup key.
 * @param prefix - Prefix value.
 * @returns Whether a citation key starts with one prefix.
 */
function hasCitationPrefix(key: string, prefix: string): boolean {
    return key.startsWith(prefix);
}

/**
 * Joins generated source tags for selected form fields.
 *
 * @param sourceTags - Source tags value.
 * @param keys - Keys value.
 * @returns Generated source tags for selected form fields.
 */
function joinModuleSourceTags(
    sourceTags: Record<string, string>,
    keys: Array<string>,
): string {
    const boundCallback = getModuleSourceTag.bind(null, sourceTags);
    return keys.map(boundCallback).join("");
}

/**
 * Gets one generated source tag by field key.
 *
 * @param sourceTags - Source tags keyed by article field.
 * @param key - Lookup key.
 * @returns One generated source tag by field key.
 */
function getModuleSourceTag(
    sourceTags: Record<string, string>,
    key: string,
): string {
    return sourceTags[key] || "";
}

/**
 * Builds source reference tags keyed by article field.
 *
 * @param references - Named source references.
 * @returns Source tags keyed by field.
 */
function buildSourceReferenceTags(references: Array<any>): any {
    const reduceCallback = function callback(
        tags: Record<string, string>,
        reference: any,
    ) {
        const tag = buildReferenceReuseTag(reference.name);

        tags[reference.key] = `${tags[reference.key] || ""}${tag}`;

        return tags;
    };
    const result = references.reduce(
        reduceCallback,
        {} as Record<string, string>,
    );
    return result;
}
