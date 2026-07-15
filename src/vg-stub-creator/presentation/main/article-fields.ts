import {
    createButtonTemplate,
    createElement,
    createFieldTemplate,
    createPreviewCardTemplate,
    createSourceUrlInputTemplate,
    createTableTemplate,
    createText,
} from "#stub/ui/template.ts";
import { msg } from "#stub/i18n";

/**
 * Creates the article field group template node.
 *
 * @returns Article field group template node.
 */
export function createFieldGroupTemplate(): any {
    const result = createElement(
        "template",
        {
            "v-if": "group.fields.length",
        },
        [
            createGroupedFieldsetTemplate(),
            createIndividualFieldsTemplate(),
            createMetadataPreviewTemplate(),
            createFullTextPreviewTemplate(),
        ],
    );
    return result;
}

/**
 * Creates independently labelled article fields.
 *
 * @returns Individual field list template node.
 */
function createIndividualFieldsTemplate(): any {
    const result = createElement(
        "template",
        {
            "v-if": "!group.fieldsetLabel",
        },
        [createMetadataFieldsTemplate(), createDefaultFieldsTemplate()],
    );
    return result;
}

/**
 * Creates the metadata fields with the source-backed rows in a table.
 *
 * @returns Metadata field template node.
 */
function createMetadataFieldsTemplate(): any {
    const result = createElement(
        "template",
        {
            "v-if": "group.key === 'metadata'",
        },
        [
            createElement(
                "template",
                {
                    "v-bind:key": "field.key",
                    "v-for": "field in group.fields.slice(0, 1)",
                },
                [createCompactFieldTemplate(), createStandardFieldTemplate()],
            ),
            createMetadataFieldTableTemplate(),
        ],
    );
    return result;
}

/**
 * Creates the default stacked fields for non-special groups.
 *
 * @returns Default field template node.
 */
function createDefaultFieldsTemplate(): any {
    const result = createElement(
        "template",
        {
            "v-else": "",
        },
        [
            createElement(
                "template",
                {
                    "v-bind:key": "field.key",
                    "v-for": "field in group.fields",
                },
                [createCompactFieldTemplate(), createStandardFieldTemplate()],
            ),
        ],
    );
    return result;
}

/**
 * Creates the metadata source-backed field table.
 *
 * @returns Metadata field table node.
 */
function createMetadataFieldTableTemplate(): any {
    const result = createTableTemplate(
        "metadataTableColumns",
        "getMetadataFieldTableRows(group)",
        createMetadataFieldTableSlotsTemplate(),
        {
            class: "vg-stub-creator-metadata-table",
            caption: msg("metadata.fields"),
        },
    );
    return result;
}

/**
 * Creates Codex table slots for metadata source-backed fields.
 *
 * @returns Metadata table slot nodes.
 */
function createMetadataFieldTableSlotsTemplate(): Array<any> {
    const labelSlot = createElement(
        "template",
        { "v-slot:item-label": "{ row }" },
        [createText("{{ getMetadataFieldLabel(row.field) }}")],
    );
    const valueSlot = createElement(
        "template",
        { "v-slot:item-value": "{ row }" },
        [createArticleFieldValueInputTemplate({ field: "row.field" })],
    );

    return [labelSlot, valueSlot, createMetadataSourceSlotTemplate()];
}

/**
 * Creates the metadata field source-input slot.
 *
 * @returns The metadata field source-input slot.
 */
function createMetadataSourceSlotTemplate(): any {
    const input = createSourceUrlInputTemplate({
        placeholder: msg("form.sourceUrls"),
        model: "form[row.field.sourceField.sourceKey]",
        change: "trimSourceValue(row.field.sourceField)",
        update: "updateSourceValue(row.field.sourceField, $event)",
    });
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
    const result = createElement(
        "cdx-field",
        {
            "is-fieldset": "",
            "v-if": "group.fieldsetLabel",
        },
        [
            createElement(
                "div",
                {
                    class: "vg-stub-creator-fieldset-fields",
                },
                [createGroupedFieldListTemplate()],
            ),
            createElement(
                "template",
                {
                    "v-slot:label": "",
                },
                [createText("{{ group.fieldsetLabel }}")],
            ),
        ],
    );
    return result;
}

/**
 * Creates the grouped field loop template.
 *
 * @returns Grouped field loop node.
 */
function createGroupedFieldListTemplate(): any {
    const result = createElement(
        "template",
        {
            "v-bind:key": "field.key",
            "v-for": "field in group.fields",
        },
        [createGroupedFieldTemplate()],
    );
    return result;
}

/**
 * Creates an unlabeled field within a grouped fieldset.
 *
 * @returns Grouped field template node.
 */
