import { html } from "#shared";

const {
    createElement: createRawElement,
    createText: createRawText,
    renderTemplate,
} = html;

export { renderTemplate };

/**
 * Escapes localized text for use as a Vue expression string literal.
 *
 * @param value - Input value.
 * @returns Localized text for use as a Vue expression string literal.
 */
export function toVueString(value: string): string {
    return JSON.stringify(value);
}

/**
 * Creates a template element with localized static attributes.
 *
 * @param tagName - Tag name value.
 * @param attributes - Attributes value.
 * @param children - Children value.
 * @returns A template element with localized static attributes.
 */
export function createElement(
    tagName: string,
    attributes: Record<string, any> = {},
    children: Array<any> = [],
): any {
    return createRawElement(tagName, attributes, children);
}

/**
 * Creates a localized static template text node.
 *
 * @param value - Input value.
 * @returns A localized static template text node.
 */
export function createText(value: string): string {
    return createRawText(value);
}

/**
 * Creates a Codex button.
 *
 * @param options - Button options.
 * @param options.action - Codex action.
 * @param options.click - Click handler expression.
 * @param options.disabled - Disabled binding expression.
 * @param options.label - Button label or interpolation.
 * @param options.show - Visibility binding expression.
 * @param options.weight - Codex weight.
 * @returns Codex button node.
 */
export function createButtonTemplate(options: any): any {
    const attributes: Record<string, any> = {
        type: "button",
        "v-on:click": options.click,
    };

    if (options.action) {
        attributes.action = options.action;
    }

    if (options.disabled) {
        attributes["v-bind:disabled"] = options.disabled;
    }

    if (options.show) {
        attributes["v-if"] = options.show;
    }

    if (options.weight) {
        attributes.weight = options.weight;
    }

    const textResultE = [createText(options.label)];
    const result = createElement("cdx-button", attributes, textResultE);
    return result;
}

/**
 * Creates an action footer.
 *
 * Actions are right-aligned by default. Pass `{ left, right }` to split
 * dismissive and primary actions across the footer.
 *
 * @param actions - Footer action button nodes.
 * @param style - Extra footer style properties.
 * @returns Dialog action footer node.
 */
export function createActionFooterTemplate(
    actions: Array<any> | any,
    style: any = {},
): any {
    if (!Array.isArray(actions)) {
        return createSplitActionFooterTemplate(actions, style);
    }

    const result = createElement(
        "div",
        {
            style: {
                display: "flex",
                gap: "0.75em",
                justifyContent: "flex-end",
                width: "100%",
                ...style,
            },
        },
        actions,
    );
    return result;
}

/**
 * Creates an action footer with left and right action groups.
 *
 * @param groups - Footer action groups.
 * @param groups.left - Left-aligned actions.
 * @param groups.right - Right-aligned actions.
 * @param style - Extra footer style properties.
 * @returns Dialog action footer node.
 */
function createSplitActionFooterTemplate(groups: any, style: any = {}): any {
    const actionFooterGroupResult = [
        createActionFooterGroupTemplate(groups.left || []),
        createActionFooterGroupTemplate(groups.right || []),
    ];
    const result = createElement(
        "div",
        {
            style: {
                alignItems: "center",
                display: "flex",
                gap: "0.75em",
                justifyContent: "space-between",
                width: "100%",
                ...style,
            },
        },
        actionFooterGroupResult,
    );
    return result;
}

/**
 * Creates one action footer group.
 *
 * @param actions - Action button nodes.
 * @returns Action group node.
 */
function createActionFooterGroupTemplate(actions: Array<any>): any {
    const result = createElement(
        "div",
        {
            style: {
                display: "flex",
                gap: "0.75em",
            },
        },
        actions,
    );
    return result;
}

/**
 * Creates an icon-only button that performs an in-place action.
 *
 * @param label - Accessible button label.
 * @param icon - Vue expression resolving to a Codex icon.
 * @param click - Click handler expression.
 * @param attributes - Extra button attributes.
 * @returns Icon action button node.
 */
export function createIconActionButtonTemplate(
    label: string,
    icon: string,
    click: string,
    attributes: any = {},
): any {
    const {
        "aria-disabled": ariaDisabled,
        class: className,
        ...extra
    } = attributes;
    const buttonAttributes = createIconButtonAttributes(
        label,
        click,
        className,
        extra,
    );

    if (ariaDisabled != null) {
        buttonAttributes["v-bind:disabled"] = ariaDisabled;
    }

    const iconNode = createElement("cdx-icon", {
        "v-bind:icon": icon,
        size: "medium",
    });
    const button = createElement("cdx-button", buttonAttributes, [iconNode]);

    return button;
}

