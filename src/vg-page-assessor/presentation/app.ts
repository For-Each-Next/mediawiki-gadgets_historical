/**
 * Mounts the talk assessment gadget.
 */

import {
    createElement,
    createEscapedText,
    replaceElementContent,
    renderTemplate,
    type TemplateElement,
    type TemplateNode,
} from "../../shared";
import { interfaceLocale, msg } from "../config/locales";
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
} from "../domain/assessment.ts";
import {
    fetchPageCreationTimes,
    fetchSubjectPageInfo,
    fetchPageText,
    saveTalkAssessment,
} from "../infrastructure/mediawiki-api.ts";
import {
    buildLineComparison,
    buildNewPageListSummary,
    fetchNewPageList,
    getTitlesForDate,
    prepareNewPageListRegistration,
    savePreparedNewPageList,
} from "../application/new-page-list.ts";
import { logStep } from "../infrastructure/logger.ts";
import projectConfig from "../config/project-config.ts";

const PROJECT_CONFIG = projectConfig;
const DIALOG_CSS = __ASSESS_VG_PAGE_DIALOG_CSS__;
const SUMMARY_LINK = ":m:User:For Each ... Next/global.js/vg page assessor.js";
const SUMMARY_TEXT = "🍄";
const SUMMARY_SOURCE_LINK = `[[${SUMMARY_LINK}|${SUMMARY_TEXT}]]`;
const DEFAULT_EDIT_SUMMARY = appendSummarySourceLink("Tag project banners");
const MAINTENANCE_ITEMS = [
    { id: "reassess", label: msg("maintenance.reassess") },
    { id: "needsInfobox", label: msg("maintenance.needsInfobox") },
    { id: "cover", label: msg("maintenance.needsImage") },
    { id: "screenshot", label: msg("maintenance.needsScreenshot") },
];

/**
 * Adds the toolbox trigger after MediaWiki is ready.
 *
 * @returns */
function init(): void {
    logStep("init start", {
        dbName: mw.config.get("wgDBname"),
        namespaceNumber: mw.config.get("wgNamespaceNumber"),
        pageName: mw.config.get("wgPageName"),
    });
    if (
        mw.config.get("wgDBname") !== "zhwiki" ||
        mw.config.get("wgNamespaceNumber") < 0
    ) {
        logStep("init skipped");
        return;
    }

    addStyles();
    logStep("init adding toolbox link");
    addToolboxLink();
}

/** Adds the localized toolbox link and click handler. */
function addToolboxLink(): void {
    const link = mw.util.addPortletLink(
        "p-tb",
        "#",
        msg("tool.name"),
        "t-assess-vg-page",
    );
    link?.addEventListener("click", function callback(event) {
        event.preventDefault();
        logStep("toolbox link clicked");
        openDialog().catch(function callback(error) {
            logStep("openDialog failed", { error });
            mw.notify(error.message || String(error), { type: "error" });
        });
    });
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
    loadNewPageListState(dialog, dialog.avgpState).catch(
        function callback(error) {
            logStep("loadNewPageListState failed", { error });
            setStatus(dialog, error.message || String(error), true);
        },
    );
}

/** Loads the initial talk and subject-page dialog state. */
async function loadDialogState(): Promise<any> {
    const api = new mw.Api();
    const currentTitle = mw.Title.newFromText(mw.config.get("wgPageName"));
    const talkTitle = getTalkPageTitle(currentTitle);
    const subjectTitle = getSubjectPageTitle(currentTitle);
    logStep("openDialog titles resolved", {
        namespaceNumber: currentTitle.getNamespaceId(),
        subjectTitle,
        talkTitle,
    });
    const [page, subjectInfo] = await Promise.all([
        fetchPageText(api, talkTitle),
        fetchSubjectPageInfo(api, subjectTitle),
    ]);
    logStep("openDialog initial page data fetched", {
        subjectInfo: {
            ...subjectInfo,
            creationDate: subjectInfo.creationDate.toISOString(),
        },
        talkPageLength: page.text.length,
    });

    return {
        api,
        assessment: createDefaultAssessment(PROJECT_CONFIG),
        pageText: page.text,
        subjectInfo,
        subjectTitle,
        talkTitle,
    };
}

