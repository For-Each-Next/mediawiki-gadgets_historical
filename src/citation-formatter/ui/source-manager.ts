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
    getSourceDraftCitationNameCells,
    isAuthorDraftParameter,
    isLastAuthorDraftParameter,
    joinAuthorDraftRow,
    listExistingSourceSections,
    listExistingSources,
    listSourceDraftParameterNames,
    moveSourceDraftTitleToScriptTitle,
    moveSourceTitlesToScriptTitle,
    parseSourceDraft,
    parseSourceInput,
    parseSourceUrl,
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
    extractCs1IssueMessages,
    mergeSourceDraftErrors,
    parseCs1ValidationResult,
} from "#me/domain/cs1-validation.ts";
import {
    analyzeCitationSources,
    applySourceAnalysisReplacements,
    type CitationSourceAnalysis,
    type SourceAnalysisFinding,
    type SourceAnalysisOccurrence,
    type SourceAnalysisReplacement,
} from "#me/domain/source-analysis.ts";
import {
    getCanonicalTemplateName,
    SUPPORTED_CITATION_TEMPLATES,
} from "#me/domain/templates.ts";
import type { CitationLayout } from "#me/domain/types.ts";
import { splitTopLevel } from "#me/domain/wikitext.ts";
import {
    fetchAvailableArchive,
    resolveSourceMetadata,
} from "#me/infra/source-metadata.ts";
import { resolveCitationWikiLink } from "#me/infra/wiki-link.ts";
import { addManagerStyles } from "#me/ui/styles.ts";
import type { editBox } from "#shared";
import { cdxIconMagicWand } from "@wikimedia/codex-icons";

const HOST_ID = "citation-formatter-source-manager";
const BASED_ON_TEMPLATE = "__based-on__";
const CS1_CHECK_ID_PREFIX = "citation-formatter-cs1-check-";
const UNUSED_SOURCE_SECTION_ID = "unused";
const GADGET_VERSION =
    typeof __GADGET_VERSION__ === "undefined"
        ? "development"
        : __GADGET_VERSION__;
const GADGET_BUILD_TIME =
    typeof __GADGET_BUILD_TIME__ === "undefined"
        ? "development build"
        : formatUtcBuildTime(__GADGET_BUILD_TIME__);
const URL_STATUSES = ["live", "dead", "unfit"] as const;
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
const SWITCH_STATUS_ICON =
    '<path d="M3 6h11.2l-2.6-2.6L13 2l5 5-5 5-1.4-1.4L14.2 8H3zm14 ' +
    '8H5.8l2.6 2.6L7 18l-5-5 5-5 1.4 1.4L5.8 12H17z"/>';
const CDX_ICON_LINK =
    '<path d="M5.862 7.453a4.353 4.353 0 016.167-.01l.707.706-' +
    "1.414 1.414-.707-.707a2.355 2.355 0 00-3.335.005L4.354 " +
    "11.81a2.725 2.725 0 003.842 3.868l.046-.046.715-.7 1.4 " +
    '1.43-.715.698-.046.046A4.727 4.727 0 012.934 10.4z"/>' +
    '<path d="M10.405 2.894a4.726 4.726 0 016.662 6.707l-2.928 ' +
    "2.947a4.354 4.354 0 01-6.167.01l-.707-.707 1.414-1.415.707.707c" +
    ".921.921 2.416.92 3.334-.004l2.928-2.948a2.727 2.727 0 00-" +
    '3.843-3.868l-.761.746-1.4-1.428.713-.7z"/>';
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
const SOURCE_TABLE_COLUMNS = [
    { id: "reference", label: "Reference", width: "28%" },
    { id: "source", label: "Source" },
    { id: "actions", label: "Actions", width: "3em" },
];

type SourceManagerMode = "draft" | "lookup";
type Cs1ToolStatus = "checking" | "complete" | "idle" | "unavailable";
type SourceToolPopup = "analysis" | "cs1" | "non-cs1" | null;
type SourceCheckerTool = Extract<SourceToolPopup, "cs1" | "non-cs1">;
type DraftActions = Record<string, unknown>;
export type ReferenceStyle = "r" | "ref";
let removeActiveSourceManager: (() => void) | null = null;
let sourceManagerGeneration = 0;

interface SelectableSourceAnalysisOccurrence extends SourceAnalysisOccurrence {
    selected: boolean;
}

interface EditableSourceAnalysisFinding extends Omit<
    SourceAnalysisFinding,
    "occurrences"
> {
    occurrences: SelectableSourceAnalysisOccurrence[];
    replacement: string;
}

interface EditableCitationSourceAnalysis extends Omit<
    CitationSourceAnalysis,
    "findings"
> {
    findings: EditableSourceAnalysisFinding[];
}

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

interface TooltipDirectiveBinding {
    value?: unknown;
}

interface TooltipDirective {
    beforeUnmount?: (
        element: HTMLElement,
        binding: TooltipDirectiveBinding,
    ) => void;
    mounted?: (element: HTMLElement, binding: TooltipDirectiveBinding) => void;
    updated?: (element: HTMLElement, binding: TooltipDirectiveBinding) => void;
}

interface CodexComponents {
    CdxButton: unknown;
    CdxCard: unknown;
    CdxCheckbox: unknown;
    CdxCombobox: unknown;
    CdxDialog: unknown;
    CdxField: unknown;
    CdxIcon: unknown;
    CdxMessage: unknown;
    CdxProgressBar: unknown;
    CdxSelect: unknown;
    CdxTab: unknown;
    CdxTable: unknown;
    CdxTabs: unknown;
    CdxTextInput: unknown;
    CdxToastContainer: unknown;
    CdxTooltip: TooltipDirective;
    useToast: () => ToastController;
}

interface ToastOptions {
    autoDismiss?: boolean | number;
}

interface ToastController {
    error: (message: string, options?: ToastOptions) => void;
    info: (message: string, options?: ToastOptions) => void;
    success: (message: string, options?: ToastOptions) => void;
    warning: (message: string, options?: ToastOptions) => void;
}

interface ResourceLoaderRequire {
    (module: "vue"): VueModule;
    (module: "@wikimedia/codex"): CodexComponents;
}

interface SourceManagerState {
    activeLookupTab: { value: string };
    autoScriptTitle: { value: boolean };
    basedOnSourceId: { value: string };
    basedOnSourceOptions: {
        readonly value: Array<{ label: string; value: string }>;
    };
    citationLayout: { value: CitationLayout };
    citationNameCells: {
        readonly value: Map<number, SourceDraftCitationNameCell>;
    };
    checkedCs1CellErrors: { value: SourceDraftErrors };
    checkedCs1Source: { value: string };
    cs1ToolMessages: { value: string[] };
    cs1ToolSources: { value: Cs1CheckedSource[] };
    cs1ToolStatus: { value: Cs1ToolStatus };
    dismissedAliasSuggestions: { value: Set<string> };
    draft: { value: SourceDraft | null };
    draftReviewQueue: { value: PreloadedCheckerSource[] };
    draftReviewTool: { value: SourceCheckerTool | null };
    draftCellErrors: { readonly value: SourceDraftErrors };
    draftSourcePreview: { readonly value: SourcePreviewPart[] };
    editingSource: { value: ExistingSource | null };
    error: { value: string };
    existingSourceQuery: { value: string };
    existingSourceSections: { value: SourceSection[] };
    existingSources: { value: ExistingSource[] };
    filteredExistingSources: { readonly value: ExistingSource[] };
    nonCs1Sources: { readonly value: ExistingSource[] };
    loading: { value: boolean };
    manualTemplate: { value: string | null };
    mode: { value: SourceManagerMode };
    open: { value: boolean };
    referenceStyle: { value: ReferenceStyle };
    sourceUrl: { value: string };
    sourceAnalysis: { value: EditableCitationSourceAnalysis };
    toolPopup: { value: SourceToolPopup };
    toolPopupOpen: { value: boolean };
    sourceSectionPath: { value: string[] };
    sourceTableRows: { readonly value: SourceTableRow[] };
    sourceSectionSelectors: {
        readonly value: SourceSectionSelector[];
    };
    parameterNameOptions: {
        readonly value: Array<{ label: string; value: string }>;
    };
    warning: { value: string };
}

interface SourceManagerActionContext {
    cleanup: () => void;
    close: () => void;
    editor: editBox.EditBox;
    state: SourceManagerState;
    toast: ToastController;
}

