/* eslint-disable */

import {
    createActionFooterTemplate,
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
                "div",
                {
                    class: "create-vg-stub-citation",
                    "v-bind:key": "citation.sourceUrl",
                    "v-for": "(citation, citationIndex) in form.citationRows",
                },
                [
                    createTableTemplate(
                        "citationTableColumns",
                        "getCitationParamTableRows(citation)",
                        createCitationParamSlotsTemplate(),
                        {
                            "v-bind:caption": "'Reference ' + citation.index",
                        },
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
            "'Reference ' + citation.index",
            [
                createIconActionLinkTemplate(
                    "Reset",
                    "tableActionIcons.regenerate",
                    "resetCitation(citationIndex)",
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
                createActionFooterTemplate([
                    createIconActionLinkTemplate(
                        "Add param",
                        "tableActionIcons.cdxIconArticleAdd",
                        "addCitationParam(citationIndex)",
                    ),
                ]),
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
