/**
 * Normalizes form data and flushes registered article modules.
 */

import { trimFieldValue } from "../shared/form-values.ts";
import { buildArticleRenderers } from "../wikitext/outputs.ts";
import { buildArticleProse } from "../wikitext/prose.ts";
import { ARTICLE_MODULES } from "./modules/index.ts";


/**
 * Creates normalized article data and compatibility parameters.
 *
 * @param form - Raw dialog form values.
 * @param options - Processor options.
 * @param options.defaultName - Fallback article title.
 * @returns Normalized article data.
 */
export function createArticleData(form: any, options: any = {}): any {
    const sourceReferences = buildNamedSourceReferences(form.sourceReferences);
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
    const records = Object.fromEntries(
        ARTICLE_MODULES.map(function callback(module) {
            const record = module.flush(normalizedForm, context);

            return [module.key, record];
        }),
    );

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
    const module = ARTICLE_MODULES.find((item) => item.fields.includes(key));

    if (module == null) {
        return trimFieldValue(value);
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
    return ARTICLE_MODULES.some((module) => module.listFields.includes(key));
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
    return ARTICLE_MODULES.reduce(
        function callback(normalized, module) {
            return {
                ...normalized,
                ...module.normalize(normalized, context),
            };
        },
        { ...form },
    );
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
    const companyMetadata = {
        ...records.companies.metadata,
        text: prose.fragments.sentence1.s1b,
    };
    const platformSeriesMetadata = {
        categories: records.platform.assumedCategories,
        categoryPlans: records.series.categoryPlans,
        platformCount: records.platform.metadata.count,
        stubTags: records.platform.assumedStubTags,
        text: prose.fragments.sentence2,
    };
    const yearGenreMetadata = {
        categories: [
            ...records.genre.assumedCategories,
            ...records.year.assumedCategories,
        ],
        stubTags: records.genre.assumedStubTags,
        text: prose.fragments.sentence1.s1a.yearGenre,
    };
    const data = {
        additionalProseText: prose.fragments.sentence4,
        aggScoresText: prose.fragments.sentence3,
        categoryRows: form.categoryRows,
        companies: {
            developers: form.developers,
            publishers: form.publishers,
        },
        companyMetadata,
        defaultSortText: renderers.defaultSort,
        englishName: form.englishName,
        form,
        genres: form.genres,
        infoboxText: renderers.infobox,
        leadNameText: prose.fragments.sentence1.s1a.titles,
        name: form.name,
        navboxText: renderers.navboxes,
        noteTaText: renderers.noteTa,
        originalLanguage: form.originalLanguage,
        originalName: form.originalName,
        records,
        platforms: form.platforms,
        platformSeriesMetadata,
        prose,
        renderers,
        sourceReferences,
        sourceTags,
        year: form.year,
        yearGenreMetadata,
    };

    return data;
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
        defaultName: trimFieldValue(options.defaultName),
        rawForm: options.rawForm || {},
        sourceReferences,
        sourceTags,

        /**
         * Gets citations matching exact keys or key prefixes.
         *
         * @param filters - Citation key filters.
         * @param filters.keys - Exact source keys.
         * @param filters.prefixes - Source key
         * prefixes.
         * @returns Matching named citations.
         */
        getCitations(filters: any = {}): Array<any> {
            const keys = filters.keys || [];
            const prefixes = filters.prefixes || [];

            return sourceReferences.filter(function callback(reference) {
                return (
                    keys.includes(reference.key) ||
                    prefixes.some(function callback(prefix) {
                        return reference.key.startsWith(prefix);
                    })
                );
            });
        },

        /**
         * Joins generated source tags for selected form fields.
         *
         * @param keys - Source reference keys.
         * @returns Joined source tags.
         */
        joinSourceTags(keys: Array<string>): string {
            return keys.map((key) => sourceTags[key] || "").join("");
        },
    };

    return context;
}


/**
 * Builds named source references.
 *
 * @param references - Source references.
 * @returns Source references with generated names.
 */
function buildNamedSourceReferences(references: Array<any>): Array<any> {
    return (references || []).map(function callback(reference, index) {
        return {
            ...reference,
            name: reference.name || `:${index + 1}`,
        };
    });
}


/**
 * Builds source reference tags keyed by article field.
 *
 * @param references - Named source references.
 * @returns Source tags keyed by field.
 */
function buildSourceReferenceTags(references: Array<any>): any {
    return references.reduce(function callback(tags, reference) {
        const tag = `<ref name="${reference.name}" />`;

        tags[reference.key] = `${tags[reference.key] || ""}${tag}`;

        return tags;
    }, {});
}
