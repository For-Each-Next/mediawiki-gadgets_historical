/* eslint-disable */

import {
    createActionFooterTemplate,
    createElement,
    createText,
} from "../template.js";

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
            createCategoryReviewTemplate(),
            createStubTagReviewTemplate(),
            createNavboxReviewTemplate(),
        ],
    );
}

/**
 * Creates editable category review rows.
 *
 * @returns {object} Category review template node.
 */
function createCategoryReviewTemplate() {
    return createElement("section", {}, [
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
    ]);
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
                                    "v-on:update:model-value":
                                        "updateRedirectRowTitle(index, $event)",
                                    "v-on:blur":
                                        "checkRedirectRow(index, $event)",
                                }),
                            ],
                        ),
                        createElement(
                            "cdx-button",
                            {
                                class: "create-vg-stub-review-action",
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
                                class: "create-vg-stub-review-action",
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
                            "v-on:update:model-value":
                                "updateNavboxRow(index, $event)",
                            "v-on:blur": "checkNavboxRow(index, $event)",
                        }),
                        createElement(
                            "cdx-button",
                            {
                                class: "create-vg-stub-review-action",
                                "v-if": "navbox.title",
                                "v-on:click": "openNavboxEdit(navbox)",
                            },
                            [
                                createText(
                                    "{{ navbox.pendingEdit ? 'Pending' : navbox.status === 'OK' ? 'Edit' : 'Create' }}",
                                ),
                            ],
                        ),
                        createElement("span", {
                            "v-else": "",
                        }),
                        createElement(
                            "cdx-button",
                            {
                                class: "create-vg-stub-review-action",
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
 * Creates editable stub-tag review rows.
 *
 * @returns {object} Stub-tag review template node.
 */
function createStubTagReviewTemplate() {
    return createElement("section", {}, [
        createElement("h3", {}, [createText("Stub tags")]),
        createElement(
            "div",
            {
                class: "create-vg-stub-stub-tag-grid",
            },
            [
                createElement(
                    "template",
                    {
                        "v-bind:key": "index",
                        "v-for": "(stubTag, index) in stubTagRows",
                    },
                    [
                        createElement("cdx-checkbox", {
                            "v-model": "stubTag.enabled",
                        }),
                        createElement(
                            "span",
                            {
                                class: "create-vg-stub-category-status",
                                "v-bind:title": "formatStubTagLabel(stubTag.stubTag)",
                            },
                            [createText("Stub")],
                        ),
                        createElement(
                            "div",
                            {
                                class: "create-vg-stub-review-title-cell",
                            },
                            [
                                createElement("cdx-text-input", {
                                    placeholder: "Template name without braces",
                                    "v-model": "stubTag.stubTag",
                                    "v-on:update:model-value":
                                        "updateStubTagRow(index, $event)",
                                }),
                            ],
                        ),
                        createElement(
                            "cdx-button",
                            {
                                class: "create-vg-stub-review-action",
                                "v-on:click": "removeStubTagRow(index)",
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
                    "v-on:click": "addStubTagRow",
                },
                [createText("Add stub tag")],
            ),
        ]),
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
                    "v-bind:title": "formatCategorySourceTitle(row.source)",
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
                        "v-on:update:model-value":
                            "updateCategoryRowCategory(index, $event)",
                        "v-on:blur": "checkCategoryRow(index, $event)",
                    }),
                ],
            ),
            createElement(
                "cdx-button",
                {
                    class: "create-vg-stub-review-action",
                    "v-if": "row.category",
                    "v-on:click": "openCategoryEdit(row)",
                },
                [
                    createText(
                        "{{ row.pendingCreation || row.pendingEdit ? 'Pending' : row.status === 'OK' ? 'Edit' : 'Create' }}",
                    ),
                ],
            ),
            createElement("span", {
                "v-else": "",
            }),
            createElement(
                "cdx-button",
                {
                    class: "create-vg-stub-review-action",
                    "v-on:click": "removeCategoryRow(index)",
                },
                [createText("Remove")],
            ),
        ],
    );
}
