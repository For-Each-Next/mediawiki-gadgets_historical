import {
    createElement,
    createIconActionLinkTemplate,
    createMessageTemplate,
    createTableHeaderTemplate,
    createTableTemplate,
    createText,
} from "#gadget/ui/template.ts";
import { msg } from "#gadget/i18n/index.ts";

/**
 * Creates the review panel and category grid template node.
 *
 * @returns Category review grid node.
 */
export function createCategoryGroupTemplate(): any {
    const redirectReviewResult = [
        createRedirectReviewTemplate(),
        createCategoryReviewTemplate(),
        createStubTagReviewTemplate(),
        createNavboxReviewTemplate(),
    ];
    const result = createElement(
        "template",
        {
            "v-if": "group.categoryReview",
        },
        redirectReviewResult,
    );
    return result;
}

/**
 * Creates editable category review rows.
 *
 * @returns Category review template node.
 */
function createCategoryReviewTemplate(): any {
    const categorySlotsResult = createCategorySlotsTemplate();
    const messageAD = {
        caption: msg("review.categories"),
        class:
            "vg-stub-creator-review-table " + "vg-stub-creator-category-table",
    };
    const tableResultC = [
        createTableTemplate(
            "categoryTableColumns",
            "form.categoryRows",
            categorySlotsResult,
            messageAD,
        ),
        createMessageTemplate(
            "categoryState.error",
            "{{ categoryState.error }}",
        ),
    ];
    const result = createElement("section", {}, tableResultC);
    return result;
}

/**
 * Creates redirect review rows.
 *
 * @returns Redirect review template node.
 */
function createRedirectReviewTemplate(): any {
    const redirectSlotsResult = createRedirectSlotsTemplate();
    const messageAC = {
        caption: msg("review.redirects"),
        class:
            "vg-stub-creator-review-table " + "vg-stub-creator-redirect-table",
    };
    const tableResultB = [
        createTableTemplate(
            "redirectTableColumns",
            "form.redirectRows || []",
            redirectSlotsResult,
            messageAC,
        ),
    ];
    const result = createElement("section", {}, tableResultB);
    return result;
}

/**
 * Creates editable navbox review rows.
 *
 * @returns Navbox review template node.
 */
function createNavboxReviewTemplate(): any {
    const navboxSlotsResult = createNavboxSlotsTemplate();
    const messageAB = {
        caption: msg("review.navboxes"),
        class:
            "vg-stub-creator-review-table " + "vg-stub-creator-navbox-table",
    };
    const tableResultA = [
        createTableTemplate(
            "navboxTableColumns",
            "form.navboxRows || []",
            navboxSlotsResult,
            messageAB,
        ),
        createMessageTemplate("reviewState.error", "{{ reviewState.error }}"),
    ];
    const result = createElement("section", {}, tableResultA);
    return result;
}

/**
 * Creates editable stub-tag review rows.
 *
 * @returns Stub-tag review template node.
 */
function createStubTagReviewTemplate(): any {
    const stubTagSlotsResult = createStubTagSlotsTemplate();
    const messageAA = {
        caption: msg("review.stubTags"),
        class:
            "vg-stub-creator-review-table " + "vg-stub-creator-stub-tag-table",
    };
    const tableResult = [
        createTableTemplate(
            "stubTagTableColumns",
            "stubTagRows",
            stubTagSlotsResult,
            messageAA,
        ),
    ];
    const result = createElement("section", {}, tableResult);
    return result;
}

/**
 * Creates category table slot templates.
 *
 * @returns Category table slot nodes.
 */
