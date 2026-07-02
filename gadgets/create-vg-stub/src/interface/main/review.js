/* eslint-disable */

import {
    createElement,
    createIconActionLinkTemplate,
    createTableHeaderTemplate,
    createTableTemplate,
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
        createTableTemplate(
            "categoryTableColumns",
            "form.categoryRows",
            createCategorySlotsTemplate(),
            {
                caption: "Categories",
                class:
                    "create-vg-stub-review-table " +
                    "create-vg-stub-category-table",
            },
        ),
        createElement(
            "p",
            {
                class: "create-vg-stub-error",
                "v-if": "categoryState.error",
            },
            [createText("{{ categoryState.error }}")],
        ),
    ]);
}

/**
 * Creates redirect review rows.
 *
 * @returns {object} Redirect review template node.
 */
function createRedirectReviewTemplate() {
    return createElement("section", {}, [
        createTableTemplate(
            "redirectTableColumns",
            "form.redirectRows || []",
            createRedirectSlotsTemplate(),
            {
                caption: "Redirects",
                class:
                    "create-vg-stub-review-table " +
                    "create-vg-stub-redirect-table",
            },
        ),
    ]);
}

/**
 * Creates editable navbox review rows.
 *
 * @returns {object} Navbox review template node.
 */
function createNavboxReviewTemplate() {
    return createElement("section", {}, [
        createTableTemplate(
            "navboxTableColumns",
            "form.navboxRows || []",
            createNavboxSlotsTemplate(),
            {
                caption: "Navboxes",
                class:
                    "create-vg-stub-review-table " +
                    "create-vg-stub-navbox-table",
            },
        ),
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
        createTableTemplate(
            "stubTagTableColumns",
            "stubTagRows",
            createStubTagSlotsTemplate(),
            {
                caption: "Stub tags",
                class:
                    "create-vg-stub-review-table " +
                    "create-vg-stub-stub-tag-table",
            },
        ),
    ]);
}

/**
 * Creates category table slot templates.
 *
 * @returns {Array<object>} Category table slot nodes.
 */
function createCategorySlotsTemplate() {
    return [
        createTableHeaderTemplate("Categories", [
            createIconActionLinkTemplate(
                "Reset",
                "tableActionIcons.regenerate",
                "rebuildCategoryRows",
                {
                    "aria-disabled": "categoryState.loading",
                },
            ),
            createIconActionLinkTemplate(
                "Clean",
                "tableActionIcons.clean",
                "cleanCategoryRows",
            ),
            createIconActionLinkTemplate(
                "Add",
                "tableActionIcons.cdxIconArticleAdd",
                "addCategoryRow",
            ),
        ]),
        createToggleSlotTemplate(
            "enabled",
            "row.enabled",
            "Include category",
            "isCategoryAddReviewRow(row)",
            "create-vg-stub-review-row-marker--category-add",
        ),
        createElement(
            "template",
            {
                "v-slot:item-source": "{ row }",
            },
            [
                createInfoChipTemplate(
                    "formatCategorySourceLabel(row.source)",
                    {
                        title: "formatCategorySourceTitle(row.source)",
                    },
                ),
            ],
        ),
        createElement(
            "template",
            {
                "v-slot:item-category": "{ row }",
            },
            [
                createElement("cdx-text-input", {
                    "v-model": "row.category",
                    "v-on:update:model-value":
                        "updateCategoryRowCategory(form.categoryRows.indexOf(row), $event)",
                    "v-on:blur":
                        "checkCategoryRow(form.categoryRows.indexOf(row), $event)",
                }),
            ],
        ),
        createPageEditSlotTemplate(
            "page",
            "row.category",
            "row.status === 'OK'",
            "openCategoryEdit(row)",
        ),
        createElement(
            "template",
            {
                "v-slot:item-actions": "{ row }",
            },
            [
                createIconActionLinkTemplate(
                    "Refresh",
                    "tableActionIcons.reload",
                    "checkCategoryRow(form.categoryRows.indexOf(row))",
                    {
                        title: "Refresh this category's page status and edit/create action",
                        "v-if": "row.category",
                    },
                ),
                createIconActionLinkTemplate(
                    "Remove",
                    "tableActionIcons.remove",
                    "removeCategoryRow(form.categoryRows.indexOf(row))",
                    {
                        class: "create-vg-stub-destructive-action",
                    },
                ),
            ],
        ),
    ];
}

/**
 * Creates redirect table slot templates.
 *
 * @returns {Array<object>} Redirect table slot nodes.
 */