function createGroupedFieldTemplate(): any {
    const result = createElement(
        "div",
        {
            class: "vg-stub-creator-fieldset-field",
        },
        [createFieldControlsTemplate()],
    );
    return result;
}

/**
 * Creates the metadata wikitext preview card.
 *
 * @returns Metadata preview card node.
 */
function createMetadataPreviewTemplate(): any {
    const result = createPreviewCardTemplate(
        msg("preview.wikitext"),
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
    const result = createPreviewCardTemplate(
        msg("preview.fullText"),
        "getProseWikitext()",
        {
            condition: "group.fullTextReview && getProseWikitext()",
            description: "getProseReviewDescription()",
        },
    );
    return result;
}

/**
 * Creates a compact article field template node.
 *
 * @returns Compact article field template node.
 */
function createCompactFieldTemplate(): any {
    const result = createElement(
        "cdx-field",
        {
            "v-bind:is-fieldset": "!!field.sourceField",
            "v-if": "field.compact",
        },
        [
            createFieldControlsTemplate({
                placeholder: "field.placeholder",
            }),
            createElement(
                "template",
                {
                    "v-slot:label": "",
                },
                [createText("{{ field.heading || field.label }}")],
            ),
        ],
    );
    return result;
}

/**
 * Creates a standard article field template node.
 *
 * @returns Standard article field template node.
 */
function createStandardFieldTemplate(): any {
    const result = createFieldTemplate(
        "field.label",
        [createFieldControlsTemplate()],
        {
            attributes: {
                "v-bind:is-fieldset": "!!field.sourceField",
                "v-else-if": "!field.compact",
            },
            bindLabel: true,
            helpText: createEnwikiHelpTextTemplate(),
            helpTextCondition: "field.key === 'enwikiTitle'",
        },
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

    const result = createElement(
        "div",
        {
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
        },
        [
            createMultilineFieldBranchTemplate(placeholder),
            createSingleLineFieldBranchTemplate(placeholder),
            createSourceUrlFieldBranchTemplate(),
        ],
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
    const result = createElement(
        "template",
        {
            "v-if": "field.multiline",
        },
        [
            createArticleFieldValueInputTemplate({
                multiline: true,
                placeholder,
            }),
        ],
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
    const result = createElement(
        "template",
        {
            "v-else": "",
        },
        [
            createArticleFieldValueInputTemplate({ placeholder }),
            createMovePageButtonTemplate(),
        ],
    );
    return result;
}

/**
 * Creates the optional source URL field branch.
 *
 * @returns Source branch node.
 */
function createSourceUrlFieldBranchTemplate(): any {
    const result = createElement(
        "template",
        {
            "v-if": "field.sourceField",
        },
        [createSourceUrlInputTemplate(createSourceUrlFieldOptions())],
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
    const result = createButtonTemplate({
        click: "openMoveDialog",
        disabled: "sourceFetchState.loading",
        label: msg("text.move"),
        show: "field.key === 'pageName' && canMovePageName()",
    });
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
    const result = [
        createElement(
            "template",
            {
                "v-if": "getEnwikiTipLinks().length",
            },
            [createEnwikiTipListTemplate()],
        ),
        createElement(
            "template",
            {
                "v-else": "",
            },
            [createText("{{ getWikidataStatusText() }}")],
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
    const result = createElement(
        "span",
        {
            class:
                "vg-stub-creator-enwiki-help " +
                "vg-stub-creator-horizontal-list",
        },
        [createEnwikiTipItemTemplate()],
    );
    return result;
}

/**
 * Creates one English Wikipedia helper item.
 *
 * @returns Helper item node.
 */
function createEnwikiTipItemTemplate(): any {
    const result = createElement(
        "span",
        {
            class: "vg-stub-creator-horizontal-list-item",
            "v-bind:key": "link.label",
            "v-for": "link in getEnwikiTipLinks()",
        },
        [
            createText("{{ link.label }} "),
            createEnwikiTipLinkTemplate(),
            createEnwikiTipTextTemplate(),
        ],
    );
    return result;
}

/**
 * Creates one linked English Wikipedia helper value.
 *
 * @returns Helper link node.
 */
function createEnwikiTipLinkTemplate(): any {
    const result = createElement(
        "a",
        {
            "v-if": "link.url",
            "v-bind:href": "link.url",
            rel: "noopener noreferrer",
            target: "_blank",
        },
        [createText("{{ link.value }}")],
    );
    return result;
}

/**
 * Creates one plain English Wikipedia helper value.
 *
 * @returns Helper text node.
 */
function createEnwikiTipTextTemplate(): any {
    const result = createElement(
        "span",
        {
            "v-else": "",
        },
        [createText("{{ link.value }}")],
    );
    return result;
}
