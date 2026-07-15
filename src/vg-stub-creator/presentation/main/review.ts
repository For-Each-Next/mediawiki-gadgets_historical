import {
    createElement,
    createIconActionLinkTemplate,
    createMessageTemplate,
    createTableHeaderTemplate,
    createTableTemplate,
    createText,
} from "../template.ts";

/**
 * Creates the review panel and category grid template node.
 *
 * @returns Category review grid node.
 */
export function createCategoryGroupTemplate(): any {
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
 * @returns Category review template node.
 */
function createCategoryReviewTemplate(): any {
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
 * @returns Redirect review template node.
 */
function createRedirectReviewTemplate(): any {
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
 * @returns Navbox review template node.
 */
function createNavboxReviewTemplate(): any {
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
 * @returns Stub-tag review template node.
 */
function createStubTagReviewTemplate(): any {
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
 * @returns Category table slot nodes.
 */
function createCategorySlotsTemplate(): Array<any> {
    return [
        createTableHeaderTemplate("Categories", createCategoryHeaderActions()),
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

/** Creates category-table header actions. */
function createCategoryHeaderActions(): Array<any> {
    const reset = createIconActionLinkTemplate(
        "Reset",
        "tableActionIcons.regenerate",
        "rebuildCategoryRows",
        { "aria-disabled": "categoryState.loading" },
    );
    const clean = createIconActionLinkTemplate(
        "Remove empty rows",
        "tableActionIcons.clean",
        "cleanCategoryRows",
    );
    const add = createIconActionLinkTemplate(
        "Add",
        "tableActionIcons.cdxIconArticleAdd",
        "addCategoryRow",
    );

    return [reset, clean, add];
}

/**
 * Creates the category source slot.
 *
 * @returns Category source slot node.
 */
function createCategorySourceSlotTemplate(): any {
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
 * @returns Category title slot node.
 */
function createCategoryTitleSlotTemplate(): any {
    return createInputSlotTemplate("category", {
        "v-model": "row.category",
        "v-on:blur": [
            "checkCategoryRow(form.categoryRows",
            ".indexOf(row), $event)",
        ].join(""),
        "v-on:update:model-value": [
            "updateCategoryRowCategory(form.cat",
            "egoryRows.indexOf(row), $event)",
        ].join(""),
    });
}

/**
 * Creates the category row action slot.
 *
 * @returns Category action slot node.
 */
function createCategoryActionSlotTemplate(): any {
    return createActionSlotTemplate([
        createIconActionLinkTemplate(
            "Refresh",
            "tableActionIcons.reload",
            "checkCategoryRow(form.categoryRows.indexOf(row))",
            {
                title: [
                    "Refresh this category's page statu",
                    "s and edit/create action",
                ].join(""),
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
 * @returns Redirect table slot nodes.
 */
function createRedirectSlotsTemplate(): Array<any> {
    return [
        createTableHeaderTemplate("Redirects", createRedirectHeaderActions()),
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

/** Creates redirect-table header actions. */
function createRedirectHeaderActions(): Array<any> {
    const reset = createIconActionLinkTemplate(
        "Reset",
        "tableActionIcons.regenerate",
        "rebuildRedirectRows",
        {
            "aria-disabled": "reviewState.loading",
            title: "Reset generated redirects",
        },
    );
    const clean = createIconActionLinkTemplate(
        "Remove empty rows",
        "tableActionIcons.clean",
        "cleanRedirectRows",
    );
    const add = createIconActionLinkTemplate(
        "Add",
        "tableActionIcons.cdxIconArticleAdd",
        "addRedirectRow",
    );
    const refresh = createRedirectRefreshAction();

    return [reset, clean, add, refresh];
}

/** Creates the redirect-table refresh action. */
function createRedirectRefreshAction(): any {
    const attributes = {
        "aria-disabled": "reviewState.loading",
        title: "Refresh existence status for all redirect rows",
    };
    const action = createIconActionLinkTemplate(
        "Refresh",
        "tableActionIcons.reload",
        "checkRedirectRows",
        attributes,
    );

    return action;
}

/**
 * Creates the redirect title input slot.
 *
 * @returns Redirect title slot node.
 */
function createRedirectTitleSlotTemplate(): any {
    return createInputSlotTemplate("title", {
        "v-model": "row.title",
        "v-on:blur": [
            "checkRedirectRow((form.redirectRow",
            "s || []).indexOf(row), $event)",
        ].join(""),
        "v-on:update:model-value": [
            "updateRedirectRowTitle((form.redir",
            "ectRows || []).indexOf(row), $even",
            "t)",
        ].join(""),
    });
}

/**
 * Creates the redirect row action slot.
 *
 * @returns Redirect action slot node.
 */
function createRedirectActionSlotTemplate(): any {
    return createActionSlotTemplate([
        createIconActionLinkTemplate(
            "Refresh",
            "tableActionIcons.reload",
            [
                "checkRedirectRow((form.redirectRow",
                "s || []).indexOf(row))",
            ].join(""),
            {
                title: "Refresh this redirect's existence status",
                "v-if": "row.title",
            },
        ),
        createRemoveActionTemplate(
            [
                "removeRedirectRow((form.redirectRo",
                "ws || []).indexOf(row))",
            ].join(""),
        ),
    ]);
}

/**
 * Creates navbox table slot templates.
 *
 * @returns Navbox table slot nodes.
 */
function createNavboxSlotsTemplate(): Array<any> {
    return [
        createTableHeaderTemplate("Navboxes", createNavboxHeaderActions()),
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

/** Creates navbox-table header actions. */
function createNavboxHeaderActions(): Array<any> {
    const reset = createIconActionLinkTemplate(
        "Reset",
        "tableActionIcons.regenerate",
        "rebuildNavboxRows",
        { "aria-disabled": "reviewState.loading" },
    );
    const clean = createIconActionLinkTemplate(
        "Remove empty rows",
        "tableActionIcons.clean",
        "cleanNavboxRows",
    );
    const add = createIconActionLinkTemplate(
        "Add",
        "tableActionIcons.cdxIconArticleAdd",
        "addNavboxRow",
    );

    return [reset, clean, add];
}

/**
 * Creates the navbox text input slot.
 *
 * @returns Navbox text slot node.
 */
function createNavboxTextSlotTemplate(): any {
    return createInputSlotTemplate("text", {
        "v-model": "row.text",
        "v-on:blur": [
            "checkNavboxRow((form.navboxRows ||",
            " []).indexOf(row), $event)",
        ].join(""),
        "v-on:update:model-value": [
            "updateNavboxRow((form.navboxRows |",
            "| []).indexOf(row), $event)",
        ].join(""),
    });
}

/**
 * Creates the navbox row action slot.
 *
 * @returns Navbox action slot node.
 */
function createNavboxActionSlotTemplate(): any {
    return createActionSlotTemplate([
        createIconActionLinkTemplate(
            "Refresh",
            "tableActionIcons.reload",
            "checkNavboxRow((form.navboxRows || []).indexOf(row))",
            {
                title: [
                    "Refresh this navbox's page status ",
                    "and edit/create action",
                ].join(""),
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
 * @returns Stub-tag table slot nodes.
 */
function createStubTagSlotsTemplate(): Array<any> {
    return [
        createTableHeaderTemplate("Stub tags", createStubTagHeaderActions()),
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

/** Creates stub-tag-table header actions. */
function createStubTagHeaderActions(): Array<any> {
    const reset = createIconActionLinkTemplate(
        "Reset",
        "tableActionIcons.regenerate",
        "resetStubTagRows",
    );
    const clean = createIconActionLinkTemplate(
        "Remove empty rows",
        "tableActionIcons.clean",
        "cleanStubTagRows",
    );
    const add = createIconActionLinkTemplate(
        "Add",
        "tableActionIcons.cdxIconArticleAdd",
        "addStubTagRow",
    );

    return [reset, clean, add];
}

/**
 * Creates the stub-tag status slot.
 *
 * @returns Stub-tag status slot node.
 */
function createStubTagStatusSlotTemplate(): any {
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
 * @returns Stub-tag input slot node.
 */
function createStubTagInputSlotTemplate(): any {
    return createInputSlotTemplate("stubTag", {
        "v-model": "row.stubTag",
        "v-on:update:model-value":
            "updateStubTagRow(stubTagRows.indexOf(row), $event)",
    });
}

/**
 * Creates a table slot containing a text input.
 *
 * @param column - Column slot suffix.
 * @param attributes - Text input attributes.
 * @returns Text input slot node.
 */
function createInputSlotTemplate(column: string, attributes: any): any {
    return createSlotTemplate(column, [
        createElement("cdx-text-input", attributes),
    ]);
}

/**
 * Creates a table row action slot.
 *
 * @param actions - Row action nodes.
 * @returns Row action slot node.
 */
function createActionSlotTemplate(actions: Array<any>): any {
    return createSlotTemplate("actions", actions);
}

/**
 * Creates a table slot.
 *
 * @param column - Column slot suffix.
 * @param children - Slot children.
 * @returns Table slot node.
 */
function createSlotTemplate(
    column: string,
    children: Array<any | string>,
): any {
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
 * @param click - Click handler expression.
 * @returns Remove action button node.
 */
function createRemoveActionTemplate(click: string): any {
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
 * @param column - Column slot suffix.
 * @param model - Vue model expression.
 * @param label - Accessible checkbox label.
 * @param markerCondition - Vue condition for row highlight
 * marker.
 * @param markerClass - Highlight marker CSS class.
 * @returns Table slot node.
 */
function createToggleSlotTemplate(
    column: string,
    model: string,
    label: string,
    markerCondition: string = "",
    markerClass: string = "",
): any {
    const checkbox = createElement("cdx-checkbox", {
        "aria-label": label,
        title: label,
        "v-model": model,
    });
    const children = [checkbox];

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
 * @param column - Column slot suffix.
 * @param title - Status tooltip expression.
 * @param label - Status label expression.
 * @param status - InfoChip status expression.
 * @returns Table slot node.
 */
function createStatusSlotTemplate(
    column: string,
    title: string,
    label: string,
    status: string = "'notice'",
): any {
    return createSlotTemplate(column, [
        createInfoChipTemplate(label, { status, title }),
    ]);
}

/**
 * Creates an InfoChip table-cell tag.
 *
 * @param label - Label text or Vue expression.
 * @param options - Chip options.
 * @param options.bindLabel - Whether label is a Vue
 * binding.
 * @param options.status - InfoChip status expression.
 * @param options.title - Tooltip expression.
 * @returns InfoChip node.
 */
function createInfoChipTemplate(label: string, options: any = {}): any {
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
 * @param column - Column slot suffix.
 * @param condition - Vue condition for showing the action.
 * @param existing - Vue expression checking whether the page
 * exists.
 * @param click - Click handler expression.
 * @returns Table slot node.
 */
function createPageEditSlotTemplate(
    column: string,
    condition: string,
    existing: string,
    click: string,
): any {
    return createSlotTemplate(column, [
        createPageEditLinkTemplate(condition, existing, click),
    ]);
}

/**
 * Creates an edit/create page action link.
 *
 * @param condition - Vue condition for showing the action.
 * @param existing - Vue expression checking whether the page
 * exists.
 * @param click - Click handler expression.
 * @returns Page action link node.
 */
function createPageEditLinkTemplate(
    condition: string,
    existing: string,
    click: string,
): any {
    return createElement(
        "a",
        {
            href: "#",
            "v-bind:aria-label": [
                "getReviewPageActionLabel(row, ",
                existing,
                ") + ' page'",
            ].join(""),
            "v-if": condition,
            "v-on:click.prevent": click,
        },
        [createText(`{{ getReviewPageActionLabel(row, ${existing}) }}`)],
    );
}
