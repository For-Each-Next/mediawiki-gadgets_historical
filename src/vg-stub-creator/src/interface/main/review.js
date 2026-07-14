/* eslint-disable */

import {
    createElement,
    createIconActionLinkTemplate,
    createMessageTemplate,
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
                    "vg-stub-creator-review-table " +
                    "vg-stub-creator-category-table",
            },
        ),
        createMessageTemplate(
            "categoryState.error",
            "{{ categoryState.error }}",
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
                    "vg-stub-creator-review-table " +
                    "vg-stub-creator-redirect-table",
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
                    "vg-stub-creator-review-table " +
                    "vg-stub-creator-navbox-table",
            },
        ),
        createMessageTemplate("reviewState.error", "{{ reviewState.error }}"),
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
                    "vg-stub-creator-review-table " +
                    "vg-stub-creator-stub-tag-table",
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
                "Remove empty rows",
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
            "vg-stub-creator-review-row-marker--category-add",
        ),
        createCategorySourceSlotTemplate(),
        createCategoryTitleSlotTemplate(),
        createPageEditSlotTemplate(
            "page",
            "row.category",
            "row.status === 'OK'",
            "openCategoryEdit(row)",
        ),
        createCategoryActionSlotTemplate(),
    ];
}

/**
 * Creates the category source slot.
 *
 * @returns {object} Category source slot node.
 */
function createCategorySourceSlotTemplate() {
    return createSlotTemplate("source", [
        createInfoChipTemplate("formatCategoryStatusLabel(row)", {
            status: "getCategoryStatusChipStatus(row)",
            title: "formatCategoryStatusTitle(row)",
        }),
    ]);
}

/**
 * Creates the category title input slot.
 *
 * @returns {object} Category title slot node.
 */
function createCategoryTitleSlotTemplate() {
    return createInputSlotTemplate("category", {
        "v-model": "row.category",
        "v-on:blur":
            "checkCategoryRow(form.categoryRows.indexOf(row), $event)",
        "v-on:update:model-value":
            "updateCategoryRowCategory(form.categoryRows.indexOf(row), $event)",
    });
}

/**
 * Creates the category row action slot.
 *
 * @returns {object} Category action slot node.
 */
function createCategoryActionSlotTemplate() {
    return createActionSlotTemplate([
        createIconActionLinkTemplate(
            "Refresh",
            "tableActionIcons.reload",
            "checkCategoryRow(form.categoryRows.indexOf(row))",
            {
                title: "Refresh this category's page status and edit/create action",
                "v-if": "row.category",
            },
        ),
        createRemoveActionTemplate(
            "removeCategoryRow(form.categoryRows.indexOf(row))",
        ),
    ]);
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
                "Remove empty rows",
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
            "vg-stub-creator-review-row-marker--redirect-conflict",
        ),
        createStatusSlotTemplate(
            "status",
            "row.status",
            "formatRedirectStatusLabel(row)",
            "getRedirectStatusChipStatus(row)",
        ),
        createRedirectTitleSlotTemplate(),
        createPageEditSlotTemplate(
            "page",
            "row.title",
            "row.exists",
            "openRedirectEdit(row)",
        ),
        createRedirectActionSlotTemplate(),
    ];
}

/**
 * Creates the redirect title input slot.
 *
 * @returns {object} Redirect title slot node.
 */
function createRedirectTitleSlotTemplate() {
    return createInputSlotTemplate("title", {
        "v-model": "row.title",
        "v-on:blur":
            "checkRedirectRow((form.redirectRows || []).indexOf(row), $event)",
        "v-on:update:model-value":
            "updateRedirectRowTitle((form.redirectRows || []).indexOf(row), $event)",
    });
}

/**
 * Creates the redirect row action slot.
 *
 * @returns {object} Redirect action slot node.
 */
function createRedirectActionSlotTemplate() {
    return createActionSlotTemplate([
        createIconActionLinkTemplate(
            "Refresh",
            "tableActionIcons.reload",
            "checkRedirectRow((form.redirectRows || []).indexOf(row))",
            {
                title: "Refresh this redirect's existence status",
                "v-if": "row.title",
            },
        ),
        createRemoveActionTemplate(
            "removeRedirectRow((form.redirectRows || []).indexOf(row))",
        ),
    ]);
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
                "Remove empty rows",
                "tableActionIcons.clean",
                "cleanNavboxRows",
            ),
            createIconActionLinkTemplate(
                "Add",
                "tableActionIcons.cdxIconArticleAdd",
                "addNavboxRow",
            ),
        ]),
        createToggleSlotTemplate(
            "enabled",
            "row.enabled",
            "Include navbox",
            "isNavboxAddReviewRow(row)",
            "vg-stub-creator-review-row-marker--navbox-add",
        ),
        createStatusSlotTemplate(
            "status",
            "row.status",
            "formatNavboxStatusLabel(row)",
            "getNavboxStatusChipStatus(row)",
        ),
        createNavboxTextSlotTemplate(),
        createPageEditSlotTemplate(
            "page",
            "row.title",
            "row.status === 'OK'",
            "openNavboxEdit(row)",
        ),
        createNavboxActionSlotTemplate(),
    ];
}

