/* eslint-disable */

/**
 * Normalizes form data and flushes registered article modules.
 */

import { trimFieldValue } from "../shared/form-values.js";
import { buildArticleRenderers } from "../wikitext/outputs.js";
import { buildArticleProse } from "../wikitext/prose.js";
import { ARTICLE_MODULES } from "./modules/index.js";

/**
 * Creates normalized article data and compatibility parameters.
 *
 * @param {object} form - Raw dialog form values.
 * @param {object} [options] - Processor options.
 * @param {string} [options.defaultName] - Fallback article title.
 * @returns {object} Normalized article data.
 */
export function createArticleData(form, options = {}) {
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
        ARTICLE_MODULES.map((module) => {
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
 * @param {object} form - Current form values.
 * @param {string} key - Form field key.
 * @param {*} value - Raw field value.
 * @returns {*} Canonical field value.
 */
export function formatArticleFormField(form, key, value) {
    const module = ARTICLE_MODULES.find((item) => item.fields.includes(key));

    if (module == null) {
        return trimFieldValue(value);
    }

    return module.formatField(key, value, form);
}

/**
 * Checks whether a registered field accepts multiple list items.
 *
 * @param {string} key - Form field key.
 * @returns {boolean} Whether the field is a multi-item list.
 */
export function isArticleListField(key) {
    return ARTICLE_MODULES.some((module) =>
        module.listFields.includes(key),
    );
}

/**
 * Gets static source URL fields declared by registered article modules.
 *
 * @returns {Array<object>} Source reference field definitions.
 */
export function getArticleSourceFields() {
    return ARTICLE_MODULES.flatMap((module) => module.sourceFields);
}

/**
 * Normalizes a form through every registered article module.
 *
 * @param {object} form - Raw form values.
 * @param {object} context - Shared module context.
 * @returns {object} Fully normalized form.
 */
function normalizeForm(form, context) {
    return ARTICLE_MODULES.reduce(
        (normalized, module) => {
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
 * @param {object} input - Processor input.
 * @param {object} input.form - Fully normalized form.
 * @param {object} input.records - Data records keyed by module name.
 * @param {Array<object>} input.sourceReferences - Named source references.
 * @param {object} input.sourceTags - Source tags keyed by field.
 * @returns {object} Processed article data.
 */
function buildArticleData(input) {
    const { form, records, sourceReferences, sourceTags } = input;
    const prose = buildArticleProse(records, sourceTags);
    const renderers = buildArticleRenderers(records, sourceTags);
    const companyMetadata = {
        ...records.companies.metadata,
        text: prose.fragments.companies,
    };
    const platformSeriesMetadata = {
        categories: records.platform.assumedCategories,
        categoryPlans: records.series.categoryPlans,
        platformCount: records.platform.metadata.count,
        stubTags: records.platform.assumedStubTags,
        text: prose.fragments.platformSeries,
    };
    const yearGenreMetadata = {
        categories: [
            ...records.genre.assumedCategories,
            ...records.year.assumedCategories,
        ],
        stubTags: records.genre.assumedStubTags,
        text: prose.fragments.yearGenre,
    };
    const data = {
        additionalProseText: prose.fragments.additional,
        aggScoresText: prose.fragments.scores,
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
        leadNameText: prose.fragments.leadName,
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
 * @param {Array<object>} sourceReferences - Named source references.
 * @param {object} sourceTags - Source tags keyed by field.
 * @param {object} options - Processor options.
 * @returns {object} Shared part context.
 */
function createModuleContext(sourceReferences, sourceTags, options) {
    const context = {
        defaultName: trimFieldValue(options.defaultName),
        rawForm: options.rawForm || {},
        sourceReferences,
        sourceTags,

        /**
         * Gets citations matching exact keys or key prefixes.
         *
         * @param {object} [filters] - Citation key filters.
         * @param {Array<string>} [filters.keys] - Exact source keys.
         * @param {Array<string>} [filters.prefixes] - Source key prefixes.
         * @returns {Array<object>} Matching named citations.
         */
        getCitations(filters = {}) {
            const keys = filters.keys || [];
            const prefixes = filters.prefixes || [];

            return sourceReferences.filter(
                (reference) =>
                    keys.includes(reference.key) ||
                    prefixes.some((prefix) =>
                        reference.key.startsWith(prefix),
                    ),
            );
        },

        /**
         * Joins generated source tags for selected form fields.
         *
         * @param {Array<string>} keys - Source reference keys.
         * @returns {string} Joined source tags.
         */
        joinSourceTags(keys) {
            return keys.map((key) => sourceTags[key] || "").join("");
        },
    };

    return context;
}

/**
 * Builds named source references.
 *
 * @param {Array<object>} [references] - Source references.
 * @returns {Array<object>} Source references with generated names.
 */
function buildNamedSourceReferences(references) {
    return (references || []).map((reference, index) => ({
        ...reference,
        name: reference.name || `:${index + 1}`,
    }));
}

/**
 * Builds source reference tags keyed by article field.
 *
 * @param {Array<object>} references - Named source references.
 * @returns {object} Source tags keyed by field.
 */
function buildSourceReferenceTags(references) {
    return references.reduce((tags, reference) => {
        const tag = `<ref name="${reference.name}" />`;

        tags[reference.key] = `${tags[reference.key] || ""}${tag}`;

        return tags;
    }, {});
}
