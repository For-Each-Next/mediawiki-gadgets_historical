/* eslint-disable */

import {
    createActionFooterTemplate,
    createElement,
    createSourceUrlInputTemplate,
    createText,
} from "../template/nodes.js";

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
        [
            createSteamNameHelperTemplate(),
            createNameRowTemplate(),
            createNameActionsTemplate(),
        ],
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
            createElement("cdx-text-input", {
                placeholder: "Steam app URL",
                "v-bind:model-value": "steamUrl",
                "v-on:update:model-value": "updateSteamUrl($event)",
            }),
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
            createElement(
                "div",
                {
                    class: "create-vg-stub-steam-actions",
                    "v-if": "fetchedSteamNameRows.length",
                },
                [
                    createElement(
                        "cdx-button",
                        {
                            "v-bind:key": "choice.key",
                            "v-for": "choice in steamNameChoices",
                            "v-on:click": "applySteamNameChoice(choice.key)",
                        },
                        [createText("{{ choice.label }}")],
                    ),
                ],
            ),
        ],
    );
}

/**
 * Creates localized name row action buttons.
 *
 * @returns {object} Localized name action button group node.
 */
function createNameActionsTemplate() {
    return createActionFooterTemplate(
        [
            createElement(
                "cdx-button",
                {
                    action: "progressive",
                    "v-on:click": "addNameRow(group.nameGroupKey)",
                    weight: "primary",
                },
                [createText("Add")],
            ),
            createElement(
                "cdx-button",
                {
                    "v-on:click": "clearNameRows(group.nameGroupKey)",
                },
                [createText("Clear")],
            ),
        ],
        {
            justifyContent: "flex-start",
        },
    );
}

/**
 * Creates a localized name row template node.
 *
 * @returns {object} Localized name row template node.
 */
function createNameRowTemplate() {
    return createElement(
        "div",
        {
            class: "create-vg-stub-name-row",
            "v-bind:key": "index",
            "v-for": "(row, index) in form[group.nameGroupKey]",
        },
        [
            createElement(
                "div",
                {
                    class: "create-vg-stub-name-controls",
                },
                [createNameMarketTemplate(), createNameInputTemplate()],
            ),
        ],
    );
}

/**
 * Creates the localized name market checkbox group template node.
 *
 * @returns {object} Localized name market checkbox group node.
 */
function createNameMarketTemplate() {
    return createElement(
        "div",
        {
            style: {
                display: "flex",
                flexWrap: "wrap",
                gap: "0.75em",
                marginBottom: "0.5em",
            },
        },
        [
            createElement(
                "cdx-checkbox",
                {
                    "v-model": "row.official",
                },
                [createText("Official")],
            ),
            createElement(
                "span",
                {
                    class: "create-vg-stub-name-market-label",
                },
                [createText("Regions:")],
            ),
            createElement(
                "cdx-checkbox",
                {
                    "v-bind:key": "market.key",
                    "v-for": "market in nameMarkets",
                    "v-model": "row[market.key]",
                },
                [createText("{{ market.label }}")],
            ),
        ],
    );
}

/**
 * Creates the localized name text input group template node.
 *
 * @returns {object} Localized name text input group node.
 */
function createNameInputTemplate() {
    return createElement(
        "div",
        {
            class: "create-vg-stub-field-controls",
        },
        [
            createElement("cdx-text-input", {
                placeholder: "Title",
                "v-bind:model-value": "row.name",
                "v-on:change":
                    "updateNameRow(group.nameGroupKey, index, 'name')",
                "v-on:update:model-value":
                    "updateNameRowValue(group.nameGroupKey, index, 'name', $event)",
            }),
            createSourceUrlInputTemplate({
                placeholder: "Source URLs",
                model: "row.sourceUrl",
                change: "updateNameRow(group.nameGroupKey, index, 'sourceUrl')",
                update: "updateNameRowValue(group.nameGroupKey, index, 'sourceUrl', $event)",
            }),
        ],
    );
}
