/* eslint-disable */

import {
    createElement,
    createIconActionLinkTemplate,
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
                [createText("No source URLs entered.")],
            ),
            createElement(
                "cdx-tabs",
                {
                    "v-if": "form.citationRows.length",
                    "v-bind:key": "getCitationTabsKey(form.citationRows)",
                    "v-model:active": "activeCitationTab",
                },
                [
                    createElement(
                        "cdx-tab",
                        {
                            class: "create-vg-stub-citation",
                            "v-bind:key": "citation.sourceUrl",
                            "v-bind:label": "getCitationTabLabel(citation)",
                            "v-bind:name":
                                "getCitationTabName(citation, citationIndex)",
                            "v-for":
                                "(citation, citationIndex) in form.citationRows",
                        },
                        [
                            createTableTemplate(
                                "citationTableColumns",
                                "getCitationParamTableRows(citation)",
                                createCitationParamSlotsTemplate(),
                                {
                                    "v-bind:caption":
                                        "getCitationTabLabel(citation)",
                                },
                            ),
                        ],
                    ),
                ],
            ),
            createElement(
                "p",
                {
                    class: "create-vg-stub-error",
                    "v-if": "citationState.error",
                },
                [createText("{{ citationState.error }}")],
            ),
        ],
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
                    "Reset",
                    "tableActionIcons.regenerate",
                    "resetCitation(citationIndex)",
                ),
                createIconActionLinkTemplate(
                    "Clean",
                    "tableActionIcons.clean",
                    "cleanCitationParams(citationIndex)",
                ),
                createIconActionLinkTemplate(
                    "Add param",
                    "tableActionIcons.cdxIconArticleAdd",
                    "addCitationParam(citationIndex)",
                ),
            ],
            {
                bindTitle: true,
            },
        ),
        createElement(
            "template",
            {
                "v-slot:item-name": "{ row }",
            },
            [
                createElement("cdx-text-input", {
                    placeholder: "Field name",
                    "v-bind:model-value": "row.param.name",
                    "v-on:change": "sortCitation(citationIndex)",
                    "v-on:update:model-value":
                        "updateCitationParam(citationIndex, row.index, 'name', $event)",
                }),
            ],
        ),
        createElement(
            "template",
            {
                "v-slot:item-value": "{ row }",
            },
            [
                createElement("cdx-text-input", {
                    placeholder: "Value",
                    "v-bind:model-value": "row.param.value",
                    "v-on:change": "sortCitation(citationIndex)",
                    "v-on:update:model-value":
                        "updateCitationParam(citationIndex, row.index, 'value', $event)",
                }),
            ],
        ),
        createElement(
            "template",
            {
                "v-slot:item-actions": "{ row }",
            },
            [
                createIconActionLinkTemplate(
                    "Remove",
                    "tableActionIcons.remove",
                    "removeCitationParam(citationIndex, row.index)",
                    {
                        class: "create-vg-stub-destructive-action",
                        "v-if": "row.index < citation.params.length",
                    },
                ),
            ],
        ),
        createElement(
            "template",
            {
                "v-slot:footer": "",
            },
            [
                createElement(
                    "a",
                    {
                        "v-bind:href": "citation.sourceUrl",
                        rel: "noopener noreferrer",
                        target: "_blank",
                    },
                    [createText("{{ citation.sourceUrl }}")],
                ),
            ],
        ),
    ];
}