/**
 * Creates shared icon-action button attributes.
 *
 * @param label - Label value.
 * @param click - Click value.
 * @param className - Class name value.
 * @param extra - Extra value.
 * @returns Shared icon-action button attributes.
 */
function createIconButtonAttributes(
    label: string,
    click: string,
    className: string,
    extra: any,
): any {
    const result = {
        "aria-label": label,
        class: ["vg-stub-creator-icon-button", className]
            .filter(Boolean)
            .join(" "),
        title: label,
        type: "button",
        weight: "quiet",
        ...extra,
        "v-on:blur": "hideTableActionTooltip",
        "v-on:click": click,
        "v-on:focus": "showTableActionTooltip($event)",
        "v-on:mouseleave": "hideTableActionTooltip",
        "v-on:mouseenter": "showTableActionTooltip($event)",
    };
    return result;
}

/**
 * Creates an icon-only button that performs an in-place action.
 *
 * @param label - Accessible button label.
 * @param icon - Vue expression resolving to a Codex icon.
 * @param click - Click handler expression.
 * @param attributes - Extra button attributes.
 * @returns Icon action button node.
 */
export function createIconActionLinkTemplate(
    label: string,
    icon: string,
    click: string,
    attributes: any = {},
): any {
    return createIconActionButtonTemplate(label, icon, click, attributes);
}

/**
 * Creates a source URL textarea template node.
 *
 * @param options - Source URL field options.
 * @param options.change - Change handler expression.
 * @param options.model - Vue model expression.
 * @param options.placeholder - Placeholder text or expression.
 * @param options.update - Input update handler expression.
 * @param options.bindPlaceholder - Whether placeholder is a
 * Vue
 * binding.
 * @returns Source URL textarea node.
 */
export function createSourceUrlInputTemplate(options: any): any {
    const attributes: Record<string, any> = {
        class: "vg-stub-creator-source-url",
        rows: "1",
        "v-bind:model-value": options.model,
        "v-on:change": options.change,
        "v-on:update:model-value": options.update,
    };

    if (options.bindPlaceholder) {
        attributes["v-bind:placeholder"] = options.placeholder;
    } else {
        attributes.placeholder = options.placeholder;
    }

    return createElement("cdx-text-area", attributes);
}

/**
 * Creates a Codex field with a label slot.
 *
 * @param label - Field label text or Vue expression.
 * @param children - Field contents.
 * @param options - Field options.
 * @param options.attributes - Field root attributes.
 * @param options.bindLabel - Whether label is a Vue
 * binding.
 * @param options.helpText - Help text slot
 * contents.
 * @param options.helpTextCondition - Optional Vue condition
 * for
 * help text.
 * @returns Codex field node.
 */
export function createFieldTemplate(
    label: string,
    children: Array<any | string>,
    options: any = {},
): any {
    const textResultD = [
        createText(options.bindLabel ? `{{ ${label} }}` : label),
    ];
    const fieldChildren = [
        ...children,
        createElement(
            "template",
            {
                "v-slot:label": "",
            },
            textResultD,
        ),
    ];

    if (options.helpText) {
        const helpTextSlotAttributesResult = createHelpTextSlotAttributes(
            options.helpTextCondition,
        );
        const elementResult = createElement(
            "template",
            helpTextSlotAttributesResult,
            options.helpText,
        );
        fieldChildren.push(elementResult);
    }

    return createElement("cdx-field", options.attributes || {}, fieldChildren);
}

/**
 * Creates field help-text slot attributes.
 *
 * @param condition - Optional help-text condition.
 * @returns Slot attributes.
 */
function createHelpTextSlotAttributes(condition: string): any {
    const attributes: Record<string, any> = {
        "v-slot:help-text": "",
    };

    if (condition) {
        attributes["v-if"] = condition;
    }

    return attributes;
}

/**
 * Creates a Codex message.
 *
 * @param condition - Vue condition expression.
 * @param message - Message text or interpolation.
 * @param options - Message options.
 * @param options.inline - Whether to render as inline
 * feedback.
 * @param options.type - Codex message type.
 * @returns Codex message node.
 */
