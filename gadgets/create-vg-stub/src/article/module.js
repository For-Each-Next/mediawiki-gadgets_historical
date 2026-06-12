/* eslint-disable */

/**
 * Defines the common contract for article data-flow modules.
 */

import { createDataRecord } from "./data-record.js";

/**
 * Defines one registered article data module.
 *
 * This factory fills the role of a metaclass in the gadget's plain
 * JavaScript runtime: every module exposes the same operations and emits the
 * same payload shape, without relying on import-time self-registration.
 *
 * @param {object} definition - Article module definition.
 * @param {Array<string>} definition.fields - Owned form field keys.
 * @param {string} definition.key - Stable module key.
 * @param {Function} [definition.flush] - Payload builder.
 * @param {Function} [definition.formatField] - Live field formatter.
 * @param {Array<string>} [definition.listFields] - Multi-item fields.
 * @param {Function} [definition.normalize] - Form normalization function.
 * @param {Array<object>} [definition.sourceFields] - Source URL fields.
 * @returns {object} Registered article module.
 */
export function defineArticleModule(definition) {
    if (trimKey(definition.key) === "") {
        throw new Error("Article modules require a key.");
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
         * Builds a normalized record for this module.
         *
         * @param {object} form - Fully normalized article form.
         * @param {object} context - Shared module context.
         * @returns {object} Uniform article data record.
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

            return createDataRecord(definition.key, payloadData);
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
         * @param {object} context - Shared module context.
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
