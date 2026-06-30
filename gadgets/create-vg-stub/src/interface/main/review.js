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
        createToggleSlotTemplate("enabled", "row.enabled", "Include category"),
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
        createToggleSlotTemplate("enabled", "row.enabled", "Include redirect"),
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
        createPageLinkSlotTemplate(
            "page",
            "row.title",
            "getRedirectPageUrl(row)",
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
                createInfoChipTemplate("Stub", {
                    bindLabel: false,
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
        createPageLinkSlotTemplate(
            "page",
            "row.stubTag",
            "getStubTagPageUrl(row)",
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
 * @returns {object} Table slot node.
 */
function createToggleSlotTemplate(column, model, label) {
    return createElement(
        "template",
        {
            [`v-slot:item-${column}`]: "{ row }",
        },
        [
            createElement("cdx-checkbox", {
                "aria-label": label,
                title: label,
                "v-model": model,
            }),
        ],
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
 * Creates a table slot with a page-navigation link.
 *
 * @param {string} column - Column slot suffix.
 * @param {string} condition - Vue condition for showing the link.
 * @param {string} href - Vue href expression.
 * @returns {object} Table slot node.
 */
function createPageLinkSlotTemplate(column, condition, href) {
    return createElement(
        "template",
        {
            [`v-slot:item-${column}`]: "{ row }",
        },
        [
            createElement(
                "a",
                {
                    "v-if": condition,
                    "v-bind:href": href,
                    rel: "noopener noreferrer",
                    target: "_blank",
                },
                [createText("Open")],
            ),
        ],
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
            createIconActionLinkTemplate(
                "Edit page",
                "tableActionIcons.cdxIconEdit",
                click,
                {
                    "v-if": `${condition} && ${existing}`,
                },
            ),
            createIconActionLinkTemplate(
                "Create page",
                "tableActionIcons.cdxIconArticleAdd",
                click,
                {
                    "v-if": `${condition} && !(${existing})`,
                },
            ),
        ],
    );
}