function createRedirectSlotsTemplate() {
    return [
        createTableHeaderTemplate("Redirects", [
            createIconActionLinkTemplate(
                "Reset",
                "tableActionIcons.regenerate",
                "rebuildRedirectRows",
                {
                    "aria-disabled": "reviewState.loading",
                    title: "Reset generated redirects",
                },
            ),
            createIconActionLinkTemplate(
                "Clean",
                "tableActionIcons.clean",
                "cleanRedirectRows",
            ),
            createIconActionLinkTemplate(
                "Add",
                "tableActionIcons.cdxIconArticleAdd",
                "addRedirectRow",
            ),
            createIconActionLinkTemplate(
                "Refresh",
                "tableActionIcons.reload",
                "checkRedirectRows",
                {
                    "aria-disabled": "reviewState.loading",
                    title: "Refresh existence status for all redirect rows",
                },
            ),
        ]),
        createToggleSlotTemplate(
            "enabled",
            "row.enabled",
            "Include redirect",
            "isRedirectConflictReviewRow(row)",
            "create-vg-stub-review-row-marker--redirect-conflict",
        ),
        createStatusSlotTemplate(
            "status",
            "row.status",
            "formatRedirectStatusLabel(row.status)",
            "getRedirectStatusChipStatus(row.status)",
        ),
        createElement(
            "template",
            {
                "v-slot:item-title": "{ row }",
            },
            [
                createElement("cdx-text-input", {
                    "v-model": "row.title",
                    "v-on:update:model-value":
                        "updateRedirectRowTitle((form.redirectRows || []).indexOf(row), $event)",
                    "v-on:blur":
                        "checkRedirectRow((form.redirectRows || []).indexOf(row), $event)",
                }),
            ],
        ),
        createPageEditSlotTemplate(
            "page",
            "row.title",
            "row.exists",
            "openRedirectEdit(row)",
        ),
        createElement(
            "template",
            {
                "v-slot:item-actions": "{ row }",
            },
            [
                createIconActionLinkTemplate(
                    "Refresh",
                    "tableActionIcons.reload",
                    "checkRedirectRow((form.redirectRows || []).indexOf(row))",
                    {
                        title: "Refresh this redirect's existence status",
                        "v-if": "row.title",
                    },
                ),
                createIconActionLinkTemplate(
                    "Remove",
                    "tableActionIcons.remove",
                    "removeRedirectRow((form.redirectRows || []).indexOf(row))",
                    {
                        class: "create-vg-stub-destructive-action",
                    },
                ),
            ],
        ),
    ];
}

/**
 * Creates navbox table slot templates.
 *
 * @returns {Array<object>} Navbox table slot nodes.
 */
function createNavboxSlotsTemplate() {
    return [
        createTableHeaderTemplate("Navboxes", [
            createIconActionLinkTemplate(
                "Reset",
                "tableActionIcons.regenerate",
                "rebuildNavboxRows",
                {
                    "aria-disabled": "reviewState.loading",
                },
            ),
            createIconActionLinkTemplate(
                "Clean",
                "tableActionIcons.clean",
                "cleanNavboxRows",
            ),
            createIconActionLinkTemplate(
                "Add",
                "tableActionIcons.cdxIconArticleAdd",
                "addNavboxRow",
            ),
        ]),
        createToggleSlotTemplate("enabled", "row.enabled", "Include navbox"),
        createStatusSlotTemplate(
            "status",
            "row.status",
            "formatNavboxStatusLabel(row.status)",
            "getNavboxStatusChipStatus(row.status)",
        ),
        createElement(
            "template",
            {
                "v-slot:item-text": "{ row }",
            },
            [
                createElement("cdx-text-input", {
                    "v-model": "row.text",
                    "v-on:update:model-value":
                        "updateNavboxRow((form.navboxRows || []).indexOf(row), $event)",
                    "v-on:blur":
                        "checkNavboxRow((form.navboxRows || []).indexOf(row), $event)",
                }),
            ],
        ),
        createPageEditSlotTemplate(
            "page",
            "row.title",
            "row.status === 'OK'",
            "openNavboxEdit(row)",
        ),
        createElement(
            "template",
            {
                "v-slot:item-actions": "{ row }",
            },
            [
                createIconActionLinkTemplate(
                    "Refresh",
                    "tableActionIcons.reload",
                    "checkNavboxRow((form.navboxRows || []).indexOf(row))",
                    {
                        title: "Refresh this navbox's page status and edit/create action",
                        "v-if": "row.title",
                    },
                ),
                createIconActionLinkTemplate(
                    "Remove",
                    "tableActionIcons.remove",
                    "removeNavboxRow((form.navboxRows || []).indexOf(row))",
                    {
                        class: "create-vg-stub-destructive-action",
                    },
                ),
            ],
        ),
    ];
}

/**
 * Creates stub-tag table slot templates.
 *
 * @returns {Array<object>} Stub-tag table slot nodes.
 */
