/**
 * Reactive presentation and review capture for the assessment dialog.
 */

import projectConfig from "#gadget/config/project-config.ts";
import type {
    DialogSavePhase,
    DialogSaveReview,
    DialogState,
    PageAssessorRuntime,
} from "#gadget/contracts/dialog.ts";
import {
    getExistingOtherProjectOptions,
    getTalkPageTopSection,
    parseAssessment,
    previewTalkPageTopSection,
    shouldRegisterByDefault,
} from "#gadget/domain/assessment.ts";
import type {
    Assessment,
    AssessmentClass,
    AssessmentImportance,
    RegistrationResult,
    SelectionMap,
} from "#gadget/domain/types.ts";
import {
    buildNewPageListSummary,
    interfaceLocale,
    msg,
} from "#gadget/i18n/index.ts";
import {
    CLASS_OPTIONS,
    IMPORTANCE_OPTIONS,
    KNOWN_CLASS_OPTIONS,
    MAINTENANCE_OPTIONS,
    OTHER_PROJECT_OPTIONS,
    TASK_FORCE_OPTIONS,
    includeAssessmentValue,
    type LabelledAssessmentOption,
    type LabelledAssessmentValue,
} from "#gadget/ui/assessment-options.ts";
import { buildEditSummary } from "#gadget/ui/assessment-summary.ts";
import type { VueModule, VueRef } from "#gadget/ui/codex.ts";
import * as Comparison from "#gadget/ui/components/wikitext-comparison.ts";
import { compareWikitext, type WikitextComparison } from "#shared/wikitext";

const DIALOG_CLOSE_DELAY_MS = 600;

export const ASSESSMENT_DIALOG_TEMPLATE =
    typeof __VG_PAGE_ASSESSOR_DIALOG_TEMPLATE__ === "undefined"
        ? ""
        : __VG_PAGE_ASSESSOR_DIALOG_TEMPLATE__;

export const ASSESSMENT_DIALOG_STYLES =
    typeof __VG_PAGE_ASSESSOR_DIALOG_STYLES__ === "undefined"
        ? ""
        : __VG_PAGE_ASSESSOR_DIALOG_STYLES__;

type MessageType = "error" | "notice";
type SelectionGroup = "maintenance" | "otherProjects" | "taskForces";

export interface AssessmentDialogOptions {
    currentNamespace: number;
    onClose: () => void;
    onSaved?: () => void;
    runtime: PageAssessorRuntime;
    state: DialogState;
}

interface DialogBindings {
    assessment: Assessment;
    classOptions: VueRef<Array<LabelledAssessmentValue<string>>>;
    currentSource: VueRef<string>;
    importanceOptions: VueRef<Array<LabelledAssessmentValue<string>>>;
    interfaceLocale: string;
    listComparison: VueRef<WikitextComparison>;
    listSummary: VueRef<string>;
    maintenanceOptions: typeof MAINTENANCE_OPTIONS;
    msg: typeof msg;
    onCancel: () => void;
    onOpenChange: (value: boolean) => void;
    onPreviewInput: (value: string) => void;
    onSave: () => Promise<void>;
    onSummaryInput: (value: string) => void;
    open: VueRef<boolean>;
    otherProjectOptions: ReadonlyArray<LabelledAssessmentOption>;
    previewText: VueRef<string>;
    registrationDisabled: VueRef<boolean>;
    registrationEligible: VueRef<boolean>;
    registrationLabel: VueRef<string>;
    saving: VueRef<boolean>;
    setClassName: (value: unknown) => void;
    setImportance: (value: unknown) => void;
    setListSummary: (value: string) => void;
    setRegister: (value: boolean) => void;
    setSelection: (group: SelectionGroup, id: string, value: boolean) => void;
    shouldRegister: VueRef<boolean>;
    showRegistrationPreview: VueRef<boolean>;
    status: VueRef<string>;
    statusType: VueRef<MessageType>;
    subjectTitle: string;
    summary: VueRef<string>;
    talkComparison: VueRef<WikitextComparison>;
    taskForceOptions: typeof TASK_FORCE_OPTIONS;
}

