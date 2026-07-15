import { createElement, createText } from "#stub/ui/template.ts";
import { createFieldGroupTemplate } from "#stub/main/article-fields.ts";
import { createCitationGroupTemplate } from "#stub/main/citations.ts";
import { createNameGroupTemplate } from "#stub/main/localized-names.ts";
import { createNoteTaGroupTemplate } from "#stub/main/noteta.ts";
import { createCategoryGroupTemplate } from "#stub/main/review.ts";

/**
 * Creates the tab container template node.
 *
 * @returns Tab container template node.
 */
export function createTabsTemplate(): any {
    return createElement(
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
}

/**
 * Creates the active tab description.
 *
 * @returns Tab description node.
 */
function createTabDescriptionTemplate(): any {
    return createElement(
        "p",
        {
            class: "vg-stub-creator-tab-description",
            "v-if": "group.description",
        },
        [createText("{{ group.description }}")],
    );
}
