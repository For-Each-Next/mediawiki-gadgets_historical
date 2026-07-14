/**
 * Creates a template element object with attributes and children.
 *
 * @param tagName - Tag name.
 * @param attributes - Element attributes.
 * @param children - Child nodes.
 * @returns Created template element object.
 */
export function createElement(
    tagName: string,
    attributes: any = {},
    children: Array<any | string> = [],
): any {
    return {
        attributes,
        children,
        tagName,
    };
}


/**
 * Creates a template text node.
 *
 * @param value - Text content.
 * @returns Created text node.
 */
export function createText(value: string): string {
    return value;
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

    return createElement("cdx-button", attributes, [
        createText(options.label),
    ]);
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

    return createElement(
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
    return createElement(
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
        [
            createActionFooterGroupTemplate(groups.left || []),
            createActionFooterGroupTemplate(groups.right || []),
        ],
    );
}


/**
 * Creates one action footer group.
 *
 * @param actions - Action button nodes.
 * @returns Action group node.
 */
function createActionFooterGroupTemplate(actions: Array<any>): any {
    return createElement(
        "div",
        {
            style: {
                display: "flex",
                gap: "0.75em",
            },
        },
        actions,
    );
}


/**
 * Creates a link that performs an in-place table row action.
 *
 * @param label - Link label text or Vue expression.
 * @param click - Click handler expression.
 * @param attributes - Extra link attributes.
 * @param attributes.bindLabel - Whether label is a Vue
 * binding.
 * @returns Action link node.
 */
export function createActionLinkTemplate(
    label: string,
    click: string,
    attributes: any = {},
): any {
    const { bindLabel, ...linkAttributes } = attributes;

    return createElement(
        "a",
        {
            href: "#",
            ...linkAttributes,
            "v-on:click.prevent": click,
        },
        [createText(bindLabel ? `{{ ${label} }}` : label)],
    );
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
    const buttonAttributes = {
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

    if (ariaDisabled != null) {
        buttonAttributes["v-bind:disabled"] = ariaDisabled;
    }

    return createElement("cdx-button", buttonAttributes, [
        createElement("cdx-icon", {
            "v-bind:icon": icon,
            size: "medium",
        }),
    ]);
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
    const fieldChildren = [
        ...children,
        createElement(
            "template",
            {
                "v-slot:label": "",
            },
            [createText(options.bindLabel ? `{{ ${label} }}` : label)],
        ),
    ];

    if (options.helpText) {
        fieldChildren.push(
            createElement(
                "template",
                createHelpTextSlotAttributes(options.helpTextCondition),
                options.helpText,
            ),
        );
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

    return createElement("cdx-message", attributes, [createText(message)]);
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
    return createElement(
        "template",
        {
            "v-slot:header": "",
        },
        actions.flatMap(createTableActionTemplate),
    );
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
    return createElement(
        "cdx-table",
        {
            ...attributes,
            "v-bind:columns": columns,
            "v-bind:data": data,
        },
        slots,
    );
}


/**
 * Creates the wikitext preview template node for one article field.
 *
 * @param fieldExpression - Vue expression resolving to a
 * field.
 * @returns Wikitext preview template node.
 */
export function createFieldPreviewTemplate(
    fieldExpression: string = "field",
): any {
    const previewExpression = `getFieldPreview(${fieldExpression})`;

    return createElement(
        "div",
        {
            class: [
                "vg-stub-creator-wikitext-preview v",
                "g-stub-creator-field-note",
            ].join(""),
            "v-if": `${fieldExpression}.previewKey && ${previewExpression}`,
        },
        [createText(`{{ ${previewExpression} }}`)],
    );
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

    return createElement(
        "cdx-card",
        {
            class: "vg-stub-creator-preview-card",
            "v-if": options.condition || expression,
        },
        [
            createElement(
                "template",
                {
                    "v-slot:title": "",
                },
                [createText(title)],
            ),
            createElement(
                "template",
                {
                    "v-slot:supporting-text": "",
                },
                supportingText,
            ),
        ],
    );
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
        children.push(createPreviewCardDescriptionTemplate(description));
    }

    children.push(createPreviewCardTextTemplate(expression));

    return children;
}


/**
 * Creates a preview card description.
 *
 * @param description - Supporting description expression.
 * @returns Description node.
 */
function createPreviewCardDescriptionTemplate(description: string): any {
    return createElement(
        "p",
        {
            class: "vg-stub-creator-preview-card-description",
        },
        [createText(`{{ ${description} }}`)],
    );
}


/**
 * Creates a preview card text block.
 *
 * @param expression - Vue expression resolving to preview
 * text.
 * @returns Preview text node.
 */
function createPreviewCardTextTemplate(expression: string): any {
    return createElement(
        "pre",
        {
            class: "vg-stub-creator-preview-card-text",
        },
        [createText(`{{ ${expression} }}`)],
    );
}


/**
 * Serializes a template node to markup.
 *
 * @param node - Template node.
 * @returns Template markup.
 */
export function renderTemplate(node: any | Array<any>): string {
    if (Array.isArray(node)) {
        return node.map(renderNode).join("");
    }

    return renderElement(node);
}


/**
 * Serializes a template child node to markup.
 *
 * @param node - Template child node.
 * @returns Template child markup.
 */
function renderNode(node: any | string): string {
    if (typeof node === "string") {
        return node;
    }

    return renderElement(node);
}


/**
 * Serializes a template element object to markup.
 *
 * @param element - Template element object.
 * @param element.attributes - Element attributes.
 * @param element.children - Child nodes.
 * @param element.tagName - Tag name.
 * @returns Element markup.
 */
function renderElement(element: any): string {
    const attributes = renderAttributes(element.attributes);
    const children = element.children.map(renderNode).join("");

    if (element.tagName === "hr") {
        return `<${element.tagName}${attributes}>`;
    }

    return [
        "<",
        element.tagName,
        "",
        attributes,
        ">",
        children,
        "</",
        element.tagName,
        ">",
    ].join("");
}


/**
 * Serializes element attributes to markup.
 *
 * @param attributes - Element attributes.
 * @returns Attribute markup.
 */
function renderAttributes(attributes: any): string {
    return Object.entries(attributes).map(renderAttribute).join("");
}


/**
 * Serializes one element attribute to markup.
 *
 * @param entry - Attribute name and value.
 * @returns Attribute markup.
 */
function renderAttribute(entry: Array<string | any>): string {
    const [name, value] = entry;
    const renderedValue = name === "style" ? renderStyle(value) : value;

    if (renderedValue === "") {
        return ` ${name}`;
    }

    return ` ${name}="${escapeAttribute(renderedValue)}"`;
}


/**
 * Serializes a style declaration object.
 *
 * @param style - Style declaration object.
 * @returns Style declaration text.
 */
function renderStyle(style: any): string {
    return [
        "",
        Object.entries(style).map(renderStyleDeclaration).join("; "),
        ";",
    ].join("");
}


/**
 * Serializes one style declaration.
 *
 * @param entry - Style property and value.
 * @returns Style declaration text.
 */
function renderStyleDeclaration(entry: [string, any]): string {
    const [name, value] = entry;

    return `${toKebabCase(name)}: ${value}`;
}


/**
 * Converts a camelCase JavaScript name to a kebab-case CSS name.
 *
 * @param value - JavaScript property name.
 * @returns CSS property name.
 */
function toKebabCase(value: string): string {
    return value.replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`);
}


/**
 * Escapes an attribute value for template markup.
 *
 * @param value - Raw attribute value.
 * @returns Escaped attribute value.
 */
function escapeAttribute(value: string): string {
    return value.replace(/&/gu, "&amp;").replace(/"/gu, "&quot;");
}
