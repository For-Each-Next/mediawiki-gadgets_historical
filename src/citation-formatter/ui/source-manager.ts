/**
 * Cursor-aware source insertion and citation-field management dialog.
 */

import { manageCitationsWithResult } from "#me/app/format.ts";
import { detectCitationLayout } from "#me/domain/manager.ts";
import {
    buildExistingSourceReference,
    canJoinAuthorDraftRow,
    canSplitAuthorDraftRow,
    changeSourceDraftTemplate,
    createManualSourceDraft,
    ensureNextAuthorDraftRows,
    filterExistingSources,
    findCreatorAliasSuggestions,
    findExistingSources,
    formatSourceDraftRows,
    getSourceDraftCitationName,
    getSourceDraftCitationNameCells,
    isAuthorDraftParameter,
    isLastAuthorDraftParameter,
    joinAuthorDraftRow,
    listExistingSourceSections,
    listExistingSources,
    parseSourceDraft,
    parseSourceInput,
    replaceExistingSource,
    serializeSourceDraft,
    splitAuthorDraftRow,
    type ExistingSource,
    type CreatorAliasSuggestion,
    type ParsedSourceInput,
    type SourceSection,
    type SourceDraft,
    type SourceDraftCitationNameCell,
    type SourceDraftRow,
} from "#me/domain/source-manager.ts";
import {
    getSourceDraftErrors,
    type SourceDraftErrors,
} from "#me/domain/source-validation.ts";
import {
    getCanonicalTemplateName,
    SUPPORTED_CITATION_TEMPLATES,
} from "#me/domain/templates.ts";
import type { CitationLayout } from "#me/domain/types.ts";
import { splitTopLevel } from "#me/domain/wikitext.ts";
import { resolveSourceMetadata } from "#me/infra/source-metadata.ts";
import { addManagerStyles } from "#me/ui/styles.ts";
import type { editBox } from "#shared";

const HOST_ID = "citation-formatter-source-manager";
const BASED_ON_TEMPLATE = "__based-on__";
const FORMATTER_MENU_ITEMS = [
    { label: "Reference calls: <ref>", value: "reference:ref" },
    { label: "Reference calls: {{r}}", value: "reference:r" },
    { label: "Citation layout: Inline", value: "layout:inline" },
    {
        label: "Citation layout: Block (two-space indent)",
        value: "layout:block",
    },
];
const USE_SOURCE_ICON = {
    ltr:
        '<path d="M15 20H1V4h14zM3 18h10V6h-2v8.5h-.914L9 13.414 ' +
        '7.914 14.5H7V6H3z"/><path d="M19 16h-2V2H5V0h14z"/>',
    shouldFlip: true,
};
const EDIT_SOURCE_ICON =
    '<path d="m15.765 7.875-8.483 8.484a1 1 0 01-.253.184l-4.214 ' +
    "2.15-1.357-1.33L3.58 13.12q.073-.145.188-.26l8.48-8.48zm3.534-" +
    '3.532-2.12 2.118-3.517-3.496 2.13-2.13z"/>';
const COPY_SOURCE_ICON = {
    ltr: '<path d="M13 19H1V7h6V1h12v12h-6zm-6-6V9H3v8h8v-4zm2-2h8V3H9z"/>',
    shouldFlip: true,
};
const SPLIT_AUTHOR_ICON =
    '<path d="M7 10c.91 0 1.764.244 2.5.67A5 5 0 0112 10h3a5 5 ' +
    "0 015 5v2H0v-2a5 5 0 015-5zm5 2q-.473.002-.901.138c.567.81.901 " +
    "1.797.901 2.862h6a3 3 0 00-3-3zM6 3a3 3 0 110 6 3 3 0 010-6M13.5 " +
    '3a3 3 0 110 6 3 3 0 010-6m0 2a1 1 0 100 2 1 1 0 000-2"/>';
const JOIN_AUTHOR_ICON =
    '<path d="M12 11a6 6 0 016 6v2H2v-2a6 6 0 016-6zM10 1a4 4 0 ' +
    '110 8 4 4 0 010-8"/>';
const FORMAT_ROWS_ICON =
    '<path d="M10 1a8.98 8.98 0 016.999 3.343L17 2h2v5l-1 1h-5' +
    'l-.001-2h2.746a7 7 0 101.184 5h2.016A9 9 0 1110 1"/>';
const TEMPLATE_OPTIONS = SUPPORTED_CITATION_TEMPLATES.map(
    function toOption(name) {
        return {
            label: name,
            value: name.toLocaleLowerCase("en-US"),
        };
    },
);
const MANUAL_TEMPLATE_OPTIONS = [
    { label: "Based on existing source", value: BASED_ON_TEMPLATE },
    ...TEMPLATE_OPTIONS,
];

type SourceManagerMode = "draft" | "lookup";
type DraftActions = Record<string, unknown>;
export type ReferenceStyle = "r" | "ref";
let removeActiveSourceManager: (() => void) | null = null;
let sourceManagerGeneration = 0;

export interface SourceManagerOptions {
    citationLayout?: CitationLayout;
    referenceStyle?: ReferenceStyle;
}

interface VueModule {
    computed: <T>(getter: () => T) => { readonly value: T };
    createMwApp: (component: unknown) => VueApp;
    defineComponent: (component: unknown) => unknown;
    ref: <T>(value: T) => { value: T };
}

interface VueApp {
    component: (name: string, component: unknown) => void;
    directive: (name: string, directive: unknown) => void;
    mount: (host: HTMLElement) => void;
    unmount: () => void;
}

interface CodexComponents {
    CdxButton: unknown;
    CdxCombobox: unknown;
    CdxDialog: unknown;
    CdxField: unknown;
    CdxIcon: unknown;
    CdxMenuButton: unknown;
    CdxMessage: unknown;
    CdxProgressBar: unknown;
    CdxSelect: unknown;
    CdxTab: unknown;
    CdxTabs: unknown;
    CdxTextInput: unknown;
    CdxTooltip: unknown;
}

interface ResourceLoaderRequire {
    (module: "vue"): VueModule;
    (module: "@wikimedia/codex"): CodexComponents;
}

interface SourceManagerState {
    activeLookupTab: { value: string };
    basedOnSourceId: { value: string };
    basedOnSourceOptions: {
        readonly value: Array<{ label: string; value: string }>;
    };
    citationLayout: { value: CitationLayout };
    citationName: { readonly value: string };
    citationNameCells: {
        readonly value: Map<number, SourceDraftCitationNameCell>;
    };
    dismissedAliasSuggestions: { value: Set<string> };
    draft: { value: SourceDraft | null };
    draftCellErrors: { readonly value: SourceDraftErrors };
    draftSourcePreview: { readonly value: SourcePreviewPart[] };
    editingSource: { value: ExistingSource | null };
    error: { value: string };
    existingSourceQuery: { value: string };
    existingSourceSections: { value: SourceSection[] };
    existingSources: { value: ExistingSource[] };
    filteredExistingSources: { readonly value: ExistingSource[] };
    formatterMenuSelection: { value: string | null };
    formatterSettingsLabel: { readonly value: string };
    loading: { value: boolean };
    manualTemplate: { value: string | null };
    mode: { value: SourceManagerMode };
    open: { value: boolean };
    referenceStyle: { value: ReferenceStyle };
    sourceUrl: { value: string };
    sourceSectionPath: { value: string[] };
    sourceSectionSelectors: {
        readonly value: SourceSectionSelector[];
    };
    warning: { value: string };
}

