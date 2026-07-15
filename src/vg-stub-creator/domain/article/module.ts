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

/** Builds one module data record. */
function flushModule(definition, fields, form, context): any {
    let data = {};

    if (definition.flush != null) {
        data = definition.flush(form, context);
    }
    const normalizedText = pickFields(form, fields);
    const inputText = pickFields(context.rawForm, fields);
    const payloadData = { inputText, normalizedText, ...data };
    return createDataRecord(definition.key, payloadData);
}

/** Formats a live module field. */
function formatModuleField(definition, key, value, form): any {
    if (definition.formatField == null) {
        return value;
    }

    return definition.formatField(key, value, form);
}

/** Normalizes one module's form values. */
function normalizeModule(definition, form, context): any {
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
