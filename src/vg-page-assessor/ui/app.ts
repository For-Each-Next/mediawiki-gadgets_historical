import { interfaceLocale, msg } from "#me/i18n/index.ts";
import {
    CLASS_VALUES,
    IMPORTANCE_VALUES,
    createDefaultAssessment,
    getTalkPageTopSection,
    getSubjectPageTitle,
    getTalkPageTitle,
    isEmptyImportanceOnlyChange,
    previewTalkPageTopSection,
    shouldRegisterByDefault,
} from "#me/domain/assessment.ts";
import {
    fetchPageCreationTimes,
    fetchSubjectPageInfo,
    fetchPageText,
    saveTalkAssessment,
} from "#me/infra/mediawiki-api.ts";
import {
    buildLineComparison,
    buildNewPageListSummary,
    fetchNewPageList,
    getTitlesForDate,
    prepareNewPageListRegistration,
    savePreparedNewPageList,
} from "#me/app/new-page-list.ts";
import { logStep } from "#me/infra/logger.ts";
import projectConfig from "#me/config/project-config.ts";
import { html } from "#shared";
const {
    createElement,
    createEscapedText,
    replaceElementContent,
    renderTemplate,
} = html;
type TemplateElement = html.TemplateElement;
type TemplateNode = html.TemplateNode;

const PROJECT_CONFIG = projectConfig;
const DIALOG_CSS = __ASSESS_VG_PAGE_DIALOG_CSS__;
const SUMMARY_LINK = ":m:User:For Each ... Next/global.js/vg page assessor.js";
const SUMMARY_TEXT = "🍄";
const SUMMARY_SOURCE_LINK = `[[${SUMMARY_LINK}|${SUMMARY_TEXT}]]`;
const DEFAULT_EDIT_SUMMARY = appendSummarySourceLink("Tag project banners");
const DIALOG_CLOSE_DELAY_MS = 600;
const MAINTENANCE_ITEMS = [
    { id: "reassess", label: msg("maintenance.reassess") },
    { id: "needsInfobox", label: msg("maintenance.needsInfobox") },
    { id: "cover", label: msg("maintenance.needsImage") },
    { id: "screenshot", label: msg("maintenance.needsScreenshot") },
];

/**
 * Adds the toolbox trigger after MediaWiki is ready.
 *
 * @returns Result when the function
 *   adds the toolbox trigger after mediawiki is ready.
 */
function init(): void {
    const loggedDbName = mw.config.get("wgDBname");
    const loggedNamespace = mw.config.get("wgNamespaceNumber");
    const loggedPageName = mw.config.get("wgPageName");
    logStep("init start", {
        dbName: loggedDbName,
        namespaceNumber: loggedNamespace,
        pageName: loggedPageName,
    });
    const dbName = mw.config.get("wgDBname");
    let unsupportedPage = dbName !== "zhwiki";

    if (!unsupportedPage) {
        const namespaceNumber = mw.config.get("wgNamespaceNumber");
        unsupportedPage = namespaceNumber < 0;
    }

    if (unsupportedPage) {
        logStep("init skipped");
        return;
    }

    addStyles();
    logStep("init adding toolbox link");
    addToolboxLink();
}

/**
 * Adds the localized toolbox link and click handler.
 */
function addToolboxLink(): void {
    const label = msg("tool.name");
    const link = mw.util.addPortletLink(
        "p-tb",
        "#",
        label,
        "t-assess-vg-page",
    );
    link?.addEventListener("click", handleToolboxClick);
}

/**
 * Opens the dialog from the toolbox link.
 *
 * @param event - Toolbox click event.
 */
function handleToolboxClick(event: Event): void {
    event.preventDefault();
    logStep("toolbox link clicked");
    openDialog().catch(handleOpenDialogError);
}

/**
 * Reports a dialog-opening failure.
 *
 * @param error - Opening failure.
 */
function handleOpenDialogError(error: any): void {
    logStep("openDialog failed", { error });
    const message = error.message || String(error);
    mw.notify(message, { type: "error" });
}

/**
 * Opens the assessment dialog.
 *
 * @returns Resolves after the dialog opens.
 */
async function openDialog(): Promise<void> {
    logStep("openDialog start");
    const state = await loadDialogState();
    const dialog = buildDialog(state);

    appendDialog(dialog);
    const handleError = handleNewPageListStateError.bind(null, dialog);
    loadNewPageListState(dialog, dialog.avgpState).catch(handleError);
}

/**
 * Reports a new-page-list loading failure.
 *
 * @param dialog - Dialog element.
 * @param error - Loading failure.
 */
function handleNewPageListStateError(
    dialog: HTMLDialogElement,
    error: any,
): void {
    logStep("loadNewPageListState failed", { error });
    const message = error.message || String(error);
    setStatus(dialog, message, true);
}

/**
 * Loads the initial talk and subject-page dialog state.
 *
 * @returns The initial talk and subject-page dialog state.
 */
async function loadDialogState(): Promise<any> {
    const api = new mw.Api();
    const pageName = mw.config.get("wgPageName");
    const currentTitle = mw.Title.newFromText(pageName);
    const talkTitle = getTalkPageTitle(currentTitle);
    const subjectTitle = getSubjectPageTitle(currentTitle);
    const namespaceNumber = currentTitle.getNamespaceId();
    logStep("openDialog titles resolved", {
        namespaceNumber,
        subjectTitle,
        talkTitle,
    });
    const pageRequest = fetchPageText(api, talkTitle);
    const subjectInfoRequest = fetchSubjectPageInfo(api, subjectTitle);
    const [page, subjectInfo] = await Promise.all([
        pageRequest,
        subjectInfoRequest,
    ]);
    const creationTimestamp = subjectInfo.creationDate.toISOString();
    logStep("openDialog initial page data fetched", {
        subjectInfo: {
            ...subjectInfo,
            creationDate: creationTimestamp,
        },
        talkPageLength: page.text.length,
    });

    const result = {
        api,
        assessment: createDefaultAssessment(PROJECT_CONFIG),
        pageText: page.text,
        subjectInfo,
        subjectTitle,
        talkTitle,
    };
    return result;
}

/**
 * Appends and opens the assessment dialog.
 *
 * @param dialog - Dialog value.
 */
function appendDialog(dialog: HTMLDialogElement): void {
    document.getElementsByTagName("body")[0].append(dialog);
    dialog.showModal();
    logStep("openDialog shown");
}

/**
 * Builds the modal dialog.
 *
 * @param state - Dialog state.
 * @param state.api - MediaWiki API client.
 * @param state.assessment - Assessment values.
 * @param state.pageText - Current talk-page text.
 * @param state.subjectTitle - Subject page title.
 * @param state.talkTitle - Talk-page title.
 * @returns Dialog element.
 */