interface SourceManagerDerivedInputs {
    checkedCs1CellErrors: SourceManagerState["checkedCs1CellErrors"];
    checkedCs1Source: SourceManagerState["checkedCs1Source"];
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
    menuItems: Array<{
        label: string;
        sectionId: string;
        value: string;
    }>;
    selected: string;
}

interface SourceTableRow {
    actions: string;
    details: string;
    group: string;
    id: string;
    reference: string;
    source: string;
    titleLanguage: string;
    usageCount: number;
}

interface Cs1CheckedSource {
    html: string;
    messages: string[];
    source: ExistingSource;
}

interface PreloadedCheckerSource {
    checkedHtml: string;
    sourceIndex: number;
}

interface SourcePreviewPart {
    kind: "alias" | "parameter" | "text";
    text: string;
}

type SourceManagerDerivedState = Pick<
    SourceManagerState,
    | "basedOnSourceOptions"
    | "citationNameCells"
    | "draftSourcePreview"
    | "draftCellErrors"
    | "filteredExistingSources"
    | "nonCs1Sources"
    | "parameterNameOptions"
    | "sourceSectionSelectors"
    | "sourceTableRows"
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
        "mediawiki.api",
    ])) as ResourceLoaderRequire;
    if (generation !== sourceManagerGeneration) {
        return;
    }
    removeActiveSourceManager?.();
    mountSourceManager(editor, require, options);
}

/** Mounts the source manager into a temporary document host. */
// eslint-disable-next-line max-lines-per-function
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
        Codex,
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
// eslint-disable-next-line max-lines-per-function
function createSourceManagerComponent(
    Vue: VueModule,
    Codex: CodexComponents,
    editor: editBox.EditBox,
    cleanup: () => void,
    options: SourceManagerOptions,
): unknown {
    const setup = function setup(): Record<string, unknown> {
        const state = createSourceManagerState(Vue, editor, options);
        const toast = Codex.useToast();
        const actions = createSourceManagerActions(
            editor,
            state,
            cleanup,
            toast,
        );
        return {
            canCheckCs1Tool: ["enwiki", "zhwiki"].includes(getCurrentWikiId()),
            editSourceIcon: EDIT_SOURCE_ICON,
            formatRowsIcon: FORMAT_ROWS_ICON,
            gadgetBuildTime: GADGET_BUILD_TIME,
            gadgetVersion: GADGET_VERSION,
            joinAuthorIcon: JOIN_AUTHOR_ICON,
            linkIcon: CDX_ICON_LINK,
            cs1WikiLabel:
                getCurrentWikiId() === "zhwiki" ? "Chinese" : "English",
            manualTemplateOptions: MANUAL_TEMPLATE_OPTIONS,
            magicWandIcon: cdxIconMagicWand,
            sourceTableColumns: SOURCE_TABLE_COLUMNS,
            sourceTemplateLabel: getCanonicalTemplateName,
            templateOptions: TEMPLATE_OPTIONS,
            splitAuthorIcon: SPLIT_AUTHOR_ICON,
            switchStatusIcon: SWITCH_STATUS_ICON,
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
    const sourceList = createInitialSourceListState(Vue, editor.read());
    const cs1State = createInitialCs1ToolState(Vue);
    const citationLayout = Vue.ref(options.citationLayout ?? "inline");
    const draft = Vue.ref<SourceDraft | null>(null);
    const referenceStyle = Vue.ref(options.referenceStyle ?? "ref");
    const derived = createSourceManagerDerivedState(Vue, {
        ...cs1State,
        citationLayout,
        draft,
        referenceStyle,
        ...sourceList,
    });
    return {
        ...derived,
        ...sourceList,
        ...cs1State,
        activeLookupTab: Vue.ref("add"),
        autoScriptTitle: Vue.ref(true),
        basedOnSourceId: Vue.ref(""),
        citationLayout,
        dismissedAliasSuggestions: Vue.ref(new Set<string>()),
        draft,
        editingSource: Vue.ref<ExistingSource | null>(null),
        error: Vue.ref(""),
        loading: Vue.ref(false),
        manualTemplate: Vue.ref<string | null>("cite magazine"),
        mode: Vue.ref<SourceManagerMode>("lookup"),
        open: Vue.ref(true),
        referenceStyle,
        sourceUrl: Vue.ref(""),
        toolPopup: Vue.ref<SourceToolPopup>(null),
        toolPopupOpen: Vue.ref(false),
        warning: Vue.ref(""),
    };
}

function createInitialCs1ToolState(Vue: VueModule) {
    return {
        checkedCs1CellErrors: Vue.ref<SourceDraftErrors>(new Map()),
        checkedCs1Source: Vue.ref(""),
        cs1ToolMessages: Vue.ref<string[]>([]),
        cs1ToolSources: Vue.ref<Cs1CheckedSource[]>([]),
        cs1ToolStatus: Vue.ref<Cs1ToolStatus>("idle"),
        draftReviewQueue: Vue.ref<PreloadedCheckerSource[]>([]),
        draftReviewTool: Vue.ref<SourceCheckerTool | null>(null),
    };
}

/** Adds mutable replacement and checkbox state to a fresh analysis. */
function createEditableSourceAnalysis(
    sources: ExistingSource[],
): EditableCitationSourceAnalysis {
    const analysis = analyzeCitationSources(sources);
    return {
        ...analysis,
        findings: analysis.findings.map(function makeFindingEditable(finding) {
            return {
                ...finding,
                occurrences: finding.occurrences.map((occurrence) => ({
                    ...occurrence,
                    selected: false,
                })),
                replacement: finding.suggestedValue,
            };
        }),
    };
}

/** Creates reactive source-list values from the current editor text. */
function createInitialSourceListState(Vue: VueModule, text: string) {
    const existingSources = Vue.ref(
        listExistingSources(text, getCurrentWikiId()),
    );
    return {
        existingSourceQuery: Vue.ref(""),
        sourceAnalysis: Vue.ref(createEditableSourceAnalysis([])),
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
    };
}

/** Builds live name and source-code values for the current draft. */
// eslint-disable-next-line max-lines-per-function
function createDraftDerivedState(
    Vue: VueModule,
    state: SourceManagerDerivedInputs,
) {
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
        if (draft == null) {
            return new Map();
        }
        const local = getSourceDraftErrors(draft, getCurrentWikiId());
        if (
            serializeCurrentSourceDraft(state) !== state.checkedCs1Source.value
        ) {
            return local;
        }
        return mergeSourceDraftErrors(local, state.checkedCs1CellErrors.value);
    }
    return {
        citationNameCells: Vue.computed(getCitationNameCells),
        draftCellErrors: Vue.computed(getDraftCellErrors),
        draftSourcePreview: Vue.computed(getDraftSourcePreview),
        parameterNameOptions: Vue.computed(function getOptions() {
            const draft = state.draft.value;
            if (draft == null) {
                return [];
            }
            return listSourceDraftParameterNames(draft).map((name) => ({
                label: name,
                value: name,
            }));
        }),
    };
}

/** Gets the active MediaWiki database for site-specific CS1 rules. */
function getCurrentWikiId(): string {
    const wikiId = mw.config.get("wgDBname");
    return typeof wikiId === "string" ? wikiId : "";
}

interface Cs1ParseApiResponse {
    parse?: {
        categories?: Array<{ category?: string }>;
        text?: string;
    };
}

/** Runs one explicit, article-wide CS1 parse check. */
async function fetchArticleCs1Issues(
    context: SourceManagerActionContext,
): Promise<void> {
    const { state } = context;
    const sources = state.existingSources.value.filter(
        (source) => source.status !== "non-standard",
    );
    state.cs1ToolMessages.value = [];
    state.cs1ToolSources.value = [];
    state.cs1ToolStatus.value = "checking";
    if (sources.length === 0) {
        state.cs1ToolStatus.value = "complete";
        return;
    }
    try {
        const response = await requestCs1Check(sources);
        const html = response.parse?.text ?? "";
        state.cs1ToolSources.value = mapCs1CheckedSources(html, sources);
        state.cs1ToolMessages.value = extractCs1IssueMessages(
            "",
            listCs1CheckCategories(response),
        );
        state.cs1ToolStatus.value = "complete";
    } catch {
        state.cs1ToolStatus.value = "unavailable";
    }
}

async function requestCs1Check(
    sources: ExistingSource[],
): Promise<Cs1ParseApiResponse> {
    const api = new mw.Api();
    return (await api.post({
        action: "parse",
        contentmodel: "wikitext",
        disableeditsection: true,
        disablelimitreport: true,
        disabletoc: true,
        formatversion: 2,
        preview: true,
        prop: "text|categories",
        text: buildCs1CheckWikitext(sources),
        title: getCurrentPageTitle(),
    })) as Cs1ParseApiResponse;
}

function listCs1CheckCategories(response: Cs1ParseApiResponse): string[] {
    return (response.parse?.categories ?? []).flatMap(
        function getCategory(entry) {
            return entry.category == null ? [] : [entry.category];
        },
    );
}

function mapCs1CheckedSources(
    html: string,
    sources: ExistingSource[],
): Cs1CheckedSource[] {
    const parsed = new DOMParser().parseFromString(html, "text/html");
    return sources.flatMap(function getCheckedSource(source, index) {
        const element = parsed.getElementById(
            `${CS1_CHECK_ID_PREFIX}${index}`,
        );
        const sourceHtml = element?.innerHTML ?? "";
        const messages = extractCs1IssueMessages(sourceHtml);
        return messages.length === 0
            ? []
            : [{ html: sourceHtml, messages, source }];
    });
}

export function buildCs1CheckWikitext(sources: ExistingSource[]): string {
    return sources
        .map(function wrapSource(source, index) {
            const id = `${CS1_CHECK_ID_PREFIX}${index}`;
            return `<div id="${id}">\n${source.rawTemplate}\n</div>`;
        })
        .join("\n");
}

function getCurrentPageTitle(): string {
    const pageName = mw.config.get("wgPageName");
    return typeof pageName === "string"
        ? pageName.replaceAll("_", " ")
        : "Citation formatter validation";
}

function serializeCurrentSourceDraft(
    state: Pick<SourceManagerState, "draft">,
): string {
    const draft = state.draft.value;
    if (draft == null) {
        return "";
    }
    try {
        return serializeSourceDraft(draft, "inline");
    } catch {
        return "";
    }
}

function formatUtcBuildTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "unknown UTC";
    }
    const month = String(date.getUTCMonth() + 1);
    const day = String(date.getUTCDate());
    const time = [
        date.getUTCHours(),
        date.getUTCMinutes(),
        date.getUTCSeconds(),
    ]
        .map((part) => String(part).padStart(2, "0"))
        .join(":");
    return `${date.getUTCFullYear()}/${month}/${day} ${time} UTC`;
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
// eslint-disable-next-line max-lines-per-function
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
            "all",
        );
    }
    const filteredExistingSources = Vue.computed(getFilteredExistingSources);
    function getBasedOnSourceOptions(): Array<{
        label: string;
        value: string;
    }> {
        return state.existingSources.value
            .filter((source) => source.status !== "non-standard")
            .map(function toOption(source) {
                const name = source.referenceName || "unnamed";
                const title = source.title || source.url || "Untitled source";
                return { label: `${name} — ${title}`, value: source.id };
            });
    }
    return {
        basedOnSourceOptions: Vue.computed(getBasedOnSourceOptions),
        filteredExistingSources,
        nonCs1Sources: Vue.computed(function getNonCs1Sources() {
            return state.existingSources.value.filter(
                (source) => source.status === "non-standard",
            );
        }),
        sourceSectionSelectors: Vue.computed(function getSelectors() {
            return buildSourceSectionSelectors(
                state.existingSourceSections.value,
                state.sourceSectionPath.value,
                state.existingSources.value,
            );
        }),
        sourceTableRows: Vue.computed(function getSourceTableRows() {
            return filteredExistingSources.value.map(toSourceTableRow);
        }),
    };
}

