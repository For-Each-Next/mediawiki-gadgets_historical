/* eslint-disable */

import {
    createActionFooterTemplate,
    createElement,
    createText,
} from "../template/nodes.js";

/**
 * Creates the review panel and category grid template node.
 *
 * @returns {object} Category review grid node.
 */
export function createCategoryGroupTemplate() {
    return createElement(
        "template",
        {
            "v-if": "group.categoryReview",
        },
        [
            createRedirectReviewTemplate(),
            createElement("h3", {}, [createText("Categories")]),
            createElement(
                "div",
                {
                    class: "create-vg-stub-category-grid",
                },
                [createCategoryRowTemplate()],
            ),
            createElement(
                "p",
                {
                    class: "create-vg-stub-error",
                    "v-if": "categoryState.error",
                },
                [createText("{{ categoryState.error }}")],
            ),
            createActionFooterTemplate([
                createElement(
                    "cdx-button",
                    {
                        "v-bind:disabled": "categoryState.loading",
                        "v-on:click": "addCategoryRow",
                    },
                    [createText("Add category")],
                ),
                createElement(
                    "cdx-button",
                    {
                        "v-bind:disabled": "categoryState.loading",
                        "v-on:click": "rebuildCategoryRows",
                    },
                    [
                        createText(
                            "{{ categoryState.loading ? 'Regenerating' : 'Regenerate' }}",
                        ),
                    ],
                ),
            ]),
            createNavboxReviewTemplate(),
        ],
    );
}

/**
 * Creates redirect review rows.
 *
 * @returns {object} Redirect review template node.
 */
function createRedirectReviewTemplate() {
    return createElement("section", {}, [
        createElement("h3", {}, [createText("Redirects")]),
        createElement(
            "div",
            {
                class: "create-vg-stub-redirect-grid",
            },
            [
                createElement(
                    "template",
                    {
                        "v-bind:key": "index",
                        "v-for":
                            "(redirect, index) in form.redirectRows || []",
                    },
                    [
                        createElement("cdx-checkbox", {
                            "v-model": "redirect.enabled",
                        }),
                        createElement(
                            "span",
                            {
                                class: "create-vg-stub-category-status",
                                "v-bind:title": "redirect.status",
                            },
                            [
                                createText(
                                    "{{ formatRedirectStatusLabel(redirect.status) }}",
                                ),
                            ],
                        ),
                        createElement(
                            "div",
                            {
                                class: "create-vg-stub-review-title-cell",
                            },
                            [
                                createElement("cdx-text-input", {
                                    "v-model": "redirect.title",
                                    "v-on:blur":
                                        "checkRedirectRow(index, $event)",
                                }),
                            ],
                        ),
                        createElement(
                            "cdx-button",
                            {
                                "v-if": "redirect.title",
                                "v-on:click": "openRedirectView(redirect)",
                            },
                            [createText("View")],
                        ),
                        createElement("span", {
                            "v-else": "",
                        }),
                        createElement(
                            "cdx-button",
                            {
                                "v-on:click": "removeRedirectRow(index)",
                            },
                            [createText("Remove")],
                        ),
                    ],
                ),
            ],
        ),
        createActionFooterTemplate([
            createElement(
                "cdx-button",
                {
                    "v-on:click": "addRedirectRow",
                },
                [createText("Add redirect")],
            ),
            createElement(
                "cdx-button",
                {
                    "v-bind:disabled": "reviewState.loading",
                    "v-on:click": "checkRedirectRows",
                },
                [
                    createText(
                        "{{ reviewState.loading ? 'Checking' : 'Check redirects' }}",
                    ),
                ],
            ),
        ]),
    ]);
}

/**
 * Creates editable navbox review rows.
 *
 * @returns {object} Navbox review template node.
 */