function buildDialog(state: any): HTMLDialogElement {
    logStep("buildDialog start");
    state.registrationLoading = true;
    const dialog = document.createElement("dialog");
    const registerDefault = false;

    dialog.className = "avgp-dialog";
    dialog.avgpState = state;
    const markup = buildDialogHtml(state, registerDefault);
    replaceElementContent(dialog, markup);
    bindDialogEvents(dialog, state);
    updateAssessmentPreview(dialog, state);
    updateTalkDiff(dialog, state);
    updateAssessmentSummary(dialog, state);
    updateRegistrationPreview(dialog, state);

    const registration = summarizeRegistration(state.registration);
    logStep("buildDialog done", {
        registerDefault,
        registration,
    });

    return dialog;
}

/**
 * Builds dialog HTML.
 *
 * @param state - Dialog state.
 * @param registerDefault - Initial register checkbox state.
 * @returns Dialog HTML.
 */
function buildDialogHtml(state: any, registerDefault: boolean): string {
    const heading = buildTextElement(
        "h2",
        { class: "avgp-heading cdx-title" },
        state.subjectTitle,
    );
    const header = createElement("header", { class: "avgp-header" }, [
        heading,
    ]);
    const children = [
        header,
        buildAssessmentFieldset(state),
        buildNewPageListFieldset(state, registerDefault),
        buildDialogActions(),
    ];
    const form = createElement(
        "form",
        { class: "avgp-shell cdx-docs", method: "dialog" },
        children,
    );

    return renderTemplate(form);
}

/**
 * Builds the assessment controls and source preview.
 *
 * @param state - Mutable operation state.
 * @returns The assessment controls and source preview.
 */
function buildAssessmentFieldset(state: any): TemplateElement {
    const controls = buildAssessmentControls();
    const sources = buildAssessmentSources();
    const grid = createElement("div", { class: "avgp-assessment-grid" }, [
        controls,
        sources,
    ]);
    const legendText = msg("dialog.assessment");
    const legend = buildTextElement(
        "legend",
        { class: "avgp-fieldset-title" },
        legendText,
    );
    const summaryLabel = msg("dialog.editSummary");
    const summaryValue = buildEditSummary(state.assessment);
    const summary = buildTextInputField({
        className: "avgp-summary cdx-field",
        id: "avgp-edit-summary",
        label: summaryLabel,
        name: "summary",
        value: summaryValue,
    });
    const fieldset = createElement("fieldset", { class: "avgp-fieldset" }, [
        legend,
        grid,
        summary,
    ]);

    return fieldset;
}

/**
 * Builds assessment radio and checkbox controls.
 *
 * @returns Assessment radio and checkbox controls.
 */
function buildAssessmentControls(): TemplateElement {
    const classLabel = msg("dialog.class");
    const importanceLabel = msg("dialog.importance");
    const children = [
        buildRadioSection(classLabel, "className", CLASS_VALUES, "Unassessed"),
        buildRadioSection(
            importanceLabel,
            "importance",
            IMPORTANCE_VALUES,
            "",
        ),
        buildTaskForceSection(),
        buildMaintenanceSection(),
        buildOtherProjectSection(),
    ];
    const ariaLabel = msg("dialog.assessmentControls");
    const controls = createElement(
        "section",
        {
            "aria-label": ariaLabel,
            class: "avgp-controls",
        },
        children,
    );

    return controls;
}

/**
 * Builds current and proposed talk-source fields.
 *
 * @returns Current and proposed talk-source fields.
 */
function buildAssessmentSources(): TemplateElement {
    const previewLabel = msg("dialog.readySource");
    const preview = buildSourceField({
        id: "avgp-preview-source",
        label: previewLabel,
        textareaAttributes: { "data-avgp-preview": "" },
    });
    const currentLabel = msg("dialog.currentSource");
    const current = buildSourceField({
        id: "avgp-current-source",
        label: currentLabel,
        textareaAttributes: {
            "data-avgp-current-source": "",
            readonly: "",
        },
    });
    const ariaLabel = msg("dialog.leadPreview");
    const sources = createElement(
        "section",
        {
            "aria-label": ariaLabel,
            class: "avgp-source",
        },
        [preview, current],
    );
    return sources;
}

/**
 * Builds the new-page-list registration controls and preview.
 *
 * @param state - Mutable operation state.
 * @param registerDefault - Register default value.
 * @returns The new-page-list registration controls and preview.
 */
function buildNewPageListFieldset(
    state: any,
    registerDefault: boolean,
): TemplateElement {
    const registration = buildRegistrationControl(state, registerDefault);
    const comparison = buildRegistrationComparison();
    const summary = buildRegistrationSummary(state);
    const legendText = msg("dialog.newPageList");
    const legend = buildTextElement(
        "legend",
        { class: "avgp-fieldset-title" },
        legendText,
    );
    const fieldset = createElement("fieldset", { class: "avgp-fieldset" }, [
        legend,
        registration,
        comparison,
        summary,
    ]);

    return fieldset;
}

/**
 * Builds the registration checkbox field.
 *
 * @param state - Mutable operation state.
 * @param registerDefault - Register default value.
 * @returns The registration checkbox field.
 */
function buildRegistrationControl(
    state: unknown,
    registerDefault: boolean,
): TemplateElement {
    const checkbox = buildRegistrationCheckbox(state, registerDefault);
    const container = createElement(
        "div",
        { "data-avgp-register-container": "" },
        [checkbox],
    );
    const registrationControl = buildFieldControl([container]);
    const registration = createElement(
        "div",
        {
            class: "cdx-field avgp-section",
        },
        [registrationControl],
    );
    return registration;
}

/**
 * Builds the before/after registration comparison field.
 *
 * @returns The before/after registration comparison field.
 */
function buildRegistrationComparison(): TemplateElement {
    const before = buildListComparisonField("before", "removed");
    const after = buildListComparisonField("after", "added");
    const compareGrid = createElement("div", { class: "avgp-compare-grid" }, [
        before,
        after,
    ]);
    const comparisonControl = buildFieldControl([compareGrid]);
    const attributes = {
        class: "cdx-field avgp-section avgp-list-preview",
        "data-avgp-list-preview": "",
        hidden: "",
    };
    const comparison = createElement("div", attributes, [comparisonControl]);
    return comparison;
}

/**
 * Builds one new-page-list comparison field.
 *
 * @param position - Position value.
 * @param tone - Tone value.
 * @returns One new-page-list comparison field.
 */
function buildListComparisonField(
    position: string,
    tone: string,
): TemplateElement {
    const label = msg(
        position === "before" ? "dialog.before" : "dialog.after",
    );
    const field = buildComparisonField({
        id: `avgp-list-${position}`,
        label,
        textareaAttributes: {
            [`data-avgp-list-${position}`]: "",
            readonly: "",
        },
        tone,
    });

    return field;
}

/**
 * Builds the new-page-list edit-summary field.
 *
 * @param state - Mutable operation state.
 * @returns The new-page-list edit-summary field.
 */