/** Projects citation definitions into the Codex Table columns. */
function toSourceTableRow(source: ExistingSource): SourceTableRow {
    return {
        actions: "",
        details:
            source.status === "non-standard"
                ? "Non-standard"
                : getCanonicalTemplateName(source.draft.template),
        group: source.group,
        id: source.id,
        reference: source.referenceName || "unnamed",
        source: source.title || source.url || "Untitled source",
        titleLanguage: source.titleLanguage,
        usageCount: source.usageCount,
    };
}

/** Builds one combobox for each selected section hierarchy level. */
export function buildSourceSectionSelectors(
    sections: SourceSection[],
    path: string[],
    sources: ExistingSource[],
): SourceSectionSelector[] {
    const selectors: SourceSectionSelector[] = [];
    let parentId = "";
    for (let level = 0; level <= path.length; level += 1) {
        let children = sections.filter(
            (section) => section.parentId === parentId,
        );
        if (
            parentId !== "" &&
            parentId !== "0" &&
            parentId !== UNUSED_SOURCE_SECTION_ID &&
            sources.some((source) => source.sectionIds.includes(parentId))
        ) {
            children = [
                buildLeadingSourceSection(parentId, level),
                ...children,
            ];
        }
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
        if (selected.endsWith(".0")) {
            break;
        }
        parentId = selected;
    }
    return selectors;
}

/** Creates the `.0` option for a selected heading's own lead. */
function buildLeadingSourceSection(
    parentId: string,
    level: number,
): SourceSection {
    const title = level === 1 ? "Section lead" : "Subsection lead";
    const id = `${parentId}.0`;
    return {
        depth: level,
        id,
        label: `§ ${id} ${title}`,
        parentId,
        start: -1,
        title,
    };
}

/** Builds the choices for one section-filter hierarchy level. */
function buildSourceSectionSelector(
    sections: SourceSection[],
    level: number,
    selected: string,
): SourceSectionSelector {
    const allLabel = level === 0 ? "All sections" : "All subsections";
    const sectionOptions = sections.map(function toOption(section) {
        return {
            label: section.label,
            sectionId: section.id,
            value: section.label,
        };
    });
    const allOption = {
        label: allLabel,
        sectionId: "",
        value: allLabel,
    };
    return {
        label: level === 0 ? "Section" : "Subsection",
        level,
        menuItems: [allOption, ...sectionOptions],
        selected:
            sectionOptions.find((option) => option.sectionId === selected)
                ?.label ?? allLabel,
    };
}

/** Creates source lookup, insertion, and editing actions. */
function createSourceManagerActions(
    editor: editBox.EditBox,
    state: SourceManagerState,
    cleanup: () => void,
    toast: ToastController,
): Record<string, unknown> {
    const close = function close(): void {
        state.open.value = false;
        queueMicrotask(cleanup);
    };
    const context = { cleanup, close, editor, state, toast };
    return {
        ...createFormatterActions(context),
        ...createNavigationActions(context),
        ...createLookupActions(context),
        ...createDraftActions(context),
        ...createToolActions(context),
    };
}

/** Creates the footer action for formatting the article source. */
// eslint-disable-next-line max-lines-per-function
function createFormatterActions(
    context: SourceManagerActionContext,
): Record<string, unknown> {
    function formatArticle(): void {
        const { editor, state } = context;
        let referencesNotFormatted = 0;
        try {
            const compact = state.referenceStyle.value === "r";
            const source = state.autoScriptTitle.value
                ? moveSourceTitlesToScriptTitle(
                      editor.read(),
                      getCurrentWikiId(),
                  ).text
                : editor.read();
            const result = manageCitationsWithResult(
                source,
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
        if (referencesNotFormatted === 0) {
            context.toast.success(message, { autoDismiss: true });
        } else {
            context.toast.warning(message, { autoDismiss: true });
        }
        refreshExistingSources(editor, state);
        state.activeLookupTab.value = "view";
    }
    function setBlockCitations(enabled: boolean): void {
        context.state.citationLayout.value = enabled ? "block" : "inline";
    }
    function setCompactReferences(enabled: boolean): void {
        context.state.referenceStyle.value = enabled ? "r" : "ref";
    }
    return { formatArticle, setBlockCitations, setCompactReferences };
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
        const reviewTool = state.draftReviewTool.value;
        resetSourceDraft(state);
        if (reviewTool != null) {
            showCheckerResults(state, reviewTool);
        }
    }
    return {
        backToLookup,
        close: context.close,
        onOpenChange,
    };
}

/** Creates parameter-editing and draft-save actions. */
// eslint-disable-next-line max-lines-per-function
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
    function sortParameters(): void {
        const draft = state.draft.value;
        if (draft != null) {
            if (state.autoScriptTitle.value) {
                moveSourceDraftTitleToScriptTitle(draft, getCurrentWikiId());
            }
            formatSourceDraftRows(draft);
            context.toast.success("Citation parameters sorted.", {
                autoDismiss: true,
            });
        }
    }
    async function autofillDate(index: number): Promise<void> {
        await autofillDraftDate(context, index);
    }
    async function linkOrganization(index: number): Promise<void> {
        await linkDraftOrganization(context, index);
    }
    function duplicateDraft(): void {
        if (
            state.draft.value == null ||
            state.editingSource.value == null ||
            state.editingSource.value.status === "non-standard"
        ) {
            return;
        }
        state.editingSource.value = null;
        state.error.value = "";
        state.warning.value =
            "Saving will create a new source without changing the original.";
    }
    function saveDraft(): void {
        saveSourceDraft(context, false);
    }
    function saveDraftAndClose(): void {
        saveSourceDraft(context, true);
    }
    function applyReviewedDraft(): void {
        saveReviewedDraft(context, false);
    }
    function saveDraftAndEditNext(): void {
        saveReviewedDraft(context, true);
    }
    function switchUrlStatus(index: number): void {
        const row = state.draft.value?.rows[index];
        if (row == null) {
            return;
        }
        const current = normalizeDraftName(row.value);
        const currentIndex = URL_STATUSES.indexOf(
            current as (typeof URL_STATUSES)[number],
        );
        row.value = URL_STATUSES[(currentIndex + 1) % URL_STATUSES.length];
    }
    return {
        ...createAuthorDraftActions(state),
        ...createAliasDraftActions(state),
        addParameter,
        applyReviewedDraft,
        autofillDate,
        changeDraftTemplate,
        duplicateDraft,
        getDateAutofillTooltip,
        isDateAutofillParameter,
        isLinkableDraftParameter,
        linkOrganization,
        saveDraft,
        saveDraftAndClose,
        saveDraftAndEditNext,
        sortParameters,
        switchUrlStatus,
    };
}

