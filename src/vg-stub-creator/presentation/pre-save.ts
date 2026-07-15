/**
 * Builds the pre-save review dialog UI.
 */

import { trimFieldValue } from "#stub/local/form-values.ts";
import {
    createActionFooterTemplate,
    createButtonTemplate,
    createElement,
    createMessageTemplate,
    createText,
    toVueString,
} from "#stub/ui/template.ts";
import { msg } from "#stub/i18n";

interface PreSaveAction {
    category?: string;
    company?: string;
    displayLabel?: string;
    englishName?: string;
    id: string;
    label?: string;
    pageTitle?: string;
    redirectTitle?: string;
    selected?: boolean;
    type?: string;
    wikidataId?: string;
}

interface PreSaveRow {
    action?: PreSaveAction;
    key: string;
    label: string;
    type: string;
}

interface PreSaveGroup {
    key: string;
    rows: PreSaveRow[];
    title: string;
}

/**
 * Groups pre-save fixes by the page they will edit.
 *
 * @param actions - Prepared pre-save action rows.
 * @param form - Dialog form state.
 * @returns Page-grouped pre-save rows.
 */
export function createPreSaveGroups(
    actions: Array<any>,
    form: any,
): Array<any> {
    const groups = [];
    const byTitle = new Map();
    const actionRows = Array.isArray(actions) ? actions : [];

    addPreSaveActionGroups(groups, byTitle, actionRows);
    addArticleRegistrationGroup(groups, byTitle, actionRows, form);
    addCompanyRegistrationGroups(groups, byTitle, actionRows, form);

    const result = groups
        .filter((group) => group.rows.length > 0)
        .map(movePreSaveWikidataRowsLast);
    return result;
}

/**
 * Adds selected action and bundled-action rows to page groups.
 *
 * @param groups - Groups value.
 * @param byTitle - By title value.
 * @param actionRows - Action rows value.
 */
function addPreSaveActionGroups(
    groups: PreSaveGroup[],
    byTitle: Map<string, PreSaveGroup>,
    actionRows: PreSaveAction[],
): void {
    for (const action of actionRows) {
        if (action?.selected === false) {
            continue;
        }

        const group = findPreSaveGroup(groups, byTitle, action);

        if (group == null) {
            continue;
        }

        group.rows.push(createPreSaveActionRow(action));
        group.rows.push(...createPreSaveNoteRows(action));
    }
}

/**
 * Finds or creates the page group for an action.
 *
 * @param groups - Groups value.
 * @param byTitle - By title value.
 * @param action - Action value.
 * @returns Or creates the page group for an action.
 */
function findPreSaveGroup(
    groups: PreSaveGroup[],
    byTitle: Map<string, PreSaveGroup>,
    action: PreSaveAction,
): PreSaveGroup | undefined {
    const title = getPreSaveActionPageTitle(action);

    return title === "" ? undefined : getPreSaveGroup(groups, byTitle, title);
}

/**
 * Creates the primary row for a pre-save action.
 *
 * @param action - Action value.
 * @returns The primary row for a pre-save action.
 */
function createPreSaveActionRow(action: PreSaveAction): PreSaveRow {
    const result = {
        action,
        key: action.id,
        label: getPreSaveActionDisplayLabel(action),
        type: "action",
    };
    return result;
}

/**
 * Creates bundled-note rows for a pre-save action.
 *
 * @param action - Action value.
 * @returns Bundled-note rows for a pre-save action.
 */
function createPreSaveNoteRows(action: PreSaveAction): PreSaveRow[] {
    const rows = getPreSaveActionNotes(action).map(function callback(note) {
        const result = {
            action,
            key: `${action.id}:${note.key}`,
            label: note.label,
            type: "bundled-action",
        };
        return result;
    });

    return rows;
}

/**
 * Adds the submitted article's new-page-list registration row.
 *
 * @param groups - Groups value.
 * @param byTitle - By title value.
 * @param actions - Actions value.
 * @param form - Form values.
 */
