import {
    createButtonTemplate,
    createElement,
    createFieldTemplate,
    createPreviewCardTemplate,
    createSourceUrlInputTemplate,
    createTableTemplate,
    createText,
} from "#gadget/ui/template.ts";
import { msg } from "#gadget/i18n/index.ts";

/**
 * Creates the article field group template node.
 *
 * @returns Article field group template node.
 */
export function createFieldGroupTemplate(): any {
    const groupedFieldsetResult = [
        createGroupedFieldsetTemplate(),
        createIndividualFieldsTemplate(),
        createMetadataPreviewTemplate(),
        createFullTextPreviewTemplate(),
    ];
    const result = createElement(
        "template",
        {
            "v-if": "group.fields.length",
        },
        groupedFieldsetResult,
    );
    return result;
}

/**
 * Creates independently labelled article fields.
 *
 * @returns Individual field list template node.
 */
function createIndividualFieldsTemplate(): any {
    const metadataFieldsResult = [
        createMetadataFieldsTemplate(),
        createDefaultFieldsTemplate(),
    ];
    const result = createElement(
        "template",
        {
            "v-if": "!group.fieldsetLabel",
        },
        metadataFieldsResult,
    );
    return result;
}

/**
 * Creates the metadata fields with the source-backed rows in a table.
 *
 * @returns Metadata field template node.
 */
function createMetadataFieldsTemplate(): any {
    const compactFieldResultA = [
        createCompactFieldTemplate(),
        createStandardFieldTemplate(),
    ];
    const elementResultB = [
        createElement(
            "template",
            {
                "v-bind:key": "field.key",
                "v-for": "field in group.fields.slice(0, 1)",
            },
            compactFieldResultA,
        ),
        createMetadataFieldTableTemplate(),
    ];
    const result = createElement(
        "template",
        {
            "v-if": "group.key === 'metadata'",
        },
        elementResultB,
    );
    return result;
}

/**
 * Creates the default stacked fields for non-special groups.
 *
 * @returns Default field template node.
 */
function createDefaultFieldsTemplate(): any {
    const compactFieldResult = [
        createCompactFieldTemplate(),
        createStandardFieldTemplate(),
    ];
    const elementResultA = [
        createElement(
            "template",
            {
                "v-bind:key": "field.key",
                "v-for": "field in group.fields",
            },
            compactFieldResult,
        ),
    ];
    const result = createElement(
        "template",
        {
            "v-else": "",
        },
        elementResultA,
    );
    return result;
}

/**
 * Creates the metadata source-backed field table.
 *
 * @returns Metadata field table node.
 */
function createMetadataFieldTableTemplate(): any {
    const metadataFieldTableSlotsResult =
        createMetadataFieldTableSlotsTemplate();
    const messageD = {
        class: "vg-stub-creator-metadata-table",
        caption: msg("metadata.fields"),
    };
    const result = createTableTemplate(
        "metadataTableColumns",
        "getMetadataFieldTableRows(group)",
        metadataFieldTableSlotsResult,
        messageD,
    );
    return result;
}

/**
 * Creates Codex table slots for metadata source-backed fields.
 *
 * @returns Metadata table slot nodes.
 */
function createMetadataFieldTableSlotsTemplate(): Array<any> {
    const textResultF = [createText("{{ getMetadataFieldLabel(row.field) }}")];
    const labelSlot = createElement(
        "template",
        { "v-slot:item-label": "{ row }" },
        textResultF,
    );
    const articleFieldValueInputResultB = [
        createArticleFieldValueInputTemplate({ field: "row.field" }),
    ];
    const valueSlot = createElement(
        "template",
        { "v-slot:item-value": "{ row }" },
        articleFieldValueInputResultB,
    );

    return [labelSlot, valueSlot, createMetadataSourceSlotTemplate()];
}

/**
 * Creates the metadata field source-input slot.
 *
 * @returns The metadata field source-input slot.
 */
function createMetadataSourceSlotTemplate(): any {
    const messageC = {
        placeholder: msg("form.sourceUrls"),
        model: "form[row.field.sourceField.sourceKey]",
        change: "trimSourceValue(row.field.sourceField)",
        update: "updateSourceValue(row.field.sourceField, $event)",
    };
    const input = createSourceUrlInputTemplate(messageC);
    const slot = createElement(
        "template",
        { "v-slot:item-source": "{ row }" },
        [input],
    );

    return slot;
}

/**
 * Creates one labelled fieldset for a group of related article fields.
 *
 * @returns Grouped fieldset template node.
 */
function createGroupedFieldsetTemplate(): any {
    const groupedFieldListResult = [createGroupedFieldListTemplate()];
    const textResultE = [createText("{{ group.fieldsetLabel }}")];
    const elementResult = [
        createElement(
            "div",
            {
                class: "vg-stub-creator-fieldset-fields",
            },
            groupedFieldListResult,
        ),
        createElement(
            "template",
            {
                "v-slot:label": "",
            },
            textResultE,
        ),
    ];
    const result = createElement(
        "cdx-field",
        {
            "is-fieldset": "",
            "v-if": "group.fieldsetLabel",
        },
        elementResult,
    );
    return result;
}

