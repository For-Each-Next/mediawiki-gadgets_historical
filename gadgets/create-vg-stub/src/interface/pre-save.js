/* eslint-disable */

/**
 * Builds the pre-save review dialog UI.
 */

import { trimFieldValue } from "../shared/form-values.js";
import {
    createActionFooterTemplate,
    createButtonTemplate,
    createElement,
    createMessageTemplate,
    createText,
} from "./template.js";

/**
 * Groups pre-save fixes by the page they will edit.
 *
 * @param {Array<object>} actions - Prepared pre-save action rows.
 * @param {object} form - Dialog form state.
 * @returns {Array<object>} Page-grouped pre-save rows.
 */
export function createPreSaveGroups(actions, form) {
    const groups = [];
    const byTitle = new Map();
    const actionRows = Array.isArray(actions) ? actions : [];

    for (const action of actionRows) {
        if (action?.selected === false) {
            continue;
        }

        const title = getPreSaveActionPageTitle(action);

        if (title === "") {
            continue;
        }

        const group = getPreSaveGroup(title);

        group.rows.push({
            action,
            key: action.id,
            label: getPreSaveActionDisplayLabel(action),
            type: "action",
        });

        for (const note of getPreSaveActionNotes(action)) {
            group.rows.push({
                action,
                key: `${action.id}:${note.key}`,
                label: note.label,
                type: "bundled-action",
            });
        }
    }

    const articleTitle = getPreSaveRegistrationArticleTitle(actionRows);

    if (articleTitle !== "" && form?.registerNewPage !== false) {
        getPreSaveGroup(articleTitle).rows.push({
            key: "register-new-page",
            label: "Register on WikiProject new-page list",
            type: "registration",
        });
    }

    for (const action of actionRows.filter(isCompanyCategoryPreSaveAction)) {
        if (action?.selected === false || form?.registerNewPage === false) {
            continue;
        }

        const title = getPreSaveActionPageTitle(action);

        if (title === "") {
            continue;
        }

        getPreSaveGroup(title).rows.push({
            key: `${action.id}:register-new-page`,
            label: "Register on WikiProject new-page list",
            type: "registration",
        });
    }

    return groups
        .filter((group) => group.rows.length > 0)
        .map(movePreSaveWikidataRowsLast);

    function getPreSaveGroup(title) {
        const normalizedTitle = trimFieldValue(title);

        if (!byTitle.has(normalizedTitle)) {
            const group = {
                key: normalizedTitle,
                title: normalizedTitle,
                rows: [],
            };

            byTitle.set(normalizedTitle, group);
            groups.push(group);
        }

        return byTitle.get(normalizedTitle);
    }
}

/**
 * Gets the display page title for a pre-save action.
 *
 * @param {object} action - Pre-save action row.
 * @returns {string} Page title.
 */
function getPreSaveActionPageTitle(action) {
    return trimFieldValue(
        action?.pageTitle ||
            action?.redirectTitle ||
            (action?.type === "category" ? `Category:${action.category}` : ""),
    );
}

/**
 * Gets the short display label for a pre-save action.
 *
 * @param {object} action - Pre-save action row.
 * @returns {string} Display label.
 */
function getPreSaveActionDisplayLabel(action) {
    return (
        trimFieldValue(action?.displayLabel) || trimFieldValue(action?.label)
    );
}

/**
 * Gets non-selectable notes for bundled work inside a pre-save action.
 *
 * @param {object} action - Pre-save action row.
 * @returns {Array<object>} Display notes.
 */
function getPreSaveActionNotes(action) {
    if (action?.type !== "category" || trimFieldValue(action.company) === "") {
        return [];
    }

    const category = trimFieldValue(action.category);
    const notes = [
        {
            key: "talk-banner",
            label: `Tag banner on [[Category talk:${category}]]`,
        },
    ];

    const wikidataId = trimFieldValue(action.wikidataId);

    if (wikidataId !== "") {
        notes.push({
            key: "wikidata",
            label: `Connect to [[d:${wikidataId}]]`,
        });
    } else if (trimFieldValue(action.englishName) !== "") {
        notes.push({
            key: "wikidata",
            label: "Connect matching Wikidata category item",
        });
    }

    return notes;
}