/**
 * Creates the actual MediaWiki Vue component mounted by the UI adapter.
 *
 * @param Vue - Vue value.
 * @param options - Operation options.
 * @returns Value.
 */
export function createAssessmentDialogComponent(
    Vue: VueModule,
    options: AssessmentDialogOptions,
): unknown {
    function setup(): DialogBindings {
        return createAssessmentDialogBindings(Vue, options);
    }

    return Vue.defineComponent({
        components: {
            WikitextComparison:
                Comparison.createWikitextComparisonComponent(Vue),
        },
        name: "VgPageAssessmentDialog",
        setup,
        template: ASSESSMENT_DIALOG_TEMPLATE,
    });
}

/**
 * Creates reactive dialog bindings without acquiring external services.
 *
 * @param Vue - Vue value.
 * @param options - Operation options.
 * @returns Value.
 */
// eslint-disable-next-line max-lines-per-function
export function createAssessmentDialogBindings(
    Vue: VueModule,
    options: AssessmentDialogOptions,
): DialogBindings {
    const { runtime, state } = options;
    const assessment = Vue.reactive(state.assessment);
    const classOptions = Vue.computed(function getClassOptions() {
        return includeAssessmentValue(
            CLASS_OPTIONS,
            assessment.className,
            KNOWN_CLASS_OPTIONS,
        );
    });
    const importanceOptions = Vue.computed(function getImportanceOptions() {
        return includeAssessmentValue(
            IMPORTANCE_OPTIONS,
            assessment.importance,
        );
    });
    const otherProjectOptions = [
        ...OTHER_PROJECT_OPTIONS,
        ...getExistingOtherProjectOptions(state.page.text, projectConfig),
    ];
    const open = Vue.ref(true);
    const previewText = Vue.ref(createAssessmentPreview(state));
    const currentSource = Vue.ref(getTalkPageTopSection(state.page.text));
    const summary = Vue.ref(buildEditSummary(assessment, otherProjectOptions));
    const listSummary = Vue.ref(buildRegistrationSummary(state));
    const shouldRegister = Vue.ref(
        getDefaultRegistration(state, options.currentNamespace),
    );
    const registration = Vue.ref(state.registration);
    const saving = Vue.ref(false);
    const status = Vue.ref("");
    const statusType = Vue.ref<MessageType>("notice");
    function setStatus(text: string, isError: boolean): void {
        status.value = text;
        statusType.value = isError ? "error" : "notice";
        runtime.logStep("status updated", { isError, text });
    }

    function refreshAssessment(): void {
        runtime.logStep("dialog change");
        runtime.logStep("readAssessment", assessment);
        const previewSource = state.previewDirty
            ? previewText.value
            : state.page.text;
        previewText.value = previewTalkPageTopSection(
            previewSource,
            assessment,
            projectConfig,
        );
        runtime.logStep("updateAssessmentPreview done", {
            fromManualSource: state.previewDirty,
            length: previewText.value.length,
        });
        currentSource.value = getTalkPageTopSection(state.page.text);
        runtime.logStep("updateTalkDiff done", {
            length: currentSource.value.length,
        });
        if (!state.summaryDirty) {
            summary.value = buildEditSummary(assessment, otherProjectOptions);
            runtime.logStep("updateAssessmentSummary done", {
                summary: summary.value,
            });
        } else {
            runtime.logStep("updateAssessmentSummary skipped: dirty");
        }
        logRegistrationPreview(runtime, registration.value, shouldRegister);
    }

    function setClassName(value: unknown): void {
        if (!isAssessmentClass(value)) {
            return;
        }
        assessment.className = value;
        refreshAssessment();
    }

    function setImportance(value: unknown): void {
        if (!isAssessmentImportance(value)) {
            return;
        }
        assessment.importance = value;
        refreshAssessment();
    }

    function setSelection(
        group: SelectionGroup,
        id: string,
        value: boolean,
    ): void {
        const selections = assessment[group] as SelectionMap;

        selections[id] = value;
        refreshAssessment();
    }

    function onPreviewInput(value: string): void {
        previewText.value = value;
        state.previewDirty = true;
        const parsed = parseAssessment(projectConfig, value);
        if (parsed != null) {
            Object.assign(assessment, parsed);
            if (!state.summaryDirty) {
                summary.value = buildEditSummary(
                    assessment,
                    otherProjectOptions,
                );
            }
        }
        runtime.logStep("lead source edited");
        runtime.logStep("updateTalkDiff done", {
            length: currentSource.value.length,
        });
    }

    function onSummaryInput(value: string): void {
        summary.value = value;
        state.summaryDirty = true;
        runtime.logStep("assessment summary edited");
    }

    function setListSummary(value: string): void {
        listSummary.value = value;
    }

    function setRegister(value: boolean): void {
        shouldRegister.value = value;
        runtime.logStep("dialog change");
        logRegistrationPreview(runtime, registration.value, shouldRegister);
    }

    function close(): void {
        open.value = false;
        queueMicrotask(options.onClose);
    }

    function onCancel(): void {
        runtime.logStep("dialog cancelled");
        close();
    }

    function onOpenChange(value: boolean): void {
        open.value = value;
        if (!value) {
            queueMicrotask(options.onClose);
        }
    }

    async function onSave(): Promise<void> {
        if (saving.value) {
            return;
        }
        runtime.logStep("save button clicked");
        saving.value = true;
        try {
            const outcome = await runtime.saveReviewedDialog(
                state,
                createSaveReview({
                    listSummary,
                    previewText,
                    registrationDisabled,
                    shouldRegister,
                    summary,
                }),
                reportSavePhase.bind(null, setStatus),
            );
            const text =
                outcome === "unchanged"
                    ? msg("dialog.unchanged")
                    : msg("dialog.saved");
            setStatus(text, false);
            setTimeout(finishSave, DIALOG_CLOSE_DELAY_MS);
        } catch (error) {
            runtime.logStep("saveDialog failed", { error });
            setStatus(getErrorMessage(error), true);
            saving.value = false;
        }
    }

    function finishSave(): void {
        close();
        if (options.onSaved != null) {
            queueMicrotask(options.onSaved);
        }
    }

    const registrationDisabled = Vue.computed(function isDisabled(): boolean {
        return isRegistrationDisabled(registration.value);
    });
    const registrationEligible = Vue.computed(function isEligible(): boolean {
        return registration.value.eligible;
    });
    const showRegistrationPreview = Vue.computed(function canPreview() {
        return canShowRegistrationPreview(registration.value);
    });
    const registrationLabel = Vue.computed(function getLabel() {
        return getRegistrationLabel(
            registration.value,
            state.subjectInfo.creationDate,
        );
    });
    const listComparison = Vue.computed(function getComparison() {
        return buildRegistrationComparison(
            state,
            registration.value,
            shouldRegister.value,
        );
    });
    const talkComparison = Vue.computed(function getTalkComparison() {
        return compareWikitext(currentSource.value, previewText.value);
    });

    return {
        assessment,
        classOptions,
        currentSource,
        importanceOptions,
        interfaceLocale,
        listComparison,
        listSummary,
        maintenanceOptions: MAINTENANCE_OPTIONS,
        msg,
        onCancel,
        onOpenChange,
        onPreviewInput,
        onSave,
        onSummaryInput,
        open,
        otherProjectOptions,
        previewText,
        registrationDisabled,
        registrationEligible,
        registrationLabel,
        saving,
        setClassName,
        setImportance,
        setListSummary,
        setRegister,
        setSelection,
        shouldRegister,
        showRegistrationPreview,
        status,
        statusType,
        subjectTitle: state.subjectTitle,
        summary,
        talkComparison,
        taskForceOptions: TASK_FORCE_OPTIONS,
    };
}

