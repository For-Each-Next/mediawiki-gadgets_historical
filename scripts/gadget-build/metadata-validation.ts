/** Validates JavaScript and userscript artifact metadata values. */

import { hasText, isRecord } from "#workspace/metadata";
import type { GadgetUserscriptConfig } from "./types.ts";

const JAVASCRIPT_IDENTIFIER_PATTERN = /^[A-Za-z_$][\w$]*$/u;
const RESERVED_BINDING_NAMES = new Set([
    "arguments",
    "await",
    "break",
    "case",
    "catch",
    "class",
    "const",
    "continue",
    "debugger",
    "default",
    "delete",
    "do",
    "else",
    "enum",
    "eval",
    "export",
    "extends",
    "false",
    "finally",
    "for",
    "function",
    "if",
    "implements",
    "import",
    "in",
    "instanceof",
    "interface",
    "let",
    "new",
    "null",
    "package",
    "private",
    "protected",
    "public",
    "return",
    "static",
    "super",
    "switch",
    "this",
    "throw",
    "true",
    "try",
    "typeof",
    "var",
    "void",
    "while",
    "with",
    "yield",
]);
const GADGET_USERSCRIPT_FIELDS = new Set([
    "grant",
    "match",
    "runAt",
    "sandbox",
]);
const SUPPORTED_PACKAGE_LICENSES = new Set(["CC-BY-SA-4.0", "CC0-1.0", "MIT"]);

/** Checks a supported package SPDX identifier. */
export function isSupportedPackageLicense(value: unknown): value is string {
    return hasText(value) && SUPPORTED_PACKAGE_LICENSES.has(value);
}

/** Checks an identifier that can be bound inside strict async code. */
export function isJavaScriptBindingIdentifier(
    value: unknown,
): value is string {
    return (
        hasText(value) &&
        JAVASCRIPT_IDENTIFIER_PATTERN.test(value) &&
        !RESERVED_BINDING_NAMES.has(value)
    );
}

/** Checks one userscript metadata value for line boundaries. */
export function isSafeUserscriptMetadataText(value: unknown): value is string {
    return hasText(value) && !/[\r\n\u2028\u2029]/u.test(value);
}

/** Checks a repeated userscript field for safe metadata values. */
export function isSafeUserscriptMetadataTextArray(
    value: unknown,
): value is string[] {
    return Array.isArray(value) && value.every(isSafeUserscriptMetadataText);
}

/** Checks the exact JSON shape of build-time text definitions. */
export function isBuildDefineMap(
    value: unknown,
): value is Record<string, { textFile: string }> {
    return (
        isRecord(value) &&
        Object.values(value).every(
            (definition) =>
                isRecord(definition) &&
                Object.keys(definition).length === 1 &&
                hasText(definition.textFile),
        )
    );
}

/** Checks whether one package-facing userscript field is supported. */
export function isSupportedGadgetUserscriptField(field: string): boolean {
    return GADGET_USERSCRIPT_FIELDS.has(field);
}

/** Checks the exact package-facing userscript configuration. */
export function isGadgetUserscriptConfig(
    value: unknown,
): value is GadgetUserscriptConfig {
    if (
        !isRecord(value) ||
        Object.keys(value).some(
            (field) => !isSupportedGadgetUserscriptField(field),
        )
    ) {
        return false;
    }
    return (
        (value.grant == null ||
            isSafeUserscriptMetadataTextArray(value.grant)) &&
        (value.match == null ||
            isSafeUserscriptMetadataTextArray(value.match)) &&
        (value.runAt == null || isSafeUserscriptMetadataText(value.runAt)) &&
        (value.sandbox == null || isSafeUserscriptMetadataText(value.sandbox))
    );
}