function createCategorySlotsTemplate(): Array<any> {
    const messageY = msg("review.categories");
    const categoryHeaderActionsResult = createCategoryHeaderActions();
    const messageZ = msg("review.includeCategory");
    const result = [
        createTableHeaderTemplate(messageY, categoryHeaderActionsResult),
        createToggleSlotTemplate(
            "enabled",
            "row.enabled",
            messageZ,
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
    return result;
}

/**
 * Creates category-table header actions.
 *
 * @returns Category-table header actions.
 */
function createCategoryHeaderActions(): Array<any> {
    const messageX = msg("common.reset");
    const reset = createIconActionLinkTemplate(
        messageX,
        "tableActionIcons.regenerate",
        "rebuildCategoryRows",
        { "aria-disabled": "categoryState.loading" },
    );
    const messageW = msg("common.clean");
    const clean = createIconActionLinkTemplate(
        messageW,
        "tableActionIcons.clean",
        "cleanCategoryRows",
    );
    const messageV = msg("common.add");
    const add = createIconActionLinkTemplate(
        messageV,
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
    const infoChipResultB = [
        createInfoChipTemplate("formatCategoryStatusLabel(row)", {
            status: "getCategoryStatusChipStatus(row)",
            title: "formatCategoryStatusTitle(row)",
        }),
    ];
    const result = createSlotTemplate("source", infoChipResultB);
    return result;
}

/**
 * Creates the category title input slot.
 *
 * @returns Category title slot node.
 */
function createCategoryTitleSlotTemplate(): any {
    const joinedTextG = {
        "v-model": "row.category",
        "v-on:blur": [
            "checkCategoryRow(form.categoryRows",
            ".indexOf(row), $event)",
        ].join(""),
        "v-on:update:model-value": [
            "updateCategoryRowCategory(form.cat",
            "egoryRows.indexOf(row), $event)",
        ].join(""),
    };
    const result = createInputSlotTemplate("category", joinedTextG);
    return result;
}

/**
 * Creates the category row action slot.
 *
 * @returns Category action slot node.
 */
function createCategoryActionSlotTemplate(): any {
    const messageU = msg("review.refresh");
    const joinedTextF = {
        title: [msg("review.refreshCategory")].join(""),
        "v-if": "row.category",
    };
    const iconActionLinkResultB = [
        createIconActionLinkTemplate(
            messageU,
            "tableActionIcons.reload",
            "checkCategoryRow(form.categoryRows.indexOf(row))",
            joinedTextF,
        ),
        createRemoveActionTemplate(
            "removeCategoryRow(form.categoryRows.indexOf(row))",
        ),
    ];
    const result = createActionSlotTemplate(iconActionLinkResultB);
    return result;
}

/**
 * Creates redirect table slot templates.
 *
 * @returns Redirect table slot nodes.
 */
function createRedirectSlotsTemplate(): Array<any> {
    const messageS = msg("review.redirects");
    const redirectHeaderActionsResult = createRedirectHeaderActions();
    const messageT = msg("review.includeRedirect");
    const result = [
        createTableHeaderTemplate(messageS, redirectHeaderActionsResult),
        createToggleSlotTemplate(
            "enabled",
            "row.enabled",
            messageT,
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
    return result;
}

/**
 * Creates redirect-table header actions.
 *
 * @returns Redirect-table header actions.
 */
function createRedirectHeaderActions(): Array<any> {
    const messageQ = msg("common.reset");
    const messageR = {
        "aria-disabled": "reviewState.loading",
        title: msg("review.resetRedirects"),
    };
    const reset = createIconActionLinkTemplate(
        messageQ,
        "tableActionIcons.regenerate",
        "rebuildRedirectRows",
        messageR,
    );
    const messageP = msg("common.clean");
    const clean = createIconActionLinkTemplate(
        messageP,
        "tableActionIcons.clean",
        "cleanRedirectRows",
    );
    const messageO = msg("common.add");
    const add = createIconActionLinkTemplate(
        messageO,
        "tableActionIcons.cdxIconArticleAdd",
        "addRedirectRow",
    );
    const refresh = createRedirectRefreshAction();

    return [reset, clean, add, refresh];
}

/**
 * Creates the redirect-table refresh action.
 *
 * @returns The redirect-table refresh action.
 */
function createRedirectRefreshAction(): any {
    const attributes = {
        "aria-disabled": "reviewState.loading",
        title: msg("review.refreshRedirects"),
    };
    const messageN = msg("review.refresh");
    const action = createIconActionLinkTemplate(
        messageN,
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
    const joinedTextE = {
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
    };
    const result = createInputSlotTemplate("title", joinedTextE);
    return result;
}

/**
 * Creates the redirect row action slot.
 *
 * @returns Redirect action slot node.
 */
function createRedirectActionSlotTemplate(): any {
    const messageL = msg("review.refresh");
    const joinedTextC = [
        "checkRedirectRow((form.redirectRow",
        "s || []).indexOf(row))",
    ].join("");
    const messageM = {
        title: msg("review.refreshRedirect"),
        "v-if": "row.title",
    };
    const joinedTextD = [
        "removeRedirectRow((form.redirectRo",
        "ws || []).indexOf(row))",
    ].join("");
    const iconActionLinkResultA = [
        createIconActionLinkTemplate(
            messageL,
            "tableActionIcons.reload",
            joinedTextC,
            messageM,
        ),
        createRemoveActionTemplate(joinedTextD),
    ];
    const result = createActionSlotTemplate(iconActionLinkResultA);
    return result;
}

/**
 * Creates navbox table slot templates.
 *
 * @returns Navbox table slot nodes.
 */
function createNavboxSlotsTemplate(): Array<any> {
    const messageJ = msg("review.navboxes");
    const navboxHeaderActionsResult = createNavboxHeaderActions();
    const messageK = msg("review.includeNavbox");
    const result = [
        createTableHeaderTemplate(messageJ, navboxHeaderActionsResult),
        createToggleSlotTemplate(
            "enabled",
            "row.enabled",
            messageK,
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
    return result;
}

/**
 * Creates navbox-table header actions.
 *
 * @returns Navbox-table header actions.
 */
function createNavboxHeaderActions(): Array<any> {
    const messageI = msg("common.reset");
    const reset = createIconActionLinkTemplate(
        messageI,
        "tableActionIcons.regenerate",
        "rebuildNavboxRows",
        { "aria-disabled": "reviewState.loading" },
    );
    const messageH = msg("common.clean");
    const clean = createIconActionLinkTemplate(
        messageH,
        "tableActionIcons.clean",
        "cleanNavboxRows",
    );
    const messageG = msg("common.add");
    const add = createIconActionLinkTemplate(
        messageG,
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
    const joinedTextB = {
        "v-model": "row.text",
        "v-on:blur": [
            "checkNavboxRow((form.navboxRows ||",
            " []).indexOf(row), $event)",
        ].join(""),
        "v-on:update:model-value": [
            "updateNavboxRow((form.navboxRows |",
            "| []).indexOf(row), $event)",
        ].join(""),
    };
    const result = createInputSlotTemplate("text", joinedTextB);
    return result;
}

/**
 * Creates the navbox row action slot.
 *
 * @returns Navbox action slot node.
 */
function createNavboxActionSlotTemplate(): any {
    const messageF = msg("review.refresh");
    const joinedTextA = {
        title: [msg("review.refreshNavbox")].join(""),
        "v-if": "row.title",
    };
    const iconActionLinkResult = [
        createIconActionLinkTemplate(
            messageF,
            "tableActionIcons.reload",
            "checkNavboxRow((form.navboxRows || []).indexOf(row))",
            joinedTextA,
        ),
        createRemoveActionTemplate(
            "removeNavboxRow((form.navboxRows || []).indexOf(row))",
        ),
    ];
    const result = createActionSlotTemplate(iconActionLinkResult);
    return result;
}

/**
 * Creates stub-tag table slot templates.
 *
 * @returns Stub-tag table slot nodes.
 */
function createStubTagSlotsTemplate(): Array<any> {
    const messageD = msg("review.stubTags");
    const stubTagHeaderActionsResult = createStubTagHeaderActions();
    const messageE = msg("review.includeStubTag");
    const removeActionResult = [
        createRemoveActionTemplate(
            "removeStubTagRow(stubTagRows.indexOf(row))",
        ),
    ];
    const result = [
        createTableHeaderTemplate(messageD, stubTagHeaderActionsResult),
        createToggleSlotTemplate(
            "enabled",
            "row.enabled",
            messageE,
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
        createActionSlotTemplate(removeActionResult),
    ];
    return result;
}

/**
 * Creates stub-tag-table header actions.
 *
 * @returns Stub-tag-table header actions.
 */
function createStubTagHeaderActions(): Array<any> {
    const messageC = msg("common.reset");
    const reset = createIconActionLinkTemplate(
        messageC,
        "tableActionIcons.regenerate",
        "resetStubTagRows",
    );
    const messageB = msg("common.clean");
    const clean = createIconActionLinkTemplate(
        messageB,
        "tableActionIcons.clean",
        "cleanStubTagRows",
    );
    const messageA = msg("common.add");
    const add = createIconActionLinkTemplate(
        messageA,
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
    const infoChipResultA = [
        createInfoChipTemplate("formatStubTagStatusLabel(row)", {
            status: "getStubTagStatusChipStatus(row)",
            title: "formatStubTagLabel(row.stubTag)",
        }),
    ];
    const result = createSlotTemplate("type", infoChipResultA);
    return result;
}

/**
 * Creates the stub-tag input slot.
 *
 * @returns Stub-tag input slot node.
 */
function createStubTagInputSlotTemplate(): any {
    const result = createInputSlotTemplate("stubTag", {
        "v-model": "row.stubTag",
        "v-on:update:model-value":
            "updateStubTagRow(stubTagRows.indexOf(row), $event)",
    });
    return result;
}

/**
 * Creates a table slot containing a text input.
 *
 * @param column - Column slot suffix.
 * @param attributes - Text input attributes.
 * @returns Text input slot node.
 */
function createInputSlotTemplate(column: string, attributes: any): any {
    const elementResultA = [createElement("cdx-text-input", attributes)];
    const result = createSlotTemplate(column, elementResultA);
    return result;
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
    const result = createElement(
        "template",
        {
            [`v-slot:item-${column}`]: "{ row }",
        },
        children,
    );
    return result;
}

/**
 * Creates a remove action button.
 *
 * @param click - Click handler expression.
 * @returns Remove action button node.
 */
function createRemoveActionTemplate(click: string): any {
    const message = msg("common.remove");
    const result = createIconActionLinkTemplate(
        message,
        "tableActionIcons.remove",
        click,
        {
            class: "vg-stub-creator-destructive-action",
        },
    );
    return result;
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
        const elementResult = createElement("span", {
            "aria-hidden": "true",
            class: `vg-stub-creator-review-row-marker ${markerClass}`,
            "v-if": markerCondition,
        });
        children.push(elementResult);
    }

    const result = createElement(
        "template",
        {
            [`v-slot:item-${column}`]: "{ row }",
        },
        children,
    );
    return result;
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
    const infoChipResult = [createInfoChipTemplate(label, { status, title })];
    const result = createSlotTemplate(column, infoChipResult);
    return result;
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
    const textResultA = [
        createText(options.bindLabel === false ? label : `{{ ${label} }}`),
    ];
    const result = createElement(
        "cdx-info-chip",
        {
            "v-bind:status": options.status || "'notice'",
            ...(options.title ? { "v-bind:title": options.title } : {}),
        },
        textResultA,
    );
    return result;
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
    const pageEditLinkResult = [
        createPageEditLinkTemplate(condition, existing, click),
    ];
    const result = createSlotTemplate(column, pageEditLinkResult);
    return result;
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
    const joinedText = {
        href: "#",
        "v-bind:aria-label": [
            "getReviewPageActionAriaLabel(row, ",
            existing,
            ")",
        ].join(""),
        "v-if": condition,
        "v-on:click.prevent": click,
    };
    const textResult = [
        createText(`{{ getReviewPageActionLabel(row, ${existing}) }}`),
    ];
    const result = createElement("a", joinedText, textResult);
    return result;
}
