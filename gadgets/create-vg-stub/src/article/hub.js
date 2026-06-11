/* eslint-disable */

/**
 * Normalizes form data and flushes registered article parts.
 */

import { trimFieldValue } from "../form-values.js";
import { ARTICLE_PARTS } from "./parts/index.js";
import { buildArticleProse } from "./prose.js";
import { buildArticleRenderers } from "./renderers.js";

/**
 * Creates normalized article data and compatibility parameters.
 *
 * @param {object} form - Raw dialog form values.
 * @param {object} [options] - Hub options.
 * @param {string} [options.defaultName] - Fallback article title.
 * @returns {object} Normalized article data hub output.
 */
export function createArticleData(form, options = {}) {
    const sourceReferences = buildNamedSourceReferences(form.sourceReferences);
    const sourceTags = buildSourceReferenceTags(sourceReferences);
    const contextOptions = {
        ...options,
        rawForm: form,
    };
    const context = createHubContext(
        sourceReferences,
        sourceTags,
        contextOptions,
    );
    const normalizedForm = normalizeForm(form, context);
    const parts = Object.fromEntries(
        ARTICLE_PARTS.map((part) => {
            const payload = part.flush(normalizedForm, context);

            return [part.key, payload];
        }),
    );

    return buildArticleData(
        normalizedForm,
        parts,
        sourceReferences,
        sourceTags,
        context,
    );
}

/**
 * Formats one live form field through its owning article part.
 *
 * @param {object} form - Current form values.
 * @param {string} key - Form field key.
 * @param {*} value - Raw field value.
 * @returns {*} Canonical field value.
 */
export function formatArticleFormField(form, key, value) {
    const part = ARTICLE_PARTS.find((item) => item.fields.includes(key));

    if (part == null) {
        return trimFieldValue(value);
    }

    return part.formatField(key, value, form);
}

/**
 * Checks whether a registered field accepts multiple list items.
 *
 * @param {string} key - Form field key.
 * @returns {boolean} Whether the field is a multi-item list.
 */
export function isArticleListField(key) {
    return ARTICLE_PARTS.some((part) => part.listFields.includes(key));
}

/**
 * Gets static source URL fields declared by registered article parts.
 *
 * @returns {Array<object>} Source reference field definitions.
 */
export function getArticleSourceFields() {
    return ARTICLE_PARTS.flatMap((part) => part.sourceFields);
}

/**
 * Normalizes a form through every registered article part.
 *
 * @param {object} form - Raw form values.
 * @param {object} context - Hub context.
 * @returns {object} Fully normalized form.
 */
function normalizeForm(form, context) {
    return ARTICLE_PARTS.reduce(
        (normalized, part) => {
            return {
                ...normalized,
                ...part.normalize(normalized, context),
            };
        },
        { ...form },
    );
}

/**
 * Builds the complete hub output and legacy parameter aliases.
 *
 * @param {object} form - Fully normalized form.
 * @param {object} parts - Part payloads keyed by part name.
 * @param {Array<object>} sourceReferences - Named source references.
 * @param {object} sourceTags - Source tags keyed by field.
 * @param {object} context - Shared hub context.
 * @returns {object} Article hub output.
 */
function buildArticleData(
    form,
    parts,
    sourceReferences,
    sourceTags,
    _context,
) {
    const prose = buildArticleProse(parts, sourceTags);
    const renderers = buildArticleRenderers(parts, sourceTags);
    const companyMetadata = {
        ...parts.companies.metadata,
        text: prose.fragments.companies,
    };
    const platformSeriesMetadata = {
        categories: parts.platform.assumedCategories,
        categoryPlans: parts.series.categoryPlans,
        platformCount: parts.platform.metadata.count,
        stubTags: parts.platform.assumedStubTags,
        text: prose.fragments.platformSeries,
    };
    const yearGenreMetadata = {
        categories: [
            ...parts.genre.assumedCategories,
            ...parts.year.assumedCategories,
        ],
        stubTags: parts.genre.assumedStubTags,
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
        parts,
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
 * Creates helpers shared by all article parts.
 *
 * @param {Array<object>} sourceReferences - Named source references.
 * @param {object} sourceTags - Source tags keyed by field.
 * @param {object} options - Hub options.
 * @returns {object} Shared part context.
 */
function createHubContext(sourceReferences, sourceTags, options) {
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
