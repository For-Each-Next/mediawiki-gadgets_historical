/* eslint-disable */

import {
    createActionFooterTemplate,
    createElement,
    createFieldTemplate,
    createIconActionLinkTemplate,
    createSourceUrlInputTemplate,
    createText,
} from "../template.js";

/**
 * Creates the localized name group template node.
 *
 * @returns {object} Localized name group template node.
 */
export function createNameGroupTemplate() {
    return createElement(
        "template",
        {
            "v-if": "group.nameGroupKey",
        },
        [createSteamNameHelperTemplate(), createNameFieldsTemplate()],
    );
}

/**
 * Creates the Steam localized name helper template node.
 *
 * @returns {object} Steam helper template node.
 */
function createSteamNameHelperTemplate() {
    return createElement(
        "div",
        {
            class: "create-vg-stub-steam-helper",
        },
        [
            createFieldTemplate("Steam app URL", [
                createElement("cdx-text-input", {
                    placeholder: "https://store.steampowered.com/app/...",
                    "v-bind:model-value": "steamUrl",
                    "v-on:update:model-value": "updateSteamUrl($event)",
                }),
            ]),
            createElement(
                "cdx-button",
                {
                    "v-bind:disabled": "sourceFetchState.loading",
                    "v-on:click": "addSteamNames",
                },
                [createText("Add Steam names")],
            ),
            createElement(
                "div",
                {
                    class:
                        "create-vg-stub-steam-suggestion " +
                        "create-vg-stub-horizontal-list",
                    "v-if": "fetchedSteamNameRows.length",
                },
                [
                    createElement(
                        "span",
                        {
                            class: "create-vg-stub-horizontal-list-item",
                            "v-bind:key": "suggestion.label",
                            "v-for":
                                "suggestion in getSteamNameSuggestions(fetchedSteamNameRows)",
                        },
                        [
                            createElement("strong", {}, [
                                createText("{{ suggestion.label }}"),
                            ]),
                            createText(" "),
                            createElement(
                                "a",
                                {
                                    "v-bind:href": "suggestion.url",
                                    rel: "noopener noreferrer",
                                    target: "_blank",
                                },
                                [createText("{{ suggestion.value }}")],
                            ),
                        ],
                    ),
                ],
            ),
            createElement("cdx-button-group", {
                class: "create-vg-stub-steam-actions",
                "v-if": "fetchedSteamNameRows.length",
                "v-bind:buttons": "steamNameButtons",
                "v-on:click": "applySteamNameChoice",
            }),
        ],
    );
}

/**
 * Creates the localized name field list template node.
 *
 * @returns {object} Localized name field list template node.
 */
function createNameFieldsTemplate() {
    return createElement(
        "div",
        {
            class: "create-vg-stub-name-fields",
        },
        [
            createElement(
                "template",
                {
                    "v-bind:key": "index",
                    "v-for": "(row, index) in form[group.nameGroupKey]",
                },
                [createNameFieldTemplate()],
            ),
            createActionFooterTemplate([
                createElement(
                    "template",
                    {
                        "v-if": "form[group.nameGroupKey].length > 1",
                    },
                    [
                        createIconActionLinkTemplate(
                            "Clear all localized names",
                            "tableActionIcons.remove",
                            "clearNameRows(group.nameGroupKey)",
                            {
                                class: "create-vg-stub-destructive-action",
                            },
                        ),
                    ],
                ),
                createIconActionLinkTemplate(
                    "Add localized name",
                    "tableActionIcons.cdxIconArticleAdd",
                    "addNameRow(group.nameGroupKey)",
                ),
            ]),
        ],
    );
}

/**
 * Creates one localized name fieldset.
 *
 * @returns {object} Localized name fieldset node.
 */
function createNameFieldTemplate() {
    return createElement(
        "cdx-field",
        {
            "is-fieldset": "",
        },
        [
            createNameSettingsRowTemplate(),
            createNameValueSourceTemplate(),
            createElement(
                "template",
                {
                    "v-slot:label": "",
                },
                [
                    createText("{{ 'Localized name ' + (index + 1) }} "),
                    createNameRemoveTemplate(),
                ],
            ),
        ],
    );
}

/**
 * Creates the localized name value/source row.
 *
 * @returns {object} Localized name value/source row node.
 */
function createNameValueSourceTemplate() {
    return createElement(
        "div",
        {
            class:
                "create-vg-stub-field-controls " +
                "create-vg-stub-field-controls--with-source",
        },
        [createNameTitleTemplate(), createNameSourceTemplate()],
    );
}

/**
 * Creates the localized name official/regions row.
 *
 * @returns {object} Localized name official/regions row node.
 */
function createNameSettingsRowTemplate() {
    return createElement(
        "div",
        {
            class: "create-vg-stub-name-settings-row",
        },
        [
            createElement(
                "cdx-checkbox",
                {
                    class: "create-vg-stub-name-official-checkbox",
                    "v-bind:model-value": "row.official",
                    "v-on:update:model-value":
                        "updateNameOfficial(group.nameGroupKey, index, $event)",
                },
                [createText("Official?")],
            ),
            createElement("span", {
                "aria-hidden": "true",
                class: "create-vg-stub-name-market-separator",
            }),
            createElement(
                "cdx-checkbox",
                {
                    "v-bind:key": "market.key",
                    "v-for": "market in nameMarkets",
                    "v-bind:model-value": "row[market.key]",
                    "v-on:update:model-value":
                        "updateNameMarket(group.nameGroupKey, index, market.key, $event)",
                },
                [createText("{{ market.label }}")],
            ),
        ],
    );
}

/**
 * Creates the localized name title input cell content.
 *
 * @returns {object} Localized name title input node.
 */
function createNameTitleTemplate() {
    return createElement("cdx-text-input", {
        placeholder: "Title",
        "v-bind:model-value": "row.name",
        "v-on:change": "updateNameRow(group.nameGroupKey, index, 'name')",
        "v-on:update:model-value":
            "updateNameRowValue(group.nameGroupKey, index, 'name', $event)",
    });
}

/**
 * Creates the localized name source row content.
 *
 * @returns {object} Localized name source input node.
 */
function createNameSourceTemplate() {
    return createSourceUrlInputTemplate({
        placeholder: "Source URLs",
        model: "row.sourceUrl",
        change: "updateNameRow(group.nameGroupKey, index, 'sourceUrl')",
        update: "updateNameRowValue(group.nameGroupKey, index, 'sourceUrl', $event)",
    });
}

/**
 * Creates the localized name remove row action.
 *
 * @returns {object} Localized name remove row action.
 */
function createNameRemoveTemplate() {
    return createIconActionLinkTemplate(
        "Remove localized name",
        "tableActionIcons.remove",
        "removeNameRow(group.nameGroupKey, index)",
        {
            class: "create-vg-stub-destructive-action",
        },
    );
}