function buildRegistrationSummary(state: {
    subjectInfo: { listedTitle: string; creationDate: Date };
    subjectTitle: string;
}): TemplateElement {
    const label = msg("dialog.editSummary");
    const title = state.subjectInfo.listedTitle || state.subjectTitle;
    const value = buildNewPageListSummary(
        title,
        state.subjectInfo.creationDate,
    );
    const summary = buildTextInputField({
        className: "avgp-list-summary cdx-field",
        id: "avgp-list-summary",
        label,
        name: "listSummary",
        value,
    });

    return summary;
}

/**
 * Builds a Codex text input field.
 *
 * @param config - Operation configuration.
 * @returns A Codex text input field.
 */
function buildTextInputField(config: any): TemplateElement {
    const inputLabel = buildInputLabel(config.label, config.id);
    const label = buildLabelContainer(inputLabel);
    const input = createElement("input", {
        class: "cdx-text-input__input",
        id: config.id,
        name: config.name,
        type: "text",
        value: config.value,
    });
    const inputContainer = createElement("div", { class: "cdx-text-input" }, [
        input,
    ]);
    const control = buildFieldControl([inputContainer]);

    return createElement("div", { class: config.className }, [label, control]);
}

/**
 * Builds the dialog status and action buttons.
 *
 * @returns The dialog status and action buttons.
 */
function buildDialogActions(): TemplateElement {
    const status = createElement("span", {
        class: "avgp-status",
        "data-avgp-status": "",
    });
    const cancelLabel = msg("dialog.cancel");
    const cancel = buildButton(cancelLabel, {
        class: "cdx-button",
        "data-avgp-cancel": "",
        type: "button",
    });
    const saveClass = [
        "cdx-button",
        "cdx-button--action-progressive",
        "cdx-button--weight-primary",
    ].join(" ");
    const saveLabel = msg("dialog.save");
    const save = buildButton(saveLabel, {
        class: saveClass,
        "data-avgp-save": "",
        type: "button",
    });

    const result = createElement("div", { class: "avgp-actions" }, [
        status,
        cancel,
        save,
    ]);
    return result;
}

/**
 * Builds a plain source textarea field.
 *
 * @param config - Field configuration.
 * @param config.id - Textarea ID.
 * @param config.label - Textarea label.
 * @param config.textareaAttributes - Extra textarea
 * attributes.
 * @returns Field template.
 */
function buildSourceField({ id, label, textareaAttributes }): TemplateElement {
    const inputLabel = buildInputLabel(label, id);
    const labelContainer = buildLabelContainer(inputLabel);
    const textarea = createElement("textarea", {
        class: "cdx-text-area__textarea avgp-source-textarea",
        id,
        ...textareaAttributes,
    });
    const textareaContainer = createElement(
        "div",
        { class: "cdx-text-area" },
        [textarea],
    );
    const control = buildFieldControl([textareaContainer]);

    const result = createElement(
        "div",
        { class: "cdx-field avgp-section avgp-source-field" },
        [labelContainer, control],
    );
    return result;
}

/**
 * Builds a readonly comparison textarea.
 *
 * @param config - Field configuration.
 * @param config.id - Textarea ID.
 * @param config.label - Textarea label.
 * @param config.textareaAttributes - Extra textarea
 * attributes.
 * @param config.tone - Visual tone.
 * @returns Field template.
 */
function buildComparisonField({
    id,
    label,
    textareaAttributes,
    tone,
}): TemplateElement {
    const inputLabel = buildInputLabel(label, id);
    const labelContainer = buildLabelContainer(inputLabel);
    const textarea = createElement("textarea", {
        class: "cdx-text-area__textarea avgp-compare-textarea",
        id,
        ...textareaAttributes,
    });
    const textareaContainer = createElement(
        "div",
        { class: "cdx-text-area" },
        [textarea],
    );
    const className = `avgp-compare-field avgp-compare-field--${tone}`;

    const result = createElement("div", { class: className }, [
        labelContainer,
        textareaContainer,
    ]);
    return result;
}

/**
 * Builds the registration checkbox with status wording.
 *
 * @param state - Dialog state.
 * @param checked - Whether registration is checked.
 * @returns Checkbox template.
 */
function buildRegistrationCheckbox(
    state: any,
    checked: boolean,
): TemplateElement {
    if (state.registrationLoading) {
        const label = msg("registration.loading");
        const indicator = buildProgressIndicator(label);

        return indicator;
    }

    const disabled = isRegistrationDisabled(state);
    const label = getRegistrationLabelForState(state);

    const inputAttributes = buildRegistrationInputAttributes(
        checked,
        disabled,
    );
    const labelContainer = buildRegistrationLabel(label);
    const input = createElement("input", inputAttributes);
    const wrapper = buildCheckboxWrapper(input, labelContainer);
    const checkbox = createElement("div", { class: "cdx-checkbox" }, [
        wrapper,
    ]);

    return checkbox;
}

/**
 * Builds a Codex checkbox input wrapper.
 *
 * @param input - Input value.
 * @param label - Label value.
 * @returns A Codex checkbox input wrapper.
 */
function buildCheckboxWrapper(
    input: html.TemplateNode,
    label: html.TemplateNode,
): TemplateElement {
    const icon = createElement("span", { class: "cdx-checkbox__icon" });
    const wrapper = createElement("div", { class: "cdx-checkbox__wrapper" }, [
        input,
        icon,
        label,
    ]);

    return wrapper;
}

/**
 * Gets the registration checkbox label for dialog state.
 *
 * @param state - Mutable operation state.
 * @returns The registration checkbox label for dialog state.
 */
function getRegistrationLabelForState(state: {
    registration: unknown;
    subjectInfo: { creationDate: Date };
}): string {
    const label = getRegistrationLabel(
        state.registration,
        state.subjectInfo.creationDate,
    );

    return label;
}

/**
 * Checks whether registration cannot be selected.
 *
 * @param state - Mutable operation state.
 * @returns Whether registration cannot be selected.
 */
function isRegistrationDisabled(state: {
    registrationLoading: boolean;
    registration: { eligible: boolean; alreadyRegistered: boolean };
}): boolean {
    const result =
        state.registrationLoading ||
        !state.registration.eligible ||
        state.registration.alreadyRegistered;
    return result;
}

/**
 * Builds registration checkbox input attributes.
 *
 * @param checked - Checked value.
 * @param disabled - Disabled value.
 * @returns Registration checkbox input attributes.
 */
function buildRegistrationInputAttributes(
    checked: boolean,
    disabled: boolean,
): unknown {
    const attributes: Record<string, any> = {
        class: "cdx-checkbox__input",
        id: "avgp-register",
        name: "register",
        type: "checkbox",
        value: "register",
    };

    if (checked) {
        attributes.checked = "";
    }
    if (disabled) {
        attributes.disabled = "";
    }

    return attributes;
}

/**
 * Builds the registration checkbox label container.
 *
 * @param label - Label value.
 * @returns The registration checkbox label container.
 */
function buildRegistrationLabel(label: string): TemplateElement {
    const labelText = buildTextElement(
        "span",
        { class: "cdx-label__label__text" },
        label,
    );
    const inputLabel = createElement(
        "label",
        { class: "cdx-label__label", for: "avgp-register" },
        [labelText],
    );
    const container = createElement(
        "div",
        { class: "cdx-checkbox__label cdx-label" },
        [inputLabel],
    );
    return container;
}

