import {
    createButtonTemplate,
    createElement,
    createFieldTemplate,
    createIconActionLinkTemplate,
    createSourceUrlInputTemplate,
    createText,
} from "../template.ts";

const STEAM_NAME_SUGGESTION_SOURCE = [
    "suggestion in getSteamNameSuggesti",
    "ons(fetchedSteamNameRows)",
].join("");


/**
 * Creates the localized name group template node.
 *
 * @returns Localized name group template node.
 */
export function createNameGroupTemplate(): any {
    return createElement(
        "template",
        {
            "v-if": "group.nameGroupKey",
        },
        [
            createSteamNameHelperTemplate(),
            createOriginalNameSearchTemplate(),
            createNameFieldsTemplate(),
        ],
    );
}


/**
 * Creates original-name lookup links.
 *
 * @returns Original-name lookup template node.
 */
function createOriginalNameSearchTemplate(): any {
    return createFieldTemplate("Original title lookup", [
        createNameSearchListTemplate(),
    ]);
}


/**
 * Creates the original-name lookup row list.
 *
 * @returns Search row list template node.
 */
function createNameSearchListTemplate(): any {
    return createElement(
        "ul",
        {
            class: "vg-stub-creator-name-search",
        },
        [createNameSearchRowTemplate()],
    );
}


/**
 * Creates one original-name lookup row.
 *
 * @returns Search row template node.
 */
