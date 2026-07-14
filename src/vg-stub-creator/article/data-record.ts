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

/** Creates a data record with blank shared collections. */
function createBlankDataRecord(key: string, data: any): ArticleDataRecord {
    return {
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

}

/** Clones mutable array values owned by a data record. */
function cloneRecordArrays(record: ArticleDataRecord): void {
    ARRAY_KEYS.forEach(function callback(arrayKey) {
        record[arrayKey] = [...(record[arrayKey] || [])];
    });
}


/**
 * Creates one normalized value carried by an article data record.
 *
 * Module-specific keys such as `key` and `role` are retained alongside
 * the
 * universal text, link, and metadata fields.
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
 * @param trueBranch - Branch used when the condition is
 * true.
 * @param falseBranch - Branch used when the condition is
 * false.
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
