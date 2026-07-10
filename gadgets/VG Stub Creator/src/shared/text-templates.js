/* eslint-disable */

/**
 * Formats generated text from the injected JSONC template catalog.
 */

import { FIELD_REFERENCE_DATA } from "./utils.js";

const TEXT_TEMPLATES = FIELD_REFERENCE_DATA.wikitext || {};

/**
 * Gets one template value by dotted key.
 *
 * @param {string} key - Dotted template key.
 * @returns {string} Template string.
 */
export function getTextTemplate(key) {
    const value = resolveTemplateValue(TEXT_TEMPLATES, key.split("."));

    if (typeof value !== "string") {
        throw new Error(`Missing text template: ${key}`);
    }

    return value;
}

/**
 * Resolves nested paths while allowing literal dots in property names.
 *
 * @param {object} data - Current template object.
 * @param {Array<string>} parts - Remaining dotted-key parts.
 * @returns {*} Resolved value.
 */
function resolveTemplateValue(data, parts) {
    if (data == null || parts.length === 0) {
        return data;
    }

    for (let length = parts.length; length > 0; length -= 1) {
        const property = parts.slice(0, length).join(".");

        if (Object.hasOwn(data, property)) {
            return resolveTemplateValue(data[property], parts.slice(length));
        }
    }

    return undefined;
}

/**
 * Substitutes named placeholders in one text template.
 *
 * @param {string} key - Dotted template key.
 * @param {object} [values] - Placeholder values.
 * @returns {string} Formatted text.
 */
export function formatText(key, values = {}) {
    const template = getTextTemplate(key);
    const result = template.replace(
        /\{([A-Za-z][A-Za-z0-9]*)\}/gu,
        (placeholder, name) => {
            if (!Object.hasOwn(values, name)) {
                return placeholder;
            }

            return String(values[name] ?? "");
        },
    );

    return result;
}