/**
 * Creates the grouped field loop template.
 *
 * @returns Grouped field loop node.
 */
function createGroupedFieldListTemplate(): any {
    const groupedFieldResult = [createGroupedFieldTemplate()];
    const result = createElement(
        "template",
        {
            "v-bind:key": "field.key",
            "v-for": "field in group.fields",
        },
        groupedFieldResult,
    );
    return result;
}

/**
 * Creates an unlabeled field within a grouped fieldset.
 *
 * @returns Grouped field template node.
 */
function createGroupedFieldTemplate(): any {
    const fieldControlsResultB = [createFieldControlsTemplate()];
    const result = createElement(
        "div",
        {
            class: "vg-stub-creator-fieldset-field",
        },
        fieldControlsResultB,
    );
    return result;
}

/**
 * Creates the metadata wikitext preview card.
 *
 * @returns Metadata preview card node.
 */
function createMetadataPreviewTemplate(): any {
    const messageB = msg("preview.wikitext");
    const result = createPreviewCardTemplate(
        messageB,
        "getGroupPreview(group)",
        {
            condition: "group.previewKey && getGroupPreview(group)",
        },
    );
    return result;
}

/**
 * Creates the full generated prose review card.
 *
 * @returns Full prose review card node.
 */
function createFullTextPreviewTemplate(): any {
    const messageA = msg("preview.fullText");
    const result = createPreviewCardTemplate(messageA, "getProseWikitext()", {
        condition: "group.fullTextReview && getProseWikitext()",
        description: "getProseReviewDescription()",
    });
    return result;
}

/**
 * Creates a compact article field template node.
 *
 * @returns Compact article field template node.
 */
function createCompactFieldTemplate(): any {
    const textResultD = [createText("{{ field.heading || field.label }}")];
    const fieldControlsResultA = [
        createFieldControlsTemplate({
            placeholder: "field.placeholder",
        }),
        createElement(
            "template",
            {
                "v-slot:label": "",
            },
            textResultD,
        ),
    ];
    const result = createElement(
        "cdx-field",
        {
            "v-bind:is-fieldset": "!!field.sourceField",
            "v-if": "field.compact",
        },
        fieldControlsResultA,
    );
    return result;
}

/**
 * Creates a standard article field template node.
 *
 * @returns Standard article field template node.
 */
function createStandardFieldTemplate(): any {
    const fieldControlsResult = [createFieldControlsTemplate()];
    const enwikiHelpTextResult = {
        attributes: {
            "v-bind:is-fieldset": "!!field.sourceField",
            "v-else-if": "!field.compact",
        },
        bindLabel: true,
        helpText: createEnwikiHelpTextTemplate(),
        helpTextCondition: "field.key === 'enwikiTitle'",
    };
    const result = createFieldTemplate(
        "field.label",
        fieldControlsResult,
        enwikiHelpTextResult,
    );
    return result;
}

/**
 * Creates the input and optional source controls for one article field.
 *
 * @param options - Control options.
 * @param options.placeholder - Placeholder Vue expression.
 * @returns Field controls node.
 */
function createFieldControlsTemplate(options: any = {}): any {
    const placeholder =
        options.placeholder ||
        "getFieldPlaceholder(field) || field.placeholder";

    const joinedText = {
        class: "vg-stub-creator-field-controls",
        "v-bind:class":
            "{ " +
            [
                "'vg-stub-creator-field-controls--w",
                "ith-source': field.sourceField, ",
            ].join("") +
            [
                "'vg-stub-creator-field-controls--w",
                "ith-move': field.key === 'pageName",
                "' ",
            ].join("") +
            "}",
    };
    const multilineFieldBranchResult = [
        createMultilineFieldBranchTemplate(placeholder),
        createSingleLineFieldBranchTemplate(placeholder),
        createSourceUrlFieldBranchTemplate(),
    ];
    const result = createElement(
        "div",
        joinedText,
        multilineFieldBranchResult,
    );
    return result;
}

/**
 * Creates the multiline article field branch.
 *
 * @param placeholder - Placeholder Vue expression.
 * @returns Multiline branch node.
 */
function createMultilineFieldBranchTemplate(placeholder: string): any {
    const articleFieldValueInputResultA = [
        createArticleFieldValueInputTemplate({
            multiline: true,
            placeholder,
        }),
    ];
    const result = createElement(
        "template",
        {
            "v-if": "field.multiline",
        },
        articleFieldValueInputResultA,
    );
    return result;
}

/**
 * Creates the single-line article field branch.
 *
 * @param placeholder - Placeholder Vue expression.
 * @returns Single-line branch node.
 */
function createSingleLineFieldBranchTemplate(placeholder: string): any {
    const articleFieldValueInputResult = [
        createArticleFieldValueInputTemplate({ placeholder }),
        createMovePageButtonTemplate(),
    ];
    const result = createElement(
        "template",
        {
            "v-else": "",
        },
        articleFieldValueInputResult,
    );
    return result;
}

