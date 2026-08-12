/** Locale adapters for source validation and analysis messages. */

import type * as analysis from "#gadget/domain/source-analysis.ts";
import type * as validation from "#gadget/domain/source-validation.ts";
import {
    createCitationFormatterI18n,
    type CitationFormatterI18n,
} from "#gadget/i18n/index.ts";

/** Creates localized messages for pure source-draft validation. */
// eslint-disable-next-line max-lines-per-function
export function createSourceValidationMessages(
    translator: Pick<CitationFormatterI18n, "msg">,
): validation.SourceValidationMessages {
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
        invalidParameterName() {
            return translator.msg("validation.invalidParameterName");
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

/** Creates localized labels and explanations for citation analysis. */
// eslint-disable-next-line max-lines-per-function
export function createSourceAnalysisMessages(
    translator: Pick<CitationFormatterI18n, "msg">,
): analysis.SourceAnalysisMessages {
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

const messages = createCitationFormatterI18n();

export const sourceValidationMessages =
    createSourceValidationMessages(messages);
export const sourceAnalysisMessages = createSourceAnalysisMessages(messages);