/**
 * Moves Wikidata rows to the end of one pre-save group.
 *
 * @param {object} group - Pre-save group.
 * @returns {object} Group with reordered rows.
 */
function movePreSaveWikidataRowsLast(group) {
    const rows = Array.isArray(group?.rows) ? group.rows : [];
    const wikidataRows = rows.filter(isPreSaveWikidataRow);
    const otherRows = rows.filter((row) => !isPreSaveWikidataRow(row));

    return {
        ...group,
        rows: [...otherRows, ...wikidataRows],
    };
}

/**
 * Checks whether a pre-save row updates Wikidata.
 *
 * @param {object} row - Pre-save row.
 * @returns {boolean} Whether the row is a Wikidata row.
 */
function isPreSaveWikidataRow(row) {
    const key = trimFieldValue(row?.key);

    return key === "interwiki" || key.endsWith(":wikidata");
}

/**
 * Serializes pre-save groups for progress display.
 *
 * @param {Array<object>} groups - Pre-save checkbox groups.
 * @returns {Array<object>} Serializable progress groups.
 */
export function serializePreSaveProgressGroups(groups) {
    return (Array.isArray(groups) ? groups : []).map((group) => ({
        key: trimFieldValue(group?.key),
        rows: (Array.isArray(group?.rows) ? group.rows : []).map((row) => ({
            key: trimFieldValue(row?.key),
            label: trimFieldValue(row?.label),
            type: trimFieldValue(row?.type),
        })),
        title: trimFieldValue(group?.title),
    }));
}

/**
 * Gets the article page that will be added to the new-page list.
 *
 * @param {Array<object>} actions - Prepared pre-save action rows.
 * @returns {string} Article title.
 */
function getPreSaveRegistrationArticleTitle(actions) {
    const selectedActions = actions.filter(
        (action) => action?.selected !== false,
    );
    const action =
        selectedActions.find((item) => item.type === "talk-banner") ||
        selectedActions.find((item) => item.type === "interwiki") ||
        selectedActions.find((item) => item.type !== "redirect");

    return getPreSaveActionPageTitle(action);
}

/**
 * Checks whether an action creates a company category.
 *
 * @param {object} action - Pre-save action row.
 * @returns {boolean} Whether the action creates a company category.
 */
function isCompanyCategoryPreSaveAction(action) {
    return (
        action?.type === "category" && trimFieldValue(action.company) !== ""
    );
}

/**
 * Creates the pre-save fixes dialog.
 *
 * @returns {object} Pre-save fixes dialog template node.
 */
export function createPreSaveDialogTemplate() {
    return createElement(
        "cdx-dialog",
        {
            "v-model:open": "preSaveOpen",
            title: "Pre-save fixes",
        },
        [
            createPreSaveIntroTemplate(),
            createPreSaveProgressIndicatorTemplate(),
            createPreSaveGroupsTemplate(),
            ...createPreSaveErrorTemplates(),
            createPreSaveFooterTemplate(),
        ],
    );
}

/**
 * Creates the pre-save dialog intro text.
 *
 * @returns {object} Intro text node.
 */
function createPreSaveIntroTemplate() {
    return createElement("p", {}, [
        createText(
            "{{ preSaveProgress == null ? 'Choose fixes to run after the article is submitted.' : 'Running selected fixes after the article is submitted.' }}",
        ),
    ]);
}

/**
 * Creates the pre-save progress indicator.
 *
 * @returns {object} Progress indicator node.
 */
function createPreSaveProgressIndicatorTemplate() {
    return createElement(
        "cdx-progress-indicator",
        {
            "show-label": "",
            "v-if": "isPreSaveProgressRunning()",
        },
        [createText("{{ getPreSaveCurrentStepLabel() }}")],
    );
}

/**
 * Creates the pre-save page-group list.
 *
 * @returns {object} Pre-save group list node.
 */
function createPreSaveGroupsTemplate() {
    return createElement(
        "div",
        {
            class: "create-vg-stub-pre-save-groups",
        },
        [createPreSaveGroupTemplate()],
    );
}

/**
 * Creates one pre-save page-group template.
 *
 * @returns {object} Pre-save page group node.
 */
