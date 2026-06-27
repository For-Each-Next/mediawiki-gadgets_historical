/* eslint-disable */

import { createElement, createText } from "../template/nodes.js";

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
                    createElement("h3", {}, [
                        createText("Reference {{ citation.index }}"),
                    ]),
                    createElement(
                        "p",
                        {
                            class: "create-vg-stub-wikitext-preview",
                        },
                        [createText("{{ citation.sourceUrl }}")],
                    ),
                    createElement(
                        "div",
                        {
                            class: "create-vg-stub-citation-grid",
                        },
                        [createCitationParamRowTemplate()],
                    ),
                    createElement(
                        "div",
                        {
                            class: "create-vg-stub-citation-actions",
                        },
                        [
                            createElement(
                                "cdx-button",
                                {
                                    "v-on:click":
                                        "resetCitation(citationIndex)",
                                },
                                [createText("Reset")],
                            ),
                            createElement(
                                "cdx-button",
                                {
                                    "v-on:click":
                                        "addCitationParam(citationIndex)",
                                },
                                [createText("Add param")],
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
function createCitationParamRowTemplate() {
    return createElement(
        "template",
        {
            "v-bind:key": "paramIndex",
            "v-for":
                "(param, paramIndex) in getCitationParamRows(citation)",
        },
        [
            createElement("cdx-text-input", {
                placeholder: "Field name",
                "v-bind:model-value": "param.name",
                "v-on:change":
                    "sortCitation(citationIndex)",
                "v-on:update:model-value":
                    "updateCitationParam(citationIndex, paramIndex, 'name', $event)",
            }),
            createElement("cdx-text-input", {
                placeholder: "Value",
                "v-bind:model-value": "param.value",
                "v-on:change":
                    "sortCitation(citationIndex)",
                "v-on:update:model-value":
                    "updateCitationParam(citationIndex, paramIndex, 'value', $event)",
            }),
            createElement(
                "cdx-button",
                {
                    "v-bind:disabled": "paramIndex >= citation.params.length",
                    "v-on:click":
                        "removeCitationParam(citationIndex, paramIndex)",
                },
                [createText("Remove")],
            ),
        ],
    );
}
