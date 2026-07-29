/**
 * Citation Formatter locale registry and domain-message adapters.
 */

import * as i18n from "#shared/i18n";
import type * as sourceAnalysis from "#gadget/domain/source-analysis.ts";
import englishCatalog from "#gadget/i18n/en.json" with { type: "json" };
import zhHansCatalog from "#gadget/i18n/zh-Hans.json" with { type: "json" };
import zhHantCatalog from "#gadget/i18n/zh-Hant.json" with { type: "json" };
import type { SourceValidationMessages } from "../domain/source-validation.ts";

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

/**
 * Creates localized messages for pure source-draft validation.
 *
 * @param translator - Locale-specific Citation Formatter translator.
 * @returns Validation-message adapter with no MediaWiki dependency.
 */
// eslint-disable-next-line max-lines-per-function
export function createSourceValidationMessages(
    translator: Pick<CitationFormatterI18n, "msg">,
): SourceValidationMessages {
    return {
        addParameter(message, parameter) {
            return translator.msg("validation.addParameter", {
                message,
                parameter,
            });
        },
        aliasRequiresValue() {
            return translator.msg("validation.aliasRequiresValue");
        },
        archiveDateRequiresUrl() {
            return translator.msg("validation.archiveDateRequiresUrl");
        },
        archiveUrlRequiresDate() {
            return translator.msg("validation.archiveUrlRequiresDate");
        },
        dependency(source, targets) {
            return translator.msg("validation.dependency", {
                source,
                targets: targets.join(translator.msg("validation.or")),
            });
        },
        dependencyWithParameter(source, targets, parameter) {
            return translator.msg("validation.dependencyWithParameter", {
                parameter,
                source,
                targets: targets.join(translator.msg("validation.or")),
            });
        },
        invalidDate(parameter) {
            return translator.msg("validation.invalidDate", { parameter });
        },
        parameterRequired() {
            return translator.msg("validation.parameterRequired");
        },
        unsupportedParameter(parameter) {
            return translator.msg("validation.unsupportedParameter", {
                parameter,
            });
        },
    };
}

/**
 * Creates localized labels and explanations for citation analysis.
 *
 * @param translator - Locale-specific Citation Formatter translator.
 * @returns Citation-analysis message adapter.
 */
// eslint-disable-next-line max-lines-per-function
export function createSourceAnalysisMessages(
    translator: Pick<CitationFormatterI18n, "msg">,
): sourceAnalysis.SourceAnalysisMessages {
    return {
        aliasLabel(sourceKey, value) {
            return translator.msg(
                sourceKey
                    ? "analysis.sourceKeyLabel"
                    : "analysis.hashAliasLabel",
                { value },
            );
        },
        aliasReason(sourceKey, hasMissing) {
            if (sourceKey) {
                return translator.msg(
                    hasMissing
                        ? "analysis.someMissingSourceKey"
                        : "analysis.differentSourceKey",
                );
            }
            return translator.msg(
                hasMissing
                    ? "analysis.someMissingAlias"
                    : "analysis.differentAlias",
            );
        },
        authorLabel(author) {
            return translator.msg("analysis.authorLabel", { author });
        },
        authorReason() {
            return translator.msg("analysis.authorReason");
        },
        domainLabel(category, domain) {
            return translator.msg(
                category === "publication"
                    ? "analysis.publicationLabel"
                    : "analysis.publisherLabel",
                { domain },
            );
        },
        domainReason(sameDisplayValue) {
            return translator.msg(
                sameDisplayValue
                    ? "analysis.sameDisplayStyle"
                    : "analysis.sameHostValue",
            );
        },
        fieldChanged() {
            return translator.msg("analysis.fieldChanged");
        },
        replacementConflict() {
            return translator.msg("analysis.replacementConflict");
        },
        sourceChanged() {
            return translator.msg("analysis.sourceChanged");
        },
        sourceMissing() {
            return translator.msg("analysis.sourceMissing");
        },
        untitledSource() {
            return translator.msg("common.untitledSource");
        },
    };
}

export const sourceValidationMessages =
    createSourceValidationMessages(messages);
export const sourceAnalysisMessages = createSourceAnalysisMessages(messages);