interface SourceManagerActionContext {
    cleanup: () => void;
    close: () => void;
    editor: editBox.EditBox;
    state: SourceManagerState;
}

interface SourceManagerDerivedInputs {
    citationLayout: SourceManagerState["citationLayout"];
    draft: SourceManagerState["draft"];
    existingSourceQuery: SourceManagerState["existingSourceQuery"];
    existingSourceSections: SourceManagerState["existingSourceSections"];
    existingSources: SourceManagerState["existingSources"];
    referenceStyle: SourceManagerState["referenceStyle"];
    sourceSectionPath: SourceManagerState["sourceSectionPath"];
}

interface SourceSectionSelector {
    label: string;
    level: number;
    menuItems: Array<{ label: string; value: string }>;
    selected: string;
}

interface SourcePreviewPart {
    kind: "alias" | "parameter" | "text";
    text: string;
}

type SourceManagerDerivedState = Pick<
    SourceManagerState,
    | "basedOnSourceOptions"
    | "citationName"
    | "citationNameCells"
    | "draftSourcePreview"
    | "draftCellErrors"
    | "filteredExistingSources"
    | "formatterSettingsLabel"
    | "sourceSectionSelectors"
>;

/** Opens the source manager for the active MediaWiki source editor. */
export async function openSourceManager(
    editor: editBox.EditBox,
    options: SourceManagerOptions = {},
): Promise<void> {
    const generation = ++sourceManagerGeneration;
    addManagerStyles();
    const require = (await mw.loader.using([
        "vue",
        "@wikimedia/codex",
    ])) as ResourceLoaderRequire;
    if (generation !== sourceManagerGeneration) {
        return;
    }
    removeActiveSourceManager?.();
    mountSourceManager(editor, require, options);
}

/** Mounts the source manager into a temporary document host. */
function mountSourceManager(
    editor: editBox.EditBox,
    require: ResourceLoaderRequire,
    options: SourceManagerOptions,
): void {
    const Vue = require("vue");
    const Codex = require("@wikimedia/codex");
    const host = document.createElement("div");
    host.id = HOST_ID;
    document.documentElement.append(host);
    let cleaned = false;
    const cleanup = function cleanup(): void {
        if (cleaned) {
            return;
        }
        cleaned = true;
        application.unmount();
        host.remove();
        if (removeActiveSourceManager === cleanup) {
            removeActiveSourceManager = null;
        }
    };
    const component = createSourceManagerComponent(
        Vue,
        editor,
        cleanup,
        options,
    );
    const application = Vue.createMwApp(component);
    registerCodexComponents(application, Codex);
    application.mount(host);
    queueMicrotask(function focusSourceInput(): void {
        document
            .querySelector<HTMLInputElement>(
                ".cf-source-manager__lookup input",
            )
            ?.focus({ preventScroll: true });
    });
    removeActiveSourceManager = cleanup;
}

/** Creates the source-manager Vue component. */
function createSourceManagerComponent(
    Vue: VueModule,
    editor: editBox.EditBox,
    cleanup: () => void,
    options: SourceManagerOptions,
): unknown {
    const setup = function setup(): Record<string, unknown> {
        const state = createSourceManagerState(Vue, editor, options);
        const actions = createSourceManagerActions(editor, state, cleanup);
        return {
            copySourceIcon: COPY_SOURCE_ICON,
            editSourceIcon: EDIT_SOURCE_ICON,
            formatRowsIcon: FORMAT_ROWS_ICON,
            formatterMenuItems: FORMATTER_MENU_ITEMS,
            joinAuthorIcon: JOIN_AUTHOR_ICON,
            manualTemplateOptions: MANUAL_TEMPLATE_OPTIONS,
            sourceTemplateLabel: getCanonicalTemplateName,
            templateOptions: TEMPLATE_OPTIONS,
            splitAuthorIcon: SPLIT_AUTHOR_ICON,
            useSourceIcon: USE_SOURCE_ICON,
            ...actions,
            ...state,
        };
    };
    return Vue.defineComponent({
        name: "CitationSourceManager",
        setup,
        template: SOURCE_MANAGER_TEMPLATE,
    });
}

/** Creates initial reactive state from the current editor contents. */
function createSourceManagerState(
    Vue: VueModule,
    editor: editBox.EditBox,
    options: SourceManagerOptions,
): SourceManagerState {
    const text = editor.read();
    const sourceList = createInitialSourceListState(Vue, text);
    const citationLayout = Vue.ref(options.citationLayout ?? "inline");
    const draft = Vue.ref<SourceDraft | null>(null);
    const referenceStyle = Vue.ref(options.referenceStyle ?? "ref");
    const derived = createSourceManagerDerivedState(Vue, {
        citationLayout,
        draft,
        referenceStyle,
        ...sourceList,
    });
    return {
        ...derived,
        ...sourceList,
        activeLookupTab: Vue.ref("add"),
        basedOnSourceId: Vue.ref(""),
        citationLayout,
        dismissedAliasSuggestions: Vue.ref(new Set<string>()),
        draft,
        editingSource: Vue.ref<ExistingSource | null>(null),
        error: Vue.ref(""),
        formatterMenuSelection: Vue.ref<string | null>(null),
        loading: Vue.ref(false),
        manualTemplate: Vue.ref<string | null>("cite magazine"),
        mode: Vue.ref<SourceManagerMode>("lookup"),
        open: Vue.ref(true),
        referenceStyle,
        sourceUrl: Vue.ref(""),
        warning: Vue.ref(""),
    };
}

/** Creates reactive source-list values from the current editor text. */
function createInitialSourceListState(Vue: VueModule, text: string) {
    const existingSources = Vue.ref(listExistingSources(text));
    return {
        existingSourceQuery: Vue.ref(""),
        existingSourceSections: Vue.ref(
            listExistingSourceSections(text, existingSources.value),
        ),
        existingSources,
        sourceSectionPath: Vue.ref<string[]>([]),
    };
}

/** Builds reactive values derived from source-manager inputs. */
function createSourceManagerDerivedState(
    Vue: VueModule,
    state: SourceManagerDerivedInputs,
): SourceManagerDerivedState {
    return {
        ...createDraftDerivedState(Vue, state),
        ...createSourceListDerivedState(Vue, state),
        formatterSettingsLabel: Vue.computed(function getLabel() {
            const references =
                state.referenceStyle.value === "r" ? "{{r}}" : "<ref>";
            const layout =
                state.citationLayout.value === "block" ? "Block" : "Inline";
            return `Formatter: ${references} · ${layout}`;
        }),
    };
}

