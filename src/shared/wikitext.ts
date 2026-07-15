/**
 * Provides shared formatting and reference lookup helpers.
 */

/** A value accepted by a MediaWiki template parameter. */
export type TemplateParamValue = string | number | boolean | null | undefined;

/** A MediaWiki template parameter key and value. */
export type TemplateParam = [string | number | null, TemplateParamValue];

/**
 * Builds a template call.
 *
 * @param template - Template title without braces.
 * @returns Template wikitext.
 */
export function buildTemplateCall(template: string): string {
    return `{{${template}}}`;
}

/**
 * Builds template wikitext from parameter entries.
 *
 * @param name - Template name.
 * @param params - Template parameter entries.
 * @param style - Template layout style.
 * @returns Template wikitext.
 */
export function buildTemplateText(
    name: string,
    params: Array<TemplateParam>,
    style: string = "inline",
): string {
    const entries = params.filter(hasTemplateParamValue);

    if (style === "block") {
        return buildBlockTemplateText(name, entries);
    }

    return buildInlineTemplateText(name, entries);
}

/**
 * Builds inline template wikitext.
 *
 * @param name - Template name.
 * @param entries - Template parameter entries.
 * @returns Inline template wikitext.
 */
function buildInlineTemplateText(
    name: string,
    entries: Array<TemplateParam>,
): string {
    return [
        "{{",
        name,
        "",
        entries.map(buildInlineTemplateParam).join(""),
        "}}",
    ].join("");
}

/**
 * Builds block template wikitext.
 *
 * @param name - Template name.
 * @param entries - Template parameter entries.
 * @returns Block template wikitext.
 */
function buildBlockTemplateText(
    name: string,
    entries: Array<TemplateParam>,
): string {
    return [
        "{{",
        name,
        "\n",
        entries.map(buildBlockTemplateParam).join("\n"),
        "\n}}",
    ].join("");
}

/**
 * Builds one inline template parameter.
 *
 * @param entry - Template parameter entry.
 * @returns Inline template parameter.
 */
function buildInlineTemplateParam(entry: TemplateParam): string {
    const [key, value] = entry;

    if (typeof key === "number") {
        return `|${value}`;
    }

    return `|${key}=${value}`;
}

/**
 * Builds one block template parameter.
 *
 * @param entry - Template parameter entry.
 * @returns Block template parameter.
 */
function buildBlockTemplateParam(entry: TemplateParam): string {
    const [key, value] = entry;

    if (key == null) {
        return `| ${value}`;
    }

    return `| ${key} = ${value}`;
}

/**
 * Checks whether a template parameter should be emitted.
 *
 * @param entry - Template parameter entry.
 * @returns Whether the value should be emitted.
 */
function hasTemplateParamValue(entry: TemplateParam): boolean {
    const [_key, value] = entry;

    return value != null;
}

/**
 * Builds wiki link text.
 *
 * @param title - Link target.
 * @param label - Link label.
 * @returns Link wikitext.
 */
export function buildLinkText(title: string, label: string): string {
    if (hasSameFirstLetterCaseInsensitiveText(title, label)) {
        return `[[${label}]]`;
    }

    return `[[${title}|${label}]]`;
}

/**
 * Handles has same first letter case insensitive text.
 *
 * Compares link text while treating spaces and underscores as
 * equivalent and ignoring case only for the first character.
 *
 * @param title - Link target.
 * @param label - Link label.
 * @returns Whether an unpiped link can use the label.
 *
 */
function hasSameFirstLetterCaseInsensitiveText(
    title: string,
    label: string,
): boolean {
    const [titleFirst = "", ...titleRest] = [...title.replace(/_/gu, " ")];
    const [labelFirst = "", ...labelRest] = [...label.replace(/_/gu, " ")];

    return (
        titleFirst.toLocaleLowerCase() === labelFirst.toLocaleLowerCase() &&
        titleRest.join("") === labelRest.join("")
    );
}

/**
 * Gets an array property from matched reference definitions.
 *
 * @param references - Matched reference definitions.
 * @param key - Reference array key.
 * @returns Flattened reference values.
 */
export function getReferenceValues(
    references: Array<any>,
    key: string,
): Array<string> {
    return references.flatMap((reference) => reference[key] || []);
}

/**
 * Removes duplicate values while preserving order.
 *
 * @param values - Values to deduplicate.
 * @returns Unique values.
 */
