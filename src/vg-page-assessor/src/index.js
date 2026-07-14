/* eslint-disable */

/**
 * Mounts the talk assessment gadget.
 */

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
} from "./assessment.js";
import {
    fetchPageCreationTimes,
    fetchSubjectPageInfo,
    fetchPageText,
    saveTalkAssessment,
} from "./api.js";
import {
    buildLineComparison,
    buildNewPageListSummary,
    fetchNewPageList,
    getTitlesForDate,
    prepareNewPageListRegistration,
    savePreparedNewPageList,
} from "./new-page-list.js";
import { logStep } from "./logger.js";

const PROJECT_CONFIG = __ASSESS_VG_PAGE_DATA__;
const DIALOG_CSS = __ASSESS_VG_PAGE_DIALOG_CSS__;
const SUMMARY_SOURCE_LINK =
    "[[:m:User:For Each ... Next/global.js/vg page assessor.js|🍄]]";
const DEFAULT_EDIT_SUMMARY = appendSummarySourceLink("Tag project banners");
const MAINTENANCE_ITEMS = [
    { id: "reassess", label: "Reassess" },
    { id: "needsInfobox", label: "Needs infobox" },
    { id: "cover", label: "Needs cover/image" },
    { id: "screenshot", label: "Needs screenshot" },
];

/**
 * Adds the toolbox trigger after MediaWiki is ready.
 *
 * @returns {void}
 */
function init() {
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
    mw.util
        .addPortletLink("p-tb", "#", "VG Page Assessor", "t-assess-vg-page")
        ?.addEventListener("click", (event) => {
            event.preventDefault();
            logStep("toolbox link clicked");
            openDialog().catch((error) => {
                logStep("openDialog failed", { error });
                mw.notify(error.message || String(error), { type: "error" });
            });
        });
}

/**
 * Opens the assessment dialog.
 *
 * @returns {Promise<void>} Resolves after the dialog opens.
 */
async function openDialog() {
    logStep("openDialog start");
    const api = new mw.Api();
    const currentTitle = mw.Title.newFromText(mw.config.get("wgPageName"));
    const talkTitle = getTalkPageTitle(currentTitle);
    const subjectTitle = getSubjectPageTitle(currentTitle);
    logStep("openDialog titles resolved", {
        namespaceNumber: currentTitle.getNamespaceId(),
        subjectTitle,
        talkTitle,
    });
    logStep("openDialog fetching initial page data");
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

    const assessment = createDefaultAssessment(PROJECT_CONFIG);
    logStep("openDialog building dialog");
    const dialog = buildDialog({
        api,
        assessment,
        pageText: page.text,
        subjectInfo,
        subjectTitle,
        talkTitle,
    });

    document.body.append(dialog);
    dialog.showModal();
    logStep("openDialog shown");
    loadNewPageListState(dialog, dialog.avgpState).catch((error) => {
        logStep("loadNewPageListState failed", { error });
        setStatus(dialog, error.message || String(error), true);
    });
}

/**
 * Builds the modal dialog.
 *
 * @param {object} state - Dialog state.
 * @param {object} state.api - MediaWiki API client.
 * @param {object} state.assessment - Assessment values.
 * @param {string} state.pageText - Current talk-page text.
 * @param {string} state.subjectTitle - Subject page title.
 * @param {string} state.talkTitle - Talk-page title.
 * @returns {HTMLDialogElement} Dialog element.
 */