/** Builds live name and source-code values for the current draft. */
function createDraftDerivedState(
    Vue: VueModule,
    state: SourceManagerDerivedInputs,
) {
    function getCitationName(): string {
        const draft = state.draft.value;
        if (draft == null) {
            return "";
        }
        try {
            return getSourceDraftCitationName(draft);
        } catch {
            return "";
        }
    }
    function getCitationNameCells(): Map<number, SourceDraftCitationNameCell> {
        const draft = state.draft.value;
        return draft == null
            ? new Map<number, SourceDraftCitationNameCell>()
            : getSourceDraftCitationNameCells(draft);
    }
    function getDraftSourcePreview(): SourcePreviewPart[] {
        return buildDraftSourcePreview(
            state.draft.value,
            state.citationLayout.value,
        );
    }
    function getDraftCellErrors(): SourceDraftErrors {
        const draft = state.draft.value;
        return draft == null
            ? new Map()
            : getSourceDraftErrors(draft, getCurrentWikiId());
    }
    return {
        citationName: Vue.computed(getCitationName),
        citationNameCells: Vue.computed(getCitationNameCells),
        draftCellErrors: Vue.computed(getDraftCellErrors),
        draftSourcePreview: Vue.computed(getDraftSourcePreview),
    };
}

/** Gets the active MediaWiki database for site-specific CS1 rules. */
function getCurrentWikiId(): string {
    const wikiId = mw.config.get("wgDBname");
    return typeof wikiId === "string" ? wikiId : "";
}

/** Builds a safely segmented preview from the current source draft. */
function buildDraftSourcePreview(
    draft: SourceDraft | null,
    layout: CitationLayout,
): SourcePreviewPart[] {
    if (draft == null) {
        return [];
    }
    try {
        return buildSourcePreview(serializeSourceDraft(draft, layout));
    } catch (error) {
        const message = `Source preview unavailable: ${formatError(error)}`;
        return [{ kind: "text", text: message }];
    }
}

/** Marks parameter names and alias comments for preview styling. */
function buildSourcePreview(source: string): SourcePreviewPart[] {
    const ranges = [
        ...findSourceParameterNameRanges(source),
        ...findSourceAliasCommentRanges(source),
    ].sort((left, right) => left.start - right.start);
    const result: SourcePreviewPart[] = [];
    let cursor = 0;
    for (const range of ranges) {
        if (range.start > cursor) {
            result.push({
                kind: "text",
                text: source.slice(cursor, range.start),
            });
        }
        result.push({
            kind: range.kind,
            text: source.slice(range.start, range.end),
        });
        cursor = range.end;
    }
    if (cursor < source.length) {
        result.push({ kind: "text", text: source.slice(cursor) });
    }
    return result;
}

interface SourcePreviewRange {
    end: number;
    kind: "alias" | "parameter";
    start: number;
}

/** Locates top-level parameter labels in formatted citation source. */
function findSourceParameterNameRanges(source: string): SourcePreviewRange[] {
    if (!source.startsWith("{{") || !source.endsWith("}}")) {
        return [];
    }
    const parts = splitTopLevel(source.slice(2, -2), "|");
    let cursor = 2 + (parts.shift()?.length ?? 0);
    return parts.flatMap(function findName(part) {
        cursor += 1;
        const start = cursor + (part.match(/^\s*/u)?.[0].length ?? 0);
        const separator = part.indexOf("=");
        const end =
            separator < 0
                ? start
                : cursor + part.slice(0, separator).trimEnd().length;
        cursor += part.length;
        return end > start ? [{ end, kind: "parameter" as const, start }] : [];
    });
}

/** Locates hashtag alias comments in formatted citation source. */
function findSourceAliasCommentRanges(source: string): SourcePreviewRange[] {
    const pattern = /<!--(?:(?!-->)[\s\S])*?#(?:(?!-->)[\s\S])*?-->/gu;
    return [...source.matchAll(pattern)].map(function toRange(match) {
        return {
            end: match.index + match[0].length,
            kind: "alias" as const,
            start: match.index,
        };
    });
}

/** Builds filtering and choice values for the existing-source list. */
function createSourceListDerivedState(
    Vue: VueModule,
    state: SourceManagerDerivedInputs,
) {
    function getFilteredExistingSources(): ExistingSource[] {
        const selectedSection = state.sourceSectionPath.value.at(-1) ?? "";
        return filterExistingSources(
            state.existingSources.value,
            state.existingSourceQuery.value,
            selectedSection,
        );
    }
    function getBasedOnSourceOptions(): Array<{
        label: string;
        value: string;
    }> {
        return state.existingSources.value.map(function toOption(source) {
            const name = source.referenceName || "unnamed";
            const title = source.title || source.url || "Untitled source";
            return { label: `${name} — ${title}`, value: source.id };
        });
    }
    return {
        basedOnSourceOptions: Vue.computed(getBasedOnSourceOptions),
        filteredExistingSources: Vue.computed(getFilteredExistingSources),
        sourceSectionSelectors: Vue.computed(function getSelectors() {
            return buildSourceSectionSelectors(
                state.existingSourceSections.value,
                state.sourceSectionPath.value,
            );
        }),
    };
}

/** Builds one combobox for each selected section hierarchy level. */
function buildSourceSectionSelectors(
    sections: SourceSection[],
    path: string[],
): SourceSectionSelector[] {
    const selectors: SourceSectionSelector[] = [];
    let parentId = "";
    for (let level = 0; level <= path.length; level += 1) {
        const children = sections.filter(
            (section) => section.parentId === parentId,
        );
        if (children.length === 0) {
            break;
        }
        const selected = path[level] ?? "";
        selectors.push(buildSourceSectionSelector(children, level, selected));
        if (
            selected === "" ||
            !children.some((section) => section.id === selected)
        ) {
            break;
        }
        parentId = selected;
    }
    return selectors;
}

/** Builds the choices for one section-filter hierarchy level. */
function buildSourceSectionSelector(
    sections: SourceSection[],
    level: number,
    selected: string,
): SourceSectionSelector {
    const allLabel = level === 0 ? "All sections" : "All subsections";
    const sectionOptions = sections.map(function toOption(section) {
        return { label: section.label, value: section.label };
    });
    const selectedLabel =
        sections.find((section) => section.id === selected)?.label ?? "";
    return {
        label: level === 0 ? "Section" : "Subsection",
        level,
        menuItems: [{ label: allLabel, value: "" }, ...sectionOptions],
        selected: selectedLabel,
    };
}

/** Creates source lookup, insertion, and editing actions. */
function createSourceManagerActions(
    editor: editBox.EditBox,
    state: SourceManagerState,
    cleanup: () => void,
): Record<string, unknown> {
    const close = function close(): void {
        state.open.value = false;
        queueMicrotask(cleanup);
    };
    const context = { cleanup, close, editor, state };
    return {
        ...createFormatterActions(context),
        ...createNavigationActions(context),
        ...createLookupActions(context),
        ...createDraftActions(context),
    };
}

