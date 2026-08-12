/**
 * Citation Formatter locale registry and domain-message adapters.
 */

import * as i18n from "#shared/i18n";
import englishCatalog from "#gadget/i18n/en.json" with { type: "json" };
import zhHansCatalog from "#gadget/i18n/zh-Hans.json" with { type: "json" };
import zhHantCatalog from "#gadget/i18n/zh-Hant.json" with { type: "json" };

export const english = englishCatalog;
export const simplifiedChinese: i18n.LocaleCatalog<typeof english> =
    zhHansCatalog;
export const traditionalChinese: i18n.LocaleCatalog<typeof english> =
    zhHantCatalog;

const catalogs = {
    "en": english,
    "zh-Hans": simplifiedChinese,
    "zh-Hant": traditionalChinese,
};

export type MessageId = Extract<keyof typeof english, string>;

export interface CitationFormatterI18n {
    interfaceLocale: string;
    msg(id: MessageId, values?: i18n.MessageValues): string;
}

/**
 * Creates a formatter translator for an explicit or detected UI locale.
 *
 * @param locale - Requested interface locale.
 * @returns Locale-resolved formatter messages.
 */
export function createCitationFormatterI18n(
    locale: string = i18n.getMediaWikiInterfaceLanguage(),
): CitationFormatterI18n {
    const translator = i18n.createTranslator(catalogs, locale);
    return {
        interfaceLocale: translator.locale,
        msg(id, values) {
            return translator.text(id, values);
        },
    };
}

const messages = createCitationFormatterI18n();

export const interfaceLocale = messages.interfaceLocale;
export const msg = messages.msg;