function buildDialog(state) {
    logStep("buildDialog start");
    state.registrationLoading = true;
    const dialog = document.createElement("dialog");
    const registerDefault = false;

    dialog.className = "avgp-dialog";
    dialog.avgpState = state;
    dialog.innerHTML = buildDialogHtml(state, registerDefault);
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
 * @param {object} state - Dialog state.
 * @param {boolean} registerDefault - Initial register checkbox state.
 * @returns {string} Dialog HTML.
 */
function buildDialogHtml(state, registerDefault) {
    return `
        <form method="dialog" class="avgp-shell cdx-docs">
            <header class="avgp-header">
                <h2 class="avgp-heading cdx-title">${escapeHtml(state.subjectTitle)}</h2>
            </header>
            <fieldset class="avgp-fieldset">
                <legend class="avgp-fieldset-title">Assessment</legend>
                <div class="avgp-assessment-grid">
                    <section class="avgp-controls" aria-label="Assessment controls">
                        ${buildRadioSection("Class", "className", CLASS_VALUES, "Unassessed")}
                        ${buildRadioSection("Importance", "importance", IMPORTANCE_VALUES, "")}
                        ${buildTaskForceSection()}
                        ${buildMaintenanceSection()}
                        ${buildOtherProjectSection()}
                    </section>
                    <section class="avgp-source" aria-label="Talk page lead-section preview">
                        ${buildSourceField({
                            id: "avgp-preview-source",
                            label: "Ready-to-save lead-section source",
                            textareaAttributes: "data-avgp-preview",
                        })}
                        ${buildSourceField({
                            id: "avgp-current-source",
                            label: "Current lead-section source",
                            textareaAttributes: "data-avgp-current-source readonly",
                        })}
                    </section>
                </div>
                <div class="avgp-summary cdx-field">
                    <div class="cdx-label">${buildInputLabel("Edit summary", "avgp-edit-summary")}</div>
                    <div class="cdx-field__control">
                        <div class="cdx-text-input">
                            <input class="cdx-text-input__input" id="avgp-edit-summary" name="summary" type="text" value="${escapeHtml(buildEditSummary(state.assessment))}">
                        </div>
                    </div>
                </div>
            </fieldset>
            <fieldset class="avgp-fieldset">
                <legend class="avgp-fieldset-title">New-page list</legend>
                <div class="cdx-field avgp-section">
                    <div class="cdx-field__control">
                        <div data-avgp-register-container>
                            ${buildRegistrationCheckbox(state, registerDefault)}
                        </div>
                    </div>
                </div>
                <div class="cdx-field avgp-section avgp-list-preview" data-avgp-list-preview hidden>
                    <div class="cdx-field__control">
                        <div class="avgp-compare-grid">
                            ${buildComparisonField({
                                id: "avgp-list-before",
                                label: "Before",
                                textareaAttributes: "data-avgp-list-before readonly",
                                tone: "removed",
                            })}
                            ${buildComparisonField({
                                id: "avgp-list-after",
                                label: "After",
                                textareaAttributes: "data-avgp-list-after readonly",
                                tone: "added",
                            })}
                        </div>
                    </div>
                </div>
                <div class="avgp-list-summary cdx-field">
                    <div class="cdx-label">${buildInputLabel("Edit summary", "avgp-list-summary")}</div>
                    <div class="cdx-field__control">
                        <div class="cdx-text-input">
                            <input class="cdx-text-input__input" id="avgp-list-summary" name="listSummary" type="text" value="${escapeHtml(buildNewPageListSummary(state.subjectInfo.listedTitle || state.subjectTitle, state.subjectInfo.creationDate))}">
                        </div>
                    </div>
                </div>
            </fieldset>
            <div class="avgp-actions">
                <span class="avgp-status" data-avgp-status></span>
                <button class="cdx-button" type="button" data-avgp-cancel>Cancel</button>
                <button class="cdx-button cdx-button--action-progressive cdx-button--weight-primary" type="button" data-avgp-save>Save</button>
            </div>
        </form>
    `;
}

/**
 * Builds a plain source textarea field.
 *
 * @param {object} config - Field configuration.
 * @param {string} config.id - Textarea ID.
 * @param {string} config.label - Textarea label.
 * @param {string} config.textareaAttributes - Extra textarea attributes.
 * @returns {string} Field HTML.
 */
function buildSourceField({ id, label, textareaAttributes }) {
    return `
        <div class="cdx-field avgp-section avgp-source-field">
            <div class="cdx-label">${buildInputLabel(label, id)}</div>
            <div class="cdx-field__control">
                <div class="cdx-text-area">
                    <textarea class="cdx-text-area__textarea avgp-source-textarea" id="${escapeHtml(id)}" ${textareaAttributes}></textarea>
                </div>
            </div>
        </div>
    `;
}

/**
 * Builds a readonly comparison textarea.
 *
 * @param {object} config - Field configuration.
 * @param {string} config.id - Textarea ID.
 * @param {string} config.label - Textarea label.
 * @param {string} config.textareaAttributes - Extra textarea attributes.
 * @param {string} config.tone - Visual tone.
 * @returns {string} Field HTML.
 */
function buildComparisonField({ id, label, textareaAttributes, tone }) {
    return `
        <div class="avgp-compare-field avgp-compare-field--${escapeHtml(tone)}">
            <div class="cdx-label">${buildInputLabel(label, id)}</div>
            <div class="cdx-text-area">
                <textarea class="cdx-text-area__textarea avgp-compare-textarea" id="${escapeHtml(id)}" ${textareaAttributes}></textarea>
            </div>
        </div>
    `;
}

/**
 * Builds the registration checkbox with status wording.
 *
 * @param {object} state - Dialog state.
 * @param {boolean} checked - Whether registration is checked.
 * @returns {string} Checkbox HTML.
 */
function buildRegistrationCheckbox(state, checked) {
    if (state.registrationLoading) {
        return buildProgressIndicator("Loading new-page-list registration state");
    }

    const disabled =
        state.registrationLoading ||
        !state.registration.eligible || state.registration.alreadyRegistered;
    const label = getRegistrationLabel(
        state.registration,
        state.subjectInfo.creationDate,
    );

    return `
        <div class="cdx-checkbox">
            <div class="cdx-checkbox__wrapper">
                <input id="avgp-register" class="cdx-checkbox__input" type="checkbox" name="register" value="register" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}>
                <span class="cdx-checkbox__icon"></span>
                <div class="cdx-checkbox__label cdx-label">
                    <label class="cdx-label__label" for="avgp-register">
                        <span class="cdx-label__label__text">${escapeHtml(label)}</span>
                    </label>
                </div>
            </div>
        </div>
    `;
}

/**
 * Builds a Codex-style progress indicator.
 *
 * @param {string} label - Loading status label.
 * @returns {string} Progress indicator HTML.
 */
function buildProgressIndicator(label) {
    return `
        <div class="cdx-progress-indicator avgp-register-loading" role="status" aria-live="polite">
            <progress class="cdx-progress-indicator__indicator" aria-label="${escapeHtml(label)}"></progress>
            <span class="cdx-progress-indicator__label">${escapeHtml(label)}</span>
        </div>
    `;
}

/**
 * Gets registration status wording.
 *
 * @param {object} registration - Prepared registration state.
 * @param {Date} creationDate - Subject page creation date.
 * @returns {string} UI label.
 */
function getRegistrationLabel(registration, creationDate) {
    if (registration == null) {
        return "Loading new-page-list registration state";
    }

    const created = `create at ${formatEnglishDate(creationDate)}`;

    if (!registration.eligible) {
        return `Not eligible (${created})`;
    }

    if (registration.existing?.date != null && registration.existing.listedTitle) {
        return `Already registered on ${formatEnglishDate(registration.existing.date)} as "${registration.existing.listedTitle}"`;
    }

    if (registration.alreadyRegistered) {
        return "Already registered in the new-page list";
    }

    return `Register the page (${created})`;
}

/**
 * Loads and prepares new-page-list state after the dialog opens.
 *
 * @param {HTMLDialogElement} dialog - Dialog element.
 * @param {object} state - Dialog state.
 * @returns {Promise<void>} Resolves after state is loaded.
 */
async function loadNewPageListState(dialog, state) {
    logStep("loadNewPageListState start");
    setStatus(dialog, "Loading new-page-list state...", false);
    const newPageList = await fetchNewPageList(state.api);

    logStep("loadNewPageListState fetched list", {
        textLength: newPageList.text.length,
    });
    const creationTimes = await fetchPageCreationTimes(state.api, [
        ...getTitlesForDate(newPageList.text, state.subjectInfo.creationDate),
        state.subjectInfo.listedTitle || state.subjectTitle,
    ]);

    creationTimes.set(
        state.subjectInfo.listedTitle || state.subjectTitle,
        state.subjectInfo.creationDate,
    );
    state.creationTimes = creationTimes;
    state.newPageList = newPageList;
    state.registrationLoading = false;
    prepareRegistration(state);
    refreshRegistrationControls(dialog, state);
    setStatus(dialog, "", false);
    logStep("loadNewPageListState done", {
        creationTimes: [...creationTimes.entries()].map(([title, date]) => [
            title,
            date.toISOString(),
        ]),
        registration: summarizeRegistration(state.registration),
    });
}

/**
 * Refreshes registration checkbox and diff after background loading.
 *
 * @param {HTMLElement} root - Dialog root.
 * @param {object} state - Dialog state.
 * @returns {void}
 */
function refreshRegistrationControls(root, state) {
    const registerDefault = shouldRegisterByDefault(
        mw.config.get("wgNamespaceNumber"),
        state.subjectTitle,
    ) && state.registration.eligible && !state.registration.alreadyRegistered;
    const container = root.querySelector("[data-avgp-register-container]");

    container.innerHTML = buildRegistrationCheckbox(state, registerDefault);
    updateRegistrationPreview(root, state);
}

/**
 * Formats a UTC date for status text.
 *
 * @param {Date} date - Date.
 * @returns {string} Month/day text.
 */
function formatEnglishDate(date) {
    return new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "long",
        timeZone: "UTC",
    }).format(date);
}