function addArticleRegistrationGroup(
    groups: PreSaveGroup[],
    byTitle: Map<string, PreSaveGroup>,
    actions: PreSaveAction[],
    form: { registerNewPage: boolean },
): void {
    const title = getPreSaveRegistrationArticleTitle(actions);

    if (title === "" || form?.registerNewPage === false) {
        return;
    }

    getPreSaveGroup(groups, byTitle, title).rows.push({
        key: "register-new-page",
        label: msg("progress.registerNewPage"),
        type: "registration",
    });
}

/**
 * Adds new-page-list rows for selected company-category actions.
 *
 * @param groups - Groups value.
 * @param byTitle - By title value.
 * @param actions - Actions value.
 * @param form - Form values.
 */
function addCompanyRegistrationGroups(
    groups: PreSaveGroup[],
    byTitle: Map<string, PreSaveGroup>,
    actions: PreSaveAction[],
    form: { registerNewPage: boolean },
): void {
    const companyActions = actions.filter(isCompanyCategoryPreSaveAction);

    for (const action of companyActions) {
        if (action?.selected === false || form?.registerNewPage === false) {
            continue;
        }

        const title = getPreSaveActionPageTitle(action);

        if (title === "") {
            continue;
        }

        getPreSaveGroup(groups, byTitle, title).rows.push({
            key: `${action.id}:register-new-page`,
            label: msg("progress.registerNewPage"),
            type: "registration",
        });
    }
}

/**
 * Gets or creates a pre-save page group.
 *
 * @param groups - Groups value.
 * @param byTitle - By title value.
 * @param title - Page title.
 * @returns Or creates a pre-save page group.
 */
function getPreSaveGroup(
    groups: PreSaveGroup[],
    byTitle: Map<string, PreSaveGroup>,
    title: string,
): PreSaveGroup {
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

    return byTitle.get(normalizedTitle)!;
}

/**
 * Gets the display page title for a pre-save action.
 *
 * @param action - Pre-save action row.
 * @returns Page title.
 */
function getPreSaveActionPageTitle(action: any): string {
    const result = trimFieldValue(
        action?.pageTitle ||
            action?.redirectTitle ||
            (action?.type === "category" ? `Category:${action.category}` : ""),
    );
    return result;
}

/**
 * Gets the short display label for a pre-save action.
 *
 * @param action - Pre-save action row.
 * @returns Display label.
 */
function getPreSaveActionDisplayLabel(action: any): string {
    return (
        trimFieldValue(action?.displayLabel) || trimFieldValue(action?.label)
    );
}

/**
 * Gets non-selectable notes for bundled work inside a pre-save action.
 *
 * @param action - Pre-save action row.
 * @returns Display notes.
 */
function getPreSaveActionNotes(action: any): Array<any> {
    if (action?.type !== "category" || trimFieldValue(action.company) === "") {
        return [];
    }

    const category = trimFieldValue(action.category);
    const notes = [
        {
            key: "talk-banner",
            label: msg("presave.tagBanner", {
                title: `Category talk:${category}`,
            }),
        },
    ];

    const wikidataId = trimFieldValue(action.wikidataId);

    if (wikidataId !== "") {
        notes.push({
            key: "wikidata",
            label: msg("presave.connectTo", { target: `d:${wikidataId}` }),
        });
    } else if (trimFieldValue(action.englishName) !== "") {
        notes.push({
            key: "wikidata",
            label: msg("progress.connectCategory"),
        });
    }

    return notes;
}

/**
 * Moves Wikidata rows to the end of one pre-save group.
 *
 * @param group - Pre-save group.
 * @returns Group with reordered rows.
 */
function movePreSaveWikidataRowsLast(group: any): any {
    let rows: Array<Record<string, unknown>> = [];

    if (Array.isArray(group?.rows)) {
        rows = group.rows;
    }
    const wikidataRows = rows.filter(isPreSaveWikidataRow);
    const otherRows = rows.filter((row) => !isPreSaveWikidataRow(row));

    const result = {
        ...group,
        rows: [...otherRows, ...wikidataRows],
    };
    return result;
}