/**
 * Builds a Codex-style progress indicator.
 *
 * @param label - Loading status label.
 * @returns Progress indicator template.
 */
function buildProgressIndicator(label: string): TemplateElement {
    const progress = createElement("progress", {
        "aria-label": label,
        class: "cdx-progress-indicator__indicator",
    });
    const status = buildTextElement(
        "span",
        { class: "cdx-progress-indicator__label" },
        label,
    );
    const attributes = {
        "aria-live": "polite",
        class: "cdx-progress-indicator avgp-register-loading",
        role: "status",
    };

    return createElement("div", attributes, [progress, status]);
}

/**
 * Gets registration status wording.
 *
 * @param registration - Prepared registration state.
 * @param creationDate - Subject page creation date.
 * @returns UI label.
 */
function getRegistrationLabel(registration: any, creationDate: Date): string {
    if (registration == null) {
        return msg("registration.loading");
    }

    const createdDate = formatInterfaceDate(creationDate);
    const created = msg("registration.createdOn", {
        date: createdDate,
    });

    if (!registration.eligible) {
        return msg("registration.ineligible", { created });
    }

    if (
        registration.existing?.date != null &&
        registration.existing.listedTitle
    ) {
        const existingDate = formatInterfaceDate(registration.existing.date);
        const result = msg("registration.existing", {
            date: existingDate,
            title: registration.existing.listedTitle,
        });
        return result;
    }

    if (registration.alreadyRegistered) {
        return msg("registration.alreadyRegistered");
    }

    return msg("registration.register", { created });
}

/**
 * Loads and prepares new-page-list state after the dialog opens.
 *
 * @param dialog - Dialog element.
 * @param state - Dialog state.
 * @returns Resolves after state is loaded.
 */
async function loadNewPageListState(
    dialog: HTMLDialogElement,
    state: any,
): Promise<void> {
    logStep("loadNewPageListState start");
    const loadingStatus = msg("registration.loadingList");
    setStatus(dialog, loadingStatus, false);
    const newPageList = await fetchNewPageList(state.api);

    logStep("loadNewPageListState fetched list", {
        textLength: newPageList.text.length,
    });
    const creationTimes = await loadRegistrationCreationTimes(
        state,
        newPageList.text,
    );
    state.creationTimes = creationTimes;
    state.newPageList = newPageList;
    state.registrationLoading = false;
    prepareRegistration(state);
    refreshRegistrationControls(dialog, state);
    setStatus(dialog, "", false);
    const loggedCreationTimes = serializeCreationTimes(creationTimes);
    const registration = summarizeRegistration(state.registration);
    logStep("loadNewPageListState done", {
        creationTimes: loggedCreationTimes,
        registration,
    });
}

/**
 * Loads creation times used to order a registration.
 *
 * @param state - Mutable operation state.
 * @param listText - List text value.
 * @returns Creation times used to order a registration.
 */
async function loadRegistrationCreationTimes(
    state: {
        subjectInfo: { listedTitle: string; creationDate: Date };
        subjectTitle: string;
        api: mw.Api;
    },
    listText: string,
) {
    const listedTitle = state.subjectInfo.listedTitle || state.subjectTitle;
    const titles = [
        ...getTitlesForDate(listText, state.subjectInfo.creationDate),
        listedTitle,
    ];
    const creationTimes = await fetchPageCreationTimes(state.api, titles);

    creationTimes.set(listedTitle, state.subjectInfo.creationDate);

    return creationTimes;
}

/**
 * Serializes creation times for diagnostic logging.
 *
 * @param creationTimes - Creation times value.
 * @returns Creation times for diagnostic logging.
 */
function serializeCreationTimes(
    creationTimes: Map<string, Date>,
): Array<[string, string]> {
    const entries: Array<[string, string]> = [];

    for (const [title, date] of creationTimes) {
        const timestamp = date.toISOString();
        entries.push([title, timestamp]);
    }

    return entries;
}

/**
 * Refreshes registration checkbox and diff after background loading.
 *
 * @param root - Dialog root.
 * @param state - Dialog state.
 * @returns Result when the function
 *   refreshes registration checkbox and diff after
 *   background loading.
 */
function refreshRegistrationControls(root: HTMLElement, state: any): void {
    const namespaceNumber = mw.config.get("wgNamespaceNumber");
    const registerDefault =
        shouldRegisterByDefault(namespaceNumber, state.subjectTitle) &&
        state.registration.eligible &&
        !state.registration.alreadyRegistered;
    const container = root.querySelector("[data-avgp-register-container]");

    const checkbox = buildRegistrationCheckbox(state, registerDefault);
    const markup = renderTemplate(checkbox);
    replaceElementContent(container, markup);
    updateRegistrationPreview(root, state);
}

/**
 * Formats a UTC date for status text.
 *
 * @param date - Date.
 * @returns Month/day text.
 */
function formatInterfaceDate(date: Date): string {
    const result = new Intl.DateTimeFormat(interfaceLocale, {
        day: "numeric",
        month: "long",
        timeZone: "UTC",
    }).format(date);
    return result;
}

/**
 * Prepares registration state.
 *
 * @param state - Dialog state.
 * @returns Result when the function
 *   prepares registration state.
 */
function prepareRegistration(state: any): void {
    logStep("prepareRegistration start");
    const currentNamespace = mw.config.get("wgNamespaceNumber");
    let namespaceNumber;

    if (currentNamespace % 2 === 0) {
        namespaceNumber = mw.config.get("wgNamespaceNumber");
    } else {
        namespaceNumber = state.subjectInfo.namespaceNumber;
    }

    state.registration = prepareNewPageListRegistration({
        creationDate: state.subjectInfo.creationDate,
        namespaceNumber,
        text: state.newPageList.text,
        title: state.subjectInfo.listedTitle || state.subjectTitle,
        creationTimes: state.creationTimes,
    });
    const registration = summarizeRegistration(state.registration);
    logStep("prepareRegistration done", registration);
}

/**
 * Builds one radio-button section.
 *
 * @param label - Section label.
 * @param name - Input name.
 * @param values - Option values.
 * @param selected - Selected option.
 * @returns Section template.
 */
function buildRadioSection(
    label: string,
    name: string,
    values: Array<string>,
    selected: string,
): TemplateElement {
    const radios = [];

    for (const value of values) {
        const radio = buildRadio(name, value, selected);
        radios.push(radio);
    }

    return buildControlSection(label, "avgp-button-group", radios);
}

/**
 * Builds one radio option.
 *
 * @param name - Input name.
 * @param value - Option value.
 * @param selected - Selected value.
 * @returns Option template.
 */