/**
 * Prepares registration state.
 *
 * @param {object} state - Dialog state.
 * @returns {void}
 */
function prepareRegistration(state) {
    logStep("prepareRegistration start");
    state.registration = prepareNewPageListRegistration({
        creationDate: state.subjectInfo.creationDate,
        namespaceNumber:
            mw.config.get("wgNamespaceNumber") % 2 === 0
                ? mw.config.get("wgNamespaceNumber")
                : state.subjectInfo.namespaceNumber,
        text: state.newPageList.text,
        title: state.subjectInfo.listedTitle || state.subjectTitle,
        creationTimes: state.creationTimes,
    });
    logStep("prepareRegistration done", summarizeRegistration(state.registration));
}

/**
 * Builds one radio-button section.
 *
 * @param {string} label - Section label.
 * @param {string} name - Input name.
 * @param {Array<string>} values - Option values.
 * @param {string} selected - Selected option.
 * @returns {string} Section HTML.
 */
function buildRadioSection(label, name, values, selected) {
    return `
        <fieldset class="cdx-field avgp-section">
            <legend class="cdx-label">${buildLegendLabel(label)}</legend>
            <div class="cdx-field__control">
                <div class="avgp-button-group">
                    ${values.map((value) => buildRadio(name, value, selected)).join("")}
                </div>
            </div>
        </fieldset>
    `;
}

