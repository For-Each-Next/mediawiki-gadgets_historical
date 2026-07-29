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
    CLASS_VALUES,
    IMPORTANCE_VALUES,
    getTalkPageTopSection,
    previewTalkPageTopSection,
    shouldRegisterByDefault,
} from "#gadget/domain/assessment.ts";
import {
    buildLineComparison,
    buildNewPageListSummary,
} from "#gadget/domain/new-page-list.ts";
import type {
    Assessment,
    AssessmentClass,
    AssessmentImportance,
    RegistrationResult,
    SelectionMap,
} from "#gadget/domain/types.ts";
import { interfaceLocale, msg } from "#gadget/i18n/index.ts";
import {
    MAINTENANCE_OPTIONS,
    OTHER_PROJECT_OPTIONS,
    TASK_FORCE_OPTIONS,
} from "#gadget/ui/assessment-options.ts";
import { buildEditSummary } from "#gadget/ui/assessment-summary.ts";
import type { VueModule, VueRef } from "#gadget/ui/codex.ts";

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
    runtime: PageAssessorRuntime;
    state: DialogState;
}

interface DialogBindings {
    assessment: Assessment;
    classValues: typeof CLASS_VALUES;
    currentSource: VueRef<string>;
    importanceValues: typeof IMPORTANCE_VALUES;
    interfaceLocale: string;
    listComparison: VueRef<{ after: string; before: string }>;
    listSummary: VueRef<string>;
    loadRegistration: () => Promise<void>;
    maintenanceOptions: typeof MAINTENANCE_OPTIONS;
    msg: typeof msg;
    onCancel: () => void;
    onOpenChange: (value: boolean) => void;
    onPreviewInput: (value: string) => void;
    onSave: () => Promise<void>;
    onSummaryInput: (value: string) => void;
    open: VueRef<boolean>;
    otherProjectOptions: typeof OTHER_PROJECT_OPTIONS;
    previewText: VueRef<string>;
    registrationDisabled: VueRef<boolean>;
    registrationLabel: VueRef<string>;
    registrationLoading: VueRef<boolean>;
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
    taskForceOptions: typeof TASK_FORCE_OPTIONS;
}

/**
 * Creates the actual MediaWiki Vue component mounted by the UI adapter.
 */
export function createAssessmentDialogComponent(
    Vue: VueModule,
    options: AssessmentDialogOptions,
): unknown {
    function setup(): DialogBindings {
        const bindings = createAssessmentDialogBindings(Vue, options);

        Vue.onMounted(function loadRegistration(): void {
            void bindings.loadRegistration();
        });
        return bindings;
    }

    return Vue.defineComponent({
        name: "VgPageAssessmentDialog",
        setup,
        template: ASSESSMENT_DIALOG_TEMPLATE,
    });
}

/**
 * Creates reactive dialog bindings without acquiring external services.
 */
