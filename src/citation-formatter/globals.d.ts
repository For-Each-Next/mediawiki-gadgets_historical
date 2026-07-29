/**
 * Build globals and template context for Citation Formatter.
 */

import type {
    CloseDialogContext,
    DraftDialogContext,
    MainDialogContext,
    ParameterAliasContext,
    ToolDialogContext,
} from "./ui/dialogs/index.ts";

type TemplateContext = CloseDialogContext &
    DraftDialogContext &
    MainDialogContext &
    ParameterAliasContext &
    ToolDialogContext;

declare global {
    const __CITATION_FORMATTER_STYLES__: string;
    const __CITATION_FORMATTER_MAIN_DIALOG_TEMPLATE__: string;
    const __CITATION_FORMATTER_MAIN_DIALOG_STYLES__: string;
    const __CITATION_FORMATTER_DRAFT_DIALOG_TEMPLATE__: string;
    const __CITATION_FORMATTER_DRAFT_DIALOG_STYLES__: string;
    const __CITATION_FORMATTER_PARAMETER_ALIAS_DIALOG_TEMPLATE__: string;
    const __CITATION_FORMATTER_PARAMETER_ALIAS_DIALOG_STYLES__: string;
    const __CITATION_FORMATTER_TOOL_DIALOG_TEMPLATE__: string;
    const __CITATION_FORMATTER_TOOL_DIALOG_STYLES__: string;
    const __CITATION_FORMATTER_CLOSE_DIALOG_TEMPLATE__: string;
    const __CITATION_FORMATTER_CLOSE_DIALOG_STYLES__: string;
    const __GADGET_BUILD_TIME__: string;
    const __GADGET_VERSION__: string;
}

declare module "@vue/runtime-core" {
    interface ComponentCustomProperties extends TemplateContext {}
}

export {};