interface SaveReviewRefs {
    listSummary: VueRef<string>;
    previewText: VueRef<string>;
    registrationDisabled: VueRef<boolean>;
    shouldRegister: VueRef<boolean>;
    summary: VueRef<string>;
}

function createSaveReview(refs: SaveReviewRefs): DialogSaveReview {
    return {
        listSummary: refs.listSummary.value.trim(),
        previewText: refs.previewText.value,
        shouldRegister:
            refs.shouldRegister.value && !refs.registrationDisabled.value,
        summary: refs.summary.value.trim(),
    };
}

function createAssessmentPreview(state: DialogState): string {
    return previewTalkPageTopSection(
        state.page.text,
        state.assessment,
        projectConfig,
    );
}

function buildRegistrationSummary(state: DialogState): string {
    const title = state.subjectInfo.listedTitle || state.subjectTitle;
    return buildNewPageListSummary(title, state.subjectInfo.creationDate);
}

function buildRegistrationComparison(
    state: DialogState,
    registration: RegistrationResult,
    shouldRegister: boolean,
): WikitextComparison {
    if (!shouldRegister || !registration.changed) {
        return { changed: false, rows: [] };
    }
    return compareWikitext(state.newPageList.text, registration.proposedText);
}

function canShowRegistrationPreview(
    registration: RegistrationResult,
): boolean {
    return registration.eligible && !registration.alreadyRegistered;
}

