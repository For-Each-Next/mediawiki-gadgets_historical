/* eslint-disable */

import {
    createElement,
    createIconActionLinkTemplate,
    createTableHeaderTemplate,
    createTableTemplate,
} from "../template.js";

/**
 * Creates editable NoteTA rows.
 *
 * @returns {object} NoteTA row template node.
 */
export function createNoteTaGroupTemplate() {
    return createElement(
        "template",
        {
            "v-if": "group.noteTaReview",
        },
        [
            createTableTemplate(
                "notetaTableColumns",
                "form.noteTaRows",
                createNoteTaSlotsTemplate(),
                {
                    caption: "NoteTA items",
                },
            ),
        ],
    );
}

/**
 * Creates one editable NoteTA row template.
 *
 * @returns {object} NoteTA row template node.
 */
function createNoteTaSlotsTemplate() {
    return [
        createTableHeaderTemplate("NoteTA items", [
            createIconActionLinkTemplate(
                "Sort",
                "tableActionIcons.sort",
                "sortNoteTaRows",
            ),
            createIconActionLinkTemplate(
                "Reset",
                "tableActionIcons.regenerate",
                "regenerateNoteTaRows",
            ),
            createIconActionLinkTemplate(
                "Remove empty rows",
                "tableActionIcons.clean",
                "cleanNoteTaRows",
            ),
            createIconActionLinkTemplate(
                "Add",
                "tableActionIcons.cdxIconArticleAdd",
                "addNoteTaRow",
            ),
        ]),
        createNoteTaKeySlotTemplate(),
        createNoteTaValueSlotTemplate(),
        createNoteTaActionSlotTemplate(),
    ];
}

/**
 * Creates the NoteTA rule-key input slot.
 *
 * @returns {object} Rule-key slot node.
 */
function createNoteTaKeySlotTemplate() {
    return createInputSlotTemplate("key", {
        placeholder: "T, G1, 1, or blank",
        "v-bind:model-value": "row.key",
        "v-on:update:model-value":
            "updateNoteTaRow(form.noteTaRows.indexOf(row), 'key', $event)",
    });
}

/**
 * Creates the NoteTA conversion input slot.
 *
 * @returns {object} Conversion slot node.
 */
function createNoteTaValueSlotTemplate() {
    return createInputSlotTemplate("value", {
        placeholder: "Games or zh-cn:...; zh-tw:...;",
        "v-bind:model-value": "row.value",
        "v-on:update:model-value":
            "updateNoteTaRow(form.noteTaRows.indexOf(row), 'value', $event)",
    });
}

/**
 * Creates the NoteTA row action slot.
 *
 * @returns {object} Action slot node.
 */
function createNoteTaActionSlotTemplate() {
    return createSlotTemplate("actions", [
        createIconActionLinkTemplate(
            "Remove",
            "tableActionIcons.remove",
            "removeNoteTaRow(form.noteTaRows.indexOf(row))",
            {
                class: "vg-stub-creator-destructive-action",
            },
        ),
    ]);
}

/**
 * Creates a table slot containing a text input.
 *
 * @param {string} column - Column slot suffix.
 * @param {object} attributes - Text input attributes.
 * @returns {object} Text input slot node.
 */
function createInputSlotTemplate(column, attributes) {
    return createSlotTemplate(column, [
        createElement("cdx-text-input", attributes),
    ]);
}

/**
 * Creates a table slot.
 *
 * @param {string} column - Column slot suffix.
 * @param {Array<object|string>} children - Slot children.
 * @returns {object} Table slot node.
 */
function createSlotTemplate(column, children) {
    return createElement(
        "template",
        {
            [`v-slot:item-${column}`]: "{ row }",
        },
        children,
    );
}