/** Creates explicit checker-popup actions for the Tools tab. */
function createToolActions(
    context: SourceManagerActionContext,
): Record<string, unknown> {
    return {
        ...createAnalysisToolActions(context),
        ...createCheckerToolActions(context),
    };
}

/** Creates citation-analysis popup and replacement actions. */
function createAnalysisToolActions(
    context: SourceManagerActionContext,
): Record<string, unknown> {
    const { state } = context;
    function openAnalysisTool(): void {
        state.sourceAnalysis.value = createEditableSourceAnalysis(
            state.existingSources.value,
        );
        state.toolPopup.value = "analysis";
        state.toolPopupOpen.value = true;
    }
    function countSelectedAnalysisReplacements(): number {
        return listSelectedAnalysisReplacements(state.sourceAnalysis.value)
            .length;
    }
    function applyAnalysisReplacements(): void {
        applySelectedAnalysisReplacements(context);
    }
    return {
        applyAnalysisReplacements,
        clearAnalysisSelection,
        countSelectedAnalysisReplacements,
        getAnalysisReplacementOptions,
        isAnalysisOccurrenceUnchanged,
        openAnalysisTool,
        selectAnalysisDifferences,
    };
}

/** Creates the CS1 and non-CS1 checker popup actions. */
function createCheckerToolActions(
    context: SourceManagerActionContext,
): Record<string, unknown> {
    const { state } = context;
    async function openCs1Tool(): Promise<void> {
        state.toolPopup.value = "cs1";
        state.toolPopupOpen.value = true;
        await fetchArticleCs1Issues(context);
    }
    function openNonCs1Tool(): void {
        state.toolPopup.value = "non-cs1";
        state.toolPopupOpen.value = true;
    }
    function closeToolPopup(): void {
        state.toolPopupOpen.value = false;
    }
    function onToolPopupOpenChange(open: boolean): void {
        if (!open) {
            state.toolPopupOpen.value = false;
        }
    }
    function reviewNonCs1Source(sourceId: string): void {
        closeToolPopup();
        reviewNonCs1CheckedSource(state, sourceId);
    }
    function reviewCs1Source(sourceId: string): void {
        closeToolPopup();
        reviewCs1CheckedSource(state, sourceId);
    }
    return {
        closeToolPopup,
        onToolPopupOpenChange,
        openCs1Tool,
        openNonCs1Tool,
        reviewCs1Source,
        reviewNonCs1Source,
    };
}

function selectAnalysisDifferences(
    finding: EditableSourceAnalysisFinding,
): void {
    for (const occurrence of finding.occurrences) {
        occurrence.selected = !isAnalysisOccurrenceUnchanged(
            finding,
            occurrence,
        );
    }
}

function clearAnalysisSelection(finding: EditableSourceAnalysisFinding): void {
    for (const occurrence of finding.occurrences) {
        occurrence.selected = false;
    }
}

function getAnalysisReplacementOptions(
    finding: EditableSourceAnalysisFinding,
): Array<{ label: string; value: string }> {
    return finding.options.map((option) => ({
        label: `${option.value || "(no alias)"} (${option.count}×)`,
        value: option.value,
    }));
}

function isAnalysisOccurrenceUnchanged(
    finding: EditableSourceAnalysisFinding,
    occurrence: SelectableSourceAnalysisOccurrence,
): boolean {
    return occurrence.value === finding.replacement;
}

/** Writes checked analysis replacements as one editor operation. */
function applySelectedAnalysisReplacements(
    context: SourceManagerActionContext,
): void {
    const { editor, state, toast } = context;
    const selected = listSelectedAnalysisReplacements(
        state.sourceAnalysis.value,
    );
    if (selected.length === 0) {
        toast.info("Select at least one differing citation value.", {
            autoDismiss: true,
        });
        return;
    }
    try {
        const text = applySourceAnalysisReplacements(
            editor.read(),
            state.existingSources.value,
            selected,
        );
        editor.write(text);
        refreshExistingSources(editor, state);
        state.sourceAnalysis.value = createEditableSourceAnalysis(
            state.existingSources.value,
        );
    } catch (error) {
        toast.error(formatError(error), { autoDismiss: true });
        return;
    }
    toast.success(`${selected.length} citation value(s) replaced.`, {
        autoDismiss: true,
    });
}

/** Expands checked occurrences into domain-layer replacements. */
function listSelectedAnalysisReplacements(
    analysis: EditableCitationSourceAnalysis,
): SourceAnalysisReplacement[] {
    return analysis.findings.flatMap((finding) =>
        finding.occurrences.flatMap((occurrence) => {
            if (
                !occurrence.selected ||
                isAnalysisOccurrenceUnchanged(finding, occurrence)
            ) {
                return [];
            }
            return [
                {
                    cell: occurrence.cell,
                    oldValue: occurrence.value,
                    parameter: occurrence.parameter,
                    replacement:
                        typeof finding.replacement === "string"
                            ? finding.replacement
                            : "",
                    rowIndex: occurrence.rowIndex,
                    sourceId: occurrence.sourceId,
                },
            ];
        }),
    );
}

function reviewCs1CheckedSource(
    state: SourceManagerState,
    sourceId: string,
): void {
    const checked = state.cs1ToolSources.value.find(
        (result) => result.source.id === sourceId,
    );
    if (checked == null) {
        return;
    }
    const queue = preloadCs1ReviewQueue(state, sourceId);
    openCs1ReviewSource(state, sourceId, checked.html, queue);
}

/** Opens a prechecked CS1 draft without another API request. */
function openCs1ReviewSource(
    state: SourceManagerState,
    sourceId: string,
    checkedHtml: string,
    queue: PreloadedCheckerSource[],
): boolean {
    openExistingSourceWhenIdle(state, sourceId);
    const draft = state.draft.value;
    if (draft == null) {
        return false;
    }
    state.draftReviewQueue.value = queue;
    state.draftReviewTool.value = "cs1";
    const result = parseCs1ValidationResult(draft, checkedHtml);
    state.checkedCs1CellErrors.value = result.cellErrors;
    state.checkedCs1Source.value = serializeCurrentSourceDraft(state);
    if (result.messages.length > 0) {
        state.warning.value = result.messages.join("\n");
    }
    return true;
}

/** Opens one non-CS1 result in the sequential checker-edit workflow. */
function reviewNonCs1CheckedSource(
    state: SourceManagerState,
    sourceId: string,
): void {
    const source = findExistingSourceById(state, sourceId);
    if (source == null) {
        return;
    }
    const queue = preloadNonCs1ReviewQueue(state, sourceId);
    openNonCs1ReviewSource(state, sourceId, queue);
}

