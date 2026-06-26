/* eslint-disable */

import {
    createElement,
    createFieldPreviewTemplate,
    createSourceUrlInputTemplate,
    createText,
} from "../template/nodes.js";

/**
 * Creates the article field group template node.
 *
 * @returns {object} Article field group template node.
 */
export function createFieldGroupTemplate() {
    return createElement(
        "template",
        {
            "v-if": "!group.nameGroupKey",
        },
        [
            createElement(
                "template",
                {
                    "v-bind:key": "field.key",
                    "v-for": "field in group.fields",
                },
                [
                    createCompactFieldTemplate(),
                    createStandardFieldTemplate(),
                    createWikidataNoteTemplate(),
                    createFieldPreviewTemplate(),
                ],
            ),
        ],
    );
}

/**
 * Creates a compact article field template node.
 *
 * @returns {object} Compact article field template node.
 */
function createCompactFieldTemplate() {
    return createElement(
        "div",
        {
            class: "create-vg-stub-field-row",
            "v-if": "field.compact",
        },
        [
            createFieldSeparatorTemplate("compact"),
            createElement(
                "div",
                {
                    class: "create-vg-stub-field-label",
                },
                [createText("{{ field.heading || field.label }}")],
            ),
            createElement(
                "div",
                {
                    class: "create-vg-stub-field-controls",
                },
                [
                    createElement("cdx-text-input", {
                        "v-bind:placeholder": "field.placeholder",
                        "v-bind:model-value": "form[field.key]",
                        "v-on:change": "normalizeFieldValue(field)",
                        "v-on:update:model-value":
                            "updateFieldValue(field, $event)",
                    }),
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
    return createElement(
        "div",
        {
            class: "create-vg-stub-field-row",
            "v-else-if": "!field.compact",
        },
        [
            createFieldSeparatorTemplate(),
            createElement(
                "div",
                {
                    class: "create-vg-stub-field-label",
                },
                [createText("{{ field.label }}")],
            ),
            createElement(
                "div",
                {
                    class: "create-vg-stub-field-controls",
                },
                [
                    createElement(
                        "template",
                        {
                            "v-if": "field.multiline",
                        },
                        [
                            createElement("cdx-text-area", {
                                rows: "1",
                                "v-bind:placeholder":
                                    "getFieldPlaceholder(field) || field.placeholder",
                                "v-bind:model-value": "form[field.key]",
                                "v-on:change": "normalizeFieldValue(field)",
                                "v-on:update:model-value":
                                    "updateFieldValue(field, $event)",
                            }),
                        ],
                    ),
                    createElement(
                        "template",
                        {
                            "v-else": "",
                        },
                        [
                            createElement("cdx-text-input", {
                                "v-bind:placeholder":
                                    "getFieldPlaceholder(field) || field.placeholder",
                                "v-bind:readonly": "field.readonly",
                                "v-bind:model-value": "form[field.key]",
                                "v-on:change": "normalizeFieldValue(field)",
                                "v-on:paste":
                                    "normalizePastedFieldValue(field, $event)",
                                "v-on:update:model-value":
                                    "updateFieldValue(field, $event)",
                            }),
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
            ),
        ],
    );
}

/**
 * Creates the Wikidata note template node after the Enwiki title field.
 *
 * @returns {object} Wikidata note template node.
 */
function createWikidataNoteTemplate() {
    return createElement(
        "div",
        {
            class:
                "create-vg-stub-wikitext-preview " +
                "create-vg-stub-field-note create-vg-stub-horizontal-list",
            "v-if": "field.key === 'enwikiTitle'",
        },
        [
            createElement(
                "template",
                {
                    "v-if": "getEnwikiTipLinks().length",
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
                            createElement("strong", {}, [
                                createText("{{ link.label }}"),
                            ]),
                            createText(" "),
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
            createElement(
                "template",
                {
                    "v-else": "",
                },
                [createText("Wikidata: {{ getWikidataText() }}")],
            ),
        ],
    );
}

/**
 * Creates a field separator template node.
 *
 * @param {string} [variant] - Separator display variant.
 * @returns {object} Field separator template node.
 */
function createFieldSeparatorTemplate(variant) {
    return createElement("hr", {
        class: [
            "create-vg-stub-field-separator",
            variant === "compact"
                ? "create-vg-stub-field-separator-compact"
                : "",
        ]
            .filter(Boolean)
            .join(" "),
        "v-if": "field.breakBefore",
    });
}