/**
 * Creates the navbox text input slot.
 *
 * @returns {object} Navbox text slot node.
 */
function createNavboxTextSlotTemplate() {
    return createInputSlotTemplate("text", {
        "v-model": "row.text",
        "v-on:blur":
            "checkNavboxRow((form.navboxRows || []).indexOf(row), $event)",
        "v-on:update:model-value":
            "updateNavboxRow((form.navboxRows || []).indexOf(row), $event)",
    });
}

/**
 * Creates the navbox row action slot.
 *
 * @returns {object} Navbox action slot node.
 */
function createNavboxActionSlotTemplate() {
    return createActionSlotTemplate([
        createIconActionLinkTemplate(
            "Refresh",
            "tableActionIcons.reload",
            "checkNavboxRow((form.navboxRows || []).indexOf(row))",
            {
                title: "Refresh this navbox's page status and edit/create action",
                "v-if": "row.title",
            },
        ),
        createRemoveActionTemplate(
            "removeNavboxRow((form.navboxRows || []).indexOf(row))",
        ),
    ]);
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
                "Remove empty rows",
                "tableActionIcons.clean",
                "cleanStubTagRows",
            ),
            createIconActionLinkTemplate(
                "Add",
                "tableActionIcons.cdxIconArticleAdd",
                "addStubTagRow",
            ),
        ]),
        createToggleSlotTemplate(
            "enabled",
            "row.enabled",
            "Include stub tag",
            "isStubTagAddReviewRow(row)",
            "vg-stub-creator-review-row-marker--stub-tag-add",
        ),
        createStubTagStatusSlotTemplate(),
        createStubTagInputSlotTemplate(),
        createPageEditSlotTemplate(
            "page",
            "row.stubTag",
            "true",
            "openStubTagEdit(row)",
        ),
        createActionSlotTemplate([
            createRemoveActionTemplate(
                "removeStubTagRow(stubTagRows.indexOf(row))",
            ),
        ]),
    ];
}

/**
 * Creates the stub-tag status slot.
 *
 * @returns {object} Stub-tag status slot node.
 */
function createStubTagStatusSlotTemplate() {
    return createSlotTemplate("type", [
        createInfoChipTemplate("formatStubTagStatusLabel(row)", {
            status: "getStubTagStatusChipStatus(row)",
            title: "formatStubTagLabel(row.stubTag)",
        }),
    ]);
}

/**
 * Creates the stub-tag input slot.
 *
 * @returns {object} Stub-tag input slot node.
 */
function createStubTagInputSlotTemplate() {
    return createInputSlotTemplate("stubTag", {
        "v-model": "row.stubTag",
        "v-on:update:model-value":
            "updateStubTagRow(stubTagRows.indexOf(row), $event)",
    });
}

/**
 * Creates a table slot containing a text input.
 *
 * @param {string} column - Column slot suffix.
 * @param {object} attributes - Text input attributes.
 * @returns {object} Text input slot node.
 */
function createInputSlotTemplate(column, attributes) {
    return createSlotTemplate(column, [
        createElement("cdx-text-input", attributes),
    ]);
}

/**
 * Creates a table row action slot.
 *
 * @param {Array<object>} actions - Row action nodes.
 * @returns {object} Row action slot node.
 */
function createActionSlotTemplate(actions) {
    return createSlotTemplate("actions", actions);
}

/**
 * Creates a table slot.
 *
 * @param {string} column - Column slot suffix.
 * @param {Array<object|string>} children - Slot children.
 * @returns {object} Table slot node.
 */
function createSlotTemplate(column, children) {
    return createElement(
        "template",
        {
            [`v-slot:item-${column}`]: "{ row }",
        },
        children,
    );
}

/**
 * Creates a remove action button.
 *
 * @param {string} click - Click handler expression.
 * @returns {object} Remove action button node.
 */
function createRemoveActionTemplate(click) {
    return createIconActionLinkTemplate(
        "Remove",
        "tableActionIcons.remove",
        click,
        {
            class: "vg-stub-creator-destructive-action",
        },
    );
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
                class: `vg-stub-creator-review-row-marker ${markerClass}`,
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
    return createSlotTemplate(column, [
        createInfoChipTemplate(label, { status, title }),
    ]);
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
    return createSlotTemplate(column, [
        createPageEditLinkTemplate(condition, existing, click),
    ]);
}

/**
 * Creates an edit/create page action link.
 *
 * @param {string} condition - Vue condition for showing the action.
 * @param {string} existing - Vue expression checking whether the page exists.
 * @param {string} click - Click handler expression.
 * @returns {object} Page action link node.
 */
function createPageEditLinkTemplate(condition, existing, click) {
    return createElement(
        "a",
        {
            href: "#",
            "v-bind:aria-label": `getReviewPageActionLabel(row, ${existing}) + ' page'`,
            "v-if": condition,
            "v-on:click.prevent": click,
        },
        [createText(`{{ getReviewPageActionLabel(row, ${existing}) }}`)],
    );
}
