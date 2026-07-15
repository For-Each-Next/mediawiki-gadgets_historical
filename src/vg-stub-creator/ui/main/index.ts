import { createElement, createText } from "#me/ui/template.ts";
import { createFieldGroupTemplate } from "#me/ui/main/article-fields.ts";
import { createCitationGroupTemplate } from "#me/ui/main/citations.ts";
import { createNameGroupTemplate } from "#me/ui/main/localized-names.ts";
import { createNoteTaGroupTemplate } from "#me/ui/main/noteta.ts";
import { createCategoryGroupTemplate } from "#me/ui/main/review.ts";

/**
 * Creates the tab container template node.
 *
 * @returns Tab container template node.
 */
export function createTabsTemplate(): any {
    const result = createElement(
        "cdx-tabs",
        {
            "v-model:active": "activeTab",
        },
        [
            createElement(
                "cdx-tab",
                {
                    "v-bind:key": "group.key",
                    "v-bind:label": "group.label",
                    "v-bind:name": "group.key",
                    "v-for": "group in groups",
                },
                [
                    createTabDescriptionTemplate(),
                    createFieldGroupTemplate(),
                    createNameGroupTemplate(),
                    createNoteTaGroupTemplate(),
                    createCitationGroupTemplate(),
                    createCategoryGroupTemplate(),
                ],
            ),
        ],
    );
    return result;
}

/**
 * Creates the active tab description.
 *
 * @returns Tab description node.
 */
function createTabDescriptionTemplate(): any {
    const result = createElement(
        "p",
        {
            class: "vg-stub-creator-tab-description",
            "v-if": "group.description",
        },
        [createText("{{ group.description }}")],
    );
    return result;
}