/**
 * Builds one radio option.
 *
 * @param {string} name - Input name.
 * @param {string} value - Option value.
 * @param {string} selected - Selected value.
 * @returns {string} Option HTML.
 */
function buildRadio(name, value, selected) {
    const label = value === "" ? "(Empty)" : value;
    const id = buildInputId(name, value || "empty");

    return `
        <div class="cdx-radio">
            <div class="cdx-radio__wrapper">
                <input id="${id}" class="cdx-radio__input" type="radio" name="${escapeHtml(name)}" value="${escapeHtml(value)}" ${value === selected ? "checked" : ""}>
                <span class="cdx-radio__icon"></span>
                <label class="cdx-radio__label" for="${id}">${escapeHtml(label)}</label>
            </div>
        </div>
    `;
}

/**
 * Builds task-force checkboxes.
 *
 * @returns {string} Section HTML.
 */
function buildTaskForceSection() {
    return buildCheckboxSection(
        "Task forces of WPVG",
        "taskForce",
        PROJECT_CONFIG.videoGames.taskForces,
    );
}

/**
 * Builds maintenance checkboxes.
 *
 * @returns {string} Section HTML.
 */
function buildMaintenanceSection() {
    return buildCheckboxSection(
        "Maintenance",
        "maintenance",
        MAINTENANCE_ITEMS,
    );
}

/**
 * Builds other-project checkboxes.
 *
 * @returns {string} Section HTML.
 */
function buildOtherProjectSection() {
    return buildCheckboxSection(
        "Other WikiProjects",
        "otherProject",
        PROJECT_CONFIG.otherProjects,
    );
}

/**
 * Builds a checkbox section.
 *
 * @param {string} label - Section label.
 * @param {string} name - Input name.
 * @param {Array<object>} items - Configured checkbox items.
 * @returns {string} Section HTML.
 */
function buildCheckboxSection(label, name, items) {
    return `
        <fieldset class="cdx-field avgp-section">
            <legend class="cdx-label">${buildLegendLabel(label)}</legend>
            <div class="cdx-field__control">
                <div class="avgp-check-grid">
                    ${items.map((item) => buildCheckbox(name, item)).join("")}
                </div>
            </div>
        </fieldset>
    `;
}

/**
 * Builds one checkbox.
 *
 * @param {string} name - Input name.
 * @param {object} item - Checkbox item.
 * @param {boolean} [checked] - Whether the checkbox is initially checked.
 * @returns {string} Checkbox HTML.
 */
