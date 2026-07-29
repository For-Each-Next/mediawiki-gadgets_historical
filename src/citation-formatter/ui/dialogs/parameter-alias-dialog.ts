/** Build-injected reference-name alias dialog bundle. */

import type { CitationFormatterI18n } from "#gadget/i18n/index.ts";

import type { CitationDialogBundle } from "./dialog-bundle.ts";

export interface ParameterAliasActions {
    applyParameterAlias(): void;
    canApplyParameterAlias(): boolean;
    closeParameterAliasDialog(): void;
    getParameterAliasDialogError(): string;
    getParameterAliasDialogLabel(): string;
    getParameterAliasOriginalValueLabel(): string;
    onParameterAliasDialogOpenChange(open: boolean): void;
}

/**
 * Bindings exposed to the build-injected parameter-alias template.
 */
export type ParameterAliasContext = ParameterAliasActions & {
    interfaceLocale: string;
    loading: boolean;
    msg: CitationFormatterI18n["msg"];
    parameterAliasDialogDirectives: string[];
    parameterAliasDialogOpen: boolean;
    parameterAliasDialogOriginalValue: string;
    parameterAliasDialogValue: string;
};

const parameterAliasDialog: CitationDialogBundle = {
    styles:
        typeof __CITATION_FORMATTER_PARAMETER_ALIAS_DIALOG_STYLES__ ===
        "undefined"
            ? ""
            : __CITATION_FORMATTER_PARAMETER_ALIAS_DIALOG_STYLES__,
    template:
        typeof __CITATION_FORMATTER_PARAMETER_ALIAS_DIALOG_TEMPLATE__ ===
        "undefined"
            ? ""
            : __CITATION_FORMATTER_PARAMETER_ALIAS_DIALOG_TEMPLATE__,
};

export default parameterAliasDialog;
