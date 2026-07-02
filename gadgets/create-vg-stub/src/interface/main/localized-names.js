/* eslint-disable */

import {
    createButtonTemplate,
    createElement,
    createFieldTemplate,
    createIconActionLinkTemplate,
    createSourceUrlInputTemplate,
    createText,
} from "../template.js";

const STEAM_NAME_SUGGESTION_SOURCE =
    "suggestion in getSteamNameSuggestions(fetchedSteamNameRows)";

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
            createOriginalNameSearchTemplate(),
            createSteamNameHelperTemplate(),
            createNameFieldsTemplate(),
        ],
    );
}

/**
 * Creates original-name lookup links.
 *
 * @returns {object} Original-name lookup template node.
 */
function createOriginalNameSearchTemplate() {
    return createFieldTemplate("Original title lookup", [
        createNameSearchListTemplate(),
    ]);
}

/**
 * Creates the original-name lookup row list.
 *
 * @returns {object} Search row list template node.
 */
function createNameSearchListTemplate() {
    return createElement(
        "ul",
        {
            class: "create-vg-stub-name-search",
        },
        [createNameSearchRowTemplate()],
    );
}

/**
 * Creates one original-name lookup row.
 *
 * @returns {object} Search row template node.
 */
function createNameSearchRowTemplate() {
    return createElement(
        "li",
        {
            "v-bind:key": "row.key",
            "v-for": "row in getNameSearchRows()",
        },
        [
            createText('Search "'),
            createElement("strong", {}, [createText("{{ row.query }}")]),
            createText('" in: '),
            createNameSearchLinkListTemplate(),
        ],
    );
}

/**
 * Creates the link list for one original-name lookup row.
 *
 * @returns {object} Search link list template node.
 */
function createNameSearchLinkListTemplate() {
    return createElement(
        "span",
        {
            class: "create-vg-stub-horizontal-list",
        },
        [createNameSearchLinkTemplate()],
    );
}

/**
 * Creates one original-name lookup link.
 *
 * @returns {object} Search link template node.
 */
function createNameSearchLinkTemplate() {
    return createElement(
        "span",
        {
            class: "create-vg-stub-horizontal-list-item",
            "v-bind:key": "link.label",
            "v-for": "link in row.links",
        },
        [
            createElement(
                "a",
                {
                    "v-bind:href": "link.url",
                    rel: "noopener noreferrer",
                    target: "_blank",
                },
                [createText("{{ link.label }}")],
            ),
        ],
    );
}

/**
 * Creates the Steam localized name helper template node.
 *
 * @returns {object} Steam helper template node.
 */
function createSteamNameHelperTemplate() {
    return createFieldTemplate("Steam name helper", [
        createElement(
            "div",
            {
                class: "create-vg-stub-steam-helper",
            },
            [
                createSteamNameInputRowTemplate(),
                createSteamNameSuggestionRowTemplate(),
            ],
        ),
    ]);
}

/**
 * Creates the Steam URL input row.
 *
 * @returns {object} Steam URL input row node.
 */
function createSteamNameInputRowTemplate() {
    return createElement(
        "div",
        {
            class: "create-vg-stub-steam-row",
        },
        [createSteamUrlInputTemplate(), createSteamNameCheckButtonTemplate()],
    );
}

/**
 * Creates the Steam URL input.
 *
 * @returns {object} Steam URL input node.
 */
function createSteamUrlInputTemplate() {
    return createElement("cdx-text-input", {
        placeholder: "https://store.steampowered.com/app/...",
        "v-bind:model-value": "steamUrl",
        "v-on:update:model-value": "updateSteamUrl($event)",
    });
}

/**
 * Creates the Steam-name check button.
 *
 * @returns {object} Check button node.
 */
function createSteamNameCheckButtonTemplate() {
    return createButtonTemplate({
        click: "addSteamNames",
        disabled: "sourceFetchState.loading",
        label: "Check",
    });
}

/**
 * Creates the Steam name suggestion row.
 *
 * @returns {object} Steam suggestion row node.
 */
function createSteamNameSuggestionRowTemplate() {
    return createElement(
        "div",
        {
            class:
                "create-vg-stub-steam-row " +
                "create-vg-stub-steam-row--suggestions",
            "v-if": "fetchedSteamNameRows.length",
        },
        [
            createSteamNameSuggestionsTemplate(),
            createSteamNameButtonGroupTemplate(),
        ],
    );
}

/**
 * Creates the Steam-name choice button group.
 *
 * @returns {object} Steam-name button group node.
 */
function createSteamNameButtonGroupTemplate() {
    return createElement("cdx-button-group", {
        class: "create-vg-stub-steam-actions",
        "v-bind:buttons": "steamNameButtons",
        "v-on:click": "applySteamNameChoice",
    });
}

/**
 * Creates fetched Steam-name help text for the Steam URL field.
 *
 * @returns {object} Steam suggestion help-text node.
 */
function createSteamNameSuggestionsTemplate() {
    return createElement(
        "ul",
        {
            class:
                "create-vg-stub-steam-suggestion " +
                "create-vg-stub-steam-links",
        },
        [
            createElement(
                "li",
                {
                    "v-bind:key": "suggestion.label",
                    "v-for": STEAM_NAME_SUGGESTION_SOURCE,
                },
                createSteamNameSuggestionContentTemplate(),
            ),
        ],
    );
}

/**
 * Creates Steam suggestion item content.
 *
 * @returns {Array<object|string>} Steam suggestion item content nodes.
 */
function createSteamNameSuggestionContentTemplate() {
    return [
        createElement("strong", {}, [createText("{{ suggestion.label }}")]),
        createText(" "),
        createSteamNameSuggestionLinkTemplate(),
    ];
}

/**
 * Creates a Steam suggestion link.
 *
 * @returns {object} Steam suggestion link node.
 */
function createSteamNameSuggestionLinkTemplate() {
    return createElement(
        "a",
        {
            "v-bind:href": "suggestion.url",
            rel: "noopener noreferrer",
            target: "_blank",
        },
        [createText("{{ suggestion.value }}")],
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
                    createSteamNameHelperLabelTemplate(),
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
            createOfficialNameCheckboxTemplate(),
            createElement("span", {
                "aria-hidden": "true",
                class: "create-vg-stub-name-market-separator",
            }),
            createNameMarketCheckboxTemplate(),
        ],
    );
}

/**
 * Creates the Steam helper label suffix.
 *
 * @returns {object} Steam helper label node.
 */
function createSteamNameHelperLabelTemplate() {
    return createElement(
        "template",
        {
            "v-if": "isSteamNameHelperRow(row)",
        },
        [createText("(by Steam helper) ")],
    );
}

/**
 * Creates the official-name checkbox.
 *
 * @returns {object} Official-name checkbox node.
 */
function createOfficialNameCheckboxTemplate() {
    return createElement(
        "cdx-checkbox",
        {
            class: "create-vg-stub-name-official-checkbox",
            "v-bind:model-value": "row.official",
            "v-on:update:model-value":
                "updateNameOfficial(group.nameGroupKey, index, $event)",
        },
        [createText("Official?")],
    );
}

/**
 * Creates one market checkbox.
 *
 * @returns {object} Market checkbox node.
 */
function createNameMarketCheckboxTemplate() {
    return createElement(
        "cdx-checkbox",
        {
            "v-bind:key": "market.key",
            "v-bind:model-value": "row[market.key]",
            "v-for": "market in nameMarkets",
            "v-on:update:model-value":
                "updateNameMarket(group.nameGroupKey, index, market.key, $event)",
        },
        [createText("{{ market.label }}")],
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
