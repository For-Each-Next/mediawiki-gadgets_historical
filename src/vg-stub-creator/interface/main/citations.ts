import {
    createElement,
    createIconActionLinkTemplate,
    createMessageTemplate,
    createTableHeaderTemplate,
    createTableTemplate,
    createText,
} from "../template.ts";


/**
 * Creates the editable citation management template node.
 *
 * @returns Citation management template node.
 */
export function createCitationGroupTemplate(): any {
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
 * @returns Citation tabs node.
 */
function createCitationTabsTemplate(): any {
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
 * @returns Citation tab node.
 */
function createCitationTabTemplate(): any {
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
 * @returns Citation table node.
 */
function createCitationTableTemplate(): any {
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
 * @returns Citation parameter row template node.
 */
function createCitationParamSlotsTemplate(): any {
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
                        title: [
                            "Re-fetch citation template data an",
                            "d overwrite edited parameters",
                        ].join(""),
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
 * @returns Parameter-name slot node.
 */
function createCitationNameSlotTemplate(): any {
    return createInputSlotTemplate("name", {
        placeholder: "Field name",
        "v-bind:model-value": "row.param.name",
        "v-on:change": "sortCitation(citationIndex)",
        "v-on:update:model-value": [
            "updateCitationParam(citationIndex,",
            " row.index, 'name', $event)",
        ].join(""),
    });
}


/**
 * Creates the citation parameter-value slot.
 *
 * @returns Parameter-value slot node.
 */
function createCitationValueSlotTemplate(): any {
    return createInputSlotTemplate("value", {
        placeholder: "Value",
        "v-bind:model-value": "row.param.value",
        "v-on:change": "sortCitation(citationIndex)",
        "v-on:update:model-value": [
            "updateCitationParam(citationIndex,",
            " row.index, 'value', $event)",
        ].join(""),
    });
}


/**
 * Creates the citation row action slot.
 *
 * @returns Citation action slot node.
 */
function createCitationActionSlotTemplate(): any {
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
 * @returns Citation footer slot node.
 */
function createCitationFooterTemplate(): any {
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
 * @returns Citation source link node.
 */
function createCitationSourceLinkTemplate(): any {
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
 * @param column - Column slot suffix.
 * @param attributes - Text input attributes.
 * @returns Text input slot node.
 */
function createInputSlotTemplate(column: string, attributes: any): any {
    return createSlotTemplate(column, [
        createElement("cdx-text-input", attributes),
    ]);
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
    return createElement(
        "template",
        {
            [`v-slot:item-${column}`]: "{ row }",
        },
        children,
    );
}