/**
 * Checks whether a pre-save row updates Wikidata.
 *
 * @param row - Pre-save row.
 * @returns Whether the row is a Wikidata row.
 */
function isPreSaveWikidataRow(row: any): boolean {
    const key = trimFieldValue(row?.key);

    return key === "interwiki" || key.endsWith(":wikidata");
}

/**
 * Serializes pre-save groups for progress display.
 *
 * @param groups - Pre-save checkbox groups.
 * @returns Serializable progress groups.
 */
export function serializePreSaveProgressGroups(
    groups: Array<any>,
): Array<any> {
    const result = (Array.isArray(groups) ? groups : []).map(
        function callback(group) {
            const result = {
                key: trimFieldValue(group?.key),
                rows: (Array.isArray(group?.rows) ? group.rows : []).map(
                    function callback(row: {
                        key: unknown;
                        label: unknown;
                        type: unknown;
                    }) {
                        const result = {
                            key: trimFieldValue(row?.key),
                            label: trimFieldValue(row?.label),
                            type: trimFieldValue(row?.type),
                        };
                        return result;
                    },
                ),
                title: trimFieldValue(group?.title),
            };
            return result;
        },
    );
    return result;
}

/**
 * Gets the article page that will be added to the new-page list.
 *
 * @param actions - Prepared pre-save action rows.
 * @returns Article title.
 */
