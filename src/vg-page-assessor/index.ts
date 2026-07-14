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
} from "./assessment.ts";
import {
    fetchPageCreationTimes,
    fetchSubjectPageInfo,
    fetchPageText,
    saveTalkAssessment,
} from "./api.ts";
import {
    buildLineComparison,
    buildNewPageListSummary,
    fetchNewPageList,
    getTitlesForDate,
    prepareNewPageListRegistration,
    savePreparedNewPageList,
} from "./new-page-list.ts";
import { logStep } from "./logger.ts";
import projectConfig from "./data.ts";

const PROJECT_CONFIG = projectConfig;
const DIALOG_CSS = __ASSESS_VG_PAGE_DIALOG_CSS__;
const SUMMARY_SOURCE_LINK = [
    "[[:m:User:For Each ... Next/global",
    ".js/vg page assessor.js|🍄]]",
].join("");
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
    mw.util
        .addPortletLink("p-tb", "#", "VG Page Assessor", "t-assess-vg-page")
        ?.addEventListener("click", function callback(event) {
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
    loadNewPageListState(dialog, dialog.avgpState).catch(
        function callback(error) {
            logStep("loadNewPageListState failed", { error });
            setStatus(dialog, error.message || String(error), true);
        },
    );
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
 * @param state - Dialog state.
 * @param registerDefault - Initial register checkbox state.
 * @returns Dialog HTML.
 */
function buildDialogHtml(state: any, registerDefault: boolean): string {
    return [
        '\n        <form method="dialog" ',
        'class="avgp-shell cdx-docs">\n  ',
        '          <header class="avgp-hea',
        'der">\n                <h2 class=',
        '"avgp-heading cdx-title">',
        escapeHtml(state.subjectTitle),
        "</h2>\n            </header>\n    ",
        '        <fieldset class="avgp-fie',
        'ldset">\n                <legend ',
        'class="avgp-fieldset-title">Asse',
        "ssment</legend>\n                <",
        'div class="avgp-assessment-grid"',
        ">\n                    <section cl",
        'ass="avgp-controls" aria-label=',
        '"Assessment controls">\n        ',
        "                ",
        buildRadioSection("Class", "className", CLASS_VALUES, "Unassessed"),
        "\n                        ",
        buildRadioSection("Importance", "importance", IMPORTANCE_VALUES, ""),
        "\n                        ",
        buildTaskForceSection(),
        "\n                        ",
        buildMaintenanceSection(),
        "\n                        ",
        buildOtherProjectSection(),
        "\n                    </section>\n",
        "                    <section class",
        '="avgp-source" aria-label="Talk',
        ' page lead-section preview">\n   ',
        "                     ",
        buildSourceField({
            id: "avgp-preview-source",
            label: "Ready-to-save lead-section source",
            textareaAttributes: "data-avgp-preview",
        }),
        "\n                        ",
        buildSourceField({
            id: "avgp-current-source",
            label: "Current lead-section source",
            textareaAttributes: "data-avgp-current-source readonly",
        }),
        "\n                    </section>\n",
        "                </div>\n          ",
        '      <div class="avgp-summary cd',
        'x-field">\n                    <d',
        'iv class="cdx-label">',
        buildInputLabel("Edit summary", "avgp-edit-summary"),
        "</div>\n                    <div c",
        'lass="cdx-field__control">\n    ',
        '                    <div class="c',
        'dx-text-input">\n                ',
        '            <input class="cdx-tex',
        't-input__input" id="avgp-edit-su',
        'mmary" name="summary" type="te',
        'xt" value="',
        escapeHtml(buildEditSummary(state.assessment)),
        '">\n                        </div',
        ">\n                    </div>\n   ",
        "             </div>\n            <",
        "/fieldset>\n            <fieldset ",
        'class="avgp-fieldset">\n        ',
        '        <legend class="avgp-field',
        'set-title">New-page list</legend>',
        '\n                <div class="cdx',
        '-field avgp-section">\n          ',
        '          <div class="cdx-field__',
        'control">\n                      ',
        "  <div data-avgp-register-containe",
        "r>\n                            ",
        buildRegistrationCheckbox(state, registerDefault),
        "\n                        </div>\n",
        "                    </div>\n      ",
        "          </div>\n                ",
        '<div class="cdx-field avgp-sectio',
        'n avgp-list-preview" data-avgp-li',
        "st-preview hidden>\n              ",
        '      <div class="cdx-field__cont',
        'rol">\n                        <d',
        'iv class="avgp-compare-grid">\n ',
        "                           ",
        buildComparisonField({
            id: "avgp-list-before",
            label: "Before",
            textareaAttributes: "data-avgp-list-before readonly",
            tone: "removed",
        }),
        "\n                            ",
        buildComparisonField({
            id: "avgp-list-after",
            label: "After",
            textareaAttributes: "data-avgp-list-after readonly",
            tone: "added",
        }),
        "\n                        </div>\n",
        "                    </div>\n      ",
        "          </div>\n                ",
        '<div class="avgp-list-summary cdx',
        '-field">\n                    <di',
        'v class="cdx-label">',
        buildInputLabel("Edit summary", "avgp-list-summary"),
        "</div>\n                    <div c",
        'lass="cdx-field__control">\n    ',
        '                    <div class="c',
        'dx-text-input">\n                ',
        '            <input class="cdx-tex',
        't-input__input" id="avgp-list-su',
        'mmary" name="listSummary" type=',
        '"text" value="',
        escapeHtml(
            buildNewPageListSummary(
                state.subjectInfo.listedTitle || state.subjectTitle,
                state.subjectInfo.creationDate,
            ),
        ),
        '">\n                        </div',
        ">\n                    </div>\n   ",
        "             </div>\n            <",
        "/fieldset>\n            <div class",
        '="avgp-actions">\n              ',
        '  <span class="avgp-status" data',
        "-avgp-status></span>\n            ",
        '    <button class="cdx-button" t',
        'ype="button" data-avgp-cancel>Ca',
        "ncel</button>\n                <bu",
        'tton class="cdx-button cdx-button',
        "--action-progressive cdx-button--w",
        'eight-primary" type="button" da',
        "ta-avgp-save>Save</button>\n      ",
        "      </div>\n        </form>\n   ",
        " ",
    ].join("");
}


/**
 * Builds a plain source textarea field.
 *
 * @param config - Field configuration.
 * @param config.id - Textarea ID.
 * @param config.label - Textarea label.
 * @param config.textareaAttributes - Extra textarea
 * attributes.
 * @returns Field HTML.
 */
function buildSourceField({ id, label, textareaAttributes }): string {
    return [
        '\n        <div class="cdx-field a',
        'vgp-section avgp-source-field">\n',
        '            <div class="cdx-label',
        '">',
        buildInputLabel(label, id),
        '</div>\n            <div class="c',
        'dx-field__control">\n            ',
        '    <div class="cdx-text-area">',
        "\n                    <textarea cl",
        'ass="cdx-text-area__textarea avgp',
        '-source-textarea" id="',
        escapeHtml(id),
        '" ',
        textareaAttributes,
        "></textarea>\n                </di",
        "v>\n            </div>\n        </",
        "div>\n    ",
    ].join("");
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
 * @returns Field HTML.
 */
function buildComparisonField({
    id,
    label,
    textareaAttributes,
    tone,
}): string {
    return [
        '\n        <div class="avgp-compar',
        "e-field avgp-compare-field--",
        escapeHtml(tone),
        '">\n            <div class="cdx-',
        'label">',
        buildInputLabel(label, id),
        '</div>\n            <div class="c',
        'dx-text-area">\n                <',
        'textarea class="cdx-text-area__te',
        'xtarea avgp-compare-textarea" id=',
        '"',
        escapeHtml(id),
        '" ',
        textareaAttributes,
        "></textarea>\n            </div>\n",
        "        </div>\n    ",
    ].join("");
}


/**
 * Builds the registration checkbox with status wording.
 *
 * @param state - Dialog state.
 * @param checked - Whether registration is checked.
 * @returns Checkbox HTML.
 */
function buildRegistrationCheckbox(state: any, checked: boolean): string {
    if (state.registrationLoading) {
        return buildProgressIndicator(
            "Loading new-page-list registration state",
        );
    }

    const disabled =
        state.registrationLoading ||
        !state.registration.eligible ||
        state.registration.alreadyRegistered;
    const label = getRegistrationLabel(
        state.registration,
        state.subjectInfo.creationDate,
    );

    return [
        '\n        <div class="cdx-checkbo',
        'x">\n            <div class="cdx',
        '-checkbox__wrapper">\n           ',
        '     <input id="avgp-register" c',
        'lass="cdx-checkbox__input" type=',
        '"checkbox" name="register" val',
        'ue="register" ',
        checked ? "checked" : "",
        " ",
        disabled ? "disabled" : "",
        '>\n                <span class="c',
        'dx-checkbox__icon"></span>\n     ',
        '           <div class="cdx-checkb',
        'ox__label cdx-label">\n          ',
        '          <label class="cdx-label',
        '__label" for="avgp-register">\n',
        "                        <span clas",
        's="cdx-label__label__text">',
        escapeHtml(label),
        "</span>\n                    </lab",
        "el>\n                </div>\n     ",
        "       </div>\n        </div>\n   ",
        " ",
    ].join("");
}


/**
 * Builds a Codex-style progress indicator.
 *
 * @param label - Loading status label.
 * @returns Progress indicator HTML.
 */
function buildProgressIndicator(label: string): string {
    return [
        '\n        <div class="cdx-progres',
        "s-indicator avgp-register-loading",
        '" role="status" aria-live="pol',
        'ite">\n            <progress clas',
        's="cdx-progress-indicator__indica',
        'tor" aria-label="',
        escapeHtml(label),
        '"></progress>\n            <span ',
        'class="cdx-progress-indicator__la',
        'bel">',
        escapeHtml(label),
        "</span>\n        </div>\n    ",
    ].join("");
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
        return "Loading new-page-list registration state";
    }

    const created = `create at ${formatEnglishDate(creationDate)}`;

    if (!registration.eligible) {
        return `Not eligible (${created})`;
    }

    if (
        registration.existing?.date != null &&
        registration.existing.listedTitle
    ) {
        return [
            "Already registered on ",
            formatEnglishDate(registration.existing.date),
            ' as "',
            registration.existing.listedTitle,
            '"',
        ].join("");
    }

    if (registration.alreadyRegistered) {
        return "Already registered in the new-page list";
    }

    return `Register the page (${created})`;
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
        creationTimes: [...creationTimes.entries()].map(function callback([
            title,
            date,
        ]) {
            return [title, date.toISOString()];
        }),
        registration: summarizeRegistration(state.registration),
    });
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

    container.innerHTML = buildRegistrationCheckbox(state, registerDefault);
    updateRegistrationPreview(root, state);
}


