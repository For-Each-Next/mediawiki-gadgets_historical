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
 * Creates an action footer.
 *
 * Actions are right-aligned by default.
 *
 * @param {Array<object>} actions - Footer action button nodes.
 * @param {object} [style] - Extra footer style properties.
 * @returns {object} Dialog action footer node.
 */
export function createActionFooterTemplate(actions, style = {}) {
    return createElement(
        "div",
        {
            style: {
                display: "flex",
                gap: "0.5em",
                justifyContent: "flex-end",
                width: "100%",
                ...style,
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
 * Creates an icon-only link that performs an in-place table row action.
 *
 * @param {string} label - Accessible link label.
 * @param {string} icon - Vue expression resolving to a Codex icon.
 * @param {string} click - Click handler expression.
 * @param {object} [attributes] - Extra link attributes.
 * @returns {object} Icon action link node.
 */
export function createIconActionLinkTemplate(
    label,
    icon,
    click,
    attributes = {},
) {
    return createElement(
        "a",
        {
            "aria-label": label,
            href: "#",
            title: label,
            ...attributes,
            "v-on:click.prevent": click,
        },
        [
            createElement("cdx-icon", {
                "v-bind:icon": icon,
                size: "medium",
            }),
        ],
    );
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
                {
                    ...(options.helpTextCondition
                        ? { "v-if": options.helpTextCondition }
                        : {}),
                    "v-slot:help-text": "",
                },
                options.helpText,
            ),
        );
    }

    return createElement("cdx-field", options.attributes || {}, fieldChildren);
}

/**
 * Creates a Codex table header slot with optional action links.
 *
 * @param {string} title - Header title text or Vue expression.
 * @param {Array<object|string>} [actions] - Header action links.
 * @param {object} [options] - Header options.
 * @param {boolean} [options.bindTitle] - Whether title is a Vue binding.
 * @returns {object} Header slot template node.
 */
export function createTableHeaderTemplate(title, actions = [], options = {}) {
    return createElement(
        "template",
        {
            "v-slot:header": "",
        },
        [
            createElement("strong", {}, [
                createText(options.bindTitle ? `{{ ${title} }}` : title),
            ]),
            ...actions.flatMap((action, index) =>
                index === 0
                    ? [createText(" "), action]
                    : [createText(" · "), action],
            ),
        ],
    );
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
 * @returns {object} Wikitext preview card node.
 */
export function createPreviewCardTemplate(title, expression, options = {}) {
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
                [
                    createElement(
                        "pre",
                        {
                            class: "create-vg-stub-preview-card-text",
                        },
                        [createText(`{{ ${expression} }}`)],
                    ),
                ],
            ),
        ],
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
