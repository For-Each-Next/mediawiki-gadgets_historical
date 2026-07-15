import {
    createElement,
    createIconActionLinkTemplate,
    createTableHeaderTemplate,
    createTableTemplate,
} from "../template.ts";

/**
 * Creates editable NoteTA rows.
 *
 * @returns NoteTA row template node.
 */
export function createNoteTaGroupTemplate(): any {
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
 * @returns NoteTA row template node.
 */
function createNoteTaSlotsTemplate(): any {
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
 * @returns Rule-key slot node.
 */
function createNoteTaKeySlotTemplate(): any {
    return createInputSlotTemplate("key", {
        placeholder: "T, G1, 1, or blank",
        "v-bind:model-value": "row.key",
        "v-on:update:model-value": [
            "updateNoteTaRow(form.noteTaRows.in",
            "dexOf(row), 'key', $event)",
        ].join(""),
    });
}

/**
 * Creates the NoteTA conversion input slot.
 *
 * @returns Conversion slot node.
 */
function createNoteTaValueSlotTemplate(): any {
    return createInputSlotTemplate("value", {
        placeholder: "Games or zh-cn:...; zh-tw:...;",
        "v-bind:model-value": "row.value",
        "v-on:update:model-value": [
            "updateNoteTaRow(form.noteTaRows.in",
            "dexOf(row), 'value', $event)",
        ].join(""),
    });
}

/**
 * Creates the NoteTA row action slot.
 *
 * @returns Action slot node.
 */
function createNoteTaActionSlotTemplate(): any {
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
 * @param column - Column slot suffix.
 * @param attributes - Text input attributes.
 * @returns Text input slot node.
 */
function createInputSlotTemplate(column: string, attributes: any): any {
    return createSlotTemplate(column, [
        createElement("cdx-text-input", attributes),
    ]);
}

/**
 * Creates a table slot.
 *
 * @param column - Column slot suffix.
 * @param children - Slot children.
 * @returns Table slot node.
 */
function createSlotTemplate(
    column: string,
    children: Array<any | string>,
): any {
    return createElement(
        "template",
        {
            [`v-slot:item-${column}`]: "{ row }",
        },
        children,
    );
}
