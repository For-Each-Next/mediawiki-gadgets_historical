/** A serializable markup element. */
export interface TemplateElement {
    attributes: Record<string, any>;
    children: Array<TemplateNode>;
    tagName: string;
}

/** A serializable markup node. */
export type TemplateNode = TemplateElement | string;

const VOID_ELEMENTS = new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
]);

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
    attributes: Record<string, any> = {},
    children: Array<TemplateNode> = [],
): TemplateElement {
    return {
        attributes,
        children,
        tagName,
    };
}

/**
 * Creates a trusted template text node.
 *
 * @param value - Trusted text or template expression.
 * @returns Created text node.
 */
export function createText(value: string): string {
    return value;
}

/**
 * Creates an escaped template text node.
 *
 * @param value - Untrusted text content.
 * @returns Escaped text node.
 */
export function createEscapedText(value: string): string {
    return String(value || "")
        .replace(/&/gu, "&amp;")
        .replace(/</gu, "&lt;")
        .replace(/>/gu, "&gt;");
}

/**
 * Serializes a template node to markup.
 *
 * @param node - Template node.
 * @returns Template markup.
 */
export function renderTemplate(
    node: TemplateNode | Array<TemplateNode>,
): string {
    if (Array.isArray(node)) {
        return node.map(renderNode).join("");
    }

    return renderNode(node);
}

/** Replaces element children from serialized HTML markup. */
export function replaceElementContent(element: Element, markup: string): void {
    const parsed = new DOMParser().parseFromString(markup, "text/html");
    const body = parsed.getElementsByTagName("body")[0];
    const nodes = Array.from(body.childNodes).map(function callback(node) {
        return document.importNode(node, true);
    });

    element.replaceChildren(...nodes);
}

/** Serializes all children of an HTML element. */
export function serializeElementContent(element: Element): string {
    const serializer = new XMLSerializer();
    const markup = Array.from(element.childNodes)
        .map(function callback(node) {
            return serializer.serializeToString(node);
        })
        .join("");

    return markup;
}

/**
 * Serializes a template child node to markup.
 *
 * @param node - Template child node.
 * @returns Template child markup.
 */
function renderNode(node: TemplateNode): string {
    if (typeof node === "string") {
        return node;
    }

    return renderElement(node);
}

/**
 * Serializes a template element object to markup.
 *
 * @param element - Template element object.
 * @returns Element markup.
 */
function renderElement(element: TemplateElement): string {
    const attributes = renderAttributes(element.attributes);
    const children = element.children.map(renderNode).join("");

    if (VOID_ELEMENTS.has(element.tagName)) {
        return `<${element.tagName}${attributes}>`;
    }

    return `<${element.tagName}${attributes}>${children}</${element.tagName}>`;
}

/**
 * Serializes element attributes to markup.
 *
 * @param attributes - Element attributes.
 * @returns Attribute markup.
 */
function renderAttributes(attributes: Record<string, any>): string {
    return Object.entries(attributes).map(renderAttribute).join("");
}

/**
 * Serializes one element attribute to markup.
 *
 * @param entry - Attribute name and value.
 * @returns Attribute markup.
 */
function renderAttribute(entry: [string, any]): string {
    const [name, value] = entry;
    const renderedValue = name === "style" ? renderStyle(value) : value;

    if (renderedValue === "") {
        return ` ${name}`;
    }

    return ` ${name}="${escapeAttribute(String(renderedValue))}"`;
}

/**
 * Serializes a style declaration object.
 *
 * @param style - Style declaration object.
 * @returns Style declaration text.
 */
function renderStyle(style: Record<string, any>): string {
    const declarations = Object.entries(style)
        .map(renderStyleDeclaration)
        .join("; ");

    return `${declarations};`;
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
    return value
        .replace(/&/gu, "&amp;")
        .replace(/"/gu, "&quot;")
        .replace(/</gu, "&lt;")
        .replace(/>/gu, "&gt;");
}