function isRegistrationDisabled(registration: RegistrationResult): boolean {
    return !registration.eligible || registration.alreadyRegistered;
}

function getRegistrationLabel(
    registration: RegistrationResult,
    creationDate: Date,
): string {
    if (!registration.eligible) {
        return msg("registration.ineligible", {
            date: formatInterfaceDate(creationDate, true),
        });
    }
    const created = msg("registration.createdOn", {
        date: formatInterfaceDate(creationDate),
    });
    if (
        registration.existing?.date != null &&
        registration.existing.listedTitle
    ) {
        return msg("registration.existing", {
            date: formatInterfaceDate(registration.existing.date),
            title: registration.existing.listedTitle,
        });
    }
    if (registration.alreadyRegistered) {
        return msg("registration.alreadyRegistered");
    }
    return msg("registration.register", { created });
}

function formatInterfaceDate(date: Date, includeYear = false): string {
    return new Intl.DateTimeFormat(interfaceLocale, {
        day: "numeric",
        month: "long",
        timeZone: "UTC",
        ...(includeYear ? { year: "numeric" } : {}),
    }).format(date);
}

function getDefaultRegistration(
    state: DialogState,
    currentNamespace: number,
): boolean {
    const registration = state.registration;
    return (
        shouldRegisterByDefault(currentNamespace, state.subjectTitle) &&
        registration.eligible &&
        !registration.alreadyRegistered
    );
}

function reportSavePhase(
    setStatus: (text: string, isError: boolean) => void,
    phase: DialogSavePhase,
): void {
    const text =
        phase === "registration"
            ? msg("dialog.updatingNewPageList")
            : msg("dialog.savingTalkPage");
    setStatus(text, false);
}

function logRegistrationPreview(
    runtime: PageAssessorRuntime,
    registration: RegistrationResult,
    shouldRegister: VueRef<boolean>,
): void {
    runtime.logStep(
        canShowRegistrationPreview(registration)
            ? "updateRegistrationPreview done"
            : "updateRegistrationPreview hidden",
        {
            registration: summarizeRegistration(registration),
            shouldRegister: shouldRegister.value,
        },
    );
}

function summarizeRegistration(
    registration: RegistrationResult,
): Record<string, unknown> {
    return {
        alreadyRegistered: registration?.alreadyRegistered,
        changed: registration?.changed,
        earliestDate: registration?.earliestDate?.toISOString(),
        eligible: registration?.eligible,
        existing: registration?.existing,
        proposedLength: registration?.proposedText?.length,
    };
}

function isAssessmentClass(value: unknown): value is AssessmentClass {
    return typeof value === "string" && value.trim() !== "";
}

function isAssessmentImportance(
    value: unknown,
): value is AssessmentImportance {
    return typeof value === "string";
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