// eslint-disable-next-line max-lines-per-function
export function createAssessmentDialogBindings(
    Vue: VueModule,
    options: AssessmentDialogOptions,
): DialogBindings {
    const { runtime, state } = options;
    const assessment = Vue.reactive(state.assessment);
    const open = Vue.ref(true);
    const previewText = Vue.ref(createAssessmentPreview(state));
    const currentSource = Vue.ref(getTalkPageTopSection(state.page.text));
    const summary = Vue.ref(buildEditSummary(assessment));
    const listSummary = Vue.ref(buildRegistrationSummary(state));
    const shouldRegister = Vue.ref(false);
    const registration = Vue.ref(state.registration);
    const registrationLoading = Vue.ref(state.registrationLoading);
    const saving = Vue.ref(false);
    const status = Vue.ref("");
    const statusType = Vue.ref<MessageType>("notice");
    let active = true;

    Vue.onUnmounted(function deactivateDialog(): void {
        active = false;
    });

    function setStatus(text: string, isError: boolean): void {
        status.value = text;
        statusType.value = isError ? "error" : "notice";
        runtime.logStep("status updated", { isError, text });
    }

    function refreshAssessment(): void {
        runtime.logStep("dialog change");
        runtime.logStep("readAssessment", assessment);
        if (!state.previewDirty) {
            previewText.value = createAssessmentPreview(state);
            runtime.logStep("updateAssessmentPreview done", {
                length: previewText.value.length,
            });
        } else {
            runtime.logStep("updateAssessmentPreview skipped: dirty");
        }
        currentSource.value = getTalkPageTopSection(state.page.text);
        runtime.logStep("updateTalkDiff done", {
            length: currentSource.value.length,
        });
        if (!state.summaryDirty) {
            summary.value = buildEditSummary(assessment);
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
        refreshAssessment();
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

    async function loadRegistration(): Promise<void> {
        runtime.logStep("loadNewPageListState start");
        setStatus(msg("registration.loadingList"), false);
        try {
            await runtime.loadRegistrationState(
                state,
                options.currentNamespace,
            );
        } catch (error) {
            runtime.logStep("loadNewPageListState failed", { error });
            setStatus(getErrorMessage(error), true);
            return;
        }
        if (!active) {
            return;
        }
        registration.value = state.registration;
        registrationLoading.value = state.registrationLoading;
        shouldRegister.value = getDefaultRegistration(
            state,
            options.currentNamespace,
        );
        setStatus("", false);
        logLoadedRegistration(runtime, state);
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
            setTimeout(close, DIALOG_CLOSE_DELAY_MS);
        } catch (error) {
            runtime.logStep("saveDialog failed", { error });
            setStatus(getErrorMessage(error), true);
            saving.value = false;
        }
    }

    const registrationDisabled = Vue.computed(function isDisabled(): boolean {
        return isRegistrationDisabled(
            registration.value,
            registrationLoading.value,
        );
    });
    const showRegistrationPreview = Vue.computed(function canPreview() {
        return canShowRegistrationPreview(
            registration.value,
            registrationLoading.value,
        );
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

    return {
        assessment,
        classValues: CLASS_VALUES,
        currentSource,
        importanceValues: IMPORTANCE_VALUES,
        interfaceLocale,
        listComparison,
        listSummary,
        loadRegistration,
        maintenanceOptions: MAINTENANCE_OPTIONS,
        msg,
        onCancel,
        onOpenChange,
        onPreviewInput,
        onSave,
        onSummaryInput,
        open,
        otherProjectOptions: OTHER_PROJECT_OPTIONS,
        previewText,
        registrationDisabled,
        registrationLabel,
        registrationLoading,
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
    registration: RegistrationResult | null,
    shouldRegister: boolean,
): { after: string; before: string } {
    if (
        !shouldRegister ||
        registration == null ||
        state.newPageList == null ||
        !registration.changed
    ) {
        return {
            after: msg("registration.noChanges"),
            before: msg("registration.noChanges"),
        };
    }
    return buildLineComparison(
        state.newPageList.text,
        registration.proposedText,
        1,
    );
}

function canShowRegistrationPreview(
    registration: RegistrationResult | null,
    loading: boolean,
): boolean {
    return (
        !loading &&
        registration?.eligible === true &&
        !registration.alreadyRegistered
    );
}

function isRegistrationDisabled(
    registration: RegistrationResult | null,
    loading: boolean,
): boolean {
    return (
        loading ||
        registration == null ||
        !registration.eligible ||
        registration.alreadyRegistered
    );
}

function getRegistrationLabel(
    registration: RegistrationResult | null,
    creationDate: Date,
): string {
    if (registration == null) {
        return msg("registration.loading");
    }
    const created = msg("registration.createdOn", {
        date: formatInterfaceDate(creationDate),
    });
    if (!registration.eligible) {
        return msg("registration.ineligible", { created });
    }
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

function formatInterfaceDate(date: Date): string {
    return new Intl.DateTimeFormat(interfaceLocale, {
        day: "numeric",
        month: "long",
        timeZone: "UTC",
    }).format(date);
}

function getDefaultRegistration(
    state: DialogState,
    currentNamespace: number,
): boolean {
    const registration = state.registration;
    return (
        registration != null &&
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
    registration: RegistrationResult | null,
    shouldRegister: VueRef<boolean>,
): void {
    runtime.logStep(
        canShowRegistrationPreview(registration, false)
            ? "updateRegistrationPreview done"
            : "updateRegistrationPreview hidden",
        {
            registration: summarizeRegistration(registration),
            shouldRegister: shouldRegister.value,
        },
    );
}

function logLoadedRegistration(
    runtime: PageAssessorRuntime,
    state: DialogState,
): void {
    const creationTimes = [...state.creationTimes].map(
        function serialize(entry): [string, string] {
            return [entry[0], entry[1].toISOString()];
        },
    );
    runtime.logStep("loadNewPageListState done", {
        creationTimes,
        registration: summarizeRegistration(state.registration),
    });
}

function summarizeRegistration(
    registration: RegistrationResult | null,
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
    return CLASS_VALUES.some(function matches(candidate) {
        return candidate === value;
    });
}

function isAssessmentImportance(
    value: unknown,
): value is AssessmentImportance {
    return IMPORTANCE_VALUES.some(function matches(candidate) {
        return candidate === value;
    });
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