function createNavboxReviewTemplate() {
    return createElement("section", {}, [
        createElement("h3", {}, [createText("Navboxes")]),
        createElement(
            "div",
            {
                class: "create-vg-stub-navbox-grid",
            },
            [
                createElement(
                    "template",
                    {
                        "v-bind:key": "index",
                        "v-for": "(navbox, index) in form.navboxRows || []",
                    },
                    [
                        createElement("cdx-checkbox", {
                            "v-model": "navbox.enabled",
                        }),
                        createElement(
                            "span",
                            {
                                class: "create-vg-stub-category-status",
                                "v-bind:title": "navbox.status",
                            },
                            [
                                createText(
                                    "{{ formatNavboxStatusLabel(navbox.status) }}",
                                ),
                            ],
                        ),
                        createElement("cdx-text-input", {
                            "v-model": "navbox.text",
                            "v-on:blur": "checkNavboxRow(index, $event)",
                        }),
                        createElement(
                            "cdx-button",
                            {
                                "v-if": "navbox.title",
                                "v-on:click": "openNavboxView(navbox)",
                            },
                            [createText("View")],
                        ),
                        createElement("span", {
                            "v-else": "",
                        }),
                        createElement(
                            "cdx-button",
                            {
                                "v-on:click": "removeNavboxRow(index)",
                            },
                            [createText("Remove")],
                        ),
                    ],
                ),
            ],
        ),
        createActionFooterTemplate([
            createElement(
                "cdx-button",
                {
                    "v-on:click": "addNavboxRow",
                },
                [createText("Add navbox")],
            ),
            createElement(
                "cdx-button",
                {
                    "v-bind:disabled": "reviewState.loading",
                    "v-on:click": "rebuildNavboxRows",
                },
                [
                    createText(
                        "{{ reviewState.loading ? 'Regenerating' : 'Regenerate' }}",
                    ),
                ],
            ),
        ]),
        createElement(
            "p",
            {
                class: "create-vg-stub-error",
                "v-if": "reviewState.error",
            },
            [createText("{{ reviewState.error }}")],
        ),
    ]);
}

/**
 * Creates category row template nodes.
 *
 * @returns {object} Category rows template node.
 */
function createCategoryRowTemplate() {
    return createElement(
        "template",
        {
            "v-bind:key": "index",
            "v-for": "(row, index) in form.categoryRows",
        },
        [
            createElement("cdx-checkbox", {
                "v-model": "row.enabled",
            }),
            createElement(
                "span",
                {
                    class: "create-vg-stub-category-status",
                    "v-bind:title": "row.source",
                },
                [createText("{{ formatCategorySourceLabel(row.source) }}")],
            ),
            createElement(
                "div",
                {
                    class: "create-vg-stub-review-title-cell",
                },
                [
                    createElement("cdx-text-input", {
                        "v-model": "row.category",
                        "v-on:blur": "checkCategoryRow(index, $event)",
                    }),
                ],
            ),
            createElement("span", {}),
            createElement(
                "div",
                {
                    class: "create-vg-stub-category-actions",
                },
                [
                    createElement(
                        "cdx-button",
                        {
                            class: "create-vg-stub-category-action",
                            "v-if": "row.category",
                            "v-on:click": "openCategoryView(row)",
                        },
                        [createText("View")],
                    ),
                    createElement("span", {
                        "v-else": "",
                    }),
                    createElement(
                        "label",
                        {
                            class: "create-vg-stub-category-stub-tag",
                            "v-if": "row.stubTag",
                        },
                        [
                            createElement("cdx-checkbox", {
                                "v-bind:title":
                                    "'Whether adding {{' + row.stubTag + '}}'",
                                "v-model": "row.stubTagEnabled",
                            }),
                            createElement("span", {}, [
                                createText("{{stub}}"),
                            ]),
                        ],
                    ),
                    createElement(
                        "cdx-button",
                        {
                            class: "create-vg-stub-category-action",
                            "v-on:click": "removeCategoryRow(index)",
                        },
                        [createText("Remove")],
                    ),
                ],
            ),
        ],
    );
}