/** Opens a preloaded non-CS1 draft in the checker workflow. */
function openNonCs1ReviewSource(
    state: SourceManagerState,
    sourceId: string,
    queue: PreloadedCheckerSource[],
): boolean {
    openExistingSourceWhenIdle(state, sourceId);
    if (state.draft.value == null) {
        return false;
    }
    state.draftReviewQueue.value = queue;
    state.draftReviewTool.value = "non-cs1";
    return true;
}

/** Preloads other CS1 results, wrapping after the final item. */
function preloadCs1ReviewQueue(
    state: SourceManagerState,
    sourceId: string,
): PreloadedCheckerSource[] {
    const results = state.cs1ToolSources.value;
    const currentIndex = results.findIndex(
        (result) => result.source.id === sourceId,
    );
    if (currentIndex < 0) {
        return [];
    }
    const ordered = [
        ...results.slice(currentIndex + 1),
        ...results.slice(0, currentIndex),
    ];
    return ordered.flatMap(function preload(result) {
        return preloadCheckerSource(state, result.source, result.html);
    });
}

/** Preloads other non-CS1 results, wrapping after the final item. */
function preloadNonCs1ReviewQueue(
    state: SourceManagerState,
    sourceId: string,
): PreloadedCheckerSource[] {
    const sources = state.nonCs1Sources.value;
    const currentIndex = sources.findIndex((source) => source.id === sourceId);
    if (currentIndex < 0) {
        return [];
    }
    const ordered = [
        ...sources.slice(currentIndex + 1),
        ...sources.slice(0, currentIndex),
    ];
    return ordered.flatMap(function preload(source) {
        return preloadCheckerSource(state, source);
    });
}

/** Captures one check result by stable source-list position. */
function preloadCheckerSource(
    state: SourceManagerState,
    source: ExistingSource,
    checkedHtml: string = "",
): PreloadedCheckerSource[] {
    const sourceIndex = state.existingSources.value.findIndex(
        (candidate) => candidate.id === source.id,
    );
    return sourceIndex < 0 ? [] : [{ checkedHtml, sourceIndex }];
}

/** Returns whether a row supports one-click date filling. */
function isDateAutofillParameter(name: string): boolean {
    return isAccessDateParameter(name) || isArchiveDateParameter(name);
}

function isAccessDateParameter(name: string): boolean {
    return ["access-date", "accessdate"].includes(normalizeDraftName(name));
}

function isArchiveDateParameter(name: string): boolean {
    return ["archive-date", "archivedate"].includes(normalizeDraftName(name));
}

function getDateAutofillTooltip(name: string): string {
    return isAccessDateParameter(name)
        ? "Fill today"
        : "Fill from archive-url";
}

/** Checks whether an organization field can become a local link. */
function isLinkableDraftParameter(name: string): boolean {
    return [
        "agency",
        "department",
        "institution",
        "journal",
        "magazine",
        "newspaper",
        "organization",
        "periodical",
        "publisher",
        "website",
        "work",
    ].includes(normalizeDraftName(name));
}

/** Fills today's date or derives archive fields from an archive URL. */
async function autofillDraftDate(
    context: SourceManagerActionContext,
    index: number,
): Promise<void> {
    const { state, toast } = context;
    const draft = state.draft.value;
    const row = draft?.rows[index];
    if (draft == null || row == null || state.loading.value) {
        return;
    }
    if (isAccessDateParameter(row.name)) {
        row.value = formatLocalIsoDate(new Date());
        toast.success("Access date filled.", { autoDismiss: true });
        return;
    }
    state.loading.value = true;
    try {
        const archiveUrl = getDraftRowValue(draft, "archive-url");
        const parsed = parseSourceUrl(archiveUrl);
        if (parsed?.archiveDate) {
            row.value = parsed.archiveDate;
            toast.success("Archive date filled.", { autoDismiss: true });
            return;
        }
        const sourceUrl = getDraftRowValue(draft, "url");
        const archive = await fetchAvailableArchive(sourceUrl);
        if (archive == null) {
            throw new Error("No archive snapshot was found.");
        }
        setDraftValue(draft, "archive-url", archive.archiveUrl);
        row.value = archive.archiveDate;
        toast.success("Archive fields filled.", { autoDismiss: true });
    } catch {
        toast.error("Archive-date check failed.", { autoDismiss: true });
    } finally {
        state.loading.value = false;
    }
}

/** Validates and redirect-normalizes an organization wikilink. */
async function linkDraftOrganization(
    context: SourceManagerActionContext,
    index: number,
): Promise<void> {
    const { state, toast } = context;
    const row = state.draft.value?.rows[index];
    if (row == null || state.loading.value) {
        return;
    }
    state.loading.value = true;
    try {
        row.value = await resolveCitationWikiLink(row.value, new mw.Api());
        toast.success("Article link checked.", { autoDismiss: true });
    } catch {
        toast.error("Link check failed.", { autoDismiss: true });
    } finally {
        state.loading.value = false;
    }
}

/** Gets one case-insensitive draft row value. */
function getDraftRowValue(draft: SourceDraft, name: string): string {
    const normalized = normalizeDraftName(name);
    return (
        draft.rows.find((row) => normalizeDraftName(row.name) === normalized)
            ?.value ?? ""
    );
}

function normalizeDraftName(name: string): string {
    return name.trim().toLocaleLowerCase("en-US");
}

