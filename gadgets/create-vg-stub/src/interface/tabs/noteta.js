/* eslint-disable */

import {
    createActionFooterTemplate,
    createElement,
    createText,
} from "../template/nodes.js";

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
            createElement(
                "div",
                {
                    class: "create-vg-stub-noteta-grid",
                },
                [createNoteTaRowTemplate()],
            ),
            createActionFooterTemplate([
                createElement(
                    "cdx-button",
                    {
                        "v-on:click": "addNoteTaRow",
                    },
                    [createText("Add NoteTA")],
                ),
                createElement(
                    "cdx-button",
                    {
                        "v-on:click": "sortNoteTaRows",
                    },
                    [createText("Sort")],
                ),
                createElement(
                    "cdx-button",
                    {
                        "v-on:click": "regenerateNoteTaRows",
                    },
                    [createText("Regenerate")],
                ),
            ]),
        ],
    );
}

/**
 * Creates one editable NoteTA row template.
 *
 * @returns {object} NoteTA row template node.
 */
function createNoteTaRowTemplate() {
    return createElement(
        "template",
        {
            "v-bind:key": "index",
            "v-for": "(row, index) in form.noteTaRows",
        },
        [
            createElement("cdx-text-input", {
                placeholder: "T, G1, 1, or blank",
                "v-bind:model-value": "row.key",
                "v-on:update:model-value":
                    "updateNoteTaRow(index, 'key', $event)",
            }),
            createElement("cdx-text-input", {
                placeholder: "Games or zh-cn:...; zh-tw:...;",
                "v-bind:model-value": "row.value",
                "v-on:update:model-value":
                    "updateNoteTaRow(index, 'value', $event)",
            }),
            createElement(
                "cdx-button",
                {
                    "v-on:click": "removeNoteTaRow(index)",
                },
                [createText("Remove")],
            ),
        ],
    );
}
