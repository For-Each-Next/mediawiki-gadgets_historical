import {
    createButtonTemplate,
    createElement,
    createFieldTemplate,
    createPreviewCardTemplate,
    createSourceUrlInputTemplate,
    createTableTemplate,
    createText,
} from "../template.ts";


/**
 * Creates the article field group template node.
 *
 * @returns Article field group template node.
 */
export function createFieldGroupTemplate(): any {
    return createElement(
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
}


/**
 * Creates independently labelled article fields.
 *
 * @returns Individual field list template node.
 */
function createIndividualFieldsTemplate(): any {
    return createElement(
        "template",
        {
            "v-if": "!group.fieldsetLabel",
        },
        [createMetadataFieldsTemplate(), createDefaultFieldsTemplate()],
    );
}


/**
 * Creates the metadata fields with the source-backed rows in a table.
 *
 * @returns Metadata field template node.
 */
function createMetadataFieldsTemplate(): any {
    return createElement(
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
}


/**
 * Creates the default stacked fields for non-special groups.
 *
 * @returns Default field template node.
 */
function createDefaultFieldsTemplate(): any {
    return createElement(
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
}


/**
 * Creates the metadata source-backed field table.
 *
 * @returns Metadata field table node.
 */
function createMetadataFieldTableTemplate(): any {
    return createTableTemplate(
        "metadataTableColumns",
        "getMetadataFieldTableRows(group)",
        createMetadataFieldTableSlotsTemplate(),
        {
            class: "vg-stub-creator-metadata-table",
            caption: "Metadata fields",
        },
    );
}


/**
 * Creates Codex table slots for metadata source-backed fields.
 *
 * @returns Metadata table slot nodes.
 */
function createMetadataFieldTableSlotsTemplate(): Array<any> {
    return [
        createElement(
            "template",
            {
                "v-slot:item-label": "{ row }",
            },
            [createText("{{ getMetadataFieldLabel(row.field) }}")],
        ),
        createElement(
            "template",
            {
                "v-slot:item-value": "{ row }",
            },
            [createArticleFieldValueInputTemplate({ field: "row.field" })],
        ),
        createElement(
            "template",
            {
                "v-slot:item-source": "{ row }",
            },
            [
                createSourceUrlInputTemplate({
                    placeholder: "Source URLs",
                    model: "form[row.field.sourceField.sourceKey]",
                    change: "trimSourceValue(row.field.sourceField)",
                    update: "updateSourceValue(row.field.sourceField, $event)",
                }),
            ],
        ),
    ];
}


/**
 * Creates one labelled fieldset for a group of related article fields.
 *
 * @returns Grouped fieldset template node.
 */
function createGroupedFieldsetTemplate(): any {
    return createElement(
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
}


/**
 * Creates the grouped field loop template.
 *
 * @returns Grouped field loop node.
 */
function createGroupedFieldListTemplate(): any {
    return createElement(
        "template",
        {
            "v-bind:key": "field.key",
            "v-for": "field in group.fields",
        },
        [createGroupedFieldTemplate()],
    );
}


/**
 * Creates an unlabeled field within a grouped fieldset.
 *
 * @returns Grouped field template node.
 */
function createGroupedFieldTemplate(): any {
    return createElement(
        "div",
        {
            class: "vg-stub-creator-fieldset-field",
        },
        [createFieldControlsTemplate()],
    );
}


/**
 * Creates the metadata wikitext preview card.
 *
 * @returns Metadata preview card node.
 */
function createMetadataPreviewTemplate(): any {
    return createPreviewCardTemplate(
        "Wikitext preview",
        "getGroupPreview(group)",
        {
            condition: "group.previewKey && getGroupPreview(group)",
        },
    );
}


/**
 * Creates the full generated prose review card.
 *
 * @returns Full prose review card node.
 */
function createFullTextPreviewTemplate(): any {
    return createPreviewCardTemplate(
        "Full text review",
        "getProseWikitext()",
        {
            condition: "group.fullTextReview && getProseWikitext()",
            description: "getProseSinographs() + ' equivalent sinographs'",
        },
    );
}


/**
 * Creates a compact article field template node.
 *
 * @returns Compact article field template node.
 */
function createCompactFieldTemplate(): any {
    return createElement(
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
}


/**
 * Creates a standard article field template node.
 *
 * @returns Standard article field template node.
 */
function createStandardFieldTemplate(): any {
    return createFieldTemplate(
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

    return createElement(
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
}


/**
 * Creates the multiline article field branch.
 *
 * @param placeholder - Placeholder Vue expression.
 * @returns Multiline branch node.
 */
function createMultilineFieldBranchTemplate(placeholder: string): any {
    return createElement(
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
}


/**
 * Creates the single-line article field branch.
 *
 * @param placeholder - Placeholder Vue expression.
 * @returns Single-line branch node.
 */
function createSingleLineFieldBranchTemplate(placeholder: string): any {
    return createElement(
        "template",
        {
            "v-else": "",
        },
        [
            createArticleFieldValueInputTemplate({ placeholder }),
            createMovePageButtonTemplate(),
        ],
    );
}


/**
 * Creates the optional source URL field branch.
 *
 * @returns Source branch node.
 */
function createSourceUrlFieldBranchTemplate(): any {
    return createElement(
        "template",
        {
            "v-if": "field.sourceField",
        },
        [createSourceUrlInputTemplate(createSourceUrlFieldOptions())],
    );
}


/**
 * Creates source URL field options.
 *
 * @returns Source URL field options.
 */
function createSourceUrlFieldOptions(): any {
    return {
        change: "trimSourceValue(field.sourceField)",
        model: "form[field.sourceField.sourceKey]",
        placeholder: "Source URLs",
        update: "updateSourceValue(field.sourceField, $event)",
    };
}


/**
 * Creates the page move button.
 *
 * @returns Page move button node.
 */
function createMovePageButtonTemplate(): any {
    return createButtonTemplate({
        click: "openMoveDialog",
        disabled: "sourceFetchState.loading",
        label: "Move",
        show: "field.key === 'pageName' && canMovePageName()",
    });
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
        return createElement("cdx-text-area", {
            class: "vg-stub-creator-article-field-text",
            rows: "1",
            "v-bind:placeholder": placeholder,
            "v-bind:model-value": `form[${field}.key]`,
            "v-on:change": `normalizeFieldValue(${field})`,
            "v-on:update:model-value": `updateFieldValue(${field}, $event)`,
        });
    }

    return createElement("cdx-text-input", {
        "v-bind:placeholder": placeholder,
        "v-bind:readonly": `${field}.readonly`,
        "v-bind:model-value": `form[${field}.key]`,
        "v-on:change": `normalizeFieldValue(${field})`,
        "v-on:paste": `normalizePastedFieldValue(${field}, $event)`,
        "v-on:update:model-value": `updateFieldValue(${field}, $event)`,
    });
}


/**
 * Creates the English Wikipedia field help text.
 *
 * @returns English Wikipedia help text nodes.
 */
function createEnwikiHelpTextTemplate(): Array<any | string> {
    return [
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
            [createText("Wikidata: {{ getWikidataText() }}")],
        ),
    ];
}


/**
 * Creates the English Wikipedia helper link list.
 *
 * @returns Helper link list node.
 */
function createEnwikiTipListTemplate(): any {
    return createElement(
        "span",
        {
            class:
                "vg-stub-creator-enwiki-help " +
                "vg-stub-creator-horizontal-list",
        },
        [createEnwikiTipItemTemplate()],
    );
}


/**
 * Creates one English Wikipedia helper item.
 *
 * @returns Helper item node.
 */
function createEnwikiTipItemTemplate(): any {
    return createElement(
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
}


/**
 * Creates one linked English Wikipedia helper value.
 *
 * @returns Helper link node.
 */
function createEnwikiTipLinkTemplate(): any {
    return createElement(
        "a",
        {
            "v-if": "link.url",
            "v-bind:href": "link.url",
            rel: "noopener noreferrer",
            target: "_blank",
        },
        [createText("{{ link.value }}")],
    );
}


/**
 * Creates one plain English Wikipedia helper value.
 *
 * @returns Helper text node.
 */
function createEnwikiTipTextTemplate(): any {
    return createElement(
        "span",
        {
            "v-else": "",
        },
        [createText("{{ link.value }}")],
    );
}
