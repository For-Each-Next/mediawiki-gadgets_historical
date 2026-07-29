import { createElement, createText } from "#gadget/ui/template.ts";
import { createFieldGroupTemplate } from "#gadget/ui/main/article-fields.ts";
import { createCitationGroupTemplate } from "#gadget/ui/main/citations.ts";
import { createNameGroupTemplate } from "#gadget/ui/main/localized-names.ts";
import { createNoteTaGroupTemplate } from "#gadget/ui/main/noteta.ts";
import { createCategoryGroupTemplate } from "#gadget/ui/main/review.ts";

/**
 * Creates the tab container template node.
 *
 * @returns Tab container template node.
 */
export function createTabsTemplate(): any {
    const tabDescriptionResult = [
        createTabDescriptionTemplate(),
        createFieldGroupTemplate(),
        createNameGroupTemplate(),
        createNoteTaGroupTemplate(),
        createCitationGroupTemplate(),
        createCategoryGroupTemplate(),
    ];
    const elementResult = [
        createElement(
            "cdx-tab",
            {
                "v-bind:key": "group.key",
                "v-bind:label": "group.label",
                "v-bind:name": "group.key",
                "v-for": "group in groups",
            },
            tabDescriptionResult,
        ),
    ];
    const result = createElement(
        "cdx-tabs",
        {
            "v-model:active": "activeTab",
        },
        elementResult,
    );
    return result;
}

/**
 * Creates the active tab description.
 *
 * @returns Tab description node.
 */
function createTabDescriptionTemplate(): any {
    const textResult = [createText("{{ group.description }}")];
    const result = createElement(
        "p",
        {
            class: "vg-stub-creator-tab-description",
            "v-if": "group.description",
        },
        textResult,
    );
    return result;
}