/**
 * Formats a UTC date for status text.
 *
 * @param date - Date.
 * @returns Month/day text.
 */
function formatEnglishDate(date: Date): string {
    return new Intl.DateTimeFormat("en", {
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
 * @returns Section HTML.
 */
function buildRadioSection(
    label: string,
    name: string,
    values: Array<string>,
    selected: string,
): string {
    return [
        '\n        <fieldset class="cdx-fi',
        'eld avgp-section">\n            <',
        'legend class="cdx-label">',
        buildLegendLabel(label),
        "</legend>\n            <div class=",
        '"cdx-field__control">\n         ',
        '       <div class="avgp-button-gr',
        'oup">\n                    ',
        values.map((value) => buildRadio(name, value, selected)).join(""),
        "\n                </div>\n        ",
        "    </div>\n        </fieldset>\n ",
        "   ",
    ].join("");
}


/**
 * Builds one radio option.
 *
 * @param name - Input name.
 * @param value - Option value.
 * @param selected - Selected value.
 * @returns Option HTML.
 */
function buildRadio(name: string, value: string, selected: string): string {
    const label = value === "" ? "(Empty)" : value;
    const id = buildInputId(name, value || "empty");

    return [
        '\n        <div class="cdx-radio"',
        '>\n            <div class="cdx-ra',
        'dio__wrapper">\n                <',
        'input id="',
        id,
        '" class="cdx-radio__input" type',
        '="radio" name="',
        escapeHtml(name),
        '" value="',
        escapeHtml(value),
        '" ',
        value === selected ? "checked" : "",
        '>\n                <span class="c',
        'dx-radio__icon"></span>\n        ',
        '        <label class="cdx-radio__',
        'label" for="',
        id,
        '">',
        escapeHtml(label),
        "</label>\n            </div>\n    ",
        "    </div>\n    ",
    ].join("");
}


/**
 * Builds task-force checkboxes.
 *
 * @returns Section HTML.
 */
function buildTaskForceSection(): string {
    return buildCheckboxSection(
        "Task forces of WPVG",
        "taskForce",
        PROJECT_CONFIG.videoGames.taskForces,
    );
}


/**
 * Builds maintenance checkboxes.
 *
 * @returns Section HTML.
 */
function buildMaintenanceSection(): string {
    return buildCheckboxSection(
        "Maintenance",
        "maintenance",
        MAINTENANCE_ITEMS,
    );
}


/**
 * Builds other-project checkboxes.
 *
 * @returns Section HTML.
 */
function buildOtherProjectSection(): string {
    return buildCheckboxSection(
        "Other WikiProjects",
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
): string {
    return [
        '\n        <fieldset class="cdx-fi',
        'eld avgp-section">\n            <',
        'legend class="cdx-label">',
        buildLegendLabel(label),
        "</legend>\n            <div class=",
        '"cdx-field__control">\n         ',
        '       <div class="avgp-check-gri',
        'd">\n                    ',
        items.map((item) => buildCheckbox(name, item)).join(""),
        "\n                </div>\n        ",
        "    </div>\n        </fieldset>\n ",
        "   ",
    ].join("");
}


/**
 * Builds one checkbox.
 *
 * @param name - Input name.
 * @param item - Checkbox item.
 * @param checked - Whether the checkbox is initially
 * checked.
 * @returns Checkbox HTML.
 */
function buildCheckbox(
    name: string,
    item: any,
    checked: boolean = false,
): string {
    const id = buildInputId(name, item.id);

    return [
        '\n        <div class="cdx-checkbo',
        'x cdx-checkbox--inline">\n       ',
        '     <div class="cdx-checkbox__wr',
        'apper">\n                <input i',
        'd="',
        id,
        '" class="cdx-checkbox__input" t',
        'ype="checkbox" name="',
        escapeHtml(name),
        '" value="',
        escapeHtml(item.id),
        '" ',
        checked ? "checked" : "",
        '>\n                <span class="c',
        'dx-checkbox__icon"></span>\n     ',
        '           <div class="cdx-checkb',
        'ox__label cdx-label">\n          ',
        '          <label class="cdx-label',
        '__label" for="',
        id,
        '">\n                        <span',
        ' class="cdx-label__label__text">',
        escapeHtml(item.label),
        "</span>\n                    </lab",
        "el>\n                </div>\n     ",
        "       </div>\n        </div>\n   ",
        " ",
    ].join("");
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
    dialog
        .querySelector("[data-avgp-cancel]")
        .addEventListener("click", function callback() {
            logStep("dialog cancelled");
            dialog.close();
            dialog.remove();
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
    const shouldRegister = checkbox?.checked && !checkbox.disabled;
    const canPreview =
        !state.registrationLoading &&
        state.registration?.eligible &&
        !state.registration.alreadyRegistered;
    const previewRoot = root.querySelector<HTMLElement>(
        "[data-avgp-list-preview]",
    );
    const summaryRoot = root.querySelector<HTMLElement>(".avgp-list-summary");

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

    const comparison = selectValue(
        shouldRegister && state.registration.changed,
        function trueBranch() {
            return buildLineComparison(
                state.newPageList.text,
                state.registration.proposedText,
                1,
            );
        },
        function falseBranch() {
            return { after: "No changes.", before: "No changes." };
        },
    );
    updateComparisonTextarea(
        root,
        "[data-avgp-list-before]",
        comparison.before,
    );
    updateComparisonTextarea(root, "[data-avgp-list-after]", comparison.after);
    logStep("updateRegistrationPreview done", {
        afterLength: root.querySelector<HTMLTextAreaElement>(
            "[data-avgp-list-after]",
        ).value.length,
        beforeLength: root.querySelector<HTMLTextAreaElement>(
            "[data-avgp-list-before]",
        ).value.length,
        shouldRegister,
    });
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
    const registerInput =
        dialog.querySelector<HTMLInputElement>("[name='register']");
    const shouldRegister = registerInput.checked && !registerInput.disabled;
    const previewText = dialog.querySelector<HTMLTextAreaElement>(
        "[data-avgp-preview]",
    ).value;
    const summary = dialog
        .querySelector<HTMLInputElement>("[name='summary']")
        .value.trim();
    const listSummary = dialog
        .querySelector<HTMLInputElement>("[name='listSummary']")
        .value.trim();

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
        setTimeout(function callback() {
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
    setTimeout(function callback() {
        dialog.close();
        dialog.remove();
    }, 600);
}


/**
 * Builds one field label for a fieldset legend.
 *
 * @param label - Field label text.
 * @returns Field label HTML.
 */
function buildLegendLabel(label: string): string {
    return [
        '\n        <span class="avgp-label',
        '-text">',
        escapeHtml(label),
        "</span>\n    ",
    ].join("");
}


/**
 * Builds one field label for an input.
 *
 * @param label - Field label text.
 * @param id - Input ID.
 * @returns Field label HTML.
 */
function buildInputLabel(label: string, id: string): string {
    return [
        '\n        <label class="avgp-labe',
        'l-text" for="',
        id,
        '">',
        escapeHtml(label),
        "</label>\n    ",
    ].join("");
}


/**
 * Builds one field label without an associated form control.
 *
 * @param label - Label text.
 * @returns Label HTML.
 */
function buildPlainLabel(label: string): string {
    return [
        '\n        <span class="avgp-label',
        '-text">',
        escapeHtml(label),
        "</span>\n    ",
    ].join("");
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


/**
 * Escapes user-visible HTML text.
 *
 * @param value - Raw value.
 * @returns Escaped text.
 */
function escapeHtml(value: string): string {
    const element = document.createElement("span");

    element.textContent = String(value || "");

    return element.innerHTML;
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