function buildCheckbox(name, item, checked = false) {
    const id = buildInputId(name, item.id);

    return `
        <div class="cdx-checkbox cdx-checkbox--inline">
            <div class="cdx-checkbox__wrapper">
                <input id="${id}" class="cdx-checkbox__input" type="checkbox" name="${escapeHtml(name)}" value="${escapeHtml(item.id)}" ${checked ? "checked" : ""}>
                <span class="cdx-checkbox__icon"></span>
                <div class="cdx-checkbox__label cdx-label">
                    <label class="cdx-label__label" for="${id}">
                        <span class="cdx-label__label__text">${escapeHtml(item.label)}</span>
                    </label>
                </div>
            </div>
        </div>
    `;
}

/**
 * Binds dialog input and action events.
 *
 * @param {HTMLDialogElement} dialog - Dialog element.
 * @param {object} state - Dialog state.
 * @returns {void}
 */
function bindDialogEvents(dialog, state) {
    dialog.addEventListener("change", () => {
        logStep("dialog change");
        readAssessment(dialog, state.assessment);
        updateAssessmentPreview(dialog, state);
        updateTalkDiff(dialog, state);
        updateAssessmentSummary(dialog, state);
        updateRegistrationPreview(dialog, state);
    });
    dialog
        .querySelector("[data-avgp-preview]")
        .addEventListener("input", () => {
            logStep("lead source edited");
            state.previewDirty = true;
            updateTalkDiff(dialog, state);
        });
    dialog.querySelector("[name='summary']").addEventListener("input", () => {
        logStep("assessment summary edited");
        state.summaryDirty = true;
    });
    dialog
        .querySelector("[data-avgp-cancel]")
        .addEventListener("click", () => {
            logStep("dialog cancelled");
            dialog.close();
            dialog.remove();
        });
    dialog.querySelector("[data-avgp-save]").addEventListener("click", () => {
        logStep("save button clicked");
        saveDialog(dialog, state).catch((error) => {
            logStep("saveDialog failed", { error });
            setStatus(dialog, error.message || String(error), true);
        });
    });
}

/**
 * Reads form values into assessment state.
 *
 * @param {HTMLElement} root - Dialog root.
 * @param {object} assessment - Mutable assessment data.
 * @returns {void}
 */
