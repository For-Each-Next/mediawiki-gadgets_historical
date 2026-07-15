import {
    createElement,
    createIconActionLinkTemplate,
    createTableHeaderTemplate,
    createTableTemplate,
} from "#stub/ui/template.ts";
import { msg } from "#stub/i18n";

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
                    caption: msg("noteta.items"),
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
}

/**
 * Creates the NoteTA rule-key input slot.
 *
 * @returns Rule-key slot node.
 */
function createNoteTaKeySlotTemplate(): any {
    return createInputSlotTemplate("key", {
        placeholder: msg("noteta.keyPlaceholder"),
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
        placeholder: msg("noteta.valuePlaceholder"),
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
            msg("common.remove"),
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