/**
 * Creates the optional source URL field branch.
 *
 * @returns Source branch node.
 */
function createSourceUrlFieldBranchTemplate(): any {
    const sourceUrlFieldOptionsResult = createSourceUrlFieldOptions();
    const sourceUrlInputResult = [
        createSourceUrlInputTemplate(sourceUrlFieldOptionsResult),
    ];
    const result = createElement(
        "template",
        {
            "v-if": "field.sourceField",
        },
        sourceUrlInputResult,
    );
    return result;
}

/**
 * Creates source URL field options.
 *
 * @returns Source URL field options.
 */
function createSourceUrlFieldOptions(): any {
    const result = {
        change: "trimSourceValue(field.sourceField)",
        model: "form[field.sourceField.sourceKey]",
        placeholder: msg("form.sourceUrls"),
        update: "updateSourceValue(field.sourceField, $event)",
    };
    return result;
}

/**
 * Creates the page move button.
 *
 * @returns Page move button node.
 */
function createMovePageButtonTemplate(): any {
    const message = {
        click: "openMoveDialog",
        disabled: "sourceFetchState.loading",
        label: msg("text.move"),
        show: "field.key === 'pageName' && canMovePageName()",
    };
    const result = createButtonTemplate(message);
    return result;
}

/**
 * Creates the value input for one article field.
 *
 * @param options - Input options.
 * @param options.field - Field Vue expression.
 * @param options.multiline - Whether to render a textarea.
 * @param options.placeholder - Placeholder Vue expression.
 * @returns Article field value input node.
 */
function createArticleFieldValueInputTemplate(options: any = {}): any {
    const field = options.field || "field";
    const placeholder =
        options.placeholder ||
        `getFieldPlaceholder(${field}) || ${field}.placeholder`;

    if (options.multiline) {
        const result = createElement("cdx-text-area", {
            class: "vg-stub-creator-article-field-text",
            rows: "1",
            "v-bind:placeholder": placeholder,
            "v-bind:model-value": `form[${field}.key]`,
            "v-on:change": `normalizeFieldValue(${field})`,
            "v-on:update:model-value": `updateFieldValue(${field}, $event)`,
        });
        return result;
    }

    const result = createElement("cdx-text-input", {
        "v-bind:placeholder": placeholder,
        "v-bind:readonly": `${field}.readonly`,
        "v-bind:model-value": `form[${field}.key]`,
        "v-on:change": `normalizeFieldValue(${field})`,
        "v-on:paste": `normalizePastedFieldValue(${field}, $event)`,
        "v-on:update:model-value": `updateFieldValue(${field}, $event)`,
    });
    return result;
}

/**
 * Creates the English Wikipedia field help text.
 *
 * @returns English Wikipedia help text nodes.
 */
function createEnwikiHelpTextTemplate(): Array<any | string> {
    const enwikiTipListResult = [createEnwikiTipListTemplate()];
    const textResultC = [createText("{{ getWikidataStatusText() }}")];
    const result = [
        createElement(
            "template",
            {
                "v-if": "getEnwikiTipLinks().length",
            },
            enwikiTipListResult,
        ),
        createElement(
            "template",
            {
                "v-else": "",
            },
            textResultC,
        ),
    ];
    return result;
}

/**
 * Creates the English Wikipedia helper link list.
 *
 * @returns Helper link list node.
 */
function createEnwikiTipListTemplate(): any {
    const enwikiTipItemResult = [createEnwikiTipItemTemplate()];
    const result = createElement(
        "span",
        {
            class:
                "vg-stub-creator-enwiki-help " +
                "vg-stub-creator-horizontal-list",
        },
        enwikiTipItemResult,
    );
    return result;
}

/**
 * Creates one English Wikipedia helper item.
 *
 * @returns Helper item node.
 */
function createEnwikiTipItemTemplate(): any {
    const textResultB = [
        createText("{{ link.label }} "),
        createEnwikiTipLinkTemplate(),
        createEnwikiTipTextTemplate(),
    ];
    const result = createElement(
        "span",
        {
            class: "vg-stub-creator-horizontal-list-item",
            "v-bind:key": "link.label",
            "v-for": "link in getEnwikiTipLinks()",
        },
        textResultB,
    );
    return result;
}

/**
 * Creates one linked English Wikipedia helper value.
 *
 * @returns Helper link node.
 */
function createEnwikiTipLinkTemplate(): any {
    const textResultA = [createText("{{ link.value }}")];
    const result = createElement(
        "a",
        {
            "v-if": "link.url",
            "v-bind:href": "link.url",
            rel: "noopener noreferrer",
            target: "_blank",
        },
        textResultA,
    );
    return result;
}

/**
 * Creates one plain English Wikipedia helper value.
 *
 * @returns Helper text node.
 */
function createEnwikiTipTextTemplate(): any {
    const textResult = [createText("{{ link.value }}")];
    const result = createElement(
        "span",
        {
            "v-else": "",
        },
        textResult,
    );
    return result;
}
