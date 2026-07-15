/**
 * Normalizes form data and flushes registered article modules.
 */

import { buildArticleProse, buildArticleRenderers } from "#me/domain/wiki.ts";
import { ARTICLE_MODULES } from "#me/domain/modules.ts";
import { cite, wikitext } from "#shared";
const { buildReferenceReuseTag, nameCitationReferences } = cite;
const { trimValue } = wikitext;

export {
    completeMetadataFieldValue,
    isCompletableMetadataField,
} from "#me/domain/data.ts";
export { ARTICLE_MODULES };
export { buildArticleProse };

/**
 * Aggregate review scores attached to an article record.
 */
export interface AggregateScoreMetadata {
    metacritic: {
        platform: string;
        score: string;
    };
    openCritic: {
        recommend: string;
    };
}

/**
 * Article record containing aggregate review scores.
 */
export interface AggregateScoreRecord {
    metadata: AggregateScoreMetadata;
}

export type SourceTags = Record<string, string | undefined>;

const ARRAY_KEYS = [
    "assumedCategories",
    "assumedStubTags",
    "categoryItems",
    "categoryPlans",
    "citations",
    "issues",
    "navboxes",
    "sourceUrls",
    "values",
];

/**
 * Creates the shared named record emitted by every article data module.
 *
 * @param key - Stable module key.
 * @param data - Module-specific record values.
 * @returns Uniform article data record.
 */
export function createDataRecord(
    key: string,
    data: any = {},
): ArticleDataRecord {
    const record = createBlankDataRecord(key, data);

    delete record.categories;
    delete record.stubTags;
    cloneRecordArrays(record);
    record.values = record.values.map(createDataValue);

    if (record.sourceUrls.length === 0) {
        record.sourceUrls = record.citations
            .map((citation) => citation.sourceUrl)
            .filter(Boolean);
    }

    return record;
}

/**
 * Creates a data record with blank shared collections.
 *
 * @param key - Lookup key.
 * @param data - Input data.
 * @returns A data record with blank shared collections.
 */
function createBlankDataRecord(key: string, data: any): ArticleDataRecord {
    const result = {
        assumedCategories: data.categories || [],
        assumedStubTags: data.stubTags || [],
        categoryItems: [],
        categoryPlans: [],
        citations: [],
        inputText: {},
        issues: [],
        key,
        metadata: {},
        navboxes: [],
        normalizedText: {},
        sourceUrls: [],
        values: [],
        wikitext: {},
        ...data,
    };
    return result;
}

/**
 * Clones mutable array values owned by a data record.
 *
 * @param record - Record value.
 */
function cloneRecordArrays(record: ArticleDataRecord): void {
    ARRAY_KEYS.forEach(function callback(arrayKey) {
        record[arrayKey] = [...(record[arrayKey] || [])];
    });
}

/**
 * Creates one normalized value carried by an article data record.
 *
 * Module-specific keys such as `key` and `role` are retained
 * alongside the universal text, link, and metadata fields.
 *
 * @param data - Module-specific value data.
 * @returns Uniform article data value.
 */
export function createDataValue(data: any = {}): ArticleDataValue {
    const normalizedText =
        data.normalizedText == null ? "" : String(data.normalizedText);
    const value: ArticleDataValue = {
        ...data,
        displayText: selectValue(
            data.displayText == null,
            function trueBranch() {
                return normalizedText;
            },
            function falseBranch() {
                return String(data.displayText);
            },
        ),
        linkTarget: data.linkTarget == null ? "" : String(data.linkTarget),
        metadata: data.metadata || {},
        normalizedText,
        wikitext:
            data.wikitext == null ? normalizedText : String(data.wikitext),
    };

    return value;
}

/**
 * Selects a lazily evaluated value for a condition.
 *
 * @param condition - Condition to evaluate.
 * @param trueBranch - Branch used when the condition is true.
 * @param falseBranch - Branch used when the condition is false.
 * @returns Value returned by the selected branch.
 */
