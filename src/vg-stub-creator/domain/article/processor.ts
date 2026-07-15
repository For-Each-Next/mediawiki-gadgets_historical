/**
 * Normalizes form data and flushes registered article modules.
 */

import { trimFieldValue } from "../../shared/form-values.ts";
import { buildArticleRenderers } from "../wikitext/outputs.ts";
import { buildArticleProse } from "../wikitext/prose.ts";
import { ARTICLE_MODULES } from "./modules";
import {
    buildReferenceReuseTag,
    nameCitationReferences,
} from "../../../shared/cite";

/**
 * Creates normalized article data and compatibility parameters.
 *
 * @param form - Raw dialog form values.
 * @param options - Processor options.
 * @param options.defaultName - Fallback article title.
 * @returns Normalized article data.
 */
export function createArticleData(form: any, options: any = {}): any {
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

/** Builds company metadata with rendered prose. */
function buildCompanyOutputMetadata(records, prose): any {
    return {
        ...records.companies.metadata,
        text: prose.fragments.sentence1.s1b,
    };
}

/** Builds platform and series output metadata. */
function buildPlatformSeriesMetadata(records, prose): any {
    return {
        categories: records.platform.assumedCategories,
        categoryPlans: records.series.categoryPlans,
        platformCount: records.platform.metadata.count,
        stubTags: records.platform.assumedStubTags,
        text: prose.fragments.sentence2,
    };
}

/** Builds year and genre output metadata. */
function buildYearGenreMetadata(records, prose): any {
    return {
        categories: [
            ...records.genre.assumedCategories,
            ...records.year.assumedCategories,
        ],
        stubTags: records.genre.assumedStubTags,
        text: prose.fragments.sentence1.s1a.yearGenre,
    };
}

/** Selects normalized form values exposed in article output. */
function buildArticleFormOutput(form): any {
    return {
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
        getCitations: getModuleCitations.bind(null, sourceReferences),
        joinSourceTags: joinModuleSourceTags.bind(null, sourceTags),
        rawForm: options.rawForm || {},
        sourceReferences,
        sourceTags,
    };

    return context;
}

/** Gets citations matching exact keys or key prefixes. */
function getModuleCitations(references, filters: any = {}): Array<any> {
    const keys = filters.keys || [];
    const prefixes = filters.prefixes || [];
    return references.filter(matchesModuleCitation.bind(null, keys, prefixes));
}

/** Checks whether one citation matches configured filters. */
function matchesModuleCitation(keys, prefixes, reference): boolean {
    return (
        keys.includes(reference.key) ||
        prefixes.some(hasCitationPrefix.bind(null, reference.key))
    );
}

/** Checks whether a citation key starts with one prefix. */
function hasCitationPrefix(key: string, prefix: string): boolean {
    return key.startsWith(prefix);
}

/** Joins generated source tags for selected form fields. */
function joinModuleSourceTags(sourceTags, keys: Array<string>): string {
    return keys.map(getModuleSourceTag.bind(null, sourceTags)).join("");
}

/** Gets one generated source tag by field key. */
function getModuleSourceTag(sourceTags, key: string): string {
    return sourceTags[key] || "";
}

/**
 * Builds source reference tags keyed by article field.
 *
 * @param references - Named source references.
 * @returns Source tags keyed by field.
 */
function buildSourceReferenceTags(references: Array<any>): any {
    return references.reduce(function callback(tags, reference) {
        const tag = buildReferenceReuseTag(reference.name);

        tags[reference.key] = `${tags[reference.key] || ""}${tag}`;

        return tags;
    }, {});
}