export function uniqueValues(values: Array<string>): Array<string> {
    return Array.from(new Set(values));
}

/**
 * Splits one user-entered field into reusable lookup values.
 *
 * @param value - User-entered field value.
 * @returns Individual lookup values.
 */
export function splitFieldValues(value: string): Array<string> {
    return splitDelimitedFieldValue(value).map(trimValue).filter(Boolean);
}

/**
 * Splits one user-entered field into category/lookup values.
 *
 * @param value - User-entered field value.
 * @returns Individual values with wikilinks normalized.
 */
export function splitLookupFieldValues(value: string): Array<string> {
    return splitDelimitedFieldValue(value)
        .map(getWikilinkValue)
        .map(trimValue)
        .filter(Boolean);
}

/**
 * Gets the value represented by a whole wikilink field item.
 *
 * @param value - Field item text.
 * @returns Display text for piped links, or target text
 * otherwise.
 */
export function getWikilinkValue(value: string): string {
    const item = trimValue(value);
    const parts = getWikilinkParts(item);

    if (parts == null) {
        return item;
    }

    return parts.label || parts.target;
}

/**
 * Gets the target and display label from a whole wikilink field item.
 *
 * @param value - Field item text.
 * @returns Wikilink target and display label.
 */
export function getWikilinkParts(value: string): any | null {
    const match = getWikilinkMatch(trimValue(value));

    if (match == null) {
        return null;
    }

    const [target, label] = splitWikilinkParts(match[1]);

    return {
        label: trimValue(label),
        target: trimValue(target),
    };
}

/**
 * Checks whether a field item is a whole wikilink.
 *
 * @param value - Field item text.
 * @returns Whether the item is a wikilink.
 */
export function isWikilinkValue(value: string): boolean {
    return getWikilinkMatch(trimValue(value)) != null;
}

/**
 * Matches a whole wikilink field item.
 *
 * @param value - Field item text.
 * @returns Wikilink match.
 */
function getWikilinkMatch(value: string): RegExpMatchArray | null {
    return value.match(/^\[\[([^\[\]\r\n]+)\]\]$/u);
}

/**
 * Splits a delimited field without splitting inside wikilinks.
 *
 * @param value - User-entered field value.
 * @returns Raw field items.
 */
function splitDelimitedFieldValue(value: string): Array<string> {
    const text = value == null ? "" : String(value);
    const firstLevelOnly = hasFirstLevelFieldSeparator(text);
    const items = [];
    let item = "";
    let inWikilink = false;

    for (let index = 0; index < text.length; index++) {
        const pair = text.slice(index, index + 2);
        const transition = getWikilinkTransition(pair, inWikilink);

        if (transition != null) {
            inWikilink = transition;
            item += pair;
            index++;
            continue;
        }

        if (
            !inWikilink &&
            isFieldValueSeparator(text, index, firstLevelOnly)
        ) {
            items.push(item);
            item = "";
            continue;
        }

        item += text[index];
    }

    items.push(item);

    return items;
}

/** Gets the wikilink state after consuming a delimiter pair. */
function getWikilinkTransition(pair: string, inWikilink: boolean) {
    if (pair === "[[") {
        return true;
    }
    if (pair === "]]" && inWikilink) {
        return false;
    }

    return null;
}

/**
 * Checks whether a field has a first-level separator outside wikilinks.
 *
 * @param text - Full input text.
 * @returns Whether the field uses first-level item
 * separators.
 */
function hasFirstLevelFieldSeparator(text: string): boolean {
    let inWikilink = false;

    for (let index = 0; index < text.length; index++) {
        const pair = text.slice(index, index + 2);

        if (pair === "[[") {
            inWikilink = true;
            index++;
            continue;
        }

        if (pair === "]]" && inWikilink) {
            inWikilink = false;
            index++;
            continue;
        }

        if (!inWikilink && /[;；\r\n]/u.test(text[index])) {
            return true;
        }
    }

    return false;
}

/**
 * Splits wikilink internals into target and display label.
 *
 * @param value - Text inside a wikilink.
 * @returns Target and optional label.
 */
function splitWikilinkParts(value: string): Array<string> {
    const separatorIndex = value.indexOf("|");

    if (separatorIndex === -1) {
        return [value, ""];
    }

    return [value.slice(0, separatorIndex), value.slice(separatorIndex + 1)];
}

