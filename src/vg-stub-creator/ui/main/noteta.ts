import {
    createElement,
    createIconActionLinkTemplate,
    createTableHeaderTemplate,
    createTableTemplate,
} from "#me/ui/template.ts";
import { msg } from "#me/i18n/index.ts";

/**
 * Creates editable NoteTA rows.
 *
 * @returns NoteTA row template node.
 */
export function createNoteTaGroupTemplate(): any {
    const result = createElement(
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
                    caption: msg("noteta.items"),
                },
            ),
        ],
    );
    return result;
}

/**
 * Creates one editable NoteTA row template.
 *
 * @returns NoteTA row template node.
 */
function createNoteTaSlotsTemplate(): any {
    const result = [
        createTableHeaderTemplate(msg("noteta.items"), [
            createIconActionLinkTemplate(
                msg("noteta.sort"),
                "tableActionIcons.sort",
                "sortNoteTaRows",
            ),
            createIconActionLinkTemplate(
                msg("common.reset"),
                "tableActionIcons.regenerate",
                "regenerateNoteTaRows",
            ),
            createIconActionLinkTemplate(
                msg("common.clean"),
                "tableActionIcons.clean",
                "cleanNoteTaRows",
            ),
            createIconActionLinkTemplate(
                msg("common.add"),
                "tableActionIcons.cdxIconArticleAdd",
                "addNoteTaRow",
            ),
        ]),
        createNoteTaKeySlotTemplate(),
        createNoteTaValueSlotTemplate(),
        createNoteTaActionSlotTemplate(),
    ];
    return result;
}

/**
 * Creates the NoteTA rule-key input slot.
 *
 * @returns Rule-key slot node.
 */
function createNoteTaKeySlotTemplate(): any {
    const result = createInputSlotTemplate("key", {
        placeholder: msg("noteta.keyPlaceholder"),
        "v-bind:model-value": "row.key",
        "v-on:update:model-value": [
            "updateNoteTaRow(form.noteTaRows.in",
            "dexOf(row), 'key', $event)",
        ].join(""),
    });
    return result;
}

/**
 * Creates the NoteTA conversion input slot.
 *
 * @returns Conversion slot node.
 */
function createNoteTaValueSlotTemplate(): any {
    const result = createInputSlotTemplate("value", {
        placeholder: msg("noteta.valuePlaceholder"),
        "v-bind:model-value": "row.value",
        "v-on:update:model-value": [
            "updateNoteTaRow(form.noteTaRows.in",
            "dexOf(row), 'value', $event)",
        ].join(""),
    });
    return result;
}

/**
 * Creates the NoteTA row action slot.
 *
 * @returns Action slot node.
 */
function createNoteTaActionSlotTemplate(): any {
    const result = createSlotTemplate("actions", [
        createIconActionLinkTemplate(
            msg("common.remove"),
            "tableActionIcons.remove",
            "removeNoteTaRow(form.noteTaRows.indexOf(row))",
            {
                class: "vg-stub-creator-destructive-action",
            },
        ),
    ]);
    return result;
}

/**
 * Creates a table slot containing a text input.
 *
 * @param column - Column slot suffix.
 * @param attributes - Text input attributes.
 * @returns Text input slot node.
 */
function createInputSlotTemplate(column: string, attributes: any): any {
    const result = createSlotTemplate(column, [
        createElement("cdx-text-input", attributes),
    ]);
    return result;
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
    const result = createElement(
        "template",
        {
            [`v-slot:item-${column}`]: "{ row }",
        },
        children,
    );
    return result;
}
