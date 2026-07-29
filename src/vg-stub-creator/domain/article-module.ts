/**
 * Defines and normalizes article-module records.
 */

import type {
    ArticleDataRecord,
    ArticleDataValue,
    ArticleModule,
    ArticleModuleContext,
    ArticleModuleDefinition,
} from "#gadget/domain/models.ts";
import * as wikitext from "#shared/wikitext";

const { trimValue } = wikitext;

/**
 * Creates the shared named record emitted by every article data module.
 *
 * @param key - Stable module key.
 * @param data - Module-specific record values.
 * @returns Uniform article data record.
 */
export function createDataRecord(
    key: string,
    data: Record<string, any> = {},
): ArticleDataRecord {
    const record = createBlankDataRecord(key, data);

    delete record.categories;
    delete record.stubTags;
    cloneRecordArrays(record);
    record.values = record.values.map(createDataValue);

    if (record.sourceUrls.length === 0) {
        record.sourceUrls = record.citations
            .map((citation) => citation.sourceUrl)
            .filter((url): url is string => Boolean(url));
    }

    return record;
}

/**
 * Creates one normalized value carried by an article data record.
 *
 * @param data - Module-specific value data.
 * @returns Uniform article data value.
 */
export function createDataValue(
    data: Record<string, any> = {},
): ArticleDataValue {
    const normalizedText =
        data.normalizedText == null ? "" : String(data.normalizedText);

    return {
        ...data,
        displayText:
            data.displayText == null
                ? normalizedText
                : String(data.displayText),
        linkTarget: data.linkTarget == null ? "" : String(data.linkTarget),
        metadata: data.metadata || {},
        normalizedText,
        wikitext:
            data.wikitext == null ? normalizedText : String(data.wikitext),
    };
}

/**
 * Defines one registered article data module.
 *
 * @param definition - Article module definition.
 * @returns Immutable runtime article module.
 */
export function defineArticleModule(
    definition: ArticleModuleDefinition,
): ArticleModule {
    if (trimKey(definition.key) === "") {
        throw new Error("Article modules require a key.");
    }

    const fields = Object.freeze([...(definition.fields || [])]);
    const listFields = Object.freeze([...(definition.listFields || [])]);
    const sourceFields = Object.freeze([...(definition.sourceFields || [])]);
    const module: ArticleModule = {
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
 * Creates a data record with independent shared collections.
 */
function createBlankDataRecord(
    key: string,
    data: Record<string, any>,
): ArticleDataRecord {
    const record = {
        assumedCategories: [],
        assumedStubTags: [],
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
    } as ArticleDataRecord;
    record.assumedCategories = data.categories || data.assumedCategories || [];
    record.assumedStubTags = data.stubTags || data.assumedStubTags || [];
    return record;
}

/**
 * Clones mutable array values owned by a data record.
 */
function cloneRecordArrays(record: ArticleDataRecord): void {
    record.assumedCategories = [...(record.assumedCategories || [])];
    record.assumedStubTags = [...(record.assumedStubTags || [])];
    record.categoryItems = [...(record.categoryItems || [])];
    record.categoryPlans = [...(record.categoryPlans || [])];
    record.citations = [...(record.citations || [])];
    record.issues = [...(record.issues || [])];
    record.navboxes = [...(record.navboxes || [])];
    record.sourceUrls = [...(record.sourceUrls || [])];
    record.values = [...(record.values || [])];
}

/**
 * Builds one module data record.
 */
function flushModule(
    definition: ArticleModuleDefinition,
    fields: readonly string[],
    form: Record<string, any>,
    context: ArticleModuleContext,
): ArticleDataRecord {
    const data = definition.flush?.(form, context) || {};
    const normalizedText = pickFields(form, fields);
    const inputText = pickFields(context.rawForm, fields);

    return createDataRecord(definition.key, {
        inputText,
        normalizedText,
        ...data,
    });
}

/**
 * Formats a live module field.
 */
function formatModuleField(
    definition: ArticleModuleDefinition,
    key: string,
    value: unknown,
    form: Record<string, any>,
): unknown {
    return definition.formatField?.(key, value, form) ?? value;
}

/**
 * Normalizes one module's form values.
 */
function normalizeModule(
    definition: ArticleModuleDefinition,
    form: Record<string, any>,
    context: ArticleModuleContext,
): Record<string, any> {
    return definition.normalize?.(form, context) || {};
}

/**
 * Gets the owned form fields from one form object.
 */
function pickFields(
    form: Record<string, any>,
    fields: readonly string[],
): Record<string, unknown> {
    return Object.fromEntries(
        fields
            .filter((field) => Object.hasOwn(form, field))
            .map((field) => [field, form[field]]),
    );
}

/**
 * Trims a module key for definition validation.
 */
function trimKey(key: unknown): string {
    return trimValue(key);
}