function buildRadio(
    name: string,
    value: string,
    selected: string,
): TemplateElement {
    const label = value === "" ? msg("common.empty") : value;
    const id = buildInputId(name, value || "empty");
    const inputAttributes = buildRadioInputAttributes(
        name,
        value,
        selected,
        id,
    );

    const input = createElement("input", inputAttributes);
    const icon = createElement("span", { class: "cdx-radio__icon" });
    const inputLabel = buildTextElement(
        "label",
        { class: "cdx-radio__label", for: id },
        label,
    );
    const wrapper = createElement("div", { class: "cdx-radio__wrapper" }, [
        input,
        icon,
        inputLabel,
    ]);

    const radio = createElement("div", { class: "cdx-radio" }, [wrapper]);

    return radio;
}

/**
 * Builds radio input attributes.
 *
 * @param name - Display name.
 * @param value - Input value.
 * @param selected - Selected value.
 * @param id - Id value.
 * @returns Radio input attributes.
 */
function buildRadioInputAttributes(
    name: string,
    value: string,
    selected: string,
    id: string,
): unknown {
    const checkedAttributes = value === selected ? { checked: "" } : {};

    const result = {
        class: "cdx-radio__input",
        id,
        name,
        type: "radio",
        value,
        ...checkedAttributes,
    };
    return result;
}

/**
 * Builds task-force checkboxes.
 *
 * @returns Section template.
 */
function buildTaskForceSection(): TemplateElement {
    const label = msg("dialog.taskForces");
    const result = buildCheckboxSection(
        label,
        "taskForce",
        PROJECT_CONFIG.videoGames.taskForces,
    );
    return result;
}

/**
 * Builds maintenance checkboxes.
 *
 * @returns Section HTML.
 */
function buildMaintenanceSection(): TemplateElement {
    const label = msg("dialog.maintenance");
    const result = buildCheckboxSection(
        label,
        "maintenance",
        MAINTENANCE_ITEMS,
    );
    return result;
}

/**
 * Builds other-project checkboxes.
 *
 * @returns Section HTML.
 */
function buildOtherProjectSection(): TemplateElement {
    const label = msg("dialog.otherProjects");
    const result = buildCheckboxSection(
        label,
        "otherProject",
        PROJECT_CONFIG.otherProjects,
    );
    return result;
}

/**
 * Builds a checkbox section.
 *
 * @param label - Section label.
 * @param name - Input name.
 * @param items - Configured checkbox items.
 * @returns Section HTML.
 */
function buildCheckboxSection(
    label: string,
    name: string,
    items: Array<any>,
): TemplateElement {
    const checkboxes = [];

    for (const item of items) {
        const checkbox = buildCheckbox(name, item);
        checkboxes.push(checkbox);
    }

    return buildControlSection(label, "avgp-check-grid", checkboxes);
}

/**
 * Builds one checkbox.
 *
 * @param name - Input name.
 * @param item - Checkbox item.
 * @param checked - Whether the checkbox is initially
 * checked.
 * @returns Checkbox template.
 */
function buildCheckbox(
    name: string,
    item: any,
    checked: boolean = false,
): TemplateElement {
    const id = buildInputId(name, item.id);
    const checkedAttributes = checked ? { checked: "" } : {};
    const inputAttributes: Record<string, any> = {
        class: "cdx-checkbox__input",
        id,
        name,
        type: "checkbox",
        value: item.id,
        ...checkedAttributes,
    };

    const input = createElement("input", inputAttributes);
    const icon = createElement("span", { class: "cdx-checkbox__icon" });
    const labelContainer = buildCheckboxLabel(id, item.label);
    const wrapper = createElement("div", { class: "cdx-checkbox__wrapper" }, [
        input,
        icon,
        labelContainer,
    ]);
    const checkbox = createElement(
        "div",
        { class: "cdx-checkbox cdx-checkbox--inline" },
        [wrapper],
    );

    return checkbox;
}

/**
 * Builds a Codex checkbox label container.
 *
 * @param id - Id value.
 * @param label - Label value.
 * @returns A Codex checkbox label container.
 */
function buildCheckboxLabel(id: string, label: string): TemplateElement {
    const labelText = buildTextElement(
        "span",
        { class: "cdx-label__label__text" },
        label,
    );
    const inputLabel = createElement(
        "label",
        { class: "cdx-label__label", for: id },
        [labelText],
    );
    const container = createElement(
        "div",
        { class: "cdx-checkbox__label cdx-label" },
        [inputLabel],
    );
    return container;
}

/**
 * Builds a fieldset containing one group of controls.
 *
 * @param label - Label value.
 * @param controlClass - Control class value.
 * @param controls - Controls value.
 * @returns A fieldset containing one group of controls.
 */
function buildControlSection(
    label: string,
    controlClass: string,
    controls: Array<TemplateNode>,
): TemplateElement {
    const plainLabel = buildPlainLabel(label);
    const legend = createElement("legend", { class: "cdx-label" }, [
        plainLabel,
    ]);
    const group = createElement("div", { class: controlClass }, controls);
    const fieldControl = buildFieldControl([group]);

    const result = createElement(
        "fieldset",
        { class: "cdx-field avgp-section" },
        [legend, fieldControl],
    );
    return result;
}

/**
 * Wraps nodes in a Codex field control.
 *
 * @param children - Children value.
 * @returns Result when the function
 *   wraps nodes in a codex field control.
 */
function buildFieldControl(children: Array<TemplateNode>): TemplateElement {
    return createElement("div", { class: "cdx-field__control" }, children);
}

/**
 * Wraps a field label in its Codex container.
 *
 * @param label - Label value.
 * @returns Result when the function
 *   wraps a field label in its codex container.
 */
function buildLabelContainer(label: TemplateNode): TemplateElement {
    return createElement("div", { class: "cdx-label" }, [label]);
}

/**
 * Builds a button with escaped label text.
 *
 * @param label - Label value.
 * @param attributes - Attributes value.
 * @returns A button with escaped label text.
 */
function buildButton(
    label: string,
    attributes: Record<string, any>,
): TemplateElement {
    return buildTextElement("button", attributes, label);
}

/**
 * Builds an element containing one escaped text node.
 *
 * @param tagName - Tag name value.
 * @param attributes - Attributes value.
 * @param text - Source text.
 * @returns An element containing one escaped text node.
 */
function buildTextElement(
    tagName: string,
    attributes: Record<string, any>,
    text: string,
): TemplateElement {
    const textNode = createEscapedText(text);
    return createElement(tagName, attributes, [textNode]);
}

/**
 * Binds dialog input and action events.
 *
 * @param dialog - Dialog element.
 * @param state - Dialog state.
 * @returns Result when the function
 *   binds dialog input and action events.
 */
function bindDialogEvents(dialog: HTMLDialogElement, state: any): void {
    const changeHandler = handleDialogChange.bind(null, dialog, state);
    dialog.addEventListener("change", changeHandler);
    bindDialogEditEvents(dialog, state);
    bindDialogActionEvents(dialog, state);
}

/**
 * Refreshes dialog state after an input change.
 *
 * @param dialog - Dialog element.
 * @param state - Dialog state.
 */
