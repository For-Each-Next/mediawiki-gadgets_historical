/** Catalog translation with MediaWiki locale detection. */

export type MessageCatalog = Record<string, string>;
export type MessageCatalogs = Record<string, MessageCatalog>;
export type MessageGroups = Record<string, MessageCatalog>;
export type FlattenMessageGroups<Groups extends MessageGroups> = {
    [
        Group in keyof Groups & string as `${Group}.${Extract<
            keyof Groups[Group],
            string
        >}`
    ]: Groups[Group][Extract<keyof Groups[Group], string>];
};
export type MessagePartValues<T> = Record<string, T | T[]>;
export type MessageValues = Record<string, string | number>;
export type LocaleCatalog<Source extends MessageCatalog> = {
    [Id in keyof Source]: string;
};

export interface Translator {
    locale: string;
    parts<T>(message: string, values: MessagePartValues<T>): Array<string | T>;
    text(message: string, values?: MessageValues): string;
}

export interface TypedI18n<Id extends string> {
    interfaceLocale: string;
    msg(id: Id, values?: MessageValues): string;
    msgParts<T>(id: Id, values: MessagePartValues<T>): Array<string | T>;
}

/**
 * Defines grouped source messages and flattens them for runtime lookup.
 */
export function defineMessages<const Groups extends MessageGroups>(
    groups: Groups,
): FlattenMessageGroups<Groups> {
    const messages: MessageCatalog = {};
    for (const [group, entries] of Object.entries(groups)) {
        for (const [id, message] of Object.entries(entries)) {
            messages[`${group}.${id}`] = message;
        }
    }
    return messages as FlattenMessageGroups<Groups>;
}

/** Creates a typed translator from its English source catalog. */
export function createI18n<Source extends MessageCatalog>(
    english: Source,
    translations: Record<string, LocaleCatalog<Source>>,
): TypedI18n<Extract<keyof Source, string>> {
    const translator = createTranslator({ "en": english, ...translations });
    return {
        interfaceLocale: translator.locale,
        msg(id, values) {
            return translator.text(id, values);
        },
        msgParts(id, values) {
            return translator.parts(id, values);
        },
    };
}

/** Creates a translator for a set of locale catalogs. */
export function createTranslator(
    catalogs: MessageCatalogs,
    locale: string = getMediaWikiInterfaceLanguage(),
): Translator {
    const resolvedLocale = resolveLocale(locale, Object.keys(catalogs));
    return {
        locale: resolvedLocale,
        parts(message, values) {
            return interpolateMessageParts(
                getTranslatedMessage(catalogs, resolvedLocale, message),
                values,
            );
        },
        text(message, values = {}) {
            const translated = getTranslatedMessage(
                catalogs,
                resolvedLocale,
                message,
            );
            return interpolateMessage(translated, values);
        },
    };
}

/** Gets a translated message with English and source-key fallback. */
function getTranslatedMessage(
    catalogs: MessageCatalogs,
    locale: string,
    message: string,
): string {
    return catalogs[locale]?.[message] || catalogs.en?.[message] || message;
}

/** Gets the current MediaWiki interface language. */
export function getMediaWikiInterfaceLanguage(): string {
    if (typeof mw === "undefined") {
        return "en";
    }
    return String(mw.config.get("wgUserLanguage") || "en");
}

/** Resolves a requested locale against available catalogs. */
export function resolveLocale(
    locale: string,
    availableLocales: string[],
): string {
    const available = new Map(
        availableLocales.map((item) => [item.toLocaleLowerCase(), item]),
    );
    const normalized = normalizeLocale(locale);
    const exact = available.get(normalized.toLocaleLowerCase());
    if (exact != null) {
        return exact;
    }
    const base = available.get(normalized.split("-")[0].toLocaleLowerCase());
    return base || available.get("en") || availableLocales[0] || "en";
}

/** Normalizes common MediaWiki Chinese language variants. */
function normalizeLocale(locale: string): string {
    const value = String(locale || "en").replace(/_/gu, "-");
    if (/^zh(?:-(?:cn|hans|my|sg))?$/iu.test(value)) {
        return "zh-Hans";
    }
    if (/^zh-(?:hk|hant|mo|tw)$/iu.test(value)) {
        return "zh-Hant";
    }
    return value;
}

/** Substitutes named values in a translated message. */
function interpolateMessage(message: string, values: MessageValues): string {
    return message.replace(
        /\{([A-Za-z][A-Za-z0-9]*)\}/gu,
        function replace(text, key) {
            return Object.hasOwn(values, key) ? String(values[key]) : text;
        },
    );
}

/** Substitutes non-text values into named message placeholders. */
function interpolateMessageParts<T>(
    message: string,
    values: MessagePartValues<T>,
): Array<string | T> {
    const parts: Array<string | T> = [];
    const pattern = /\{([A-Za-z][A-Za-z0-9]*)\}/gu;
    let offset = 0;
    for (const match of message.matchAll(pattern)) {
        parts.push(message.slice(offset, match.index));
        appendMessagePart(parts, values[match[1]], match[0]);
        offset = match.index + match[0].length;
    }
    parts.push(message.slice(offset));
    return parts.filter((part) => part !== "");
}

/** Appends a scalar, list, or unresolved placeholder. */
function appendMessagePart<T>(
    parts: Array<string | T>,
    value: T | T[] | undefined,
    placeholder: string,
): void {
    if (Array.isArray(value)) {
        parts.push(...value);
        return;
    }
    parts.push(value == null ? placeholder : value);
}
