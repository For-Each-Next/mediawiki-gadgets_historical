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
 * Creates a dialog action footer.
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
