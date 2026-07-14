/* eslint-disable */

import {
    createElement,
    createIconActionLinkTemplate,
    createMessageTemplate,
    createTableHeaderTemplate,
    createTableTemplate,
    createText,
} from "../template.js";

/**
 * Creates the editable citation management template node.
 *
 * @returns {object} Citation management template node.
 */
export function createCitationGroupTemplate() {
    return createElement(
        "template",
        {
            "v-if": "group.citationReview",
        },
        [
            createElement(
                "p",
                {
                    "v-if": "form.citationRows.length === 0",
                },
                [createText("Add source URLs to article fields.")],
            ),
            createCitationTabsTemplate(),
            createMessageTemplate(
                "citationState.error",
                "{{ citationState.error }}",
            ),
        ],
    );
}

/**
 * Creates the citation tabs container.
 *
 * @returns {object} Citation tabs node.
 */
function createCitationTabsTemplate() {
    return createElement(
        "cdx-tabs",
        {
            "v-if": "form.citationRows.length",
            "v-bind:key": "getCitationTabsKey(form.citationRows)",
            "v-model:active": "activeCitationTab",
        },
        [createCitationTabTemplate()],
    );
}

/**
 * Creates one citation tab.
 *
 * @returns {object} Citation tab node.
 */
function createCitationTabTemplate() {
    return createElement(
        "cdx-tab",
        {
            class: "vg-stub-creator-citation",
            "v-bind:key": "citation.sourceUrl",
            "v-bind:label": "getCitationTabLabel(citation)",
            "v-bind:name": "getCitationTabName(citation, citationIndex)",
            "v-for": "(citation, citationIndex) in form.citationRows",
        },
        [createCitationTableTemplate()],
    );
}

/**
 * Creates the citation parameter table.
 *
 * @returns {object} Citation table node.
 */
function createCitationTableTemplate() {
    return createTableTemplate(
        "citationTableColumns",
        "getCitationParamTableRows(citation)",
        createCitationParamSlotsTemplate(),
        {
            "v-bind:caption": "getCitationTabLabel(citation)",
        },
    );
}

/**
 * Creates one editable citation parameter row template.
 *
 * @returns {object} Citation parameter row template node.
 */
function createCitationParamSlotsTemplate() {
    return [
        createTableHeaderTemplate(
            "getCitationTabLabel(citation)",
            [
                createIconActionLinkTemplate(
                    "Re-fetch",
                    "tableActionIcons.regenerate",
                    "refetchCitation(citationIndex)",
                    {
                        class: "vg-stub-creator-destructive-action",
                        title: "Re-fetch citation template data and overwrite edited parameters",
                    },
                ),
                createIconActionLinkTemplate(
                    "Remove empty rows",
                    "tableActionIcons.clean",
                    "cleanCitationParams(citationIndex)",
                ),
                createIconActionLinkTemplate(
                    "Add parameter",
                    "tableActionIcons.cdxIconArticleAdd",
                    "addCitationParam(citationIndex)",
                ),
            ],
            {
                bindTitle: true,
            },
        ),
        createCitationNameSlotTemplate(),
        createCitationValueSlotTemplate(),
        createCitationActionSlotTemplate(),
        createCitationFooterTemplate(),
    ];
}

/**
 * Creates the citation parameter-name slot.
 *
 * @returns {object} Parameter-name slot node.
 */
function createCitationNameSlotTemplate() {
    return createInputSlotTemplate("name", {
        placeholder: "Field name",
        "v-bind:model-value": "row.param.name",
        "v-on:change": "sortCitation(citationIndex)",
        "v-on:update:model-value":
            "updateCitationParam(citationIndex, row.index, 'name', $event)",
    });
}

/**
 * Creates the citation parameter-value slot.
 *
 * @returns {object} Parameter-value slot node.
 */
function createCitationValueSlotTemplate() {
    return createInputSlotTemplate("value", {
        placeholder: "Value",
        "v-bind:model-value": "row.param.value",
        "v-on:change": "sortCitation(citationIndex)",
        "v-on:update:model-value":
            "updateCitationParam(citationIndex, row.index, 'value', $event)",
    });
}

/**
 * Creates the citation row action slot.
 *
 * @returns {object} Citation action slot node.
 */
function createCitationActionSlotTemplate() {
    return createSlotTemplate("actions", [
        createIconActionLinkTemplate(
            "Reset",
            "tableActionIcons.regenerate",
            "resetCitationParam(citationIndex, row.index)",
            {
                "v-if": "row.index < citation.params.length",
            },
        ),
        createIconActionLinkTemplate(
            "Remove",
            "tableActionIcons.remove",
            "removeCitationParam(citationIndex, row.index)",
            {
                class: "vg-stub-creator-destructive-action",
                "v-if": "row.index < citation.params.length",
            },
        ),
    ]);
}

/**
 * Creates the citation table footer.
 *
 * @returns {object} Citation footer slot node.
 */
function createCitationFooterTemplate() {
    return createElement(
        "template",
        {
            "v-slot:footer": "",
        },
        [createCitationSourceLinkTemplate()],
    );
}

/**
 * Creates the citation source link.
 *
 * @returns {object} Citation source link node.
 */
function createCitationSourceLinkTemplate() {
    return createElement(
        "a",
        {
            "v-bind:href": "citation.sourceUrl",
            rel: "noopener noreferrer",
            target: "_blank",
        },
        [createText("{{ citation.sourceUrl }}")],
    );
}

/**
 * Creates a table slot containing a text input.
 *
 * @param {string} column - Column slot suffix.
 * @param {object} attributes - Text input attributes.
 * @returns {object} Text input slot node.
 */
function createInputSlotTemplate(column, attributes) {
    return createSlotTemplate(column, [
        createElement("cdx-text-input", attributes),
    ]);
}

/**
 * Creates a table slot.
 *
 * @param {string} column - Column slot suffix.
 * @param {Array<object|string>} children - Slot children.
 * @returns {object} Table slot node.
 */
function createSlotTemplate(column, children) {
    return createElement(
        "template",
        {
            [`v-slot:item-${column}`]: "{ row }",
        },
        children,
    );
}
