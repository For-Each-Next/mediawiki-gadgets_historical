/**
 * Formats generated text from the injected JSONC template catalog.
 */

import textTemplates from "./wikitext.ts";

const TEXT_TEMPLATES = textTemplates;

/**
 * Gets one template value by dotted key.
 *
 * @param key - Dotted template key.
 * @returns Template string.
 */
export function getTextTemplate(key: string): string {
    const value = resolveTemplateValue(TEXT_TEMPLATES, key.split("."));

    if (typeof value !== "string") {
        throw new Error(`Missing text template: ${key}`);
    }

    return value;
}

/**
 * Resolves nested paths while allowing literal dots in property names.
 *
 * @param data - Current template object.
 * @param parts - Remaining dotted-key parts.
 * @returns Resolved value.
 */
function resolveTemplateValue(data: any, parts: Array<string>): any {
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
 * @param key - Dotted template key.
 * @param values - Placeholder values.
 * @returns Formatted text.
 */
export function formatText(key: string, values: any = {}): string {
    const template = getTextTemplate(key);
    const result = template.replace(
        /\{([A-Za-z][A-Za-z0-9]*)\}/gu,
        function callback(placeholder, name) {
            if (!Object.hasOwn(values, name)) {
                return placeholder;
            }

            return String(values[name] ?? "");
        },
    );

    return result;
}
