/* eslint-disable */

import {
    createElement,
    createIconActionLinkTemplate,
    createTableHeaderTemplate,
    createTableTemplate,
    createText,
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
                "Clean",
                "tableActionIcons.clean",
                "cleanNoteTaRows",
            ),
            createIconActionLinkTemplate(
                "Add",
                "tableActionIcons.cdxIconArticleAdd",
                "addNoteTaRow",
            ),
        ]),
        createElement(
            "template",
            {
                "v-slot:item-key": "{ row }",
            },
            [
                createElement("cdx-text-input", {
                    placeholder: "T, G1, 1, or blank",
                    "v-bind:model-value": "row.key",
                    "v-on:update:model-value":
                        "updateNoteTaRow(form.noteTaRows.indexOf(row), 'key', $event)",
                }),
            ],
        ),
        createElement(
            "template",
            {
                "v-slot:item-value": "{ row }",
            },
            [
                createElement("cdx-text-input", {
                    placeholder: "Games or zh-cn:...; zh-tw:...;",
                    "v-bind:model-value": "row.value",
                    "v-on:update:model-value":
                        "updateNoteTaRow(form.noteTaRows.indexOf(row), 'value', $event)",
                }),
            ],
        ),
        createElement(
            "template",
            {
                "v-slot:item-actions": "{ row }",
            },
            [
                createIconActionLinkTemplate(
                    "Remove",
                    "tableActionIcons.remove",
                    "removeNoteTaRow(form.noteTaRows.indexOf(row))",
                    {
                        class: "create-vg-stub-destructive-action",
                    },
                ),
            ],
        ),
    ];
}
