/**
 * Build globals and template context for VG Stub Creator.
 */

import type { Icon, StatusType } from "@wikimedia/codex";
import type { VgStubCreatorTemplateBindings } from "./ui/form/component.ts";

type RawTemplateContext = {
    [
        Key in keyof VgStubCreatorTemplateBindings
    ]: VgStubCreatorTemplateBindings[Key] extends {
        value: infer Value;
    }
        ? Value
        : VgStubCreatorTemplateBindings[Key];
};
type TemplateForm = Record<string, any> & {
    citationRows: Array<any>;
    localizedNames: Array<any>;
};
type TemplateGroup = Record<string, any> & {
    nameGroupKey: "localizedNames" | null;
};
type TemplateMethodOverrides = {
    checkCategoryRow: (index: number, event?: Event) => Promise<void>;
    checkNavboxRow: (index: number, event?: Event) => Promise<void>;
    checkRedirectRow: (index: number, event?: Event) => Promise<void>;
    getCategoryStatusChipStatus: (row: any) => StatusType;
    getNavboxStatusChipStatus: (row: any) => StatusType;
    getRedirectStatusChipStatus: (row: any) => StatusType;
    getStubTagStatusChipStatus: (row: any) => StatusType;
    tableActionIcons: Record<string, Icon>;
};
type TemplateContext = Omit<
    RawTemplateContext,
    "form" | "groups" | "historyEntries" | keyof TemplateMethodOverrides
> &
    TemplateMethodOverrides & {
        form: TemplateForm;
        groups: Array<TemplateGroup>;
        historyEntries: Array<any>;
    };

declare global {
    const __VG_STUB_CREATOR_SHARED_DIALOG_STYLES__: string;
    const __VG_STUB_CREATOR_MAIN_DIALOG_TEMPLATE__: string;
    const __VG_STUB_CREATOR_MAIN_DIALOG_STYLES__: string;
    const __VG_STUB_CREATOR_PRE_SAVE_DIALOG_TEMPLATE__: string;
    const __VG_STUB_CREATOR_PRE_SAVE_DIALOG_STYLES__: string;
    const __VG_STUB_CREATOR_COMPANY_CATEGORY_DIALOG_TEMPLATE__: string;
    const __VG_STUB_CREATOR_COMPANY_CATEGORY_DIALOG_STYLES__: string;
    const __VG_STUB_CREATOR_CATEGORY_VIEW_DIALOG_TEMPLATE__: string;
    const __VG_STUB_CREATOR_CATEGORY_VIEW_DIALOG_STYLES__: string;
    const __VG_STUB_CREATOR_PAGE_EDIT_DIALOG_TEMPLATE__: string;
    const __VG_STUB_CREATOR_PAGE_EDIT_DIALOG_STYLES__: string;
    const __VG_STUB_CREATOR_MOVE_DIALOG_TEMPLATE__: string;
    const __VG_STUB_CREATOR_MOVE_DIALOG_STYLES__: string;
    const __VG_STUB_CREATOR_PREVIEW_DIALOG_TEMPLATE__: string;
    const __VG_STUB_CREATOR_PREVIEW_DIALOG_STYLES__: string;
    const __VG_STUB_CREATOR_HISTORY_DIALOG_TEMPLATE__: string;
    const __VG_STUB_CREATOR_HISTORY_DIALOG_STYLES__: string;
    const __VG_STUB_CREATOR_HISTORY_JSON_DIALOG_TEMPLATE__: string;
    const __VG_STUB_CREATOR_HISTORY_JSON_DIALOG_STYLES__: string;
}

declare module "@vue/runtime-core" {
    interface ComponentCustomProperties extends TemplateContext {}
}

export {};
