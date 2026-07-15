import {
    createButtonTemplate,
    createElement,
    createFieldTemplate,
    createIconActionLinkTemplate,
    createSourceUrlInputTemplate,
    createText,
} from "#stub/ui/template.ts";
import { msg, msgParts } from "#stub/i18n";

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
    const result = createElement(
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
    return result;
}

/**
 * Creates original-name lookup links.
 *
 * @returns Original-name lookup template node.
 */
function createOriginalNameSearchTemplate(): any {
    const result = createFieldTemplate(msg("names.originalTitleLookup"), [
        createNameSearchListTemplate(),
    ]);
    return result;
}

/**
 * Creates the original-name lookup row list.
 *
 * @returns Search row list template node.
 */
function createNameSearchListTemplate(): any {
    const result = createElement(
        "ul",
        {
            class: "vg-stub-creator-name-search",
        },
        [createNameSearchRowTemplate()],
    );
    return result;
}

/**
 * Creates one original-name lookup row.
 *
 * @returns Search row template node.
 */
function createNameSearchRowTemplate(): any {
    const result = createElement(
        "li",
        {
            "v-bind:key": "row.key",
            "v-for": "row in getNameSearchRows()",
        },
        localizeNameSearchSentence(),
    );
    return result;
}

/**
 * Creates the translated lookup sentence with rich placeholders.
 *
 * @returns The translated lookup sentence with rich placeholders.
 */
function localizeNameSearchSentence(): Array<any | string> {
    const parts = msgParts("names.searchSentence", {
        links: createNameSearchLinkListTemplate(),
        query: createElement("strong", {}, [createText("{{ row.query }}")]),
    });
    return parts.map(createLocalizedMessagePart);
}

/**
 * Converts a translated string part to a template text node.
 *
 * @param part - Part value.
 * @returns A translated string part to a template text node.
 */
function createLocalizedMessagePart(part: any): any {
    return typeof part === "string" ? createText(part) : part;
}

/**
 * Creates the link list for one original-name lookup row.
 *
 * @returns Search link list template node.
 */
function createNameSearchLinkListTemplate(): any {
    const result = createElement(
        "span",
        {
            class: "vg-stub-creator-horizontal-list",
        },
        [createNameSearchLinkTemplate()],
    );
    return result;
}

/**
 * Creates one original-name lookup link.
 *
 * @returns Search link template node.
 */
