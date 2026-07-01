/* eslint-disable */

import {
    createElement,
    createFieldTemplate,
    createPreviewCardTemplate,
    createSourceUrlInputTemplate,
    createTableTemplate,
    createText,
} from "../template.js";

/**
 * Creates the article field group template node.
 *
 * @returns {object} Article field group template node.
 */
export function createFieldGroupTemplate() {
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
 * @returns {object} Individual field list template node.
 */
function createIndividualFieldsTemplate() {
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
 * @returns {object} Metadata field template node.
 */
function createMetadataFieldsTemplate() {
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
 * @returns {object} Default field template node.
 */
function createDefaultFieldsTemplate() {
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
 * @returns {object} Metadata field table node.
 */
function createMetadataFieldTableTemplate() {
    return createTableTemplate(
        "metadataTableColumns",
        "getMetadataFieldTableRows(group)",
        createMetadataFieldTableSlotsTemplate(),
        {
            class: "create-vg-stub-metadata-table",
            caption: "Metadata fields",
        },
    );
}

/**
 * Creates Codex table slots for metadata source-backed fields.
 *
 * @returns {Array<object>} Metadata table slot nodes.
 */
function createMetadataFieldTableSlotsTemplate() {
    return [
        createElement(
            "template",
            {
                "v-slot:item-label": "{ row }",
            },
            [createText("{{ row.field.label }}")],
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
 * @returns {object} Grouped fieldset template node.
 */
function createGroupedFieldsetTemplate() {
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
                    class: "create-vg-stub-fieldset-fields",
                },
                [
                    createElement(
                        "template",
                        {
                            "v-bind:key": "field.key",
                            "v-for": "field in group.fields",
                        },
                        [createGroupedFieldTemplate()],
                    ),
                ],
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
 * Creates an unlabeled field within a grouped fieldset.
 *
 * @returns {object} Grouped field template node.
 */
function createGroupedFieldTemplate() {
    return createElement(
        "div",
        {
            class: "create-vg-stub-fieldset-field",
        },
        [createFieldControlsTemplate()],
    );
}

/**
 * Creates the metadata wikitext preview card.
 *
 * @returns {object} Metadata preview card node.
 */
function createMetadataPreviewTemplate() {
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
 * @returns {object} Full prose review card node.
 */
function createFullTextPreviewTemplate() {
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
 * @returns {object} Compact article field template node.
 */
function createCompactFieldTemplate() {
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
 * @returns {object} Standard article field template node.
 */
function createStandardFieldTemplate() {
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
 * @param {object} [options] - Control options.
 * @param {string} [options.placeholder] - Placeholder Vue expression.
 * @returns {object} Field controls node.
 */
function createFieldControlsTemplate(options = {}) {
    const placeholder =
        options.placeholder ||
        "getFieldPlaceholder(field) || field.placeholder";

    return createElement(
        "div",
        {
            class: "create-vg-stub-field-controls",
            "v-bind:class":
                "{ " +
                "'create-vg-stub-field-controls--with-source': field.sourceField, " +
                "'create-vg-stub-field-controls--with-move': field.key === 'name' " +
                "}",
        },
        [
            createElement(
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
            ),
            createElement(
                "template",
                {
                    "v-else": "",
                },
                [
                    createArticleFieldValueInputTemplate({
                        placeholder,
                    }),
                    createElement(
                        "cdx-button",
                        {
                            "v-if": "field.key === 'name'",
                            "v-bind:disabled": "sourceFetchState.loading",
                            "v-on:click": "openMoveDialog",
                        },
                        [createText("Move")],
                    ),
                ],
            ),
            createElement(
                "template",
                {
                    "v-if": "field.sourceField",
                },
                [
                    createSourceUrlInputTemplate({
                        placeholder: "Source URLs",
                        model: "form[field.sourceField.sourceKey]",
                        change: "trimSourceValue(field.sourceField)",
                        update: "updateSourceValue(field.sourceField, $event)",
                    }),
                ],
            ),
        ],
    );
}

/**
 * Creates the value input for one article field.
 *
 * @param {object} [options] - Input options.
 * @param {string} [options.field] - Field Vue expression.
 * @param {boolean} [options.multiline] - Whether to render a textarea.
 * @param {string} [options.placeholder] - Placeholder Vue expression.
 * @returns {object} Article field value input node.
 */
function createArticleFieldValueInputTemplate(options = {}) {
    const field = options.field || "field";
    const placeholder =
        options.placeholder ||
        `getFieldPlaceholder(${field}) || ${field}.placeholder`;

    if (options.multiline) {
        return createElement("cdx-text-area", {
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
 * @returns {Array<object|string>} English Wikipedia help text nodes.
 */
function createEnwikiHelpTextTemplate() {
    return [
        createElement(
            "template",
            {
                "v-if": "getEnwikiTipLinks().length",
            },
            [
                createElement(
                    "span",
                    {
                        class:
                            "create-vg-stub-enwiki-help " +
                            "create-vg-stub-horizontal-list",
                    },
                    [
                        createElement(
                            "span",
                            {
                                class: "create-vg-stub-horizontal-list-item",
                                "v-bind:key": "link.label",
                                "v-for": "link in getEnwikiTipLinks()",
                            },
                            [
                                createText("{{ link.label }} "),
                                createElement(
                                    "a",
                                    {
                                        "v-if": "link.url",
                                        "v-bind:href": "link.url",
                                        rel: "noopener noreferrer",
                                        target: "_blank",
                                    },
                                    [createText("{{ link.value }}")],
                                ),
                                createElement(
                                    "span",
                                    {
                                        "v-else": "",
                                    },
                                    [createText("{{ link.value }}")],
                                ),
                            ],
                        ),
                    ],
                ),
            ],
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