function createPreSaveGroupTemplate() {
    return createElement(
        "section",
        {
            class: "create-vg-stub-pre-save-page",
            "v-bind:key": "group.key",
            "v-for": "group in getVisiblePreSaveGroups()",
        },
        [
            createElement(
                "div",
                {
                    class: "create-vg-stub-pre-save-title",
                },
                [createText("{{ group.title }}")],
            ),
            createElement(
                "ul",
                {
                    class: "create-vg-stub-pre-save-list",
                },
                [createPreSaveRowTemplate()],
            ),
        ],
    );
}

/**
 * Creates one pre-save row template.
 *
 * @returns {object} Pre-save row node.
 */
function createPreSaveRowTemplate() {
    return createElement(
        "li",
        {
            class: "create-vg-stub-pre-save-item",
            "v-bind:class": "getPreSaveProgressRowClass(row.step)",
            "v-bind:key": "row.key",
            "v-for": "row in group.rows",
        },
        [
            createPreSaveProgressRowTemplate(),
            createPreSaveCheckboxTemplate("action", "row.action.selected"),
            createPreSaveCheckboxTemplate(
                "registration",
                "form.registerNewPage",
            ),
            createPreSaveCheckboxTemplate(
                "bundled-action",
                "row.action.selected",
            ),
            createElement(
                "span",
                {
                    class: "create-vg-stub-pre-save-note",
                    "v-else": "",
                },
                [createText("{{ row.label }}")],
            ),
        ],
    );
}

/**
 * Creates the progress rendering branch for one pre-save row.
 *
 * @returns {object} Progress row branch node.
 */
function createPreSaveProgressRowTemplate() {
    return createElement(
        "template",
        {
            "v-if": "row.type === 'progress'",
        },
        [
            createElement("cdx-icon", {
                "v-bind:class": "getPreSaveStatusIconClass(row.step.status)",
                "v-bind:icon": "getPreSaveStatusIcon(row.step.status)",
            }),
            createElement("span", {}, [createText("{{ row.label }}")]),
        ],
    );
}

/**
 * Creates a checkbox rendering branch for one pre-save row type.
 *
 * @param {string} rowType - Pre-save row type.
 * @param {string} model - Checkbox model expression.
 * @returns {object} Checkbox branch node.
 */
function createPreSaveCheckboxTemplate(rowType, model) {
    return createElement(
        "cdx-checkbox",
        {
            "v-else-if": `row.type === '${rowType}'`,
            "v-model": model,
        },
        [createText("{{ row.label }}")],
    );
}

/**
 * Creates pre-save dialog error messages.
 *
 * @returns {Array<object>} Error message nodes.
 */
function createPreSaveErrorTemplates() {
    return [
        createMessageTemplate(
            "sourceFetchState.error",
            "{{ sourceFetchState.error }}",
        ),
        createMessageTemplate(
            "preSaveProgress && preSaveProgress.error",
            "{{ preSaveProgress.error }}",
        ),
    ];
}

/**
 * Creates the pre-save dialog footer.
 *
 * @returns {object} Dialog footer node.
 */
function createPreSaveFooterTemplate() {
    return createElement(
        "template",
        {
            "v-slot:footer": "",
        },
        [createActionFooterTemplate(createPreSaveFooterActions())],
    );
}

/**
 * Creates pre-save footer actions.
 *
 * @returns {object} Footer action groups.
 */
function createPreSaveFooterActions() {
    return {
        left: [createPreSaveCloseButtonTemplate()],
        right: [createPreSaveSubmitButtonTemplate()],
    };
}

/**
 * Creates the pre-save close button.
 *
 * @returns {object} Close button node.
 */
function createPreSaveCloseButtonTemplate() {
    return createButtonTemplate({
        click: "preSaveOpen = false",
        disabled: "sourceFetchState.loading",
        label: "Close",
        weight: "quiet",
    });
}

/**
 * Creates the pre-save submit button.
 *
 * @returns {object} Submit button node.
 */
function createPreSaveSubmitButtonTemplate() {
    return createButtonTemplate({
        action: "progressive",
        click: "confirmSubmit",
        disabled: "sourceFetchState.loading || preSaveProgress != null",
        label: "{{ sourceFetchState.loading ? 'Preparing' : 'Save' }}",
        weight: "primary",
    });
}
