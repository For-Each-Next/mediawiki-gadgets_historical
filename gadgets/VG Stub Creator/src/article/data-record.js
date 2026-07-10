/* eslint-disable */

/**
 * Defines the named data records passed through article processing.
 */

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
 * @typedef {object} ArticleDataRecord
 * @property {Array<string>} assumedCategories
 * @property {Array<string>} assumedStubTags
 * @property {Array<object>} categoryItems
 * @property {Array<object>} categoryPlans
 * @property {Array<object>} citations
 * @property {object} inputText
 * @property {Array<object>} issues
 * @property {string} key
 * @property {object} metadata
 * @property {Array<object>} navboxes
 * @property {object} normalizedText
 * @property {Array<string>} sourceUrls
 * @property {Array<ArticleDataValue>} values
 * @property {object} wikitext
 */

/**
 * @typedef {object} ArticleDataValue
 * @property {string} displayText
 * @property {string} linkTarget
 * @property {object} metadata
 * @property {string} normalizedText
 * @property {string} wikitext
 */

/**
 * Creates the shared named record emitted by every article data module.
 *
 * @param {string} key - Stable module key.
 * @param {object} data - Module-specific record values.
 * @returns {ArticleDataRecord} Uniform article data record.
 */
export function createDataRecord(key, data = {}) {
    const record = {
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

    delete record.categories;
    delete record.stubTags;

    ARRAY_KEYS.forEach((arrayKey) => {
        record[arrayKey] = [...(record[arrayKey] || [])];
    });
    record.values = record.values.map(createDataValue);

    if (record.sourceUrls.length === 0) {
        record.sourceUrls = record.citations
            .map((citation) => citation.sourceUrl)
            .filter(Boolean);
    }

    return record;
}

/**
 * Creates one normalized value carried by an article data record.
 *
 * Module-specific keys such as `key` and `role` are retained alongside the
 * universal text, link, and metadata fields.
 *
 * @param {object} data - Module-specific value data.
 * @returns {ArticleDataValue} Uniform article data value.
 */
export function createDataValue(data = {}) {
    const normalizedText =
        data.normalizedText == null ? "" : String(data.normalizedText);
    const value = {
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

    return value;
}