function handleDialogChange(dialog: HTMLDialogElement, state: any): void {
    logStep("dialog change");
    readAssessment(dialog, state.assessment);
    updateAssessmentPreview(dialog, state);
    updateTalkDiff(dialog, state);
    updateAssessmentSummary(dialog, state);
    updateRegistrationPreview(dialog, state);
}

/**
 * Binds source and summary edit tracking.
 *
 * @param dialog - Dialog value.
 * @param state - Mutable operation state.
 */
function bindDialogEditEvents(
    dialog: HTMLElement,
    state: { previewDirty: boolean; summaryDirty: boolean },
): void {
    const preview = dialog.querySelector("[data-avgp-preview]");
    const previewHandler = handlePreviewInput.bind(null, dialog, state);
    preview.addEventListener("input", previewHandler);

    const summary = dialog.querySelector("[name='summary']");
    const summaryHandler = handleSummaryInput.bind(null, state);
    summary.addEventListener("input", summaryHandler);
}

/**
 * Marks the talk preview as manually edited.
 *
 * @param dialog - Dialog element.
 * @param state - Dialog state.
 */
function handlePreviewInput(dialog: HTMLElement, state: any): void {
    logStep("lead source edited");
    state.previewDirty = true;
    updateTalkDiff(dialog, state);
}

/**
 * Marks the assessment summary as manually edited.
 *
 * @param state - Dialog state.
 */
function handleSummaryInput(state: { summaryDirty: boolean }): void {
    logStep("assessment summary edited");
    state.summaryDirty = true;
}

/**
 * Binds dialog cancel and save actions.
 *
 * @param dialog - Dialog value.
 * @param state - Mutable operation state.
 */
function bindDialogActionEvents(
    dialog: HTMLDialogElement,
    state: unknown,
): void {
    const cancel = dialog.querySelector("[data-avgp-cancel]");
    const cancelHandler = handleDialogCancel.bind(null, dialog);
    cancel.addEventListener("click", cancelHandler);

    const save = dialog.querySelector("[data-avgp-save]");
    const saveHandler = handleDialogSave.bind(null, dialog, state);
    save.addEventListener("click", saveHandler);
}

/**
 * Closes a cancelled dialog.
 *
 * @param dialog - Dialog element.
 */
function handleDialogCancel(dialog: HTMLDialogElement): void {
    logStep("dialog cancelled");
    closeDialog(dialog);
}

/**
 * Starts a dialog save.
 *
 * @param dialog - Dialog element.
 * @param state - Dialog state.
 */
function handleDialogSave(dialog: HTMLDialogElement, state: unknown): void {
    logStep("save button clicked");
    const handleError = handleDialogSaveError.bind(null, dialog);
    saveDialog(dialog, state).catch(handleError);
}

/**
 * Reports a dialog save failure.
 *
 * @param dialog - Dialog element.
 * @param error - Save failure.
 */
function handleDialogSaveError(dialog: HTMLDialogElement, error: any): void {
    logStep("saveDialog failed", { error });
    const message = error.message || String(error);
    setStatus(dialog, message, true);
}

/**
 * Reads form values into assessment state.
 *
 * @param root - Dialog root.
 * @param assessment - Mutable assessment data.
 * @returns Form values into assessment state.
 */
function readAssessment(root: HTMLElement, assessment: any): void {
    assessment.className = root.querySelector<HTMLInputElement>(
        "[name='className']:checked",
    ).value;
    assessment.importance = root.querySelector<HTMLInputElement>(
        "[name='importance']:checked",
    ).value;
    assessment.maintenance = readCheckedMap(root, "maintenance");
    assessment.taskForces = readCheckedMap(root, "taskForce");
    assessment.otherProjects = readCheckedMap(root, "otherProject");
    logStep("readAssessment", assessment);
}

/**
 * Reads one checkbox group into an object map.
 *
 * @param root - Dialog root.
 * @param name - Checkbox input name.
 * @returns Checked ID map.
 */
function readCheckedMap(root: HTMLElement, name: string): any {
    const entries = [
        ...root.querySelectorAll<HTMLInputElement>(`[name='${name}']`),
    ].map(function callback(input) {
        return [input.value, input.checked];
    });
    const result = Object.fromEntries(entries);
    return result;
}

/**
 * Updates the preview pane.
 *
 * @param root - Dialog root.
 * @param state - Dialog state.
 * @returns Result when the function
 *   updates the preview pane.
 */
function updateAssessmentPreview(root: HTMLElement, state: any): void {
    if (state.previewDirty) {
        logStep("updateAssessmentPreview skipped: dirty");
        return;
    }

    const preview = root.querySelector<HTMLTextAreaElement>(
        "[data-avgp-preview]",
    );
    preview.value = previewTalkPageTopSection(
        state.pageText,
        state.assessment,
        PROJECT_CONFIG,
    );
    logStep("updateAssessmentPreview done", {
        length: preview.value.length,
    });
}

/**
 * Updates the current talk-page lead-section pane.
 *
 * @param root - Dialog root.
 * @param state - Dialog state.
 * @returns Result when the function
 *   updates the current talk-page lead-section pane.
 */
function updateTalkDiff(root: HTMLElement, state: any): void {
    const currentSource = root.querySelector<HTMLTextAreaElement>(
        "[data-avgp-current-source]",
    );
    currentSource.value = getTalkPageTopSection(state.pageText);
    logStep("updateTalkDiff done", {
        length: currentSource.value.length,
    });
}

/**
 * Updates the new-page-list preview.
 *
 * @param root - Dialog root.
 * @param state - Dialog state.
 * @returns Result when the function
 *   updates the new-page-list preview.
 */
function updateRegistrationPreview(root: HTMLElement, state: any): void {
    const checkbox = root.querySelector<HTMLInputElement>("[name='register']");
    const shouldRegister = isRegistrationCheckboxSelected(checkbox);
    const canPreview = canShowRegistrationPreview(state);
    const previewRoot = root.querySelector<HTMLElement>(
        "[data-avgp-list-preview]",
    );
    const summaryRoot = root.querySelector<HTMLElement>(".avgp-list-summary");

    setRegistrationPreviewVisibility(previewRoot, summaryRoot, canPreview);

    if (!canPreview) {
        clearRegistrationPreview(root, state);
        return;
    }

    const comparison = buildRegistrationPreviewComparison(
        state,
        shouldRegister,
    );
    updateComparisonTextarea(
        root,
        "[data-avgp-list-before]",
        comparison.before,
    );
    updateComparisonTextarea(root, "[data-avgp-list-after]", comparison.after);
    logRegistrationPreview(root, shouldRegister);
}

/**
 * Checks whether the registration checkbox is active and selected.
 *
 * @param checkbox - Checkbox value.
 * @returns Whether the registration checkbox is active and selected.
 */
function isRegistrationCheckboxSelected(checkbox: any): boolean {
    return checkbox?.checked === true && checkbox.disabled === false;
}

