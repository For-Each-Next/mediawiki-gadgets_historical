/* eslint-disable */

import { createElement, createText } from "../template.js";
import { createFieldGroupTemplate } from "./article-fields.js";
import { createCitationGroupTemplate } from "./citations.js";
import { createNameGroupTemplate } from "./localized-names.js";
import { createNoteTaGroupTemplate } from "./noteta.js";
import { createCategoryGroupTemplate } from "./review.js";

/**
 * Creates the tab container template node.
 *
 * @returns {object} Tab container template node.
 */
export function createTabsTemplate() {
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
 * @returns {object} Tab description node.
 */
function createTabDescriptionTemplate() {
    return createElement(
        "p",
        {
            class: "create-vg-stub-tab-description",
            "v-if": "group.description",
        },
        [createText("{{ group.description }}")],
    );
}