/** Creates the footer action for formatting the article source. */
function createFormatterActions(
    context: SourceManagerActionContext,
): Record<string, unknown> {
    function formatArticle(): void {
        const { editor, state } = context;
        let referencesNotFormatted = 0;
        try {
            const compact = state.referenceStyle.value === "r";
            const result = manageCitationsWithResult(
                editor.read(),
                [],
                compact,
                state.citationLayout.value,
            );
            referencesNotFormatted = result.referencesNotFormatted;
            editor.write(result.text);
        } catch (error) {
            state.error.value = formatError(error);
            return;
        }
        const message =
            referencesNotFormatted === 0
                ? "Citation formatting complete."
                : "Citation formatting complete; " +
                  `${referencesNotFormatted} reference(s) not formatted.`;
        mw.notify(message, {
            type: referencesNotFormatted === 0 ? "success" : "warn",
        });
        finishSourceManager(context);
    }
    return { formatArticle };
}

/** Creates dialog navigation actions. */
function createNavigationActions(
    context: SourceManagerActionContext,
): Record<string, unknown> {
    function onOpenChange(value: boolean): void {
        if (!value) {
            queueMicrotask(context.cleanup);
        }
    }
    function backToLookup(): void {
        const { state } = context;
        state.draft.value = null;
        state.dismissedAliasSuggestions.value = new Set();
        state.editingSource.value = null;
        state.error.value = "";
        state.warning.value = "";
        state.mode.value = "lookup";
    }
    function changeFormatterSetting(selection: string | null): void {
        const { state } = context;
        if (selection === "reference:ref" || selection === "reference:r") {
            state.referenceStyle.value =
                selection === "reference:r" ? "r" : "ref";
        }
        if (selection === "layout:inline" || selection === "layout:block") {
            state.citationLayout.value =
                selection === "layout:block" ? "block" : "inline";
        }
        state.formatterMenuSelection.value = null;
    }
    return {
        backToLookup,
        changeFormatterSetting,
        close: context.close,
        onOpenChange,
    };
}

/** Creates parameter-editing and draft-save actions. */
function createDraftActions(
    context: SourceManagerActionContext,
): Record<string, unknown> {
    const { state } = context;
    function addParameter(): void {
        state.draft.value?.rows.push(createBlankDraftRow());
    }
    function changeDraftTemplate(template: string | null): void {
        updateDraftTemplate(state, template);
    }
    function formatParameters(): void {
        const draft = state.draft.value;
        if (draft != null) {
            formatSourceDraftRows(draft);
        }
    }
    function saveDraft(): void {
        saveSourceDraft(context, false);
    }
    function saveDraftAndClose(): void {
        saveSourceDraft(context, true);
    }
    return {
        ...createAuthorDraftActions(state),
        ...createAliasDraftActions(state),
        addParameter,
        changeDraftTemplate,
        formatParameters,
        saveDraft,
        saveDraftAndClose,
    };
}

/** Validates and saves the current source draft. */
function saveSourceDraft(
    context: SourceManagerActionContext,
    closeAfterSave: boolean,
): void {
    const { editor, state } = context;
    const draft = state.draft.value;
    if (draft == null) {
        return;
    }
    try {
        validateDraft(draft);
        if (state.editingSource.value == null) {
            insertNewSource(editor, draft, state.citationLayout.value);
        } else {
            updateExistingSource(editor, state, draft);
        }
    } catch (error) {
        state.error.value = formatError(error);
        return;
    }
    if (closeAfterSave) {
        finishSourceManager(context);
        return;
    }
    refreshExistingSources(editor, state);
    state.activeLookupTab.value = "view";
    state.dismissedAliasSuggestions.value = new Set();
    state.draft.value = null;
    state.editingSource.value = null;
    state.error.value = "";
    state.mode.value = "lookup";
    state.warning.value = "";
}

/** Creates author-row splitting and automatic next-slot actions. */
function createAuthorDraftActions(state: SourceManagerState): DraftActions {
    function canJoinAuthor(index: number): boolean {
        const draft = state.draft.value;
        return draft != null && canJoinAuthorDraftRow(draft, index);
    }
    function canSplitAuthor(index: number): boolean {
        const draft = state.draft.value;
        return draft != null && canSplitAuthorDraftRow(draft, index);
    }
    function joinAuthor(index: number): void {
        const draft = state.draft.value;
        if (draft != null) {
            joinAuthorDraftRow(draft, index);
        }
    }
    function splitAuthor(index: number): void {
        const draft = state.draft.value;
        if (draft != null) {
            splitAuthorDraftRow(draft, index);
        }
    }
    function updateParameterValue(index: number, value: string): void {
        const draft = state.draft.value;
        if (draft?.rows[index] == null) {
            return;
        }
        draft.rows[index].value = value;
        ensureNextAuthorDraftRows(draft);
    }
    return {
        canJoinAuthor,
        canSplitAuthor,
        isAuthorDraftParameter,
        isLastAuthorDraftParameter,
        joinAuthor,
        splitAuthor,
        updateParameterValue,
    };
}

/** Creates opt-in actions for previously used creator aliases. */
function createAliasDraftActions(state: SourceManagerState): DraftActions {
    function getAliasSuggestion(index: number): CreatorAliasSuggestion | null {
        return findAvailableAliasSuggestion(state, index);
    }
    function useAliasSuggestion(index: number): void {
        const draft = state.draft.value;
        const row = draft?.rows[index];
        const suggestion = getAliasSuggestion(index);
        if (row != null && suggestion != null) {
            row.alias = suggestion.alias;
        }
    }
    function dismissAliasSuggestion(index: number): void {
        const draft = state.draft.value;
        const row = draft?.rows[index];
        const suggestion = getAliasSuggestion(index);
        if (row == null || suggestion == null) {
            return;
        }
        const dismissed = new Set(state.dismissedAliasSuggestions.value);
        dismissed.add(buildAliasSuggestionKey(index, row, suggestion));
        state.dismissedAliasSuggestions.value = dismissed;
    }
    return {
        dismissAliasSuggestion,
        getAliasSuggestion,
        useAliasSuggestion,
    };
}

/** Gets the first prior alias that was not dismissed for this row. */
function findAvailableAliasSuggestion(
    state: SourceManagerState,
    index: number,
): CreatorAliasSuggestion | null {
    const row = state.draft.value?.rows[index];
    if (
        row == null ||
        state.editingSource.value != null ||
        row.alias.trim() !== ""
    ) {
        return null;
    }
    const suggestions = findCreatorAliasSuggestions(
        state.existingSources.value,
        row,
    );
    return (
        suggestions.find(function isNotDismissed(suggestion) {
            const key = buildAliasSuggestionKey(index, row, suggestion);
            return !state.dismissedAliasSuggestions.value.has(key);
        }) ?? null
    );
}

/** Builds a draft-local key for one dismissible alias suggestion. */
function buildAliasSuggestionKey(
    index: number,
    row: SourceDraftRow,
    suggestion: CreatorAliasSuggestion,
): string {
    return [index, row.name, row.value, suggestion.alias].join("\u0000");
}