/**
 * Checks whether registration preview data is available.
 *
 * @param state - Mutable operation state.
 * @returns Whether registration preview data is available.
 */
function canShowRegistrationPreview(state: any): boolean {
    const result =
        state.registrationLoading === false &&
        state.registration?.eligible === true &&
        state.registration.alreadyRegistered === false;
    return result;
}

/**
 * Logs the rendered registration comparison sizes.
 *
 * @param root - Root value.
 * @param shouldRegister - Whether should register.
 */
function logRegistrationPreview(
    root: HTMLElement,
    shouldRegister: boolean,
): void {
    const after = root.querySelector<HTMLTextAreaElement>(
        "[data-avgp-list-after]",
    );
    const before = root.querySelector<HTMLTextAreaElement>(
        "[data-avgp-list-before]",
    );

    logStep("updateRegistrationPreview done", {
        afterLength: after.value.length,
        beforeLength: before.value.length,
        shouldRegister,
    });
}

/**
 * Shows or hides registration preview elements.
 *
 * @param preview - Preview value.
 * @param summary - Summary value.
 * @param visible - Visible value.
 */
function setRegistrationPreviewVisibility(
    preview: HTMLElement,
    summary: HTMLElement,
    visible: boolean,
): void {
    preview.hidden = !visible;
    summary.hidden = !visible;
}

/**
 * Clears a hidden registration preview.
 *
 * @param root - Root value.
 * @param state - Mutable operation state.
 */
function clearRegistrationPreview(
    root: HTMLElement,
    state: { registration: unknown },
): void {
    updateComparisonTextarea(root, "[data-avgp-list-before]", "");
    updateComparisonTextarea(root, "[data-avgp-list-after]", "");
    const registration = summarizeRegistration(state.registration);
    logStep("updateRegistrationPreview hidden", {
        registration,
    });
}

/**
 * Builds the current registration comparison.
 *
 * @param state - Mutable operation state.
 * @param shouldRegister - Whether should register.
 * @returns The current registration comparison.
 */
function buildRegistrationPreviewComparison(
    state: {
        registration: { changed: unknown; proposedText: string };
        newPageList: { text: string };
    },
    shouldRegister: boolean,
): { after: string; before: string } {
    if (!shouldRegister || !state.registration.changed) {
        return { after: "No changes.", before: "No changes." };
    }

    const comparison = buildLineComparison(
        state.newPageList.text,
        state.registration.proposedText,
        1,
    );

    return comparison;
}

/**
 * Updates the edit summary while it has not been manually edited.
 *
 * @param root - Dialog root.
 * @param state - Dialog state.
 * @returns Result when the function
 *   updates the edit summary while it has not been
 *   manually edited.
 */
function updateAssessmentSummary(root: HTMLElement, state: any): void {
    if (state.summaryDirty) {
        logStep("updateAssessmentSummary skipped: dirty");
        return;
    }

    const summaryInput =
        root.querySelector<HTMLInputElement>("[name='summary']");
    summaryInput.value = buildEditSummary(state.assessment);
    logStep("updateAssessmentSummary done", {
        summary: summaryInput.value,
    });
}

/**
 * Builds the default edit summary for the selected assessment.
 *
 * @param assessment - Selected assessment values.
 * @returns Edit summary.
 */
function buildEditSummary(assessment: any): string {
    const banners = [
        buildVideoGamesSummary(assessment),
        ...getSelectedLabels(
            PROJECT_CONFIG.otherProjects,
            assessment.otherProjects,
        ),
    ];
    const className = `${assessment.className || "Unassessed"}-Class`;
    let summary;

    if (banners.length === 0) {
        summary = msg("summary.tagProjects");
    } else {
        const projects = banners.join(", ");
        summary = msg("summary.tagProjectsWithClass", {
            className,
            projects,
        });
    }

    return appendSummarySourceLink(summary);
}

/**
 * Builds the Video games summary fragment.
 *
 * @param assessment - Selected assessment values.
 * @returns Video games summary fragment.
 */
function buildVideoGamesSummary(assessment: any): string {
    const details = buildVideoGamesSummaryDetails(assessment);
    let result;

    if (details.length === 0) {
        result = msg("summary.videoGames");
    } else {
        const joinedDetails = details.join("; ");
        result = msg("summary.videoGamesWithDetails", {
            details: joinedDetails,
        });
    }

    return result;
}

/**
 * Builds the selected Video games summary details.
 *
 * @param assessment - Assessment value.
 * @returns The selected Video games summary details.
 */
function buildVideoGamesSummaryDetails(assessment: any): Array<string> {
    const details: Array<string> = [];
    const taskForces = getSelectedLabels(
        PROJECT_CONFIG.videoGames.taskForces,
        assessment.taskForces,
    );
    const maintenance = getSelectedLabels(
        MAINTENANCE_ITEMS,
        assessment.maintenance,
    );

    if (assessment.importance) {
        const importance = msg("summary.importance", {
            importance: assessment.importance,
        });
        details.push(importance);
    }

    if (taskForces.length > 0) {
        const joinedTaskForces = taskForces.join(", ");
        details.push(joinedTaskForces);
    }

    if (maintenance.length > 0) {
        const joinedMaintenance = maintenance.join(", ");
        details.push(joinedMaintenance);
    }

    return details;
}

/**
 * Gets selected item labels.
 *
 * @param items - Configured item list.
 * @param selectedMap - Selected item map.
 * @returns Selected labels.
 */
function getSelectedLabels(
    items: Array<any>,
    selectedMap: any,
): Array<string> {
    const result = items
        .filter((item) => selectedMap?.[item.id])
        .map((item) => item.label);
    return result;
}

/**
 * Saves talk assessment and optional list registration.
 *
 * @param dialog - Dialog element.
 * @param state - Dialog state.
 * @returns Resolves after saving.
 */
async function saveDialog(
    dialog: HTMLDialogElement,
    state: any,
): Promise<void> {
    logStep("saveDialog start");
    const options = readDialogSaveOptions(dialog);

    readAssessment(dialog, state.assessment);
    const registration = summarizeRegistration(state.registration);
    logStep("saveDialog options", {
        listSummary: options.listSummary,
        previewLength: options.previewText.length,
        registration,
        shouldRegister: options.shouldRegister,
        summary: options.summary,
    });
    await saveDialogRegistration(dialog, state, options);

    if (skipUnchangedTalkSave(dialog, state, options.previewText)) {
        return;
    }

    await saveDialogTalkPage(dialog, state, options);
    scheduleDialogClose(dialog);
}

/**
 * Reads save controls from the assessment dialog.
 *
 * @param dialog - Dialog value.
 * @returns Save controls from the assessment dialog.
 */
function readDialogSaveOptions(dialog: HTMLDialogElement): any {
    const register =
        dialog.querySelector<HTMLInputElement>("[name='register']");
    const preview = dialog.querySelector<HTMLTextAreaElement>(
        "[data-avgp-preview]",
    );
    const summary = dialog.querySelector<HTMLInputElement>("[name='summary']");
    const listSummary = dialog.querySelector<HTMLInputElement>(
        "[name='listSummary']",
    );

    const result = {
        listSummary: listSummary.value.trim(),
        previewText: preview.value,
        shouldRegister: register.checked && !register.disabled,
        summary: summary.value.trim(),
    };
    return result;
}

