import {
    createButtonTemplate,
    createElement,
    createFieldTemplate,
    createIconActionLinkTemplate,
    createSourceUrlInputTemplate,
    createText,
} from "#gadget/ui/template.ts";
import { msg, msgParts } from "#gadget/i18n/index.ts";

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
    const steamNameHelperResult = [
        createSteamNameHelperTemplate(),
        createOriginalNameSearchTemplate(),
        createNameFieldsTemplate(),
    ];
    const result = createElement(
        "template",
        {
            "v-if": "group.nameGroupKey",
        },
        steamNameHelperResult,
    );
    return result;
}

/**
 * Creates original-name lookup links.
 *
 * @returns Original-name lookup template node.
 */
function createOriginalNameSearchTemplate(): any {
    const messageH = msg("names.originalTitleLookup");
    const nameSearchListResult = [createNameSearchListTemplate()];
    const result = createFieldTemplate(messageH, nameSearchListResult, {
        attributes: {
            "v-if": "getNameSearchRows().length > 0",
        },
    });
    return result;
}

/**
 * Creates the original-name lookup row list.
 *
 * @returns Search row list template node.
 */
function createNameSearchListTemplate(): any {
    const nameSearchRowResult = [createNameSearchRowTemplate()];
    const result = createElement(
        "ul",
        {
            class: "vg-stub-creator-name-search",
        },
        nameSearchRowResult,
    );
    return result;
}

/**
 * Creates one original-name lookup row.
 *
 * @returns Search row template node.
 */
function createNameSearchRowTemplate(): any {
    const localizeNameSearchSentenceResu = localizeNameSearchSentence();
    const result = createElement(
        "li",
        {
            "v-bind:key": "row.key",
            "v-for": "row in getNameSearchRows()",
        },
        localizeNameSearchSentenceResu,
    );
    return result;
}

/**
 * Creates the translated lookup sentence with rich placeholders.
 *
 * @returns The translated lookup sentence with rich placeholders.
 */
function localizeNameSearchSentence(): Array<any | string> {
    const textResultF = [createText("{{ row.query }}")];
    const nameSearchLinkListResult = {
        links: createNameSearchLinkListTemplate(),
        query: createElement("strong", {}, textResultF),
    };
    const parts = msgParts("names.searchSentence", nameSearchLinkListResult);
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
    const nameSearchLinkResult = [createNameSearchLinkTemplate()];
    const result = createElement(
        "span",
        {
            class: "vg-stub-creator-horizontal-list",
        },
        nameSearchLinkResult,
    );
    return result;
}

/**
 * Creates one original-name lookup link.
 *
 * @returns Search link template node.
 */
function createNameSearchLinkTemplate(): any {
    const textResultE = [createText("{{ link.label }}")];
    const elementResultC = [
        createElement(
            "a",
            {
                "v-bind:href": "link.url",
                rel: "noopener noreferrer",
                target: "_blank",
            },
            textResultE,
        ),
    ];
    const result = createElement(
        "span",
        {
            class: "vg-stub-creator-horizontal-list-item",
            "v-bind:key": "link.label",
            "v-for": "link in row.links",
        },
        elementResultC,
    );
    return result;
}

/**
 * Creates the Steam localized name helper template node.
 *
 * @returns Steam helper template node.
 */
function createSteamNameHelperTemplate(): any {
    const messageG = msg("names.steamHelper");
    const steamNameInputRowResult = [
        createSteamNameInputRowTemplate(),
        createSteamNameSuggestionRowTemplate(),
    ];
    const elementResultB = [
        createElement(
            "div",
            {
                class: "vg-stub-creator-steam-helper",
            },
            steamNameInputRowResult,
        ),
    ];
    const result = createFieldTemplate(messageG, elementResultB);
    return result;
}

/**
 * Creates the Steam URL input row.
 *
 * @returns Steam URL input row node.
 */