/** Appends and opens the assessment dialog. */
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
    replaceElementContent(dialog, buildDialogHtml(state, registerDefault));
    bindDialogEvents(dialog, state);
    updateAssessmentPreview(dialog, state);
    updateTalkDiff(dialog, state);
    updateAssessmentSummary(dialog, state);
    updateRegistrationPreview(dialog, state);

    logStep("buildDialog done", {
        registerDefault,
        registration: summarizeRegistration(state.registration),
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

/** Builds the assessment controls and source preview. */
function buildAssessmentFieldset(state: any): TemplateElement {
    const controls = buildAssessmentControls();
    const sources = buildAssessmentSources();
    const grid = createElement("div", { class: "avgp-assessment-grid" }, [
        controls,
        sources,
    ]);
    const legend = buildTextElement(
        "legend",
        { class: "avgp-fieldset-title" },
        msg("dialog.assessment"),
    );
    const summary = buildTextInputField({
        className: "avgp-summary cdx-field",
        id: "avgp-edit-summary",
        label: msg("dialog.editSummary"),
        name: "summary",
        value: buildEditSummary(state.assessment),
    });
    const fieldset = createElement("fieldset", { class: "avgp-fieldset" }, [
        legend,
        grid,
        summary,
    ]);

    return fieldset;
}

/** Builds assessment radio and checkbox controls. */
function buildAssessmentControls(): TemplateElement {
    const children = [
        buildRadioSection(
            msg("dialog.class"),
            "className",
            CLASS_VALUES,
            "Unassessed",
        ),
        buildRadioSection(
            msg("dialog.importance"),
            "importance",
            IMPORTANCE_VALUES,
            "",
        ),
        buildTaskForceSection(),
        buildMaintenanceSection(),
        buildOtherProjectSection(),
    ];
    const controls = createElement(
        "section",
        {
            "aria-label": msg("dialog.assessmentControls"),
            class: "avgp-controls",
        },
        children,
    );

    return controls;
}

/** Builds current and proposed talk-source fields. */
function buildAssessmentSources(): TemplateElement {
    const preview = buildSourceField({
        id: "avgp-preview-source",
        label: msg("dialog.readySource"),
        textareaAttributes: { "data-avgp-preview": "" },
    });
    const current = buildSourceField({
        id: "avgp-current-source",
        label: msg("dialog.currentSource"),
        textareaAttributes: {
            "data-avgp-current-source": "",
            readonly: "",
        },
    });
    const sources = createElement(
        "section",
        {
            "aria-label": msg("dialog.leadPreview"),
            class: "avgp-source",
        },
        [preview, current],
    );
    return sources;
}

/** Builds the new-page-list registration controls and preview. */
function buildNewPageListFieldset(
    state: any,
    registerDefault: boolean,
): TemplateElement {
    const registration = buildRegistrationControl(state, registerDefault);
    const comparison = buildRegistrationComparison();
    const summary = buildRegistrationSummary(state);
    const legend = buildTextElement(
        "legend",
        { class: "avgp-fieldset-title" },
        msg("dialog.newPageList"),
    );
    const fieldset = createElement("fieldset", { class: "avgp-fieldset" }, [
        legend,
        registration,
        comparison,
        summary,
    ]);

    return fieldset;
}

/** Builds the registration checkbox field. */
function buildRegistrationControl(state, registerDefault): TemplateElement {
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

/** Builds the before/after registration comparison field. */
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

/** Builds one new-page-list comparison field. */
function buildListComparisonField(position, tone): TemplateElement {
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

/** Builds the new-page-list edit-summary field. */
function buildRegistrationSummary(state): TemplateElement {
    const summary = buildTextInputField({
        className: "avgp-list-summary cdx-field",
        id: "avgp-list-summary",
        label: msg("dialog.editSummary"),
        name: "listSummary",
        value: buildNewPageListSummary(
            state.subjectInfo.listedTitle || state.subjectTitle,
            state.subjectInfo.creationDate,
        ),
    });

    return summary;
}

/** Builds a Codex text input field. */
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

/** Builds the dialog status and action buttons. */
function buildDialogActions(): TemplateElement {
    const status = createElement("span", {
        class: "avgp-status",
        "data-avgp-status": "",
    });
    const cancel = buildButton(msg("dialog.cancel"), {
        class: "cdx-button",
        "data-avgp-cancel": "",
        type: "button",
    });
    const saveClass = [
        "cdx-button",
        "cdx-button--action-progressive",
        "cdx-button--weight-primary",
    ].join(" ");
    const save = buildButton(msg("dialog.save"), {
        class: saveClass,
        "data-avgp-save": "",
        type: "button",
    });

    return createElement("div", { class: "avgp-actions" }, [
        status,
        cancel,
        save,
    ]);
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
    const labelContainer = buildLabelContainer(buildInputLabel(label, id));
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

    return createElement(
        "div",
        { class: "cdx-field avgp-section avgp-source-field" },
        [labelContainer, control],
    );
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
    const labelContainer = buildLabelContainer(buildInputLabel(label, id));
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

    return createElement("div", { class: className }, [
        labelContainer,
        textareaContainer,
    ]);
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
        const indicator = buildProgressIndicator(msg("registration.loading"));

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

/** Builds a Codex checkbox input wrapper. */
function buildCheckboxWrapper(input, label): TemplateElement {
    const icon = createElement("span", { class: "cdx-checkbox__icon" });
    const wrapper = createElement("div", { class: "cdx-checkbox__wrapper" }, [
        input,
        icon,
        label,
    ]);

    return wrapper;
}

/** Gets the registration checkbox label for dialog state. */
function getRegistrationLabelForState(state): string {
    const label = getRegistrationLabel(
        state.registration,
        state.subjectInfo.creationDate,
    );

    return label;
}

/** Checks whether registration cannot be selected. */
function isRegistrationDisabled(state): boolean {
    return (
        state.registrationLoading ||
        !state.registration.eligible ||
        state.registration.alreadyRegistered
    );
}

/** Builds registration checkbox input attributes. */
function buildRegistrationInputAttributes(checked, disabled): any {
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

/** Builds the registration checkbox label container. */
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
    setStatus(dialog, msg("registration.loadingList"), false);
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
    logStep("loadNewPageListState done", {
        creationTimes: serializeCreationTimes(creationTimes),
        registration: summarizeRegistration(state.registration),
    });
}

/** Loads creation times used to order a registration. */
async function loadRegistrationCreationTimes(state, listText) {
    const listedTitle = state.subjectInfo.listedTitle || state.subjectTitle;
    const titles = [
        ...getTitlesForDate(listText, state.subjectInfo.creationDate),
        listedTitle,
    ];
    const creationTimes = await fetchPageCreationTimes(state.api, titles);

    creationTimes.set(listedTitle, state.subjectInfo.creationDate);

    return creationTimes;
}

/** Serializes creation times for diagnostic logging. */
function serializeCreationTimes(creationTimes): Array<any> {
    const entries = [...creationTimes.entries()].map(function callback(entry) {
        return [entry[0], entry[1].toISOString()];
    });

    return entries;
}

/**
 * Refreshes registration checkbox and diff after background loading.
 *
 * @param root - Dialog root.
 * @param state - Dialog state.
 * @returns */
function refreshRegistrationControls(root: HTMLElement, state: any): void {
    const registerDefault =
        shouldRegisterByDefault(
            mw.config.get("wgNamespaceNumber"),
            state.subjectTitle,
        ) &&
        state.registration.eligible &&
        !state.registration.alreadyRegistered;
    const container = root.querySelector("[data-avgp-register-container]");

    const markup = renderTemplate(
        buildRegistrationCheckbox(state, registerDefault),
    );
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
    return new Intl.DateTimeFormat(interfaceLocale, {
        day: "numeric",
        month: "long",
        timeZone: "UTC",
    }).format(date);
}

/**
 * Prepares registration state.
 *
 * @param state - Dialog state.
 * @returns */
function prepareRegistration(state: any): void {
    logStep("prepareRegistration start");
    state.registration = prepareNewPageListRegistration({
        creationDate: state.subjectInfo.creationDate,
        namespaceNumber: selectValue(
            mw.config.get("wgNamespaceNumber") % 2 === 0,
            function trueBranch() {
                return mw.config.get("wgNamespaceNumber");
            },
            function falseBranch() {
                return state.subjectInfo.namespaceNumber;
            },
        ),
        text: state.newPageList.text,
        title: state.subjectInfo.listedTitle || state.subjectTitle,
        creationTimes: state.creationTimes,
    });
    logStep(
        "prepareRegistration done",
        summarizeRegistration(state.registration),
    );
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
    const radios = values.map((value) => buildRadio(name, value, selected));

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

/** Builds radio input attributes. */
function buildRadioInputAttributes(name, value, selected, id): any {
    const checkedAttributes = value === selected ? { checked: "" } : {};

    return {
        class: "cdx-radio__input",
        id,
        name,
        type: "radio",
        value,
        ...checkedAttributes,
    };
}

/**
 * Builds task-force checkboxes.
 *
 * @returns Section template.
 */
function buildTaskForceSection(): TemplateElement {
    return buildCheckboxSection(
        msg("dialog.taskForces"),
        "taskForce",
        PROJECT_CONFIG.videoGames.taskForces,
    );
}

/**
 * Builds maintenance checkboxes.
 *
 * @returns Section HTML.
 */
function buildMaintenanceSection(): TemplateElement {
    return buildCheckboxSection(
        msg("dialog.maintenance"),
        "maintenance",
        MAINTENANCE_ITEMS,
    );
}

/**
 * Builds other-project checkboxes.
 *
 * @returns Section HTML.
 */
function buildOtherProjectSection(): TemplateElement {
    return buildCheckboxSection(
        msg("dialog.otherProjects"),
        "otherProject",
        PROJECT_CONFIG.otherProjects,
    );
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
    const checkboxes = items.map((item) => buildCheckbox(name, item));

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

/** Builds a Codex checkbox label container. */
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

/** Builds a fieldset containing one group of controls. */
function buildControlSection(
    label: string,
    controlClass: string,
    controls: Array<TemplateNode>,
): TemplateElement {
    const legend = createElement("legend", { class: "cdx-label" }, [
        buildPlainLabel(label),
    ]);
    const group = createElement("div", { class: controlClass }, controls);
    const fieldControl = buildFieldControl([group]);

    return createElement("fieldset", { class: "cdx-field avgp-section" }, [
        legend,
        fieldControl,
    ]);
}

/** Wraps nodes in a Codex field control. */
function buildFieldControl(children: Array<TemplateNode>): TemplateElement {
    return createElement("div", { class: "cdx-field__control" }, children);
}

/** Wraps a field label in its Codex container. */
function buildLabelContainer(label: TemplateNode): TemplateElement {
    return createElement("div", { class: "cdx-label" }, [label]);
}

/** Builds a button with escaped label text. */
function buildButton(
    label: string,
    attributes: Record<string, any>,
): TemplateElement {
    return buildTextElement("button", attributes, label);
}

/** Builds an element containing one escaped text node. */
function buildTextElement(
    tagName: string,
    attributes: Record<string, any>,
    text: string,
): TemplateElement {
    return createElement(tagName, attributes, [createEscapedText(text)]);
}

/**
 * Binds dialog input and action events.
 *
 * @param dialog - Dialog element.
 * @param state - Dialog state.
 * @returns */
function bindDialogEvents(dialog: HTMLDialogElement, state: any): void {
    dialog.addEventListener("change", function callback() {
        logStep("dialog change");
        readAssessment(dialog, state.assessment);
        updateAssessmentPreview(dialog, state);
        updateTalkDiff(dialog, state);
        updateAssessmentSummary(dialog, state);
        updateRegistrationPreview(dialog, state);
    });
    bindDialogEditEvents(dialog, state);
    bindDialogActionEvents(dialog, state);
}

/** Binds source and summary edit tracking. */
function bindDialogEditEvents(dialog, state): void {
    dialog
        .querySelector("[data-avgp-preview]")
        .addEventListener("input", function callback() {
            logStep("lead source edited");
            state.previewDirty = true;
            updateTalkDiff(dialog, state);
        });
    dialog
        .querySelector("[name='summary']")
        .addEventListener("input", function callback() {
            logStep("assessment summary edited");
            state.summaryDirty = true;
        });
}

/** Binds dialog cancel and save actions. */
function bindDialogActionEvents(dialog, state): void {
    dialog
        .querySelector("[data-avgp-cancel]")
        .addEventListener("click", function callback() {
            logStep("dialog cancelled");
            closeDialog(dialog);
        });
    dialog
        .querySelector("[data-avgp-save]")
        .addEventListener("click", function callback() {
            logStep("save button clicked");
            saveDialog(dialog, state).catch(function callback(error) {
                logStep("saveDialog failed", { error });
                setStatus(dialog, error.message || String(error), true);
            });
        });
}

/**
 * Reads form values into assessment state.
 *
 * @param root - Dialog root.
 * @param assessment - Mutable assessment data.
 * @returns */
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
    return Object.fromEntries(
        [...root.querySelectorAll<HTMLInputElement>(`[name='${name}']`)].map(
            function callback(input) {
                return [input.value, input.checked];
            },
        ),
    );
}

/**
 * Updates the preview pane.
 *
 * @param root - Dialog root.
 * @param state - Dialog state.
 * @returns */
function updateAssessmentPreview(root: HTMLElement, state: any): void {
    if (state.previewDirty) {
        logStep("updateAssessmentPreview skipped: dirty");
        return;
    }

    root.querySelector<HTMLTextAreaElement>("[data-avgp-preview]").value =
        previewTalkPageTopSection(
            state.pageText,
            state.assessment,
            PROJECT_CONFIG,
        );
    logStep("updateAssessmentPreview done", {
        length: root.querySelector<HTMLTextAreaElement>("[data-avgp-preview]")
            .value.length,
    });
}

/**
 * Updates the current talk-page lead-section pane.
 *
 * @param root - Dialog root.
 * @param state - Dialog state.
 * @returns */
function updateTalkDiff(root: HTMLElement, state: any): void {
    root.querySelector<HTMLTextAreaElement>(
        "[data-avgp-current-source]",
    ).value = getTalkPageTopSection(state.pageText);
    logStep("updateTalkDiff done", {
        length: root.querySelector<HTMLTextAreaElement>(
            "[data-avgp-current-source]",
        ).value.length,
    });
}

/**
 * Updates the new-page-list preview.
 *
 * @param root - Dialog root.
 * @param state - Dialog state.
 * @returns */
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

/** Checks whether the registration checkbox is active and selected. */
function isRegistrationCheckboxSelected(checkbox: any): boolean {
    return checkbox?.checked === true && checkbox.disabled === false;
}

/** Checks whether registration preview data is available. */
function canShowRegistrationPreview(state: any): boolean {
    return (
        state.registrationLoading === false &&
        state.registration?.eligible === true &&
        state.registration.alreadyRegistered === false
    );
}

/** Logs the rendered registration comparison sizes. */
function logRegistrationPreview(root: HTMLElement, shouldRegister): void {
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

/** Shows or hides registration preview elements. */
function setRegistrationPreviewVisibility(preview, summary, visible): void {
    preview.hidden = !visible;
    summary.hidden = !visible;
}

/** Clears a hidden registration preview. */
function clearRegistrationPreview(root, state): void {
    updateComparisonTextarea(root, "[data-avgp-list-before]", "");
    updateComparisonTextarea(root, "[data-avgp-list-after]", "");
    logStep("updateRegistrationPreview hidden", {
        registration: summarizeRegistration(state.registration),
    });
}

/** Builds the current registration comparison. */
function buildRegistrationPreviewComparison(state, shouldRegister): any {
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
 * @returns */
function updateAssessmentSummary(root: HTMLElement, state: any): void {
    if (state.summaryDirty) {
        logStep("updateAssessmentSummary skipped: dirty");
        return;
    }

    root.querySelector<HTMLInputElement>("[name='summary']").value =
        buildEditSummary(state.assessment);
    logStep("updateAssessmentSummary done", {
        summary:
            root.querySelector<HTMLInputElement>("[name='summary']").value,
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
    const summary = selectValue(
        banners.length === 0,
        function trueBranch() {
            return "Tag project banners";
        },
        function falseBranch() {
            return [
                "Tag project banners (",
                className,
                "): ",
                banners.join(", "),
                "",
            ].join("");
        },
    );

    return appendSummarySourceLink(summary);
}

/**
 * Builds the Video games summary fragment.
 *
 * @param assessment - Selected assessment values.
 * @returns Video games summary fragment.
 */
function buildVideoGamesSummary(assessment: any): string {
    const details = [];
    const taskForces = getSelectedLabels(
        PROJECT_CONFIG.videoGames.taskForces,
        assessment.taskForces,
    );
    const maintenance = getSelectedLabels(
        MAINTENANCE_ITEMS,
        assessment.maintenance,
    );

    if (assessment.importance) {
        details.push(`${assessment.importance}-importance`);
    }

    if (taskForces.length > 0) {
        details.push(taskForces.join(", "));
    }

    if (maintenance.length > 0) {
        details.push(maintenance.join(", "));
    }

    return selectValue(
        details.length === 0,
        function trueBranch() {
            return "Video games";
        },
        function falseBranch() {
            return `Video games (${details.join("; ")})`;
        },
    );
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
    return items
        .filter((item) => selectedMap?.[item.id])
        .map((item) => item.label);
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
    logStep("saveDialog options", {
        listSummary: options.listSummary,
        previewLength: options.previewText.length,
        registration: summarizeRegistration(state.registration),
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

/** Reads save controls from the assessment dialog. */
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

    return {
        listSummary: listSummary.value.trim(),
        previewText: preview.value,
        shouldRegister: register.checked && !register.disabled,
        summary: summary.value.trim(),
    };
}

/** Saves the selected new-page-list registration. */
async function saveDialogRegistration(dialog, state, options): Promise<void> {
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

/** Skips a talk save that only clears empty importance. */
function skipUnchangedTalkSave(dialog, state, previewText): boolean {
    const unchanged = isEmptyImportanceOnlyChange(
        getTalkPageTopSection(state.pageText),
        previewText,
    );

    if (unchanged) {
        logStep("saveDialog skipping talk save: empty importance only");
        setStatus(dialog, "Skipped unchanged assessment.", false);
        scheduleDialogClose(dialog);
    }

    return unchanged;
}

/** Saves the edited talk-page top section. */
async function saveDialogTalkPage(dialog, state, options): Promise<void> {
    setStatus(dialog, "Saving talk page...", false);
    logStep("saveDialog saving talk page");
    await saveTalkAssessment(
        state.api,
        state.talkTitle,
        options.previewText,
        PROJECT_CONFIG,
        options.summary || DEFAULT_EDIT_SUMMARY,
    );

    setStatus(dialog, msg("status.saved"), false);
    logStep("saveDialog done");
}

/** Closes and removes a dialog after status text can be read. */
function scheduleDialogClose(dialog): void {
    setTimeout(function callback() {
        closeDialog(dialog);
    }, 600);
}

/** Closes and removes a dialog. */
function closeDialog(dialog): void {
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
    return buildTextElement(
        "label",
        { class: "avgp-label-text", for: id },
        label,
    );
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
    return `avgp-${name}-${String(value || "")
        .replace(/[^a-z0-9]+/giu, "-")
        .replace(/^-|-$/gu, "")
        .toLowerCase()}`;
}

/**
 * Appends the source-code marker to an edit summary.
 *
 * @param summary - Base edit summary.
 * @returns Summary with source marker.
 */
function appendSummarySourceLink(summary: string): string {
    const value = String(summary || "").trim();

    return selectValue(
        value.includes(SUMMARY_SOURCE_LINK),
        function trueBranch() {
            return value;
        },
        function falseBranch() {
            return `${value} ${SUMMARY_SOURCE_LINK}`.trim();
        },
    );
}

/**
 * Updates a comparison textarea value.
 *
 * @param root - Dialog root.
 * @param selector - Textarea selector.
 * @param value - Textarea value.
 * @returns */
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
 * @returns */
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
 * @returns */
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
    return {
        alreadyRegistered: registration?.alreadyRegistered,
        changed: registration?.changed,
        earliestDate: registration?.earliestDate?.toISOString?.(),
        eligible: registration?.eligible,
        existing: registration?.existing,
        proposedLength: registration?.proposedText?.length,
    };
}

mw.loader.using(
    ["codex-styles", "mediawiki.api", "mediawiki.Title", "mediawiki.util"],
    init,
);

/**
 * Selects a lazily evaluated value for a condition.
 *
 * @param condition - Condition to evaluate.
 * @param trueBranch - Branch used when the condition is
 * true.
 * @param falseBranch - Branch used when the condition is
 * false.
 * @returns Value returned by the selected branch.
 */
function selectValue(
    condition: unknown,
    trueBranch: (...args: any[]) => any,
    falseBranch: (...args: any[]) => any,
): any {
    if (condition) {
        return trueBranch();
    }

    return falseBranch();
}