export function createMessageTemplate(
    condition: string,
    message: string,
    options: any = {},
): any {
    const attributes: Record<string, any> = {
        class: "vg-stub-creator-message",
        type: options.type || "error",
        "v-if": condition,
    };

    if (options.inline) {
        attributes.inline = "";
    }

    const textResultC = [createText(message)];
    return createElement("cdx-message", attributes, textResultC);
}

/**
 * Creates a Codex table header slot with action links.
 *
 * The table caption already names the table, so this slot only renders
 * controls.
 *
 * @param _title - Header title text or Vue expression.
 * @param actions - Header action links.
 * @param _options - Header options.
 * @returns Header slot template node.
 */
export function createTableHeaderTemplate(
    _title: string,
    actions: Array<any | string> = [],
    _options: any = {},
): any {
    const flattenedValues = actions.flatMap(createTableActionTemplate);
    const result = createElement(
        "template",
        {
            "v-slot:header": "",
        },
        flattenedValues,
    );
    return result;
}

/**
 * Creates one table-header action.
 *
 * @param action - Header action.
 * @param index - Action index.
 * @returns Action nodes.
 */
function createTableActionTemplate(
    action: any | string,
    index: number,
): Array<any | string> {
    const spacer = index === 0 ? [] : [createText(" ")];

    return [...spacer, action];
}

/**
 * Creates a Codex table template.
 *
 * @param columns - Vue expression resolving to table columns.
 * @param data - Vue expression resolving to table data.
 * @param slots - Table slot templates.
 * @param attributes - Extra table attributes.
 * @param attributes.caption - Accessible table caption.
 * @returns Codex table node.
 */
export function createTableTemplate(
    columns: string,
    data: string,
    slots: Array<any | string>,
    attributes: any = {},
): any {
    const result = createElement(
        "cdx-table",
        {
            ...attributes,
            "v-bind:columns": columns,
            "v-bind:data": data,
        },
        slots,
    );
    return result;
}

/**
 * Creates a Codex card showing a wikitext preview fragment.
 *
 * @param title - Card title.
 * @param expression - Vue expression resolving to preview
 * text.
 * @param options - Card options.
 * @param options.condition - Optional Vue condition.
 * @param options.description - Supporting description
 * expression.
 * @returns Wikitext preview card node.
 */
export function createPreviewCardTemplate(
    title: string,
    expression: string,
    options: any = {},
): any {
    const supportingText = createPreviewCardSupportingText(
        expression,
        options.description,
    );

    const textResultB = [createText(title)];
    const titleSlot = createElement(
        "template",
        { "v-slot:title": "" },
        textResultB,
    );
    const supportingSlot = createElement(
        "template",
        { "v-slot:supporting-text": "" },
        supportingText,
    );
    const card = createElement(
        "cdx-card",
        {
            class: "vg-stub-creator-preview-card",
            "v-if": options.condition || expression,
        },
        [titleSlot, supportingSlot],
    );

    return card;
}

/**
 * Creates supporting text children for a preview card.
 *
 * @param expression - Vue expression resolving to preview
 * text.
 * @param description - Supporting description expression.
 * @returns Supporting text children.
 */
function createPreviewCardSupportingText(
    expression: string,
    description: string,
): Array<any> {
    const children = [];

    if (description) {
        const previewCardDescriptionResult =
            createPreviewCardDescriptionTemplate(description);
        children.push(previewCardDescriptionResult);
    }

    const previewCardTextResult = createPreviewCardTextTemplate(expression);
    children.push(previewCardTextResult);

    return children;
}

/**
 * Creates a preview card description.
 *
 * @param description - Supporting description expression.
 * @returns Description node.
 */
function createPreviewCardDescriptionTemplate(description: string): any {
    const textResultA = [createText(`{{ ${description} }}`)];
    const result = createElement(
        "p",
        {
            class: "vg-stub-creator-preview-card-description",
        },
        textResultA,
    );
    return result;
}

/**
 * Creates a preview card text block.
 *
 * @param expression - Vue expression resolving to preview
 * text.
 * @returns Preview text node.
 */
function createPreviewCardTextTemplate(expression: string): any {
    const textResult = [createText(`{{ ${expression} }}`)];
    const result = createElement(
        "pre",
        {
            class: "vg-stub-creator-preview-card-text",
        },
        textResult,
    );
    return result;
}