function createSteamNameInputRowTemplate(): any {
    const steamUrlInputResult = [
        createSteamUrlInputTemplate(),
        createSteamNameCheckButtonTemplate(),
    ];
    const result = createElement(
        "div",
        {
            class: "vg-stub-creator-steam-row",
        },
        steamUrlInputResult,
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
    const messageF = {
        click: "addSteamNames",
        disabled: "sourceFetchState.loading",
        label: msg("names.check"),
    };
    const result = createButtonTemplate(messageF);
    return result;
}

/**
 * Creates the Steam name suggestion row.
 *
 * @returns Steam suggestion row node.
 */
function createSteamNameSuggestionRowTemplate(): any {
    const steamNameSuggestionsResult = [
        createSteamNameSuggestionsTemplate(),
        createSteamNameButtonGroupTemplate(),
    ];
    const result = createElement(
        "div",
        {
            class:
                "vg-stub-creator-steam-row " +
                "vg-stub-creator-steam-row--suggestions",
            "v-if": "fetchedSteamNameRows.length",
        },
        steamNameSuggestionsResult,
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
    const steamNameSuggestionContentResu =
        createSteamNameSuggestionContentTemplate();
    const elementResultA = [
        createElement(
            "li",
            {
                "v-bind:key": "suggestion.label",
                "v-for": STEAM_NAME_SUGGESTION_SOURCE,
            },
            steamNameSuggestionContentResu,
        ),
    ];
    const result = createElement(
        "ul",
        {
            class:
                "vg-stub-creator-steam-suggestion " +
                "vg-stub-creator-steam-links",
        },
        elementResultA,
    );
    return result;
}

/**
 * Creates Steam suggestion item content.
 *
 * @returns Steam suggestion item content nodes.
 */
function createSteamNameSuggestionContentTemplate(): Array<any | string> {
    const textResultD = [createText("{{ suggestion.label }}")];
    const result = [
        createElement("strong", {}, textResultD),
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
    const textResultC = [createText("{{ suggestion.value }}")];
    const result = createElement(
        "a",
        {
            "v-bind:href": "suggestion.url",
            rel: "noopener noreferrer",
            target: "_blank",
        },
        textResultC,
    );
    return result;
}

/**
 * Creates the localized name field list template node.
 *
 * @returns Localized name field list template node.
 */
function createNameFieldsTemplate(): any {
    const nameFieldResult = [createNameFieldTemplate()];
    const elementResult = [
        createElement(
            "template",
            {
                "v-bind:key": "index",
                "v-for": "(row, index) in form[group.nameGroupKey]",
            },
            nameFieldResult,
        ),
    ];
    const result = createElement(
        "div",
        {
            class: "vg-stub-creator-name-fields",
        },
        elementResult,
    );
    return result;
}

/**
 * Creates one localized name fieldset.
 *
 * @returns Localized name fieldset node.
 */
function createNameFieldTemplate(): any {
    const localizedNameLabelResult = [
        createLocalizedNameLabelTemplate(),
        createSteamNameHelperLabelTemplate(),
        createNameApplyTitleTemplate(),
        createNameRemoveTemplate(),
    ];
    const nameSettingsRowResult = [
        createNameSettingsRowTemplate(),
        createNameValueSourceTemplate(),
        createElement(
            "template",
            {
                "v-slot:label": "",
            },
            localizedNameLabelResult,
        ),
    ];
    const result = createElement(
        "cdx-field",
        {
            "is-fieldset": "",
        },
        nameSettingsRowResult,
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
    const nameTitleResult = [
        createNameTitleTemplate(),
        createNameSourceTemplate(),
    ];
    const result = createElement(
        "div",
        {
            class:
                "vg-stub-creator-field-controls " +
                "vg-stub-creator-field-controls--with-source",
        },
        nameTitleResult,
    );
    return result;
}

/**
 * Creates the localized name official/regions row.
 *
 * @returns Localized name official/regions row node.
 */
function createNameSettingsRowTemplate(): any {
    const officialNameCheckboxResult = [
        createOfficialNameCheckboxTemplate(),
        createElement("span", {
            "aria-hidden": "true",
            class: "vg-stub-creator-name-market-separator",
        }),
        createNameMarketCheckboxTemplate(),
    ];
    const result = createElement(
        "div",
        {
            class: "vg-stub-creator-name-settings-row",
        },
        officialNameCheckboxResult,
    );
    return result;
}

/**
 * Creates the Steam helper label suffix.
 *
 * @returns Steam helper label node.
 */
function createSteamNameHelperLabelTemplate(): any {
    const messageE = `(${msg("names.bySteamHelper")}) `;
    const textResultB = [createText(messageE)];
    const result = createElement(
        "template",
        {
            "v-if": "isSteamNameHelperRow(row)",
        },
        textResultB,
    );
    return result;
}

/**
 * Creates the official-name checkbox.
 *
 * @returns Official-name checkbox node.
 */
function createOfficialNameCheckboxTemplate(): any {
    const messageD = msg("names.official");
    const textResultA = [createText(messageD)];
    const result = createElement(
        "cdx-checkbox",
        {
            class: "vg-stub-creator-name-official-checkbox",
            "v-bind:model-value": "row.official",
            "v-on:update:model-value":
                "updateNameOfficial(group.nameGroupKey, index, $event)",
        },
        textResultA,
    );
    return result;
}

/**
 * Creates one market checkbox.
 *
 * @returns Market checkbox node.
 */
function createNameMarketCheckboxTemplate(): any {
    const joinedText = {
        "v-bind:key": "market.key",
        "v-bind:model-value": "row[market.key]",
        "v-for": "market in nameMarkets",
        "v-on:update:model-value": [
            "updateNameMarket(group.nameGroupKe",
            "y, index, market.key, $event)",
        ].join(""),
    };
    const textResult = [createText("{{ market.label }}")];
    const result = createElement("cdx-checkbox", joinedText, textResult);
    return result;
}

/**
 * Creates the localized name title input cell content.
 *
 * @returns Localized name title input node.
 */
function createNameTitleTemplate(): any {
    const messageC = {
        placeholder: msg("names.title"),
        "v-bind:model-value": "row.name",
        "v-on:change": "updateNameRow(group.nameGroupKey, index, 'name')",
        "v-on:update:model-value": [
            "updateNameRowValue(group.nameGroup",
            "Key, index, 'name', $event)",
        ].join(""),
    };
    const result = createElement("cdx-text-input", messageC);
    return result;
}

/**
 * Creates the localized name source row content.
 *
 * @returns Localized name source input node.
 */
function createNameSourceTemplate(): any {
    const messageB = {
        placeholder: msg("names.sourceUrls"),
        model: "row.sourceUrl",
        change: "updateNameRow(group.nameGroupKey, index, 'sourceUrl')",
        update: [
            "updateNameRowValue(group.nameGroup",
            "Key, index, 'sourceUrl', $event)",
        ].join(""),
    };
    const result = createSourceUrlInputTemplate(messageB);
    return result;
}

/**
 * Creates the localized name remove row action.
 *
 * @returns Localized name remove row action.
 */
function createNameRemoveTemplate(): any {
    const messageA = msg("names.remove");
    const result = createIconActionLinkTemplate(
        messageA,
        "tableActionIcons.remove",
        "removeNameRow(group.nameGroupKey, index)",
        {
            class: "vg-stub-creator-destructive-action",
        },
    );
    return result;
}

/**
 * Creates the action that fills the page title from a Chinese name.
 *
 * @returns Apply-page-title action.
 */
function createNameApplyTitleTemplate(): any {
    const message = msg("names.applyAsPageTitle");
    const result = createIconActionLinkTemplate(
        message,
        "tableActionIcons.applyTitle",
        "applyNameAsPageTitle(group.nameGroupKey, index)",
        {
            "v-if": "row.name.trim()",
        },
    );
    return result;
}