function selectValue(
    condition: unknown,
    trueBranch: (...args: any[]) => any,
    falseBranch: (...args: any[]) => any,
): any {
    if (condition) {
        return trueBranch();
    }

    return falseBranch();
}

/**
 * Defines one registered article data module.
 *
 * @param definition - Article module definition.
 * @returns Registered article module.
 */
export function defineArticleModule(definition: any): any {
    if (trimKey(definition.key) === "") {
        throw new Error("Article modules require a key.");
    }

    const fields = Object.freeze([...(definition.fields || [])]);
    const listFields = Object.freeze([...(definition.listFields || [])]);
    const sourceFields = Object.freeze([...(definition.sourceFields || [])]);
    const module = {
        fields,
        flush: flushModule.bind(null, definition, fields),
        formatField: formatModuleField.bind(null, definition),
        key: definition.key,
        listFields,
        normalize: normalizeModule.bind(null, definition),
        sourceFields,
    };

    return Object.freeze(module);
}

/**
 * Builds one module data record.
 *
 * @param definition - Definition value.
 * @param fields - Fields value.
 * @param form - Form values.
 * @param context - Operation context.
 * @returns One module data record.
 */
function flushModule(
    definition: { flush: (arg0: unknown, arg1: unknown) => {}; key: string },
    fields: readonly string[],
    form: unknown,
    context: { rawForm: unknown },
): unknown {
    let data = {};

    if (definition.flush != null) {
        data = definition.flush(form, context);
    }
    const normalizedText = pickFields(form, fields);
    const inputText = pickFields(context.rawForm, fields);
    const payloadData = { inputText, normalizedText, ...data };
    return createDataRecord(definition.key, payloadData);
}

/**
 * Formats a live module field.
 *
 * @param definition - Definition value.
 * @param key - Lookup key.
 * @param value - Input value.
 * @param form - Form values.
 * @returns A live module field.
 */
function formatModuleField(
    definition: {
        formatField: (arg0: unknown, arg1: unknown, arg2: unknown) => unknown;
    },
    key: unknown,
    value: unknown,
    form: unknown,
): unknown {
    if (definition.formatField == null) {
        return value;
    }

    return definition.formatField(key, value, form);
}

/**
 * Normalizes one module's form values.
 *
 * @param definition - Definition value.
 * @param form - Form values.
 * @param context - Operation context.
 * @returns One module's form values.
 */
function normalizeModule(
    definition: { normalize?: (...args: unknown[]) => unknown },
    form: unknown,
    context: unknown,
): unknown {
    if (definition.normalize == null) {
        return {};
    }

    return definition.normalize(form, context);
}

/**
 * Gets the owned form fields from one form object.
 *
 * @param form - Normalized form values.
 * @param fields - Owned form field keys.
 * @returns Owned normalized values.
 */
function pickFields(form: any, fields: ReadonlyArray<string>): any {
    const result = Object.fromEntries(
        fields
            .filter((field) => Object.hasOwn(form, field))
            .map((field) => [field, form[field]]),
    );
    return result;
}

/**
 * Trims a module key for definition validation.
 *
 * @param key - Raw module key.
 * @returns Trimmed module key.
 */
function trimKey(key: any): string {
    return key == null ? "" : String(key).trim();
}

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
    const result = ARTICLE_MODULES.reduce(
        function callback(normalized, module) {
            const result = {
                ...normalized,
                ...module.normalize(normalized, context),
            };
            return result;
        },
        { ...form },
    );
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
    return references.filter(matchesModuleCitation.bind(null, keys, prefixes));
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
    const result =
        keys.includes(reference.key) ||
        prefixes.some(hasCitationPrefix.bind(null, reference.key));
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
    return keys.map(getModuleSourceTag.bind(null, sourceTags)).join("");
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
    const result = references.reduce(function callback(tags, reference) {
        const tag = buildReferenceReuseTag(reference.name);

        tags[reference.key] = `${tags[reference.key] || ""}${tag}`;

        return tags;
    }, {});
    return result;
}
