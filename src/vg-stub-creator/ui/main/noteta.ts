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
    const noteTaSlotsResult = createNoteTaSlotsTemplate();
    const messageH = {
        caption: msg("noteta.items"),
    };
    const tableResult = [
        createTableTemplate(
            "notetaTableColumns",
            "form.noteTaRows",
            noteTaSlotsResult,
            messageH,
        ),
    ];
    const result = createElement(
        "template",
        {
            "v-if": "group.noteTaReview",
        },
        tableResult,
    );
    return result;
}

/**
 * Creates one editable NoteTA row template.
 *
 * @returns NoteTA row template node.
 */
function createNoteTaSlotsTemplate(): any {
    const messageC = msg("noteta.items");
    const messageD = msg("noteta.sort");
    const messageE = msg("common.reset");
    const messageF = msg("common.clean");
    const messageG = msg("common.add");
    const iconActionLinkResultA = [
        createIconActionLinkTemplate(
            messageD,
            "tableActionIcons.sort",
            "sortNoteTaRows",
        ),
        createIconActionLinkTemplate(
            messageE,
            "tableActionIcons.regenerate",
            "regenerateNoteTaRows",
        ),
        createIconActionLinkTemplate(
            messageF,
            "tableActionIcons.clean",
            "cleanNoteTaRows",
        ),
        createIconActionLinkTemplate(
            messageG,
            "tableActionIcons.cdxIconArticleAdd",
            "addNoteTaRow",
        ),
    ];
    const result = [
        createTableHeaderTemplate(messageC, iconActionLinkResultA),
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
    const messageB = {
        placeholder: msg("noteta.keyPlaceholder"),
        "v-bind:model-value": "row.key",
        "v-on:update:model-value": [
            "updateNoteTaRow(form.noteTaRows.in",
            "dexOf(row), 'key', $event)",
        ].join(""),
    };
    const result = createInputSlotTemplate("key", messageB);
    return result;
}

/**
 * Creates the NoteTA conversion input slot.
 *
 * @returns Conversion slot node.
 */
function createNoteTaValueSlotTemplate(): any {
    const messageA = {
        placeholder: msg("noteta.valuePlaceholder"),
        "v-bind:model-value": "row.value",
        "v-on:update:model-value": [
            "updateNoteTaRow(form.noteTaRows.in",
            "dexOf(row), 'value', $event)",
        ].join(""),
    };
    const result = createInputSlotTemplate("value", messageA);
    return result;
}

/**
 * Creates the NoteTA row action slot.
 *
 * @returns Action slot node.
 */
function createNoteTaActionSlotTemplate(): any {
    const message = msg("common.remove");
    const iconActionLinkResult = [
        createIconActionLinkTemplate(
            message,
            "tableActionIcons.remove",
            "removeNoteTaRow(form.noteTaRows.indexOf(row))",
            {
                class: "vg-stub-creator-destructive-action",
            },
        ),
    ];
    const result = createSlotTemplate("actions", iconActionLinkResult);
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
    const elementResult = [createElement("cdx-text-input", attributes)];
    const result = createSlotTemplate(column, elementResult);
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
