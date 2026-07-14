/**
 * Defines the common contract for article data-flow modules.
 */

import { createDataRecord } from "./data-record.ts";


/**
 * Defines one registered article data module.
 *
 * This factory fills the role of a metaclass in the gadget's plain
 * JavaScript runtime: every module exposes the same operations and
 * emits the
 * same payload shape, without relying on import-time self-registration.
 *
 * @param definition - Article module definition.
 * @param definition.fields - Owned form field keys.
 * @param definition.key - Stable module key.
 * @param definition.flush - Payload builder.
 * @param definition.formatField - Live field formatter.
 * @param definition.listFields - Multi-item fields.
 * @param definition.normalize - Form normalization
 * function.
 * @param definition.sourceFields - Source URL fields.
 * @returns Registered article module.
 */
export function defineArticleModule(definition: any): any {
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
         * @param form - Fully normalized article form.
         * @param context - Shared module context.
         * @returns Uniform article data record.
         */
        flush(form: any, context: any): any {
            const data = selectValue(
                definition.flush == null,
                function trueBranch() {
                    return {};
                },
                function falseBranch() {
                    return definition.flush(form, context);
                },
            );
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
         * @param key - Form field key.
         * @param value - Raw form field value.
         * @param form - Current form values.
         * @returns Formatted field value.
         */
        formatField(key: string, value: any, form: any): any {
            if (definition.formatField == null) {
                return value;
            }

            return definition.formatField(key, value, form);
        },

        /**
         * Normalizes all form values owned by this part.
         *
         * @param form - Current normalized form values.
         * @param context - Shared module context.
         * @returns Normalized form patch.
         */
        normalize(form: any, context: any): any {
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
 * @param form - Normalized form values.
 * @param fields - Owned form field keys.
 * @returns Owned normalized values.
 */
function pickFields(form: any, fields: ReadonlyArray<string>): any {
    return Object.fromEntries(
        fields
            .filter((field) => Object.hasOwn(form, field))
            .map((field) => [field, form[field]]),
    );
}


/**
 * Trims a part key for definition validation.
 *
 * @param key - Raw part key.
 * @returns Trimmed key.
 */
function trimKey(key: any): string {
    return key == null ? "" : String(key).trim();
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
