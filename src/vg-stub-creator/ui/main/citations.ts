import {
    createElement,
    createIconActionLinkTemplate,
    createMessageTemplate,
    createTableHeaderTemplate,
    createTableTemplate,
    createText,
} from "#me/ui/template.ts";
import { msg } from "#me/i18n/index.ts";

/**
 * Creates the editable citation management template node.
 *
 * @returns Citation management template node.
 */
export function createCitationGroupTemplate(): any {
    const messageG = msg("references.empty");
    const textResultA = [createText(messageG)];
    const elementResultA = [
        createElement(
            "p",
            {
                "v-if": "form.citationRows.length === 0",
            },
            textResultA,
        ),
        createCitationTabsTemplate(),
        createMessageTemplate(
            "citationState.error",
            "{{ citationState.error }}",
        ),
    ];
    const result = createElement(
        "template",
        {
            "v-if": "group.citationReview",
        },
        elementResultA,
    );
    return result;
}

/**
 * Creates the citation tabs container.
 *
 * @returns Citation tabs node.
 */
function createCitationTabsTemplate(): any {
    const citationTabResult = [createCitationTabTemplate()];
    const result = createElement(
        "cdx-tabs",
        {
            "v-if": "form.citationRows.length",
            "v-bind:key": "getCitationTabsKey(form.citationRows)",
            "v-model:active": "activeCitationTab",
        },
        citationTabResult,
    );
    return result;
}

/**
 * Creates one citation tab.
 *
 * @returns Citation tab node.
 */
function createCitationTabTemplate(): any {
    const citationTableResult = [createCitationTableTemplate()];
    const result = createElement(
        "cdx-tab",
        {
            class: "vg-stub-creator-citation",
            "v-bind:key": "citation.sourceUrl",
            "v-bind:label": "getCitationTabLabel(citation)",
            "v-bind:name": "getCitationTabName(citation, citationIndex)",
            "v-for": "(citation, citationIndex) in form.citationRows",
        },
        citationTableResult,
    );
    return result;
}

/**
 * Creates the citation parameter table.
 *
 * @returns Citation table node.
 */
function createCitationTableTemplate(): any {
    const citationParamSlotsResult = createCitationParamSlotsTemplate();
    const result = createTableTemplate(
        "citationTableColumns",
        "getCitationParamTableRows(citation)",
        citationParamSlotsResult,
        {
            "v-bind:caption": "getCitationTabLabel(citation)",
        },
    );
    return result;
}

/**
 * Creates one editable citation parameter row template.
 *
 * @returns Citation parameter row template node.
 */
function createCitationParamSlotsTemplate(): any {
    const citationHeaderActionsResult = createCitationHeaderActions();
    const header = createTableHeaderTemplate(
        "getCitationTabLabel(citation)",
        citationHeaderActionsResult,
        { bindTitle: true },
    );

    const result = [
        header,
        createCitationNameSlotTemplate(),
        createCitationValueSlotTemplate(),
        createCitationActionSlotTemplate(),
        createCitationFooterTemplate(),
    ];
    return result;
}

/**
 * Creates citation-table header actions.
 *
 * @returns Citation-table header actions.
 */
function createCitationHeaderActions(): Array<any> {
    const refetchTitle = [msg("references.refetch")].join("");
    const messageF = msg("references.refetchAction");
    const refetch = createIconActionLinkTemplate(
        messageF,
        "tableActionIcons.regenerate",
        "refetchCitation(citationIndex)",
        {
            class: "vg-stub-creator-destructive-action",
            title: refetchTitle,
        },
    );
    const messageE = msg("common.clean");
    const clean = createIconActionLinkTemplate(
        messageE,
        "tableActionIcons.clean",
        "cleanCitationParams(citationIndex)",
    );
    const messageD = msg("references.addParameter");
    const add = createIconActionLinkTemplate(
        messageD,
        "tableActionIcons.cdxIconArticleAdd",
        "addCitationParam(citationIndex)",
    );

    return [refetch, clean, add];
}

/**
 * Creates the citation parameter-name slot.
 *
 * @returns Parameter-name slot node.
 */
function createCitationNameSlotTemplate(): any {
    const messageC = {
        placeholder: msg("references.parameterName"),
        "v-bind:model-value": "row.param.name",
        "v-on:change": "sortCitation(citationIndex)",
        "v-on:update:model-value": [
            "updateCitationParam(citationIndex,",
            " row.index, 'name', $event)",
        ].join(""),
    };
    const result = createInputSlotTemplate("name", messageC);
    return result;
}

/**
 * Creates the citation parameter-value slot.
 *
 * @returns Parameter-value slot node.
 */
function createCitationValueSlotTemplate(): any {
    const messageB = {
        placeholder: msg("common.value"),
        "v-bind:model-value": "row.param.value",
        "v-on:change": "sortCitation(citationIndex)",
        "v-on:update:model-value": [
            "updateCitationParam(citationIndex,",
            " row.index, 'value', $event)",
        ].join(""),
    };
    const result = createInputSlotTemplate("value", messageB);
    return result;
}

/**
 * Creates the citation row action slot.
 *
 * @returns Citation action slot node.
 */
function createCitationActionSlotTemplate(): any {
    const message = msg("common.reset");
    const messageA = msg("common.remove");
    const iconActionLinkResult = [
        createIconActionLinkTemplate(
            message,
            "tableActionIcons.regenerate",
            "resetCitationParam(citationIndex, row.index)",
            {
                "v-if": "row.index < citation.params.length",
            },
        ),
        createIconActionLinkTemplate(
            messageA,
            "tableActionIcons.remove",
            "removeCitationParam(citationIndex, row.index)",
            {
                class: "vg-stub-creator-destructive-action",
                "v-if": "row.index < citation.params.length",
            },
        ),
    ];
    const result = createSlotTemplate("actions", iconActionLinkResult);
    return result;
}

/**
 * Creates the citation table footer.
 *
 * @returns Citation footer slot node.
 */
function createCitationFooterTemplate(): any {
    const citationSourceLinkResult = [createCitationSourceLinkTemplate()];
    const result = createElement(
        "template",
        {
            "v-slot:footer": "",
        },
        citationSourceLinkResult,
    );
    return result;
}

/**
 * Creates the citation source link.
 *
 * @returns Citation source link node.
 */
function createCitationSourceLinkTemplate(): any {
    const textResult = [createText("{{ citation.sourceUrl }}")];
    const result = createElement(
        "a",
        {
            "v-bind:href": "citation.sourceUrl",
            rel: "noopener noreferrer",
            target: "_blank",
        },
        textResult,
    );
    return result;
}

/**
 * Creates a table slot containing a text input.
 *
 * @param column - Column slot suffix.
 * @param attributes - Text input attributes.
 * @returns Text input slot node.
 */
function createInputSlotTemplate(column: string, attributes: any): any {
    const elementResult = [createElement("cdx-text-input", attributes)];
    const result = createSlotTemplate(column, elementResult);
    return result;
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
    const result = createElement(
        "template",
        {
            [`v-slot:item-${column}`]: "{ row }",
        },
        children,
    );
    return result;
}