/** Formats today using the user's local calendar date. */
function formatLocalIsoDate(date: Date): string {
    const year = String(date.getFullYear()).padStart(4, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/** Validates and saves the current source draft. */
function saveSourceDraft(
    context: SourceManagerActionContext,
    closeAfterSave: boolean,
): void {
    const { editor, state, toast } = context;
    if (!writeSourceDraft(context)) {
        return;
    }
    toast.success("Citation source saved.", { autoDismiss: true });
    if (closeAfterSave) {
        finishSourceManager(context);
        return;
    }
    refreshExistingSources(editor, state);
    resetSourceDraft(state);
    state.activeLookupTab.value = "view";
}

/** Saves a checker result and returns or opens the next issue. */
function saveReviewedDraft(
    context: SourceManagerActionContext,
    editNext: boolean,
): void {
    const { editor, state, toast } = context;
    const reviewTool = state.draftReviewTool.value;
    const reviewQueue = state.draftReviewQueue.value;
    const nextSource = editNext ? reviewQueue[0] : null;
    const remainingQueue = editNext ? reviewQueue.slice(1) : [];
    if (reviewTool == null || !writeSourceDraft(context)) {
        return;
    }
    refreshExistingSources(editor, state);
    if (reviewTool === "cs1") {
        syncCs1BatchResults(state, reviewQueue);
    }
    resetSourceDraft(state);
    toast.success("Citation source saved.", { autoDismiss: true });
    if (
        nextSource != null &&
        openPreloadedCheckerSource(
            state,
            reviewTool,
            nextSource,
            remainingQueue,
        )
    ) {
        return;
    }
    showCheckerResults(state, reviewTool);
}

/** Keeps unreviewed CS1 results from the original batch request. */
function syncCs1BatchResults(
    state: SourceManagerState,
    queue: PreloadedCheckerSource[],
): void {
    state.cs1ToolSources.value = queue
        .toSorted((left, right) => left.sourceIndex - right.sourceIndex)
        .flatMap(function restoreResult(preloaded) {
            const source = state.existingSources.value[preloaded.sourceIndex];
            const messages = extractCs1IssueMessages(preloaded.checkedHtml);
            return source == null ||
                source.status === "non-standard" ||
                messages.length === 0
                ? []
                : [{ html: preloaded.checkedHtml, messages, source }];
        });
    if (state.cs1ToolSources.value.length === 0) {
        state.cs1ToolMessages.value = [];
    }
}

/** Opens a preloaded next item against the refreshed source ranges. */
function openPreloadedCheckerSource(
    state: SourceManagerState,
    reviewTool: SourceCheckerTool,
    preloaded: PreloadedCheckerSource,
    remainingQueue: PreloadedCheckerSource[],
): boolean {
    const source = state.existingSources.value[preloaded.sourceIndex];
    if (source == null) {
        return false;
    }
    if (reviewTool === "cs1") {
        return openCs1ReviewSource(
            state,
            source.id,
            preloaded.checkedHtml,
            remainingQueue,
        );
    }
    if (source.status !== "non-standard") {
        return false;
    }
    return openNonCs1ReviewSource(state, source.id, remainingQueue);
}

/** Opens refreshed checker results over the manager lookup view. */
function showCheckerResults(
    state: SourceManagerState,
    reviewTool: SourceCheckerTool,
): void {
    state.activeLookupTab.value = "tools";
    state.toolPopup.value = reviewTool;
    state.toolPopupOpen.value = true;
}

/** Validates and writes the current source draft. */
function writeSourceDraft(context: SourceManagerActionContext): boolean {
    const { editor, state } = context;
    const draft = state.draft.value;
    if (draft == null) {
        return false;
    }
    try {
        if (state.autoScriptTitle.value) {
            moveSourceDraftTitleToScriptTitle(draft, getCurrentWikiId());
        }
        validateDraft(draft);
        if (state.editingSource.value == null) {
            insertNewSource(editor, draft, state.citationLayout.value);
        } else {
            updateExistingSource(editor, state, draft);
        }
    } catch (error) {
        state.error.value = formatError(error);
        return false;
    }
    return true;
}

/** Clears the draft view without changing the source-list state. */
function resetSourceDraft(state: SourceManagerState): void {
    state.dismissedAliasSuggestions.value = new Set();
    state.draft.value = null;
    state.draftReviewQueue.value = [];
    state.draftReviewTool.value = null;
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
    function createManualSource(): void {
        openManualSourceWhenIdle(context.state);
    }
    function insertListedSource(sourceId: string): void {
        insertListedSourceWhenIdle(context, sourceId);
    }
    return {
        createManualSource,
        editListedSource,
        insertListedSource,
        onSourcePaste(event: ClipboardEvent): void {
            handleSourcePaste(context, event);
        },
        resolveEnteredSource,
        selectSourceSection(
            selector: SourceSectionSelector,
            selected: string | number,
        ): void {
            selectSourceSectionOption(context.state, selector, selected);
        },
    };
}

function selectSourceSectionOption(
    state: SourceManagerState,
    selector: SourceSectionSelector,
    selected: string | number,
): void {
    const entered = String(selected);
    const option = selector.menuItems.find(
        (item) =>
            item.value === entered ||
            item.label === entered ||
            item.sectionId === entered,
    );
    if (option != null) {
        updateSourceSectionSelection(state, selector.level, option.sectionId);
    }
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

/** Clones one selected citation into a new source draft. */
function openBasedOnSource(state: SourceManagerState, sourceId: string): void {
    const source = findExistingSourceById(state, sourceId);
    if (source == null || source.status === "non-standard") {
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
    state.sourceSectionPath.value = [
        ...state.sourceSectionPath.value.slice(0, level),
        value,
    ];
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
    context.toast.success("Existing reference inserted.", {
        autoDismiss: true,
    });
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
        context.toast.success("Existing reference inserted.", {
            autoDismiss: true,
        });
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
    clearCheckedCs1Errors(state);
    state.draftReviewTool.value = null;
    const draft = cloneDraft(source.draft);
    ensureNextAuthorDraftRows(draft);
    state.dismissedAliasSuggestions.value = new Set();
    state.editingSource.value = source;
    state.draft.value = draft;
    state.error.value = "";
    state.warning.value =
        source.status === "non-standard"
            ? "Saving will replace the original reference content with " +
              "the new citation template."
            : "";
    state.mode.value = "draft";
}

function clearCheckedCs1Errors(state: SourceManagerState): void {
    state.checkedCs1CellErrors.value = new Map();
    state.checkedCs1Source.value = "";
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
    clearCheckedCs1Errors(state);
    state.dismissedAliasSuggestions.value = new Set();
    state.draft.value = draft;
    state.draftReviewTool.value = null;
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
    const sources = listExistingSources(text, getCurrentWikiId());
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
}

/** Inserts a newly built full reference at the active selection. */
function insertNewSource(
    editor: editBox.EditBox,
    draft: SourceDraft,
    layout: CitationLayout,
): void {
    const citation = serializeSourceDraft(draft, layout);
    editor.replaceSelection(`<ref>${citation}</ref>`);
}

/** Updates one citation while preserving its current layout. */
function updateExistingSource(
    editor: editBox.EditBox,
    state: SourceManagerState,
    draft: SourceDraft,
): void {
    const current = editor.read();
    const source = state.editingSource.value as ExistingSource;
    const layout =
        source.status === "non-standard"
            ? state.citationLayout.value
            : detectCitationLayout(`<ref>${source.rawTemplate}</ref>`);
    const replaced = replaceExistingSource(current, source, draft, layout);
    editor.write(replaced);
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

function hasTooltipMessage(value: unknown): boolean {
    return typeof value === "string" && value.trim() !== "";
}

function removeOptionalTooltip(
    tooltip: TooltipDirective,
    activeElements: WeakSet<HTMLElement>,
    element: HTMLElement,
    binding: TooltipDirectiveBinding,
): void {
    if (!activeElements.has(element)) {
        return;
    }
    tooltip.beforeUnmount?.(element, binding);
    activeElements.delete(element);
}

/** Applies Codex tooltips only while a dynamic message exists. */
function createOptionalTooltipDirective(
    tooltip: TooltipDirective,
): TooltipDirective {
    const activeElements = new WeakSet<HTMLElement>();

    return {
        beforeUnmount(element, binding) {
            removeOptionalTooltip(tooltip, activeElements, element, binding);
        },
        mounted(element, binding) {
            if (hasTooltipMessage(binding.value)) {
                tooltip.mounted?.(element, binding);
                activeElements.add(element);
            }
        },
        updated(element, binding) {
            if (!hasTooltipMessage(binding.value)) {
                removeOptionalTooltip(
                    tooltip,
                    activeElements,
                    element,
                    binding,
                );
                return;
            }
            if (activeElements.has(element)) {
                tooltip.updated?.(element, binding);
            } else {
                tooltip.mounted?.(element, binding);
                activeElements.add(element);
            }
        },
    };
}

/** Registers the Codex components used by the source manager. */
function registerCodexComponents(app: VueApp, Codex: CodexComponents): void {
    app.component("CdxButton", Codex.CdxButton);
    app.component("CdxCard", Codex.CdxCard);
    app.component("CdxCheckbox", Codex.CdxCheckbox);
    app.component("CdxCombobox", Codex.CdxCombobox);
    app.component("CdxDialog", Codex.CdxDialog);
    app.component("CdxField", Codex.CdxField);
    app.component("CdxIcon", Codex.CdxIcon);
    app.component("CdxMessage", Codex.CdxMessage);
    app.component("CdxProgressBar", Codex.CdxProgressBar);
    app.component("CdxSelect", Codex.CdxSelect);
    app.component("CdxTab", Codex.CdxTab);
    app.component("CdxTable", Codex.CdxTable);
    app.component("CdxTabs", Codex.CdxTabs);
    app.component("CdxTextInput", Codex.CdxTextInput);
    app.component("CdxToastContainer", Codex.CdxToastContainer);
    app.directive(
        "optional-tooltip",
        createOptionalTooltipDirective(Codex.CdxTooltip),
    );
    app.directive("tooltip", Codex.CdxTooltip);
}

const SOURCE_MANAGER_TEMPLATE = `
<cdx-dialog
    v-model:open="open"
    class="cf-source-manager"
    title="Citation formatter"
    @update:open="onOpenChange"
>
    <cdx-toast-container />
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
            <div
                v-if="existingSources.length > 0"
                class="cf-source-manager__source-filters"
            >
                <cdx-field
                    class="cf-source-manager__filter-field"
                >
                    <template #label>Filter by Keyword</template>
                    <cdx-text-input
                        v-model="existingSourceQuery"
                        placeholder="Search authors, websites, or keywords"
                    />
                </cdx-field>
                <cdx-field
                    v-if="sourceSectionSelectors.length > 0"
                    class="cf-source-manager__filter-field"
                >
                    <template #label>Filter by Section</template>
                    <div class="cf-source-manager__filter-controls">
                        <cdx-combobox
                            v-for="selector in sourceSectionSelectors"
                            :key="selector.level"
                            :selected="selector.selected"
                            :menu-items="selector.menuItems"
                            :menu-config="{ visibleItemLimit: 8 }"
                            :aria-label="selector.label"
                            @update:selected="
                                selectSourceSection( selector, $event )
                            "
                        />
                    </div>
                </cdx-field>
            </div>
            <p v-if="existingSources.length === 0">
                No existing citation definitions found.
            </p>
            <p v-else-if="filteredExistingSources.length === 0">
                No sources match these keywords.
            </p>
            <cdx-table
                v-else
                class="cf-source-manager__source-table"
                caption="Existing citation sources"
                :hide-caption="true"
                :use-row-headers="true"
                :columns="sourceTableColumns"
                :data="sourceTableRows"
            >
                <template #item-reference="{ item, row }">
                    <div class="cf-source-manager__source-reference">
                        <span
                            class="
                                cf-source-manager__source-reference-name
                            "
                            :title="
                                item === 'unnamed'
                                    ? 'Unnamed reference'
                                    : item
                            "
                        >
                            {{ item }}
                        </span>
                        <small class="cf-source-manager__source-details">
                            <code>{{ row.details }}</code>
                            <template v-if="row.group">
                                · group {{ row.group }}
                            </template>
                            · {{ row.usageCount }}×
                        </small>
                    </div>
                </template>
                <template #item-source="{ item, row }">
                    <span
                        class="cf-source-manager__source-title"
                        :lang="row.titleLanguage || undefined"
                        :title="item"
                    >
                        {{ item }}
                    </span>
                </template>
                <template #item-actions="{ row }">
                    <div class="cf-source-manager__existing-actions">
                        <cdx-button
                            v-tooltip="'Use source'"
                            action="progressive"
                            weight="quiet"
                            :disabled="loading"
                            aria-label="Use source"
                            @click="insertListedSource( row.id )"
                        >
                            <cdx-icon :icon="useSourceIcon" />
                        </cdx-button>
                        <cdx-button
                            v-tooltip="'Edit source'"
                            weight="quiet"
                            :disabled="loading"
                            aria-label="Edit source"
                            @click="editListedSource( row.id )"
                        >
                            <cdx-icon :icon="editSourceIcon" />
                        </cdx-button>
                    </div>
                </template>
            </cdx-table>
        </cdx-tab>
        <cdx-tab name="tools" label="Tools">
            <div class="cf-source-manager__tools">
                <cdx-field
                    class="cf-source-manager__advanced-formatting"
                    :is-fieldset="true"
                >
                    <template #label>
                        Advanced formatting preferences
                    </template>
                    <template #description>
                        Choose article-wide citation transformations, then
                        apply them together.
                    </template>
                    <cdx-checkbox
                        :model-value="referenceStyle === 'r'"
                        @update:model-value="setCompactReferences"
                    >
                        Use <code>&#123;&#123;r&#125;&#125;</code> instead of
                        <code>&lt;ref&gt;</code> where possible
                    </cdx-checkbox>
                    <cdx-checkbox
                        :model-value="citationLayout === 'block'"
                        @update:model-value="setBlockCitations"
                    >
                        Use block citations (two-space indent) instead of
                        inline citations
                    </cdx-checkbox>
                    <cdx-checkbox v-model="autoScriptTitle">
                        Move a foreign-language <code>title</code> to
                        <code>script-title</code> when its language code is
                        available
                    </cdx-checkbox>
                    <cdx-button
                        action="progressive"
                        weight="primary"
                        :disabled="loading"
                        @click="formatArticle"
                    >
                        Apply advanced formatting
                    </cdx-button>
                </cdx-field>
                <cdx-field>
                    <template #label>Citation checks</template>
                    <template #description>
                        Open checker results in a separate popup.
                    </template>
                    <div class="cf-source-manager__tool-launchers">
                        <cdx-button
                            action="progressive"
                            @click="openAnalysisTool"
                        >
                            Analyze citation consistency
                        </cdx-button>
                        <cdx-button
                            v-if="canCheckCs1Tool"
                            action="progressive"
                            @click="openCs1Tool"
                        >
                            Check CS1 issues
                        </cdx-button>
                        <cdx-button @click="openNonCs1Tool">
                            Check non-CS1 sources
                        </cdx-button>
                    </div>
                </cdx-field>
                <cdx-card class="cf-source-manager__gadget-info">
                    <template #title>Gadget info</template>
                    <template #supporting-text>
                        Version {{ gadgetVersion }}
                        (build at: {{ gadgetBuildTime }})
                    </template>
                </cdx-card>
            </div>
        </cdx-tab>
        </cdx-tabs>
    </div>
    <div v-else-if="draft">
        <cdx-field
            v-if="
                editingSource &&
                editingSource.status === 'non-standard'
            "
            class="cf-source-manager__original-source"
        >
            <template #label>Original source code</template>
            <template #description>
                This code is shown for comparison and will be replaced
                by the citation template when saved.
            </template>
            <pre>{{ editingSource.rawReference }}</pre>
        </cdx-field>
        <div class="cf-source-manager__draft-header">
            <cdx-field class="cf-source-manager__template-field">
                <template #label>Citation template</template>
                <cdx-select
                    :selected="draft.template"
                    :menu-items="templateOptions"
                    @update:selected="changeDraftTemplate"
                />
            </cdx-field>
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
                        <cdx-combobox
                            v-model:selected="row.name"
                            class="cf-source-manager__param-name"
                            :menu-items="parameterNameOptions"
                            :menu-config="{ visibleItemLimit: 8 }"
                            :status="
                                draftCellErrors.get( index )?.name
                                    ? 'error'
                                    : 'default'
                            "
                            v-optional-tooltip="
                                draftCellErrors.get( index )?.name
                            "
                            aria-label="Parameter name"
                            placeholder="parameter"
                        >
                            <template #no-results>
                                Custom parameter
                            </template>
                        </cdx-combobox>
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
                            v-optional-tooltip="
                                draftCellErrors.get( index )?.value ||
                                (
                                    citationNameCells.get( index ) ===
                                    'value'
                                        ? 'This value is used in the ' +
                                            'generated reference name.'
                                        : ''
                                )
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
                            v-optional-tooltip="
                                draftCellErrors.get( index )?.alias ||
                                (
                                    citationNameCells.get( index ) ===
                                    'alias'
                                        ? 'This alias is used in the ' +
                                            'generated reference name.'
                                        : ''
                                )
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
                                v-if="
                                    row.name.trim().toLowerCase() ===
                                    'url-status'
                                "
                                v-tooltip="
                                    'Switch status: live, dead, or unfit'
                                "
                                weight="quiet"
                                aria-label="
                                    Switch url-status between live, dead,
                                    and unfit
                                "
                                @click="switchUrlStatus( index )"
                            >
                                <cdx-icon :icon="switchStatusIcon" />
                            </cdx-button>
                            <cdx-button
                                v-if="isDateAutofillParameter( row.name )"
                                v-tooltip="
                                    getDateAutofillTooltip( row.name )
                                "
                                weight="quiet"
                                :disabled="loading"
                                :aria-label="
                                    getDateAutofillTooltip( row.name )
                                "
                                @click="autofillDate( index )"
                            >
                                <cdx-icon :icon="magicWandIcon" />
                            </cdx-button>
                            <cdx-button
                                v-if="isLinkableDraftParameter( row.name )"
                                v-tooltip="'Check or fix the article link'"
                                weight="quiet"
                                :disabled="
                                    loading || row.value.trim() === ''
                                "
                                :aria-label="
                                    'Check article link for ' + row.name
                                "
                                @click="linkOrganization( index )"
                            >
                                <cdx-icon :icon="linkIcon" />
                            </cdx-button>
                            <cdx-button
                                v-if="isAuthorDraftParameter( row.name )"
                                v-tooltip="
                                    'Use separate first and last name fields'
                                "
                                weight="quiet"
                                :disabled="!canSplitAuthor( index )"
                                :aria-label="
                                    'Use separate first and last fields for ' +
                                    row.name
                                "
                                @click="splitAuthor( index )"
                            >
                                <cdx-icon :icon="splitAuthorIcon" />
                            </cdx-button>
                            <cdx-button
                                v-else-if="
                                    isLastAuthorDraftParameter( row.name )
                                "
                                v-tooltip="'Return to one full-name field'"
                                weight="quiet"
                                :disabled="!canJoinAuthor( index )"
                                :aria-label="
                                    'Use one full-name field for ' + row.name
                                "
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
            <cdx-button @click="sortParameters">
                <cdx-icon :icon="formatRowsIcon" />
                Sort parameters
            </cdx-button>
            <cdx-button
                v-if="
                    editingSource &&
                    editingSource.status !== 'non-standard' &&
                    !draftReviewTool
                "
                @click="duplicateDraft"
            >
                Duplicate
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
        <div class="cf-source-manager__footer-actions">
            <cdx-button
                v-if="mode === 'draft' && !draftReviewTool"
                action="progressive"
                weight="primary"
                @click="saveDraftAndClose"
            >
                Save and close
            </cdx-button>
            <cdx-button
                v-if="mode === 'draft' && draftReviewTool"
                action="progressive"
                weight="primary"
                @click="saveDraftAndEditNext"
            >
                Save and edit next
            </cdx-button>
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
                v-if="mode === 'draft' && draftReviewTool"
                action="progressive"
                @click="applyReviewedDraft"
            >
                Apply
            </cdx-button>
            <cdx-button
                v-if="mode === 'draft' && !draftReviewTool"
                action="progressive"
                @click="saveDraft"
            >
                Save
            </cdx-button>
            <cdx-button
                v-if="mode === 'draft'"
                @click="backToLookup"
            >
                {{ draftReviewTool ? 'Back to results' : 'Back' }}
            </cdx-button>
            <cdx-button @click="close">Close</cdx-button>
        </div>
    </template>
</cdx-dialog>
<cdx-dialog
    v-model:open="toolPopupOpen"
    class="cf-source-manager__tool-dialog"
    :title="
        toolPopup === 'analysis'
            ? 'Citation consistency analysis'
            : (
                toolPopup === 'cs1'
                    ? 'CS1 issue check'
                    : 'Non-CS1 source check'
            )
    "
    @update:open="onToolPopupOpenChange"
>
    <template v-if="toolPopup === 'analysis'">
        <p>
            Review possible inconsistencies, choose a target value, then
            check only the occurrences to fix. Parameter names stay as is.
        </p>
        <cdx-message
            v-if="sourceAnalysis.findings.length === 0"
            type="success"
        >
            No likely value-format inconsistencies found.
        </cdx-message>
        <div
            v-for="finding in sourceAnalysis.findings"
            v-else
            :key="finding.id"
            class="cf-source-analysis__finding"
        >
            <h4>{{ finding.label }}</h4>
            <p>{{ finding.reason }}</p>
            <div class="cf-source-analysis__finding-controls">
                <cdx-field>
                    <template #label>
                        {{
                            finding.category === 'alias'
                                ? 'Alias / source key'
                                : 'Value'
                        }}
                    </template>
                    <cdx-combobox
                        v-model:selected="finding.replacement"
                        :menu-items="
                            getAnalysisReplacementOptions( finding )
                        "
                    >
                        <template #no-results>
                            Use entered value
                        </template>
                    </cdx-combobox>
                </cdx-field>
                <div class="cf-source-analysis__selection-actions">
                    <cdx-button
                        weight="quiet"
                        @click="selectAnalysisDifferences( finding )"
                    >
                        Select differing
                    </cdx-button>
                    <cdx-button
                        weight="quiet"
                        @click="clearAnalysisSelection( finding )"
                    >
                        Clear
                    </cdx-button>
                </div>
            </div>
            <ul class="cf-source-analysis__occurrences">
                <li
                    v-for="occurrence in finding.occurrences"
                    :key="occurrence.id"
                >
                    <cdx-checkbox
                        v-model="occurrence.selected"
                        :disabled="
                            isAnalysisOccurrenceUnchanged(
                                finding,
                                occurrence
                            )
                        "
                    >
                        <span class="cf-source-analysis__occurrence-heading">
                            <strong>
                                {{
                                    occurrence.referenceName ||
                                    'unnamed reference'
                                }}
                            </strong>
                            <code>|{{ occurrence.parameter }}=</code>
                            <code>{{ occurrence.displayValue }}</code>
                            <code v-if="occurrence.cell === 'alias'">
                                {{
                                    occurrence.value
                                        ? '<!-- # ' +
                                            occurrence.value +
                                            ' -->'
                                        : '(no # alias)'
                                }}
                            </code>
                        </span>
                        <small>
                            {{ occurrence.template }} ·
                            {{ occurrence.title }}
                        </small>
                    </cdx-checkbox>
                </li>
            </ul>
        </div>
    </template>
    <template v-else-if="toolPopup === 'cs1'">
        <p>
            Complete CS1 check using the installed rules on
            {{ cs1WikiLabel }} Wikipedia.
        </p>
        <cdx-progress-bar
            v-if="cs1ToolStatus === 'checking'"
            aria-label="Checking CS1 issues"
        />
        <cdx-message
            v-else-if="cs1ToolStatus === 'unavailable'"
            type="error"
        >
            The CS1 API check is temporarily unavailable.
        </cdx-message>
        <cdx-message
            v-else-if="
                cs1ToolStatus === 'complete' &&
                cs1ToolMessages.length === 0 &&
                cs1ToolSources.length === 0
            "
            type="success"
        >
            No CS1 issues found.
        </cdx-message>
        <cdx-message
            v-if="
                cs1ToolStatus === 'complete' &&
                cs1ToolMessages.length > 0
            "
            type="warning"
        >
            <ul>
                <li
                    v-for="message in cs1ToolMessages"
                    :key="message"
                >
                    {{ message }}
                </li>
            </ul>
        </cdx-message>
        <ol
            v-if="
                cs1ToolStatus === 'complete' &&
                cs1ToolSources.length > 0
            "
            class="cf-source-manager__existing-list"
        >
            <li
                v-for="result in cs1ToolSources"
                :key="result.source.id"
                class="
                    cf-source-manager__existing-row
                    cf-source-manager__existing-row--error
                "
            >
                <div class="cf-source-manager__existing-summary">
                    <small class="cf-source-manager__existing-name">
                        ({{
                            result.source.referenceName || 'unnamed'
                        }})
                    </small>
                    <span
                        class="cf-source-manager__existing-title"
                        :title="
                            result.source.title ||
                            result.source.url ||
                            'Untitled source'
                        "
                    >
                        {{
                            result.source.title ||
                            result.source.url ||
                            'Untitled source'
                        }}
                    </span>
                    <small class="cf-source-manager__existing-meta">
                        <code>
                            {{
                                sourceTemplateLabel(
                                    result.source.draft.template
                                )
                            }}
                        </code>
                        · {{ result.messages.join( ' · ' ) }}
                    </small>
                </div>
                <div class="cf-source-manager__existing-actions">
                    <cdx-button
                        v-tooltip="'Edit source'"
                        weight="quiet"
                        aria-label="Edit source"
                        @click="
                            reviewCs1Source( result.source.id )
                        "
                    >
                        <cdx-icon :icon="editSourceIcon" />
                    </cdx-button>
                </div>
            </li>
        </ol>
    </template>
    <template v-else-if="toolPopup === 'non-cs1'">
        <p>
            Static scan for references that do not contain a supported
            CS1 citation template.
        </p>
        <cdx-message
            v-if="nonCs1Sources.length === 0"
            type="success"
        >
            No non-CS1 sources found.
        </cdx-message>
        <ol
            v-else
            class="cf-source-manager__existing-list"
        >
            <li
                v-for="source in nonCs1Sources"
                :key="source.id"
                class="
                    cf-source-manager__existing-row
                    cf-source-manager__existing-row--non-standard
                "
            >
                <div class="cf-source-manager__existing-summary">
                    <small class="cf-source-manager__existing-name">
                        ({{ source.referenceName || 'unnamed' }})
                    </small>
                    <span
                        class="cf-source-manager__existing-title"
                        :title="source.rawReference"
                    >
                        {{
                            source.title ||
                            source.referenceName ||
                            'Unnamed reference'
                        }}
                    </span>
                    <small class="cf-source-manager__existing-meta">
                        <code>Non-CS1 source</code>
                        · {{ source.usageCount }}×
                    </small>
                </div>
                <div class="cf-source-manager__existing-actions">
                    <cdx-button
                        v-tooltip="'Convert source'"
                        weight="quiet"
                        aria-label="Convert source"
                        @click="reviewNonCs1Source( source.id )"
                    >
                        <cdx-icon :icon="editSourceIcon" />
                    </cdx-button>
                </div>
            </li>
        </ol>
    </template>
    <template #footer>
        <div class="cf-source-manager__footer-actions">
            <cdx-button
                v-if="toolPopup === 'analysis'"
                :disabled="countSelectedAnalysisReplacements() === 0"
                action="progressive"
                weight="primary"
                @click="applyAnalysisReplacements"
            >
                Apply selected
                ({{ countSelectedAnalysisReplacements() }})
            </cdx-button>
            <cdx-button
                @click="closeToolPopup"
            >
                Close
            </cdx-button>
        </div>
    </template>
</cdx-dialog>
`;