/** Applies a selected citation type without discarding entered rows. */
function updateDraftTemplate(
    state: SourceManagerState,
    template: string | null,
): void {
    const draft = state.draft.value;
    if (draft != null && template != null) {
        const changed = changeSourceDraftTemplate(draft, template);
        ensureNextAuthorDraftRows(changed);
        state.draft.value = changed;
    }
}

/** Validates user-added names and aliases. */
function validateDraft(draft: SourceDraft): void {
    const populated = draft.rows.some((row) => row.value.trim() !== "");
    if (!populated) {
        throw new Error("Enter at least one citation field.");
    }
    for (const row of draft.rows) {
        const hasContent = row.value.trim() !== "" || row.alias.trim() !== "";
        if (row.name.trim() === "" && hasContent) {
            throw new Error("Enter a name for each populated parameter.");
        }
        if (row.alias.trim() !== "" && row.value.trim() === "") {
            throw new Error(
                `Enter a value before adding the ${row.name} alias.`,
            );
        }
    }
}

/** Creates URL, manual-source, and existing-source tab actions. */
function createLookupActions(
    context: SourceManagerActionContext,
): Record<string, unknown> {
    async function resolveEnteredSource(entered?: string): Promise<void> {
        await resolveSourceInput(context, entered);
    }
    function editListedSource(sourceId: string): void {
        openExistingSourceWhenIdle(context.state, sourceId);
    }
    function cloneListedSource(sourceId: string): void {
        openBasedOnSourceWhenIdle(context.state, sourceId);
    }
    function createManualSource(): void {
        openManualSourceWhenIdle(context.state);
    }
    function insertListedSource(sourceId: string): void {
        insertListedSourceWhenIdle(context, sourceId);
    }
    return {
        createManualSource,
        cloneListedSource,
        editListedSource,
        insertListedSource,
        onSourcePaste(event: ClipboardEvent): void {
            handleSourcePaste(context, event);
        },
        resolveEnteredSource,
        selectSourceSection(level: number, selected: string | number): void {
            updateSourceSectionSelection(context.state, level, selected);
        },
    };
}

/** Resolves a recognizable pasted source immediately. */
function handleSourcePaste(
    context: SourceManagerActionContext,
    event: ClipboardEvent,
): void {
    if (context.state.loading.value) {
        return;
    }
    const entered = event.clipboardData?.getData("text/plain").trim() || "";
    if (parseSourceInput(entered) == null) {
        return;
    }
    event.preventDefault();
    context.state.sourceUrl.value = entered;
    void resolveSourceInput(context, entered);
}

/** Opens a manual draft only when no URL request can replace it. */
function openManualSourceWhenIdle(state: SourceManagerState): void {
    if (state.loading.value) {
        return;
    }
    const template = state.manualTemplate.value ?? "cite magazine";
    if (template === BASED_ON_TEMPLATE) {
        openBasedOnSource(state, state.basedOnSourceId.value);
        return;
    }
    openDraft(state, createManualSourceDraft(template));
}

/** Opens an existing source as a new draft rather than an edit. */
function openBasedOnSourceWhenIdle(
    state: SourceManagerState,
    sourceId: string,
): void {
    if (!state.loading.value) {
        openBasedOnSource(state, sourceId);
    }
}

/** Clones one selected citation into a new source draft. */
function openBasedOnSource(state: SourceManagerState, sourceId: string): void {
    const source = findExistingSourceById(state, sourceId);
    if (source == null) {
        state.error.value = "Choose an existing citation to base this on.";
        return;
    }
    openDraft(state, cloneDraft(source.draft));
}

/** Updates one level of the hierarchical source-section filter. */
function updateSourceSectionSelection(
    state: SourceManagerState,
    level: number,
    selected: string | number,
): void {
    const value = String(selected);
    if (value === "") {
        state.sourceSectionPath.value =
            level === 0 ? [] : state.sourceSectionPath.value.slice(0, level);
        return;
    }
    const parentId =
        level === 0 ? "" : state.sourceSectionPath.value[level - 1];
    const section = state.existingSourceSections.value.find(
        (candidate) =>
            candidate.label === value && candidate.parentId === parentId,
    );
    if (section != null) {
        state.sourceSectionPath.value = [
            ...state.sourceSectionPath.value.slice(0, level),
            section.id,
        ];
    }
}

/** Opens an existing draft only when no URL request can replace it. */
function openExistingSourceWhenIdle(
    state: SourceManagerState,
    sourceId: string,
): void {
    if (!state.loading.value) {
        openExistingSource(state, sourceId);
    }
}

/** Inserts a listed source only when URL lookup is idle. */
function insertListedSourceWhenIdle(
    context: SourceManagerActionContext,
    sourceId: string,
): void {
    if (!context.state.loading.value) {
        insertListedExistingSource(context, sourceId);
    }
}

/** Inserts one source chosen directly from the existing-source list. */
function insertListedExistingSource(
    context: SourceManagerActionContext,
    sourceId: string,
): void {
    const source = findExistingSourceById(context.state, sourceId);
    if (source == null) {
        context.state.error.value = "The selected citation is unavailable.";
        return;
    }
    insertExistingSource(
        context.editor,
        source,
        context.state.referenceStyle.value,
    );
    finishSourceManager(context);
}

/** Resolves a source or immediately inserts its existing ref. */
async function resolveSourceInput(
    context: SourceManagerActionContext,
    entered?: string,
): Promise<void> {
    const { editor, state } = context;
    if (state.loading.value) {
        return;
    }
    const value = entered ?? state.sourceUrl.value;
    const parsed = parseSourceInput(value);
    if (parsed == null) {
        state.error.value = "Enter a source URL, identifier, or citation.";
        return;
    }
    state.sourceUrl.value = value.trim();
    state.error.value = "";
    state.warning.value = "";
    const matches =
        parsed.originalUrl === ""
            ? []
            : findExistingSources(editor.read(), value);
    const existing = chooseAutomaticSource(matches);
    if (existing != null) {
        insertExistingSource(editor, existing, state.referenceStyle.value);
        finishSourceManager(context);
        return;
    }
    if (matches.length > 0) {
        state.activeLookupTab.value = "view";
        state.warning.value =
            "This URL is cited in more than one reference group. " +
            "Choose the intended citation from the existing list.";
        return;
    }
    await loadNewSourceDraft(parsed, state);
}

/** Chooses an unambiguous reusable match for immediate insertion. */
function chooseAutomaticSource(
    matches: ExistingSource[],
): ExistingSource | null {
    const groups = new Set(matches.map((source) => source.group));
    if (groups.size > 1) {
        return null;
    }
    const named = matches.find((source) => source.referenceName !== "");
    return named ?? matches[0] ?? null;
}