/**
 * Saves the selected new-page-list registration.
 *
 * @param dialog - Dialog value.
 * @param state - Mutable operation state.
 * @param options - Operation options.
 */
async function saveDialogRegistration(
    dialog: HTMLDialogElement,
    state: {
        registration: { changed: boolean; proposedText: string };
        subjectInfo: { listedTitle: string; creationDate: Date };
        subjectTitle: string;
        api: mw.Api;
        newPageList: {
            basetimestamp: string;
            starttimestamp: string;
        };
    },
    options: { shouldRegister: boolean; listSummary: string },
): Promise<void> {
    if (!options.shouldRegister || !state.registration.changed) {
        return;
    }

    const defaultSummary = buildNewPageListSummary(
        state.subjectInfo.listedTitle || state.subjectTitle,
        state.subjectInfo.creationDate,
    );

    setStatus(dialog, "Updating new-page list...", false);
    logStep("saveDialog saving new-page list");
    await savePreparedNewPageList(
        state.api,
        state.newPageList,
        state.registration.proposedText,
        options.listSummary || defaultSummary,
    );
}

/**
 * Skips a talk save that only clears empty importance.
 *
 * @param dialog - Dialog value.
 * @param state - Mutable operation state.
 * @param previewText - Preview text value.
 * @returns Result when the function
 *   skips a talk save that only clears empty
 *   importance.
 */
function skipUnchangedTalkSave(
    dialog: HTMLDialogElement,
    state: { pageText: string },
    previewText: string,
): boolean {
    const currentTopSection = getTalkPageTopSection(state.pageText);
    const unchanged = isEmptyImportanceOnlyChange(
        currentTopSection,
        previewText,
    );

    if (unchanged) {
        logStep("saveDialog skipping talk save: empty importance only");
        setStatus(dialog, "Skipped unchanged assessment.", false);
        scheduleDialogClose(dialog);
    }

    return unchanged;
}

/**
 * Saves the edited talk-page top section.
 *
 * @param dialog - Dialog value.
 * @param state - Mutable operation state.
 * @param options - Operation options.
 */
async function saveDialogTalkPage(
    dialog: HTMLDialogElement,
    state: { api: mw.Api; talkTitle: string },
    options: { previewText: string; summary: string },
): Promise<void> {
    setStatus(dialog, "Saving talk page...", false);
    logStep("saveDialog saving talk page");
    await saveTalkAssessment(
        state.api,
        state.talkTitle,
        options.previewText,
        PROJECT_CONFIG,
        options.summary || DEFAULT_EDIT_SUMMARY,
    );

    const savedStatus = msg("dialog.saved");
    setStatus(dialog, savedStatus, false);
    logStep("saveDialog done");
}

/**
 * Closes and removes a dialog after status text can be read.
 *
 * @param dialog - Dialog value.
 */
function scheduleDialogClose(dialog: HTMLDialogElement): void {
    const close = closeDialog.bind(null, dialog);
    setTimeout(close, DIALOG_CLOSE_DELAY_MS);
}

/**
 * Closes and removes a dialog.
 *
 * @param dialog - Dialog value.
 */
function closeDialog(dialog: { close: () => void; remove: () => void }): void {
    dialog.close();
    dialog.remove();
}

/**
 * Builds one field label for an input.
 *
 * @param label - Field label text.
 * @param id - Input ID.
 * @returns Field label template.
 */
function buildInputLabel(label: string, id: string): TemplateElement {
    const result = buildTextElement(
        "label",
        { class: "avgp-label-text", for: id },
        label,
    );
    return result;
}

/**
 * Builds one field label without an associated form control.
 *
 * @param label - Label text.
 * @returns Label template.
 */
function buildPlainLabel(label: string): TemplateElement {
    return buildTextElement("span", { class: "avgp-label-text" }, label);
}

/**
 * Builds a stable input ID.
 *
 * @param name - Input group name.
 * @param value - Input value.
 * @returns Input ID.
 */
function buildInputId(name: string, value: string): string {
    const result = `avgp-${name}-${String(value || "")
        .replace(/[^a-z0-9]+/giu, "-")
        .replace(/^-|-$/gu, "")
        .toLowerCase()}`;
    return result;
}

/**
 * Appends the source-code marker to an edit summary.
 *
 * @param summary - Base edit summary.
 * @returns Summary with source marker.
 */
function appendSummarySourceLink(summary: string): string {
    const value = String(summary || "").trim();
    const includesSourceLink = value.includes(SUMMARY_SOURCE_LINK);
    let result = value;

    if (!includesSourceLink) {
        result = `${value} ${SUMMARY_SOURCE_LINK}`.trim();
    }

    return result;
}

/**
 * Updates a comparison textarea value.
 *
 * @param root - Dialog root.
 * @param selector - Textarea selector.
 * @param value - Textarea value.
 * @returns Result when the function
 *   updates a comparison textarea value.
 */
function updateComparisonTextarea(
    root: HTMLElement,
    selector: string,
    value: string,
): void {
    const textarea = root.querySelector<HTMLTextAreaElement>(selector);

    if (textarea != null) {
        textarea.value = String(value || "");
    }
}

/**
 * Shows dialog status text.
 *
 * @param root - Dialog root.
 * @param text - Status text.
 * @param isError - Whether the status is an error.
 * @returns Result when the function
 *   shows dialog status text.
 */
function setStatus(root: HTMLElement, text: string, isError: boolean): void {
    const status = root.querySelector<HTMLElement>("[data-avgp-status]");

    status.textContent = text;
    status.classList.toggle("avgp-status--error", isError);
    status.dataset.status = isError ? "error" : "default";
    logStep("status updated", { isError, text });
}

/**
 * Adds dialog styles to the page once.
 *
 * @returns Result when the function
 *   adds dialog styles to the page once.
 */
function addStyles(): void {
    if (document.getElementById("avgp-styles") != null) {
        logStep("addStyles skipped: already present");
        return;
    }

    const style = document.createElement("style");

    style.id = "avgp-styles";
    style.textContent = DIALOG_CSS;
    document.head.append(style);
    logStep("addStyles done");
}

/**
 * Summarizes registration state for console logging.
 *
 * @param registration - Registration state.
 * @returns Log-safe summary.
 */
function summarizeRegistration(registration: any): any {
    const result = {
        alreadyRegistered: registration?.alreadyRegistered,
        changed: registration?.changed,
        earliestDate: registration?.earliestDate?.toISOString?.(),
        eligible: registration?.eligible,
        existing: registration?.existing,
        proposedLength: registration?.proposedText?.length,
    };
    return result;
}

mw.loader.using(
    ["codex-styles", "mediawiki.api", "mediawiki.Title", "mediawiki.util"],
    init,
);