function getPreSaveRegistrationArticleTitle(actions: Array<any>): string {
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
 * @param action - Pre-save action row.
 * @returns Whether the action creates a company category.
 */
function isCompanyCategoryPreSaveAction(action: any): boolean {
    return (
        action?.type === "category" && trimFieldValue(action.company) !== ""
    );
}

/**
 * Creates the pre-save fixes dialog.
 *
 * @returns Pre-save fixes dialog template node.
 */
export function createPreSaveDialogTemplate(): any {
    const result = createElement(
        "cdx-dialog",
        {
            "v-model:open": "preSaveOpen",
            title: msg("presave.title"),
        },
        [
            createPreSaveIntroTemplate(),
            createPreSaveProgressIndicatorTemplate(),
            createPreSaveGroupsTemplate(),
            ...createPreSaveErrorTemplates(),
            createPreSaveFooterTemplate(),
        ],
    );
    return result;
}

/**
 * Creates the pre-save dialog intro text.
 *
 * @returns Intro text node.
 */
function createPreSaveIntroTemplate(): any {
    const result = createElement("p", {}, [
        createText(
            `{{ preSaveProgress == null ? ${toVueString(
                msg("presave.description"),
            )} : ${toVueString(msg("presave.running"))} }}`,
        ),
    ]);
    return result;
}

/**
 * Creates the pre-save progress indicator.
 *
 * @returns Progress indicator node.
 */
function createPreSaveProgressIndicatorTemplate(): any {
    const result = createElement(
        "cdx-progress-indicator",
        {
            "show-label": "",
            "v-if": "isPreSaveProgressRunning()",
        },
        [createText("{{ getPreSaveCurrentStepLabel() }}")],
    );
    return result;
}

/**
 * Creates the pre-save page-group list.
 *
 * @returns Pre-save group list node.
 */
function createPreSaveGroupsTemplate(): any {
    const result = createElement(
        "div",
        {
            class: "vg-stub-creator-pre-save-groups",
        },
        [createPreSaveGroupTemplate()],
    );
    return result;
}

/**
 * Creates one pre-save page-group template.
 *
 * @returns Pre-save page group node.
 */
function createPreSaveGroupTemplate(): any {
    const result = createElement(
        "section",
        {
            class: "vg-stub-creator-pre-save-page",
            "v-bind:key": "group.key",
            "v-for": "group in getVisiblePreSaveGroups()",
        },
        [
            createElement(
                "div",
                {
                    class: "vg-stub-creator-pre-save-title",
                },
                [createText("{{ group.title }}")],
            ),
            createElement(
                "ul",
                {
                    class: "vg-stub-creator-pre-save-list",
                },
                [createPreSaveRowTemplate()],
            ),
        ],
    );
    return result;
}

/**
 * Creates one pre-save row template.
 *
 * @returns Pre-save row node.
 */
function createPreSaveRowTemplate(): any {
    const children = [
        createPreSaveProgressRowTemplate(),
        createPreSaveCheckboxTemplate("action", "row.action.selected"),
        createPreSaveCheckboxTemplate("registration", "form.registerNewPage"),
        createPreSaveCheckboxTemplate("bundled-action", "row.action.selected"),
        createElement(
            "span",
            { class: "vg-stub-creator-pre-save-note", "v-else": "" },
            [createText("{{ row.label }}")],
        ),
    ];
    const row = createElement(
        "li",
        {
            class: "vg-stub-creator-pre-save-item",
            "v-bind:class": "getPreSaveProgressRowClass(row.step)",
            "v-bind:key": "row.key",
            "v-for": "row in group.rows",
        },
        children,
    );

    return row;
}

/**
 * Creates the progress rendering branch for one pre-save row.
 *
 * @returns Progress row branch node.
 */
function createPreSaveProgressRowTemplate(): any {
    const result = createElement(
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
    return result;
}

/**
 * Creates a checkbox rendering branch for one pre-save row type.
 *
 * @param rowType - Pre-save row type.
 * @param model - Checkbox model expression.
 * @returns Checkbox branch node.
 */
function createPreSaveCheckboxTemplate(rowType: string, model: string): any {
    const result = createElement(
        "cdx-checkbox",
        {
            "v-else-if": `row.type === '${rowType}'`,
            "v-model": model,
        },
        [createText("{{ row.label }}")],
    );
    return result;
}

/**
 * Creates pre-save dialog error messages.
 *
 * @returns Error message nodes.
 */
function createPreSaveErrorTemplates(): Array<any> {
    const result = [
        createMessageTemplate(
            "sourceFetchState.error",
            "{{ sourceFetchState.error }}",
        ),
        createMessageTemplate(
            "preSaveProgress && preSaveProgress.error",
            "{{ preSaveProgress.error }}",
        ),
    ];
    return result;
}

/**
 * Creates the pre-save dialog footer.
 *
 * @returns Dialog footer node.
 */
function createPreSaveFooterTemplate(): any {
    const result = createElement(
        "template",
        {
            "v-slot:footer": "",
        },
        [createActionFooterTemplate(createPreSaveFooterActions())],
    );
    return result;
}

/**
 * Creates pre-save footer actions.
 *
 * @returns Footer action groups.
 */
function createPreSaveFooterActions(): any {
    const result = {
        left: [createPreSaveCloseButtonTemplate()],
        right: [createPreSaveSubmitButtonTemplate()],
    };
    return result;
}

/**
 * Creates the pre-save close button.
 *
 * @returns Close button node.
 */
function createPreSaveCloseButtonTemplate(): any {
    const result = createButtonTemplate({
        click: "preSaveOpen = false",
        disabled: "sourceFetchState.loading",
        label: msg("common.close"),
        weight: "quiet",
    });
    return result;
}

/**
 * Creates the pre-save submit button.
 *
 * @returns Submit button node.
 */
function createPreSaveSubmitButtonTemplate(): any {
    const result = createButtonTemplate({
        action: "progressive",
        click: "confirmSubmit",
        disabled: "sourceFetchState.loading || preSaveProgress != null",
        label: `{{ sourceFetchState.loading ? ${toVueString(
            msg("presave.preparing"),
        )} : ${toVueString(msg("common.save"))} }}`,
        weight: "primary",
    });
    return result;
}