/**
 * Checks whether a character separates field values.
 *
 * @param text - Full input text.
 * @param index - Character index.
 * @param firstLevelOnly - Whether to ignore weaker
 * separators.
 * @returns Whether the character is a field separator.
 */
function isFieldValueSeparator(
    text: string,
    index: number,
    firstLevelOnly: boolean,
): boolean {
    const character = text[index];

    if (firstLevelOnly) {
        return /[;；\r\n]/u.test(character);
    }

    if (character === "/") {
        return isSpacedSlash(text, index);
    }

    return /[、,，;；\r\n]/u.test(character);
}

/**
 * Checks whether a slash is being used as a spaced field separator.
 *
 * @param text - Full input text.
 * @param index - Slash index.
 * @returns Whether the slash is a spaced separator.
 */
function isSpacedSlash(text: string, index: number): boolean {
    return (
        /\s/u.test(text[index - 1] || "") || /\s/u.test(text[index + 1] || "")
    );
}

/**
 * Trims a lookup value.
 *
 * @param value - Raw lookup value.
 * @returns Trimmed lookup value.
 */
export function trimValue(value: string): string {
    return value.trim();
}

/**
 * Gets one reference definition by key or alias.
 *
 * @param definitions - Reference definitions for
 * a
 * lookup field.
 * @param value - User-entered field item.
 * @returns Matched reference definition.
 */
export function getReferenceDefinition(
    definitions: any | Array<any>,
    value: string,
): any | undefined {
    return getReferenceEntry(definitions, value).reference;
}

/**
 * Gets one reference entry by key or alias.
 *
 * @param definitions - Reference definitions for
 * a
 * lookup field.
 * @param value - User-entered field item.
 * @returns Matched reference key and definition.
 */
export function getReferenceEntry(
    definitions: any | Array<any>,
    value: string,
): any {
    const entries = getReferenceEntries(definitions);
    const normalizedValue = normalizeAlias(getWikilinkValue(value));
    const entry = entries.find(function callback([key, definition]) {
        return (
            normalizeAlias(key) === normalizedValue ||
            normalizeAlias(definition.page || "") === normalizedValue ||
            normalizeAlias(definition.label || "") === normalizedValue ||
            hasMatchingReferenceAlias(definition.aliases, value)
        );
    });

    if (entry == null) {
        return {};
    }

    const [key, reference] = entry;

    return { key, reference };
}

/**
 * Gets reference entries from an array or keyed object.
 *
 * @param definitions - Reference definitions for
 * a
 * lookup field.
 * @returns Reference key and definition
 * pairs.
 */
function getReferenceEntries(
    definitions: any | Array<any>,
): Array<Array<string | any>> {
    if (Array.isArray(definitions)) {
        return definitions.map(function callback(definition) {
            return [getReferenceKey(definition), definition];
        });
    }

    return Object.entries(definitions || {});
}

/**
 * Gets the canonical key from one array reference definition.
 *
 * @param definition - Reference definition.
 * @param definition.aliases - Reference aliases.
 * @param definition.label - Canonical display label.
 * @param definition.page - Canonical page title.
 * @returns Canonical alias key.
 */
function getReferenceKey(definition: any): string | undefined {
    return (
        definition.page ||
        definition.label ||
        definition.aliases?.find((alias) => typeof alias === "string")
    );
}

/** Checks whether any definition alias matches a whole value. */
function hasMatchingReferenceAlias(
    aliases: Array<any>,
    value: string,
): boolean {
    for (const alias of aliases || []) {
        if (matchesReferenceAlias(alias, value)) {
            return true;
        }
    }

    return false;
}

/** Matches a string or regex alias against a whole value. */
function matchesReferenceAlias(
    alias: string | RegExp,
    value: string,
): boolean {
    const unwrappedValue = getWikilinkValue(value);

    if (typeof alias === "string") {
        return normalizeAlias(alias) === normalizeAlias(unwrappedValue);
    }

    alias.lastIndex = 0;
    const match = alias.exec(unwrappedValue);
    return match?.[0] === unwrappedValue;
}

/**
 * Normalizes an alias for case-insensitive matching.
 *
 * @param alias - Alias text.
 * @returns Normalized alias.
 */
function normalizeAlias(alias: string): string {
    return alias.toLocaleLowerCase();
}
