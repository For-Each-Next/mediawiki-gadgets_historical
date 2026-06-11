/* eslint-disable */

/**
 * Defines the common contract for article data-flow modules.
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
 * Defines one registered article part.
 *
 * This factory fills the role of a metaclass in the gadget's plain
 * JavaScript runtime: every part exposes the same operations and emits the
 * same payload shape, without relying on import-time self-registration.
 *
 * @param {object} definition - Article part definition.
 * @param {Array<string>} definition.fields - Owned form field keys.
 * @param {string} definition.key - Stable part key.
 * @param {Function} [definition.flush] - Payload builder.
 * @param {Function} [definition.formatField] - Live field formatter.
 * @param {Array<string>} [definition.listFields] - Multi-item fields.
 * @param {Function} [definition.normalize] - Form normalization function.
 * @param {Array<object>} [definition.sourceFields] - Source URL fields.
 * @returns {object} Registered article part.
 */
export function defineArticlePart(definition) {
    if (trimKey(definition.key) === "") {
        throw new Error("Article parts require a key.");
    }

    const fields = Object.freeze([...(definition.fields || [])]);
    const listFields = Object.freeze([...(definition.listFields || [])]);
    const sourceFields = Object.freeze([...(definition.sourceFields || [])]);

    return Object.freeze({
        fields,
        key: definition.key,
        listFields,
        sourceFields,

        /**
         * Builds a normalized payload for this part.
         *
         * @param {object} form - Fully normalized article form.
         * @param {object} context - Shared hub context.
         * @returns {object} Uniform article part payload.
         */
        flush(form, context) {
            const data =
                definition.flush == null
                    ? {}
                    : definition.flush(form, context);
            const normalizedText = pickFields(form, fields);
            const inputText = pickFields(context.rawForm, fields);
            const payloadData = {
                inputText,
                normalizedText,
                ...data,
            };

            return createArticlePartPayload(definition.key, payloadData);
        },

        /**
         * Formats a live form field owned by this part.
         *
         * @param {string} key - Form field key.
         * @param {*} value - Raw form field value.
         * @param {object} form - Current form values.
         * @returns {*} Formatted field value.
         */
        formatField(key, value, form) {
            if (definition.formatField == null) {
                return value;
            }

            return definition.formatField(key, value, form);
        },

        /**
         * Normalizes all form values owned by this part.
         *
         * @param {object} form - Current normalized form values.
         * @param {object} context - Shared hub context.
         * @returns {object} Normalized form patch.
         */
        normalize(form, context) {
            if (definition.normalize == null) {
                return {};
            }

            return definition.normalize(form, context);
        },
    });
}

/**
 * Creates the shared payload shape emitted by every article part.
 *
 * @param {string} key - Stable part key.
 * @param {object} data - Part-specific payload values.
 * @returns {object} Uniform article part payload.
 */
export function createArticlePartPayload(key, data = {}) {
    const payload = {
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

    delete payload.categories;
    delete payload.stubTags;

    ARRAY_KEYS.forEach((arrayKey) => {
        payload[arrayKey] = [...(payload[arrayKey] || [])];
    });
    payload.values = payload.values.map(createArticleValue);

    if (payload.sourceUrls.length === 0) {
        payload.sourceUrls = payload.citations
            .map((citation) => citation.sourceUrl)
            .filter(Boolean);
    }

    return payload;
}

/**
 * Creates the shared value shape sent from parts through the article hub.
 *
 * Part-specific keys such as `key` and `role` are retained alongside the
 * universal text, link, and metadata fields.
 *
 * @param {object} data - Part-specific value data.
 * @returns {object} Uniform article value.
 */
export function createArticleValue(data = {}) {
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

/**
 * Gets the owned form fields from one form object.
 *
 * @param {object} form - Normalized form values.
 * @param {Array<string>} fields - Owned form field keys.
 * @returns {object} Owned normalized values.
 */
function pickFields(form, fields) {
    return Object.fromEntries(
        fields
            .filter((field) => Object.hasOwn(form, field))
            .map((field) => [field, form[field]]),
    );
}

/**
 * Trims a part key for definition validation.
 *
 * @param {*} key - Raw part key.
 * @returns {string} Trimmed key.
 */
function trimKey(key) {
    return key == null ? "" : String(key).trim();
}
