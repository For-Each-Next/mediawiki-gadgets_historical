/* eslint-disable */

/**
 * Creates a template element object with attributes and children.
 *
 * @param {string} tagName - Tag name.
 * @param {object} [attributes] - Element attributes.
 * @param {Array<object|string>} [children] - Child nodes.
 * @returns {object} Created template element object.
 */
export function createElement(tagName, attributes = {}, children = []) {
    return {
        attributes,
        children,
        tagName,
    };
}

/**
 * Creates a template text node.
 *
 * @param {string} value - Text content.
 * @returns {string} Created text node.
 */
export function createText(value) {
    return value;
}

/**
 * Creates a Codex button.
 *
 * @param {object} options - Button options.
 * @param {string} [options.action] - Codex action.
 * @param {string} options.click - Click handler expression.
 * @param {string} [options.disabled] - Disabled binding expression.
 * @param {string} options.label - Button label or interpolation.
 * @param {string} [options.show] - Visibility binding expression.
 * @param {string} [options.weight] - Codex weight.
 * @returns {object} Codex button node.
 */
export function createButtonTemplate(options) {
    const attributes = {
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
 * @param {Array<object>|object} actions - Footer action button nodes.
 * @param {object} [style] - Extra footer style properties.
 * @returns {object} Dialog action footer node.
 */
export function createActionFooterTemplate(actions, style = {}) {
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
 * @param {object} groups - Footer action groups.
 * @param {Array<object>} [groups.left] - Left-aligned actions.
 * @param {Array<object>} [groups.right] - Right-aligned actions.
 * @param {object} [style] - Extra footer style properties.
 * @returns {object} Dialog action footer node.
 */
function createSplitActionFooterTemplate(groups, style = {}) {
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
 * @param {Array<object>} actions - Action button nodes.
 * @returns {object} Action group node.
 */
function createActionFooterGroupTemplate(actions) {
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
 * @param {string} label - Link label text or Vue expression.
 * @param {string} click - Click handler expression.
 * @param {object} [attributes] - Extra link attributes.
 * @param {boolean} [attributes.bindLabel] - Whether label is a Vue binding.
 * @returns {object} Action link node.
 */
export function createActionLinkTemplate(label, click, attributes = {}) {
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
 * @param {string} label - Accessible button label.
 * @param {string} icon - Vue expression resolving to a Codex icon.
 * @param {string} click - Click handler expression.
 * @param {object} [attributes] - Extra button attributes.
 * @returns {object} Icon action button node.
 */
export function createIconActionButtonTemplate(
    label,
    icon,
    click,
    attributes = {},
) {
    const {
        "aria-disabled": ariaDisabled,
        class: className,
        ...extra
    } = attributes;
    const buttonAttributes = {
        "aria-label": label,
        class: ["create-vg-stub-icon-button", className]
            .filter(Boolean)
            .join(" "),
        title: label,
        type: "button",
        weight: "quiet",
        ...extra,
        "v-on:click": click,
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
 * @param {string} label - Accessible button label.
 * @param {string} icon - Vue expression resolving to a Codex icon.
 * @param {string} click - Click handler expression.
 * @param {object} [attributes] - Extra button attributes.
 * @returns {object} Icon action button node.
 */
export function createIconActionLinkTemplate(
    label,
    icon,
    click,
    attributes = {},
) {
    return createIconActionButtonTemplate(label, icon, click, attributes);
}

/**
 * Creates a source URL textarea template node.
 *
 * @param {object} options - Source URL field options.
 * @param {string} options.change - Change handler expression.
 * @param {string} options.model - Vue model expression.
 * @param {string} options.placeholder - Placeholder text or expression.
 * @param {string} options.update - Input update handler expression.
 * @param {boolean} [options.bindPlaceholder] - Whether placeholder is a Vue binding.
 * @returns {object} Source URL textarea node.
 */
export function createSourceUrlInputTemplate(options) {
    const attributes = {
        class: "create-vg-stub-source-url",
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
 * @param {string} label - Field label text or Vue expression.
 * @param {Array<object|string>} children - Field contents.
 * @param {object} [options] - Field options.
 * @param {object} [options.attributes] - Field root attributes.
 * @param {boolean} [options.bindLabel] - Whether label is a Vue binding.
 * @param {Array<object|string>} [options.helpText] - Help text slot contents.
 * @param {string} [options.helpTextCondition] - Optional Vue condition for help text.
 * @returns {object} Codex field node.
 */
export function createFieldTemplate(label, children, options = {}) {
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
 * @param {string} [condition] - Optional help-text condition.
 * @returns {object} Slot attributes.
 */
function createHelpTextSlotAttributes(condition) {
    const attributes = {
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
 * @param {string} condition - Vue condition expression.
 * @param {string} message - Message text or interpolation.
 * @param {object} [options] - Message options.
 * @param {boolean} [options.inline] - Whether to render as inline feedback.
 * @param {string} [options.type] - Codex message type.
 * @returns {object} Codex message node.
 */
export function createMessageTemplate(condition, message, options = {}) {
    const attributes = {
        class: "create-vg-stub-message",
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
 * @param {string} _title - Header title text or Vue expression.
 * @param {Array<object|string>} [actions] - Header action links.
 * @param {object} [_options] - Header options.
 * @returns {object} Header slot template node.
 */
export function createTableHeaderTemplate(
    _title,
    actions = [],
    _options = {},
) {
    return createElement(
        "template",
        {
            "v-slot:header": "",
        },
        actions.flatMap(createTableActionTemplate),
    );
}

/**
 * Creates one table-header action and tooltip.
 *
 * @param {object|string} action - Header action.
 * @param {number} index - Action index.
 * @returns {Array<object|string>} Action and tooltip nodes.
 */
function createTableActionTemplate(action, index) {
    const spacer = index === 0 ? [] : [createText(" ")];

    return [...spacer, action, createIconTooltipTemplate(action)];
}

/**
 * Creates a tooltip for an icon-only action.
 *
 * @param {object|string} action - Header action.
 * @returns {object} Tooltip node.
 */
function createIconTooltipTemplate(action) {
    return createElement(
        "span",
        {
            class: "create-vg-stub-icon-tooltip",
            role: "tooltip",
        },
        [createText(getActionLabel(action))],
    );
}

/**
 * Gets the accessible label from an action node.
 *
 * @param {object|string} action - Header action.
 * @returns {string} Action label.
 */
function getActionLabel(action) {
    if (typeof action === "string") {
        return "";
    }

    return action.attributes?.title || action.attributes?.["aria-label"] || "";
}

/**
 * Creates a Codex table template.
 *
 * @param {string} columns - Vue expression resolving to table columns.
 * @param {string} data - Vue expression resolving to table data.
 * @param {Array<object|string>} slots - Table slot templates.
 * @param {object} [attributes] - Extra table attributes.
 * @param {string} [attributes.caption] - Accessible table caption.
 * @returns {object} Codex table node.
 */
export function createTableTemplate(columns, data, slots, attributes = {}) {
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
 * @param {string} [fieldExpression] - Vue expression resolving to a field.
 * @returns {object} Wikitext preview template node.
 */
export function createFieldPreviewTemplate(fieldExpression = "field") {
    const previewExpression = `getFieldPreview(${fieldExpression})`;

    return createElement(
        "div",
        {
            class: "create-vg-stub-wikitext-preview create-vg-stub-field-note",
            "v-if": `${fieldExpression}.previewKey && ${previewExpression}`,
        },
        [createText(`{{ ${previewExpression} }}`)],
    );
}

/**
 * Creates a Codex card showing a wikitext preview fragment.
 *
 * @param {string} title - Card title.
 * @param {string} expression - Vue expression resolving to preview text.
 * @param {object} [options] - Card options.
 * @param {string} [options.condition] - Optional Vue condition.
 * @param {string} [options.description] - Supporting description expression.
 * @returns {object} Wikitext preview card node.
 */
export function createPreviewCardTemplate(title, expression, options = {}) {
    const supportingText = createPreviewCardSupportingText(
        expression,
        options.description,
    );

    return createElement(
        "cdx-card",
        {
            class: "create-vg-stub-preview-card",
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
 * @param {string} expression - Vue expression resolving to preview text.
 * @param {string} [description] - Supporting description expression.
 * @returns {Array<object>} Supporting text children.
 */
function createPreviewCardSupportingText(expression, description) {
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
 * @param {string} description - Supporting description expression.
 * @returns {object} Description node.
 */
function createPreviewCardDescriptionTemplate(description) {
    return createElement(
        "p",
        {
            class: "create-vg-stub-preview-card-description",
        },
        [createText(`{{ ${description} }}`)],
    );
}

/**
 * Creates a preview card text block.
 *
 * @param {string} expression - Vue expression resolving to preview text.
 * @returns {object} Preview text node.
 */
function createPreviewCardTextTemplate(expression) {
    return createElement(
        "pre",
        {
            class: "create-vg-stub-preview-card-text",
        },
        [createText(`{{ ${expression} }}`)],
    );
}

/**
 * Serializes a template node to markup.
 *
 * @param {object|Array<object>} node - Template node.
 * @returns {string} Template markup.
 */
export function renderTemplate(node) {
    if (Array.isArray(node)) {
        return node.map(renderNode).join("");
    }

    return renderElement(node);
}

/**
 * Serializes a template child node to markup.
 *
 * @param {object|string} node - Template child node.
 * @returns {string} Template child markup.
 */
function renderNode(node) {
    if (typeof node === "string") {
        return node;
    }

    return renderElement(node);
}

/**
 * Serializes a template element object to markup.
 *
 * @param {object} element - Template element object.
 * @param {object} element.attributes - Element attributes.
 * @param {Array<object|string>} element.children - Child nodes.
 * @param {string} element.tagName - Tag name.
 * @returns {string} Element markup.
 */
function renderElement(element) {
    const attributes = renderAttributes(element.attributes);
    const children = element.children.map(renderNode).join("");

    if (element.tagName === "hr") {
        return `<${element.tagName}${attributes}>`;
    }

    return `<${element.tagName}${attributes}>${children}</${element.tagName}>`;
}

/**
 * Serializes element attributes to markup.
 *
 * @param {object} attributes - Element attributes.
 * @returns {string} Attribute markup.
 */
function renderAttributes(attributes) {
    return Object.entries(attributes).map(renderAttribute).join("");
}

/**
 * Serializes one element attribute to markup.
 *
 * @param {Array<string|object>} entry - Attribute name and value.
 * @returns {string} Attribute markup.
 */
function renderAttribute(entry) {
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
 * @param {object} style - Style declaration object.
 * @returns {string} Style declaration text.
 */
function renderStyle(style) {
    return `${Object.entries(style).map(renderStyleDeclaration).join("; ")};`;
}

/**
 * Serializes one style declaration.
 *
 * @param {Array<string>} entry - Style property and value.
 * @returns {string} Style declaration text.
 */
function renderStyleDeclaration(entry) {
    const [name, value] = entry;

    return `${toKebabCase(name)}: ${value}`;
}

/**
 * Converts a camelCase JavaScript name to a kebab-case CSS name.
 *
 * @param {string} value - JavaScript property name.
 * @returns {string} CSS property name.
 */
function toKebabCase(value) {
    return value.replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`);
}

/**
 * Escapes an attribute value for template markup.
 *
 * @param {string} value - Raw attribute value.
 * @returns {string} Escaped attribute value.
 */
function escapeAttribute(value) {
    return value.replace(/&/gu, "&amp;").replace(/"/gu, "&quot;");
}