function createNameSearchRowTemplate(): any {
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
 * @returns Search link list template node.
 */
function createNameSearchLinkListTemplate(): any {
    return createElement(
        "span",
        {
            class: "vg-stub-creator-horizontal-list",
        },
        [createNameSearchLinkTemplate()],
    );
}


/**
 * Creates one original-name lookup link.
 *
 * @returns Search link template node.
 */
function createNameSearchLinkTemplate(): any {
    return createElement(
        "span",
        {
            class: "vg-stub-creator-horizontal-list-item",
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
 * @returns Steam helper template node.
 */
function createSteamNameHelperTemplate(): any {
    return createFieldTemplate("Steam name helper", [
        createElement(
            "div",
            {
                class: "vg-stub-creator-steam-helper",
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
 * @returns Steam URL input row node.
 */
function createSteamNameInputRowTemplate(): any {
    return createElement(
        "div",
        {
            class: "vg-stub-creator-steam-row",
        },
        [createSteamUrlInputTemplate(), createSteamNameCheckButtonTemplate()],
    );
}


/**
 * Creates the Steam URL input.
 *
 * @returns Steam URL input node.
 */
function createSteamUrlInputTemplate(): any {
    return createElement("cdx-text-input", {
        placeholder: "https://store.steampowered.com/app/...",
        "v-bind:model-value": "steamUrl",
        "v-on:update:model-value": "updateSteamUrl($event)",
    });
}


/**
 * Creates the Steam-name check button.
 *
 * @returns Check button node.
 */
function createSteamNameCheckButtonTemplate(): any {
    return createButtonTemplate({
        click: "addSteamNames",
        disabled: "sourceFetchState.loading",
        label: "Check",
    });
}


/**
 * Creates the Steam name suggestion row.
 *
 * @returns Steam suggestion row node.
 */
function createSteamNameSuggestionRowTemplate(): any {
    return createElement(
        "div",
        {
            class:
                "vg-stub-creator-steam-row " +
                "vg-stub-creator-steam-row--suggestions",
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
 * @returns Steam-name button group node.
 */
function createSteamNameButtonGroupTemplate(): any {
    return createElement("cdx-button-group", {
        class: "vg-stub-creator-steam-actions",
        "v-bind:buttons": "steamNameButtons",
        "v-on:click": "applySteamNameChoice",
    });
}


/**
 * Creates fetched Steam-name help text for the Steam URL field.
 *
 * @returns Steam suggestion help-text node.
 */
function createSteamNameSuggestionsTemplate(): any {
    return createElement(
        "ul",
        {
            class:
                "vg-stub-creator-steam-suggestion " +
                "vg-stub-creator-steam-links",
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
 * @returns Steam suggestion item content nodes.
 */
function createSteamNameSuggestionContentTemplate(): Array<any | string> {
    return [
        createElement("strong", {}, [createText("{{ suggestion.label }}")]),
        createText(" "),
        createSteamNameSuggestionLinkTemplate(),
    ];
}


/**
 * Creates a Steam suggestion link.
 *
 * @returns Steam suggestion link node.
 */
function createSteamNameSuggestionLinkTemplate(): any {
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
 * @returns Localized name field list template node.
 */
function createNameFieldsTemplate(): any {
    return createElement(
        "div",
        {
            class: "vg-stub-creator-name-fields",
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
 * @returns Localized name fieldset node.
 */
function createNameFieldTemplate(): any {
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
 * @returns Localized name value/source row node.
 */
function createNameValueSourceTemplate(): any {
    return createElement(
        "div",
        {
            class:
                "vg-stub-creator-field-controls " +
                "vg-stub-creator-field-controls--with-source",
        },
        [createNameTitleTemplate(), createNameSourceTemplate()],
    );
}


/**
 * Creates the localized name official/regions row.
 *
 * @returns Localized name official/regions row node.
 */
function createNameSettingsRowTemplate(): any {
    return createElement(
        "div",
        {
            class: "vg-stub-creator-name-settings-row",
        },
        [
            createOfficialNameCheckboxTemplate(),
            createElement("span", {
                "aria-hidden": "true",
                class: "vg-stub-creator-name-market-separator",
            }),
            createNameMarketCheckboxTemplate(),
        ],
    );
}


/**
 * Creates the Steam helper label suffix.
 *
 * @returns Steam helper label node.
 */
function createSteamNameHelperLabelTemplate(): any {
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
 * @returns Official-name checkbox node.
 */
function createOfficialNameCheckboxTemplate(): any {
    return createElement(
        "cdx-checkbox",
        {
            class: "vg-stub-creator-name-official-checkbox",
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
 * @returns Market checkbox node.
 */
function createNameMarketCheckboxTemplate(): any {
    return createElement(
        "cdx-checkbox",
        {
            "v-bind:key": "market.key",
            "v-bind:model-value": "row[market.key]",
            "v-for": "market in nameMarkets",
            "v-on:update:model-value": [
                "updateNameMarket(group.nameGroupKe",
                "y, index, market.key, $event)",
            ].join(""),
        },
        [createText("{{ market.label }}")],
    );
}


/**
 * Creates the localized name title input cell content.
 *
 * @returns Localized name title input node.
 */
function createNameTitleTemplate(): any {
    return createElement("cdx-text-input", {
        placeholder: "Title",
        "v-bind:model-value": "row.name",
        "v-on:change": "updateNameRow(group.nameGroupKey, index, 'name')",
        "v-on:update:model-value": [
            "updateNameRowValue(group.nameGroup",
            "Key, index, 'name', $event)",
        ].join(""),
    });
}


/**
 * Creates the localized name source row content.
 *
 * @returns Localized name source input node.
 */
function createNameSourceTemplate(): any {
    return createSourceUrlInputTemplate({
        placeholder: "Source URLs",
        model: "row.sourceUrl",
        change: "updateNameRow(group.nameGroupKey, index, 'sourceUrl')",
        update: [
            "updateNameRowValue(group.nameGroup",
            "Key, index, 'sourceUrl', $event)",
        ].join(""),
    });
}


/**
 * Creates the localized name remove row action.
 *
 * @returns Localized name remove row action.
 */
function createNameRemoveTemplate(): any {
    return createIconActionLinkTemplate(
        "Remove localized name",
        "tableActionIcons.remove",
        "removeNameRow(group.nameGroupKey, index)",
        {
            class: "vg-stub-creator-destructive-action",
        },
    );
}