function createStubTagSlotsTemplate() {
    return [
        createTableHeaderTemplate("Stub tags", [
            createIconActionLinkTemplate(
                "Reset",
                "tableActionIcons.regenerate",
                "resetStubTagRows",
            ),
            createIconActionLinkTemplate(
                "Clean",
                "tableActionIcons.clean",
                "cleanStubTagRows",
            ),
            createIconActionLinkTemplate(
                "Add",
                "tableActionIcons.cdxIconArticleAdd",
                "addStubTagRow",
            ),
        ]),
        createToggleSlotTemplate("enabled", "row.enabled", "Include stub tag"),
        createElement(
            "template",
            {
                "v-slot:item-type": "{ row }",
            },
            [
                createInfoChipTemplate("formatStubTagStatusLabel(row)", {
                    status: "getStubTagStatusChipStatus(row)",
                    title: "formatStubTagLabel(row.stubTag)",
                }),
            ],
        ),
        createElement(
            "template",
            {
                "v-slot:item-stubTag": "{ row }",
            },
            [
                createElement("cdx-text-input", {
                    placeholder: "Template name without braces",
                    "v-model": "row.stubTag",
                    "v-on:update:model-value":
                        "updateStubTagRow(stubTagRows.indexOf(row), $event)",
                }),
            ],
        ),
        createPageEditSlotTemplate(
            "page",
            "row.stubTag",
            "true",
            "openStubTagEdit(row)",
        ),
        createElement(
            "template",
            {
                "v-slot:item-actions": "{ row }",
            },
            [
                createIconActionLinkTemplate(
                    "Remove",
                    "tableActionIcons.remove",
                    "removeStubTagRow(stubTagRows.indexOf(row))",
                    {
                        class: "create-vg-stub-destructive-action",
                    },
                ),
            ],
        ),
    ];
}

/**
 * Creates a table slot containing an include checkbox.
 *
 * @param {string} column - Column slot suffix.
 * @param {string} model - Vue model expression.
 * @param {string} label - Accessible checkbox label.
 * @param {string} [markerCondition] - Vue condition for row highlight marker.
 * @param {string} [markerClass] - Highlight marker CSS class.
 * @returns {object} Table slot node.
 */
function createToggleSlotTemplate(
    column,
    model,
    label,
    markerCondition = "",
    markerClass = "",
) {
    const children = [
        createElement("cdx-checkbox", {
            "aria-label": label,
            title: label,
            "v-model": model,
        }),
    ];

    if (markerCondition !== "") {
        children.push(
            createElement("span", {
                "aria-hidden": "true",
                class: `create-vg-stub-review-row-marker ${markerClass}`,
                "v-if": markerCondition,
            }),
        );
    }

    return createElement(
        "template",
        {
            [`v-slot:item-${column}`]: "{ row }",
        },
        children,
    );
}

/**
 * Creates a plain status text table slot.
 *
 * @param {string} column - Column slot suffix.
 * @param {string} title - Status tooltip expression.
 * @param {string} label - Status label expression.
 * @param {string} [status] - InfoChip status expression.
 * @returns {object} Table slot node.
 */
function createStatusSlotTemplate(column, title, label, status = "'notice'") {
    return createElement(
        "template",
        {
            [`v-slot:item-${column}`]: "{ row }",
        },
        [createInfoChipTemplate(label, { status, title })],
    );
}

/**
 * Creates an InfoChip table-cell tag.
 *
 * @param {string} label - Label text or Vue expression.
 * @param {object} [options] - Chip options.
 * @param {boolean} [options.bindLabel] - Whether label is a Vue binding.
 * @param {string} [options.status] - InfoChip status expression.
 * @param {string} [options.title] - Tooltip expression.
 * @returns {object} InfoChip node.
 */
function createInfoChipTemplate(label, options = {}) {
    return createElement(
        "cdx-info-chip",
        {
            "v-bind:status": options.status || "'notice'",
            ...(options.title ? { "v-bind:title": options.title } : {}),
        },
        [createText(options.bindLabel === false ? label : `{{ ${label} }}`)],
    );
}

/**
 * Creates a table slot with an edit/create page action.
 *
 * @param {string} column - Column slot suffix.
 * @param {string} condition - Vue condition for showing the action.
 * @param {string} existing - Vue expression checking whether the page exists.
 * @param {string} click - Click handler expression.
 * @returns {object} Table slot node.
 */
function createPageEditSlotTemplate(column, condition, existing, click) {
    return createElement(
        "template",
        {
            [`v-slot:item-${column}`]: "{ row }",
        },
        [
            createElement(
                "a",
                {
                    href: "#",
                    "v-bind:aria-label":
                        `getReviewPageActionLabel(row, ${existing}) + ' page'`,
                    "v-if": condition,
                    "v-on:click.prevent": click,
                },
                [
                    createText(
                        `{{ getReviewPageActionLabel(row, ${existing}) }}`,
                    ),
                ],
            ),
        ],
    );
}