function createNameSearchLinkTemplate(): any {
    const result = createElement(
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
    return result;
}

/**
 * Creates the Steam localized name helper template node.
 *
 * @returns Steam helper template node.
 */
function createSteamNameHelperTemplate(): any {
    const result = createFieldTemplate(msg("names.steamHelper"), [
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
    return result;
}

/**
 * Creates the Steam URL input row.
 *
 * @returns Steam URL input row node.
 */
function createSteamNameInputRowTemplate(): any {
    const result = createElement(
        "div",
        {
            class: "vg-stub-creator-steam-row",
        },
        [createSteamUrlInputTemplate(), createSteamNameCheckButtonTemplate()],
    );
    return result;
}

/**
 * Creates the Steam URL input.
 *
 * @returns Steam URL input node.
 */
function createSteamUrlInputTemplate(): any {
    const result = createElement("cdx-text-input", {
        placeholder: "https://store.steampowered.com/app/...",
        "v-bind:model-value": "steamUrl",
        "v-on:update:model-value": "updateSteamUrl($event)",
    });
    return result;
}

/**
 * Creates the Steam-name check button.
 *
 * @returns Check button node.
 */
function createSteamNameCheckButtonTemplate(): any {
    const result = createButtonTemplate({
        click: "addSteamNames",
        disabled: "sourceFetchState.loading",
        label: msg("names.check"),
    });
    return result;
}

/**
 * Creates the Steam name suggestion row.
 *
 * @returns Steam suggestion row node.
 */
function createSteamNameSuggestionRowTemplate(): any {
    const result = createElement(
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
    return result;
}

/**
 * Creates the Steam-name choice button group.
 *
 * @returns Steam-name button group node.
 */
function createSteamNameButtonGroupTemplate(): any {
    const result = createElement("cdx-button-group", {
        class: "vg-stub-creator-steam-actions",
        "v-bind:buttons": "steamNameButtons",
        "v-on:click": "applySteamNameChoice",
    });
    return result;
}

/**
 * Creates fetched Steam-name help text for the Steam URL field.
 *
 * @returns Steam suggestion help-text node.
 */
function createSteamNameSuggestionsTemplate(): any {
    const result = createElement(
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
    return result;
}

/**
 * Creates Steam suggestion item content.
 *
 * @returns Steam suggestion item content nodes.
 */
function createSteamNameSuggestionContentTemplate(): Array<any | string> {
    const result = [
        createElement("strong", {}, [createText("{{ suggestion.label }}")]),
        createText(" "),
        createSteamNameSuggestionLinkTemplate(),
    ];
    return result;
}

/**
 * Creates a Steam suggestion link.
 *
 * @returns Steam suggestion link node.
 */
function createSteamNameSuggestionLinkTemplate(): any {
    const result = createElement(
        "a",
        {
            "v-bind:href": "suggestion.url",
            rel: "noopener noreferrer",
            target: "_blank",
        },
        [createText("{{ suggestion.value }}")],
    );
    return result;
}

/**
 * Creates the localized name field list template node.
 *
 * @returns Localized name field list template node.
 */
function createNameFieldsTemplate(): any {
    const result = createElement(
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
    return result;
}

/**
 * Creates one localized name fieldset.
 *
 * @returns Localized name fieldset node.
 */
function createNameFieldTemplate(): any {
    const result = createElement(
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
                    createLocalizedNameLabelTemplate(),
                    createSteamNameHelperLabelTemplate(),
                    createNameRemoveTemplate(),
                ],
            ),
        ],
    );
    return result;
}

/**
 * Creates the numbered localized-name field label.
 *
 * @returns The numbered localized-name field label.
 */
function createLocalizedNameLabelTemplate(): string {
    const label = msg("names.localizedName");
    return createText(`{{ '${label} ' + (index + 1) }} `);
}

/**
 * Creates the localized name value/source row.
 *
 * @returns Localized name value/source row node.
 */
function createNameValueSourceTemplate(): any {
    const result = createElement(
        "div",
        {
            class:
                "vg-stub-creator-field-controls " +
                "vg-stub-creator-field-controls--with-source",
        },
        [createNameTitleTemplate(), createNameSourceTemplate()],
    );
    return result;
}

/**
 * Creates the localized name official/regions row.
 *
 * @returns Localized name official/regions row node.
 */
function createNameSettingsRowTemplate(): any {
    const result = createElement(
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
    return result;
}

/**
 * Creates the Steam helper label suffix.
 *
 * @returns Steam helper label node.
 */
function createSteamNameHelperLabelTemplate(): any {
    const result = createElement(
        "template",
        {
            "v-if": "isSteamNameHelperRow(row)",
        },
        [createText(`(${msg("names.bySteamHelper")}) `)],
    );
    return result;
}

/**
 * Creates the official-name checkbox.
 *
 * @returns Official-name checkbox node.
 */
function createOfficialNameCheckboxTemplate(): any {
    const result = createElement(
        "cdx-checkbox",
        {
            class: "vg-stub-creator-name-official-checkbox",
            "v-bind:model-value": "row.official",
            "v-on:update:model-value":
                "updateNameOfficial(group.nameGroupKey, index, $event)",
        },
        [createText(msg("names.official"))],
    );
    return result;
}

/**
 * Creates one market checkbox.
 *
 * @returns Market checkbox node.
 */
function createNameMarketCheckboxTemplate(): any {
    const result = createElement(
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
    return result;
}

/**
 * Creates the localized name title input cell content.
 *
 * @returns Localized name title input node.
 */
function createNameTitleTemplate(): any {
    const result = createElement("cdx-text-input", {
        placeholder: msg("names.title"),
        "v-bind:model-value": "row.name",
        "v-on:change": "updateNameRow(group.nameGroupKey, index, 'name')",
        "v-on:update:model-value": [
            "updateNameRowValue(group.nameGroup",
            "Key, index, 'name', $event)",
        ].join(""),
    });
    return result;
}

/**
 * Creates the localized name source row content.
 *
 * @returns Localized name source input node.
 */
function createNameSourceTemplate(): any {
    const result = createSourceUrlInputTemplate({
        placeholder: msg("names.sourceUrls"),
        model: "row.sourceUrl",
        change: "updateNameRow(group.nameGroupKey, index, 'sourceUrl')",
        update: [
            "updateNameRowValue(group.nameGroup",
            "Key, index, 'sourceUrl', $event)",
        ].join(""),
    });
    return result;
}

/**
 * Creates the localized name remove row action.
 *
 * @returns Localized name remove row action.
 */
function createNameRemoveTemplate(): any {
    const result = createIconActionLinkTemplate(
        msg("names.remove"),
        "tableActionIcons.remove",
        "removeNameRow(group.nameGroupKey, index)",
        {
            class: "vg-stub-creator-destructive-action",
        },
    );
    return result;
}