/** Opens one listed existing citation as a cloned editable draft. */
function openExistingSource(
    state: SourceManagerState,
    sourceId: string,
): void {
    const source = findExistingSourceById(state, sourceId);
    if (source == null) {
        state.error.value = "The selected citation is unavailable.";
        return;
    }
    const draft = cloneDraft(source.draft);
    ensureNextAuthorDraftRows(draft);
    state.dismissedAliasSuggestions.value = new Set();
    state.editingSource.value = source;
    state.draft.value = draft;
    state.error.value = "";
    state.warning.value = "";
    state.mode.value = "draft";
}

/** Gets one existing source by its stable list identifier. */
function findExistingSourceById(
    state: SourceManagerState,
    sourceId: string,
): ExistingSource | null {
    return (
        state.existingSources.value.find(
            (candidate) => candidate.id === sourceId,
        ) ?? null
    );
}

/** Fetches Citoid and archive data for a new source. */
async function loadNewSourceDraft(
    parsed: ParsedSourceInput,
    state: SourceManagerState,
): Promise<void> {
    state.loading.value = true;
    const archiveSeed =
        parsed.archiveUrl === ""
            ? null
            : {
                  archiveDate: parsed.archiveDate,
                  archiveUrl: parsed.archiveUrl,
              };
    try {
        const metadata = await resolveSourceMetadata(
            parsed.search,
            archiveSeed,
        );
        const draft = parseSourceDraft(metadata.citeTemplate);
        const liveOriginal =
            parsed.originalUrl !== "" &&
            archiveSeed == null &&
            metadata.metadataError === "";
        applyResolvedMetadata(draft, metadata, liveOriginal);
        const warnings = buildMetadataWarnings(metadata);
        state.warning.value = warnings.join(" ");
        openDraft(state, draft, warnings.length > 0);
    } catch (error) {
        const draft = createLookupFallbackDraft(parsed);
        setDraftValue(draft, "archive-url", parsed.archiveUrl);
        setDraftValue(draft, "archive-date", parsed.archiveDate);
        state.warning.value =
            `Metadata could not be loaded (${formatError(error)}). ` +
            "The source is ready for manual editing.";
        openDraft(state, draft, true);
    } finally {
        state.loading.value = false;
    }
}

/** Builds an editable fallback after an unexpected lookup failure. */
function createLookupFallbackDraft(parsed: ParsedSourceInput): SourceDraft {
    if (parsed.originalUrl !== "") {
        return parseSourceDraft(`{{Cite web | url = ${parsed.originalUrl}}}`);
    }
    return createManualSourceDraft("cite web");
}

/** Applies resolved URL and archive values to editable rows. */
function applyResolvedMetadata(
    draft: SourceDraft,
    metadata: Awaited<ReturnType<typeof resolveSourceMetadata>>,
    liveOriginal: boolean,
): void {
    if (metadata.originalUrl !== "") {
        setDraftValue(draft, "url", metadata.originalUrl);
    }
    setDraftValue(draft, "archive-url", metadata.archiveUrl);
    setDraftValue(draft, "archive-date", metadata.archiveDate);
    if (metadata.archiveUrl !== "" && liveOriginal) {
        setDraftValue(draft, "url-status", "live");
    }
}

/** Builds non-blocking service warnings for an editable draft. */
function buildMetadataWarnings(metadata: {
    archiveError: string;
    metadataError: string;
}): string[] {
    const warnings: string[] = [];
    if (metadata.metadataError !== "") {
        warnings.push(
            `Metadata could not be loaded (${metadata.metadataError}).`,
        );
    }
    if (metadata.archiveError !== "") {
        warnings.push(`Archive lookup failed (${metadata.archiveError}).`);
    }
    return warnings;
}

/** Switches the dialog to its editable draft view. */
function openDraft(
    state: SourceManagerState,
    draft: SourceDraft,
    preserveWarning: boolean = false,
): void {
    ensureNextAuthorDraftRows(draft);
    state.dismissedAliasSuggestions.value = new Set();
    state.draft.value = draft;
    state.editingSource.value = null;
    state.error.value = "";
    if (!preserveWarning) {
        state.warning.value = "";
    }
    state.mode.value = "draft";
}

/** Re-reads source definitions and filters after an in-dialog save. */
function refreshExistingSources(
    editor: editBox.EditBox,
    state: SourceManagerState,
): void {
    const text = editor.read();
    const sources = listExistingSources(text);
    state.existingSources.value = sources;
    state.existingSourceSections.value = listExistingSourceSections(
        text,
        sources,
    );
    state.sourceSectionPath.value = [];
}

/** Inserts a reuse or anonymous full ref at the active selection. */
function insertExistingSource(
    editor: editBox.EditBox,
    source: ExistingSource,
    style: ReferenceStyle,
): void {
    const compact = style === "r";
    editor.replaceSelection(buildExistingSourceReference(source, compact));
    const detail = source.referenceName || "an existing citation";
    mw.notify(`Inserted reference to ${detail}.`, { type: "success" });
}

/** Inserts a newly built full reference at the active selection. */
function insertNewSource(
    editor: editBox.EditBox,
    draft: SourceDraft,
    layout: CitationLayout,
): void {
    const citation = serializeSourceDraft(draft, layout);
    editor.replaceSelection(`<ref>${citation}</ref>`);
    mw.notify("Citation source inserted.", { type: "success" });
}

/** Updates one citation while preserving its current layout. */
function updateExistingSource(
    editor: editBox.EditBox,
    state: SourceManagerState,
    draft: SourceDraft,
): void {
    const current = editor.read();
    const source = state.editingSource.value as ExistingSource;
    const layout = detectCitationLayout(`<ref>${source.rawTemplate}</ref>`);
    const replaced = replaceExistingSource(current, source, draft, layout);
    editor.write(replaced);
    mw.notify("Citation source updated.", { type: "success" });
}

/** Closes the modal before restoring editor focus. */
function finishSourceManager(context: SourceManagerActionContext): void {
    context.close();
    queueMicrotask(function focusEditor(): void {
        context.editor.focus();
    });
}

/** Assigns a draft parameter while retaining the seeded row. */
function setDraftValue(draft: SourceDraft, name: string, value: string): void {
    const row = draft.rows.find((candidate) => candidate.name === name);
    if (row != null) {
        row.value = value;
        return;
    }
    draft.rows.push({ alias: "", directive: "", main: false, name, value });
}

/** Creates a user-addable empty parameter row. */
function createBlankDraftRow(): SourceDraftRow {
    return {
        alias: "",
        directive: "",
        main: false,
        name: "",
        value: "",
    };
}

/** Clones a draft without mutating the source list. */
function cloneDraft(draft: SourceDraft): SourceDraft {
    return {
        rows: draft.rows.map((row) => ({ ...row })),
        template: draft.template,
    };
}

/** Converts a rejected value into readable UI text. */
function formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