function readAssessment(root, assessment) {
    assessment.className = root.querySelector(
        "[name='className']:checked",
    ).value;
    assessment.importance = root.querySelector(
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
 * @param {HTMLElement} root - Dialog root.
 * @param {string} name - Checkbox input name.
 * @returns {object} Checked ID map.
 */
function readCheckedMap(root, name) {
    return Object.fromEntries(
        [...root.querySelectorAll(`[name='${name}']`)].map((input) => [
            input.value,
            input.checked,
        ]),
    );
}

/**
 * Updates the preview pane.
 *
 * @param {HTMLElement} root - Dialog root.
 * @param {object} state - Dialog state.
 * @returns {void}
 */
function updateAssessmentPreview(root, state) {
    if (state.previewDirty) {
        logStep("updateAssessmentPreview skipped: dirty");
        return;
    }

    root.querySelector("[data-avgp-preview]").value =
        previewTalkPageTopSection(
            state.pageText,
            state.assessment,
            PROJECT_CONFIG,
        );
    logStep("updateAssessmentPreview done", {
        length: root.querySelector("[data-avgp-preview]").value.length,
    });
}

/**
 * Updates the current talk-page lead-section pane.
 *
 * @param {HTMLElement} root - Dialog root.
 * @param {object} state - Dialog state.
 * @returns {void}
 */
function updateTalkDiff(root, state) {
    root.querySelector("[data-avgp-current-source]").value =
        getTalkPageTopSection(state.pageText);
    logStep("updateTalkDiff done", {
        length: root.querySelector("[data-avgp-current-source]").value.length,
    });
}

/**
 * Updates the new-page-list preview.
 *
 * @param {HTMLElement} root - Dialog root.
 * @param {object} state - Dialog state.
 * @returns {void}
 */
function updateRegistrationPreview(root, state) {
    const checkbox = root.querySelector("[name='register']");
    const shouldRegister = checkbox?.checked && !checkbox.disabled;
    const canPreview =
        !state.registrationLoading &&
        state.registration?.eligible &&
        !state.registration.alreadyRegistered;
    const previewRoot = root.querySelector("[data-avgp-list-preview]");
    const summaryRoot = root.querySelector(".avgp-list-summary");

    previewRoot.hidden = !canPreview;
    summaryRoot.hidden = !canPreview;

    if (!canPreview) {
        updateComparisonTextarea(root, "[data-avgp-list-before]", "");
        updateComparisonTextarea(root, "[data-avgp-list-after]", "");
        logStep("updateRegistrationPreview hidden", {
            registration: summarizeRegistration(state.registration),
        });
        return;
    }

    const comparison =
        shouldRegister && state.registration.changed
            ? buildLineComparison(
                  state.newPageList.text,
                  state.registration.proposedText,
                  1,
              )
            : { after: "No changes.", before: "No changes." };
    updateComparisonTextarea(root, "[data-avgp-list-before]", comparison.before);
    updateComparisonTextarea(root, "[data-avgp-list-after]", comparison.after);
    logStep("updateRegistrationPreview done", {
        afterLength: root.querySelector("[data-avgp-list-after]").value.length,
        beforeLength: root.querySelector("[data-avgp-list-before]").value.length,
        shouldRegister,
    });
}

/**
 * Updates the edit summary while it has not been manually edited.
 *
 * @param {HTMLElement} root - Dialog root.
 * @param {object} state - Dialog state.
 * @returns {void}
 */
function updateAssessmentSummary(root, state) {
    if (state.summaryDirty) {
        logStep("updateAssessmentSummary skipped: dirty");
        return;
    }

    root.querySelector("[name='summary']").value = buildEditSummary(
        state.assessment,
    );
    logStep("updateAssessmentSummary done", {
        summary: root.querySelector("[name='summary']").value,
    });
}

/**
 * Builds the default edit summary for the selected assessment.
 *
 * @param {object} assessment - Selected assessment values.
 * @returns {string} Edit summary.
 */
function buildEditSummary(assessment) {
    const banners = [
        buildVideoGamesSummary(assessment),
        ...getSelectedLabels(
            PROJECT_CONFIG.otherProjects,
            assessment.otherProjects,
        ),
    ];
    const className = `${assessment.className || "Unassessed"}-Class`;
    const summary =
        banners.length === 0
            ? "Tag project banners"
            : `Tag project banners (${className}): ${banners.join(", ")}`;

    return appendSummarySourceLink(summary);
}

/**
 * Builds the Video games summary fragment.
 *
 * @param {object} assessment - Selected assessment values.
 * @returns {string} Video games summary fragment.
 */
function buildVideoGamesSummary(assessment) {
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

    return details.length === 0
        ? "Video games"
        : `Video games (${details.join("; ")})`;
}

/**
 * Gets selected item labels.
 *
 * @param {Array<object>} items - Configured item list.
 * @param {object} selectedMap - Selected item map.
 * @returns {Array<string>} Selected labels.
 */
function getSelectedLabels(items, selectedMap) {
    return items
        .filter((item) => selectedMap?.[item.id])
        .map((item) => item.label);
}

/**
 * Saves talk assessment and optional list registration.
 *
 * @param {HTMLDialogElement} dialog - Dialog element.
 * @param {object} state - Dialog state.
 * @returns {Promise<void>} Resolves after saving.
 */
async function saveDialog(dialog, state) {
    logStep("saveDialog start");
    const registerInput = dialog.querySelector("[name='register']");
    const shouldRegister = registerInput.checked && !registerInput.disabled;
    const previewText = dialog.querySelector("[data-avgp-preview]").value;
    const summary = dialog.querySelector("[name='summary']").value.trim();
    const listSummary = dialog.querySelector("[name='listSummary']").value.trim();

    readAssessment(dialog, state.assessment);
    logStep("saveDialog options", {
        listSummary,
        previewLength: previewText.length,
        registration: summarizeRegistration(state.registration),
        shouldRegister,
        summary,
    });

    if (shouldRegister && state.registration.changed) {
        setStatus(dialog, "Updating new-page list...", false);
        logStep("saveDialog saving new-page list");
        await savePreparedNewPageList(
            state.api,
            state.newPageList,
            state.registration.proposedText,
            listSummary ||
                buildNewPageListSummary(
                    state.subjectInfo.listedTitle || state.subjectTitle,
                    state.subjectInfo.creationDate,
                ),
        );
    }

    if (
        isEmptyImportanceOnlyChange(
            getTalkPageTopSection(state.pageText),
            previewText,
        )
    ) {
        logStep("saveDialog skipping talk save: empty importance only");
        setStatus(dialog, "Skipped unchanged assessment.", false);
        setTimeout(() => {
            dialog.close();
            dialog.remove();
        }, 600);
        return;
    }

    setStatus(dialog, "Saving talk page...", false);
    logStep("saveDialog saving talk page");
    await saveTalkAssessment(
        state.api,
        state.talkTitle,
        previewText,
        PROJECT_CONFIG,
        summary || DEFAULT_EDIT_SUMMARY,
    );

    setStatus(dialog, "Saved.", false);
    logStep("saveDialog done");
    setTimeout(() => {
        dialog.close();
        dialog.remove();
    }, 600);
}

/**
 * Builds one field label for a fieldset legend.
 *
 * @param {string} label - Field label text.
 * @returns {string} Field label HTML.
 */
function buildLegendLabel(label) {
    return `
        <span class="avgp-label-text">${escapeHtml(label)}</span>
    `;
}

/**
 * Builds one field label for an input.
 *
 * @param {string} label - Field label text.
 * @param {string} id - Input ID.
 * @returns {string} Field label HTML.
 */
function buildInputLabel(label, id) {
    return `
        <label class="avgp-label-text" for="${id}">${escapeHtml(label)}</label>
    `;
}

/**
 * Builds one field label without an associated form control.
 *
 * @param {string} label - Label text.
 * @returns {string} Label HTML.
 */
function buildPlainLabel(label) {
    return `
        <span class="avgp-label-text">${escapeHtml(label)}</span>
    `;
}

/**
 * Builds a stable input ID.
 *
 * @param {string} name - Input group name.
 * @param {string} value - Input value.
 * @returns {string} Input ID.
 */
function buildInputId(name, value) {
    return `avgp-${name}-${String(value || "")
        .replace(/[^a-z0-9]+/giu, "-")
        .replace(/^-|-$/gu, "")
        .toLowerCase()}`;
}

/**
 * Appends the source-code marker to an edit summary.
 *
 * @param {string} summary - Base edit summary.
 * @returns {string} Summary with source marker.
 */
function appendSummarySourceLink(summary) {
    const value = String(summary || "").trim();

    return value.includes(SUMMARY_SOURCE_LINK)
        ? value
        : `${value} ${SUMMARY_SOURCE_LINK}`.trim();
}

/**
 * Updates a comparison textarea value.
 *
 * @param {HTMLElement} root - Dialog root.
 * @param {string} selector - Textarea selector.
 * @param {string} value - Textarea value.
 * @returns {void}
 */
function updateComparisonTextarea(root, selector, value) {
    const textarea = root.querySelector(selector);

    if (textarea != null) {
        textarea.value = String(value || "");
    }
}

/**
 * Shows dialog status text.
 *
 * @param {HTMLElement} root - Dialog root.
 * @param {string} text - Status text.
 * @param {boolean} isError - Whether the status is an error.
 * @returns {void}
 */
function setStatus(root, text, isError) {
    const status = root.querySelector("[data-avgp-status]");

    status.textContent = text;
    status.classList.toggle("avgp-status--error", isError);
    status.dataset.status = isError ? "error" : "default";
    logStep("status updated", { isError, text });
}

/**
 * Adds dialog styles to the page once.
 *
 * @returns {void}
 */
function addStyles() {
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
 * @param {object} registration - Registration state.
 * @returns {object} Log-safe summary.
 */
function summarizeRegistration(registration) {
    return {
        alreadyRegistered: registration?.alreadyRegistered,
        changed: registration?.changed,
        earliestDate: registration?.earliestDate?.toISOString?.(),
        eligible: registration?.eligible,
        existing: registration?.existing,
        proposedLength: registration?.proposedText?.length,
    };
}

/**
 * Escapes user-visible HTML text.
 *
 * @param {string} value - Raw value.
 * @returns {string} Escaped text.
 */
function escapeHtml(value) {
    const element = document.createElement("span");

    element.textContent = String(value || "");

    return element.innerHTML;
}

mw.loader.using(
    ["codex-styles", "mediawiki.api", "mediawiki.Title", "mediawiki.util"],
    init,
);