/** Registers the Codex components used by the source manager. */
function registerCodexComponents(app: VueApp, Codex: CodexComponents): void {
    app.component("CdxButton", Codex.CdxButton);
    app.component("CdxCombobox", Codex.CdxCombobox);
    app.component("CdxDialog", Codex.CdxDialog);
    app.component("CdxField", Codex.CdxField);
    app.component("CdxIcon", Codex.CdxIcon);
    app.component("CdxMenuButton", Codex.CdxMenuButton);
    app.component("CdxMessage", Codex.CdxMessage);
    app.component("CdxProgressBar", Codex.CdxProgressBar);
    app.component("CdxSelect", Codex.CdxSelect);
    app.component("CdxTab", Codex.CdxTab);
    app.component("CdxTabs", Codex.CdxTabs);
    app.component("CdxTextInput", Codex.CdxTextInput);
    app.directive("tooltip", Codex.CdxTooltip);
}

const SOURCE_MANAGER_TEMPLATE = `
<cdx-dialog
    v-model:open="open"
    class="cf-source-manager"
    title="Citation formatter"
    @update:open="onOpenChange"
>
    <cdx-message
        v-if="error"
        type="error"
        class="cf-source-manager__status"
    >
        {{ error }}
    </cdx-message>
    <cdx-message
        v-if="warning"
        type="warning"
        class="cf-source-manager__status"
    >
        {{ warning }}
    </cdx-message>
    <div v-if="mode === 'lookup'">
        <cdx-tabs
            v-model:active="activeLookupTab"
            class="cf-source-manager__tabs"
        >
        <cdx-tab name="add" label="Add source">
            <div class="cf-source-manager__lookup">
                <cdx-field>
                    <template #label>Source</template>
                    <template #description>
                        Enter a URL, Wayback link, DOI, ISBN, ISSN,
                        PMID/PMCID, QID, or citation text.
                        Existing URL citations are reused.
                    </template>
                    <cdx-text-input
                        v-model="sourceUrl"
                        input-type="search"
                        autofocus
                        :disabled="loading"
                        placeholder="URL, identifier, or citation"
                        @paste="onSourcePaste"
                        @keydown.enter.prevent="resolveEnteredSource()"
                    />
                </cdx-field>
                <cdx-button
                    action="progressive"
                    weight="primary"
                    :disabled="loading"
                    @click="resolveEnteredSource()"
                >
                    Find source
                </cdx-button>
            </div>
            <div v-if="loading" class="cf-source-manager__loading">
                <small>Fetching source metadata and archive…</small>
                <cdx-progress-bar
                    aria-label="Fetching source metadata and archive"
                />
            </div>
            <div class="cf-source-manager__manual">
                <cdx-field>
                    <template #label>Citation type</template>
                    <template #description>
                        Create a source manually or base it on an existing
                        citation.
                    </template>
                    <cdx-select
                        v-model:selected="manualTemplate"
                        :menu-items="manualTemplateOptions"
                        :disabled="loading"
                    />
                </cdx-field>
                <cdx-field v-if="manualTemplate === '__based-on__'">
                    <template #label>Based on</template>
                    <cdx-combobox
                        v-model:selected="basedOnSourceId"
                        :menu-items="basedOnSourceOptions"
                        :menu-config="{ visibleItemLimit: 6 }"
                        :disabled="loading"
                        placeholder="Choose an existing source"
                    >
                        <template #no-results>
                            No existing sources found.
                        </template>
                    </cdx-combobox>
                </cdx-field>
                <cdx-button
                    action="progressive"
                    :disabled="
                        loading ||
                        (
                            manualTemplate === '__based-on__' &&
                            basedOnSourceId === ''
                        )
                    "
                    @click="createManualSource"
                >
                    Create source
                </cdx-button>
            </div>
        </cdx-tab>
        <cdx-tab
            name="view"
            :label="'View sources (' + existingSources.length + ')'"
        >
            <cdx-field
                v-if="existingSources.length > 0"
                class="cf-source-manager__source-search"
                :hide-label="true"
            >
                <template #label>Search sources</template>
                <cdx-text-input
                    v-model="existingSourceQuery"
                    input-type="search"
                    placeholder="Search sources by keywords"
                />
            </cdx-field>
            <div
                v-if="existingSources.length > 0"
                class="cf-source-manager__section-filters"
            >
                <cdx-field
                    v-for="selector in sourceSectionSelectors"
                    :key="selector.level"
                    :hide-label="true"
                >
                    <template #label>{{ selector.label }}</template>
                    <cdx-combobox
                        :selected="selector.selected"
                        :menu-items="selector.menuItems"
                        :menu-config="{ visibleItemLimit: 8 }"
                        :aria-label="selector.label"
                        @update:selected="
                            selectSourceSection(
                                selector.level,
                                $event
                            )
                        "
                    />
                </cdx-field>
            </div>
            <p v-if="existingSources.length === 0">
                No existing citation definitions found.
            </p>
            <p v-else-if="filteredExistingSources.length === 0">
                No sources match these keywords.
            </p>
            <ol v-else class="cf-source-manager__existing-list">
                <li
                    v-for="source in filteredExistingSources"
                    :key="source.id"
                    class="cf-source-manager__existing-row"
                >
                    <div class="cf-source-manager__existing-summary">
                        <small
                            class="cf-source-manager__existing-name"
                            :title="
                                source.referenceName ||
                                'Unnamed reference'
                            "
                        >
                            ({{
                                source.referenceName || 'unnamed'
                            }} · {{ source.usageCount }}×)
                        </small>
                        <span
                            class="cf-source-manager__existing-title"
                            :lang="source.titleLanguage || undefined"
                            :title="
                                source.title ||
                                source.url ||
                                'Untitled source'
                            "
                        >
                            {{
                                source.title ||
                                source.url ||
                                'Untitled source'
                            }}
                        </span>
                        <small class="cf-source-manager__existing-meta">
                            <code>
                                {{
                                    sourceTemplateLabel(
                                        source.draft.template
                                    )
                                }}
                            </code>
                            <template v-if="source.group">
                                · group {{ source.group }}
                            </template>
                        </small>
                    </div>
                    <div class="cf-source-manager__existing-actions">
                        <cdx-button
                            v-tooltip="'Use source'"
                            action="progressive"
                            weight="quiet"
                            :disabled="loading"
                            aria-label="Use source"
                            @click="insertListedSource( source.id )"
                        >
                            <cdx-icon :icon="useSourceIcon" />
                        </cdx-button>
                        <cdx-button
                            v-tooltip="'Edit source'"
                            weight="quiet"
                            :disabled="loading"
                            aria-label="Edit source"
                            @click="editListedSource( source.id )"
                        >
                            <cdx-icon :icon="editSourceIcon" />
                        </cdx-button>
                        <cdx-button
                            v-tooltip="'Create source based on this'"
                            weight="quiet"
                            :disabled="loading"
                            aria-label="Create source based on this"
                            @click="cloneListedSource( source.id )"
                        >
                            <cdx-icon :icon="copySourceIcon" />
                        </cdx-button>
                    </div>
                </li>
            </ol>
        </cdx-tab>
        </cdx-tabs>
    </div>
    <div v-else-if="draft">
        <div class="cf-source-manager__draft-header">
            <cdx-field>
                <template #label>Citation template</template>
                <cdx-select
                    :selected="draft.template"
                    :menu-items="templateOptions"
                    @update:selected="changeDraftTemplate"
                />
            </cdx-field>
            <div class="cf-source-manager__citation-name">
                <strong>Reference name</strong>
                <code>{{ citationName || 'Unavailable' }}</code>
            </div>
        </div>
        <table class="cf-source-manager__params">
            <colgroup>
                <col class="cf-source-manager__params-parameter">
                <col class="cf-source-manager__params-value">
                <col class="cf-source-manager__params-alias">
                <col class="cf-source-manager__params-controls">
            </colgroup>
            <thead>
                <tr>
                    <th>Parameter</th>
                    <th>Value</th>
                    <th>Alias / source key</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                <tr
                    v-for="( row, index ) in draft.rows"
                    :key="index"
                >
                    <td>
                        <cdx-text-input
                            v-model="row.name"
                            class="cf-source-manager__param-name"
                            :status="
                                draftCellErrors.get( index )?.name
                                    ? 'error'
                                    : 'default'
                            "
                            v-tooltip="
                                draftCellErrors.get( index )?.name ||
                                undefined
                            "
                            aria-label="Parameter name"
                            placeholder="parameter"
                        />
                    </td>
                    <td>
                        <cdx-text-input
                            :model-value="row.value"
                            :class="{
                                'cf-source-manager__name-cell':
                                    citationNameCells.get( index ) ===
                                    'value',
                                'cf-source-manager__error-cell':
                                    draftCellErrors.get( index )?.value
                            }"
                            :status="
                                draftCellErrors.get( index )?.value
                                    ? 'error'
                                    : 'default'
                            "
                            v-tooltip="
                                draftCellErrors.get( index )?.value ||
                                undefined
                            "
                            :aria-label="row.name + ' value'"
                            @update:model-value="
                                updateParameterValue( index, $event )
                            "
                        />
                    </td>
                    <td>
                        <cdx-text-input
                            v-model="row.alias"
                            :class="{
                                'cf-source-manager__name-cell':
                                    citationNameCells.get( index ) ===
                                    'alias',
                                'cf-source-manager__error-cell':
                                    draftCellErrors.get( index )?.alias
                            }"
                            :status="
                                draftCellErrors.get( index )?.alias
                                    ? 'error'
                                    : 'default'
                            "
                            v-tooltip="
                                draftCellErrors.get( index )?.alias ||
                                undefined
                            "
                            :aria-label="
                                row.name === 'url'
                                    ? 'url shared source key'
                                    : row.name + ' reference-name alias'
                            "
                            :disabled="
                                row.value.trim() === '' &&
                                row.alias.trim() === ''
                            "
                            :placeholder="
                                row.name === 'url'
                                    ? 'Optional shared source URL'
                                    : undefined
                            "
                        />
                        <div
                            v-if="getAliasSuggestion( index )"
                            class="cf-source-manager__alias-suggestion"
                        >
                            <small>
                                Auto-suggested value:
                                {{ getAliasSuggestion( index ).alias }}
                            </small>
                            <div
                                class="
                                    cf-source-manager__alias-suggestion-actions
                                "
                            >
                                <cdx-button
                                    weight="quiet"
                                    @click="useAliasSuggestion( index )"
                                >
                                    Use
                                </cdx-button>
                                <cdx-button
                                    weight="quiet"
                                    @click="dismissAliasSuggestion( index )"
                                >
                                    Dismiss
                                </cdx-button>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="cf-source-manager__param-actions">
                            <cdx-button
                                v-if="isAuthorDraftParameter( row.name )"
                                weight="quiet"
                                :disabled="!canSplitAuthor( index )"
                                :aria-label="
                                    'Use separate first and last fields for ' +
                                    row.name
                                "
                                title="Use separate first and last name fields"
                                @click="splitAuthor( index )"
                            >
                                <cdx-icon :icon="splitAuthorIcon" />
                            </cdx-button>
                            <cdx-button
                                v-else-if="
                                    isLastAuthorDraftParameter( row.name )
                                "
                                weight="quiet"
                                :disabled="!canJoinAuthor( index )"
                                :aria-label="
                                    'Use one full-name field for ' + row.name
                                "
                                title="Return to one full-name field"
                                @click="joinAuthor( index )"
                            >
                                <cdx-icon :icon="joinAuthorIcon" />
                            </cdx-button>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
        <div class="cf-source-manager__actions">
            <cdx-button @click="addParameter">Add parameter</cdx-button>
            <cdx-button @click="formatParameters">
                <cdx-icon :icon="formatRowsIcon" />
                Format
            </cdx-button>
        </div>
        <cdx-field class="cf-source-manager__source-preview">
            <template #label>Source code</template>
            <pre><span
                v-for="( part, index ) in draftSourcePreview"
                :key="index"
                :class="
                    'cf-source-manager__source-preview--' + part.kind
                "
            >{{ part.text }}</span></pre>
        </cdx-field>
    </div>
    <template #footer>
        <div
            class="
                cf-source-manager__footer-actions
                cf-source-manager__footer-actions--desktop
            "
        >
            <cdx-button
                v-if="mode === 'draft'"
                @click="backToLookup"
            >
                Back
            </cdx-button>
            <cdx-menu-button
                v-model:selected="formatterMenuSelection"
                :menu-items="formatterMenuItems"
                @update:selected="changeFormatterSetting"
            >
                {{ formatterSettingsLabel }}
            </cdx-menu-button>
            <cdx-button @click="close">Cancel</cdx-button>
            <cdx-button
                v-if="mode === 'lookup'"
                action="progressive"
                weight="primary"
                :disabled="loading"
                @click="formatArticle"
            >
                Format citations
            </cdx-button>
            <cdx-button
                v-if="mode === 'draft'"
                action="progressive"
                @click="saveDraft"
            >
                Save
            </cdx-button>
            <cdx-button
                v-if="mode === 'draft'"
                action="progressive"
                weight="primary"
                @click="saveDraftAndClose"
            >
                Save and close
            </cdx-button>
        </div>
        <div
            class="
                cf-source-manager__footer-actions
                cf-source-manager__footer-actions--mobile
            "
        >
            <cdx-button
                v-if="mode === 'lookup'"
                action="progressive"
                weight="primary"
                :disabled="loading"
                @click="formatArticle"
            >
                Format citations
            </cdx-button>
            <cdx-button
                v-if="mode === 'draft'"
                action="progressive"
                weight="primary"
                @click="saveDraftAndClose"
            >
                Save and close
            </cdx-button>
            <cdx-button
                v-if="mode === 'draft'"
                action="progressive"
                @click="saveDraft"
            >
                Save
            </cdx-button>
            <cdx-menu-button
                v-model:selected="formatterMenuSelection"
                :menu-items="formatterMenuItems"
                @update:selected="changeFormatterSetting"
            >
                {{ formatterSettingsLabel }}
            </cdx-menu-button>
            <cdx-button @click="close">Cancel</cdx-button>
            <cdx-button
                v-if="mode === 'draft'"
                @click="backToLookup"
            >
                Back
            </cdx-button>
        </div>
    </template>
</cdx-dialog>
`;
