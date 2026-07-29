/**
 * Reusable Codex-style form elements for the assessor dialog.
 */

import * as html from "#shared/html";

export type TemplateAttributes = html.TemplateAttributes;
export type TemplateElement = html.TemplateElement;
export type TemplateNode = html.TemplateNode;

interface TextInputFieldConfig {
    className: string;
    id: string;
    label: string;
    name: string;
    value: string;
}

interface TextareaFieldConfig {
    id: string;
    label: string;
    textareaAttributes: TemplateAttributes;
}

interface ComparisonFieldConfig extends TextareaFieldConfig {
    tone: string;
}

/**
 * Builds a Codex text input field.
 */
export function buildTextInputField(
    config: TextInputFieldConfig,
): TemplateElement {
    const inputLabel = buildInputLabel(config.label, config.id);
    const label = buildLabelContainer(inputLabel);
    const input = html.createElement("input", {
        class: "cdx-text-input__input",
        id: config.id,
        name: config.name,
        type: "text",
        value: config.value,
    });
    const inputContainer = html.createElement(
        "div",
        { class: "cdx-text-input" },
        [input],
    );
    const control = buildFieldControl([inputContainer]);

    return html.createElement("div", { class: config.className }, [
        label,
        control,
    ]);
}

/**
 * Builds a plain source textarea field.
 */
export function buildSourceField(
    config: TextareaFieldConfig,
): TemplateElement {
    const inputLabel = buildInputLabel(config.label, config.id);
    const labelContainer = buildLabelContainer(inputLabel);
    const textarea = html.createElement("textarea", {
        class: "cdx-text-area__textarea avgp-source-textarea",
        id: config.id,
        ...config.textareaAttributes,
    });
    const textareaContainer = html.createElement(
        "div",
        { class: "cdx-text-area" },
        [textarea],
    );
    const control = buildFieldControl([textareaContainer]);

    return html.createElement(
        "div",
        { class: "cdx-field avgp-section avgp-source-field" },
        [labelContainer, control],
    );
}

/**
 * Builds a readonly comparison textarea.
 */
export function buildComparisonField(
    config: ComparisonFieldConfig,
): TemplateElement {
    const inputLabel = buildInputLabel(config.label, config.id);
    const labelContainer = buildLabelContainer(inputLabel);
    const textarea = html.createElement("textarea", {
        class: "cdx-text-area__textarea avgp-compare-textarea",
        id: config.id,
        ...config.textareaAttributes,
    });
    const textareaContainer = html.createElement(
        "div",
        { class: "cdx-text-area" },
        [textarea],
    );
    const className = `avgp-compare-field avgp-compare-field--${config.tone}`;

    return html.createElement("div", { class: className }, [
        labelContainer,
        textareaContainer,
    ]);
}

/**
 * Wraps nodes in a Codex field control.
 */
export function buildFieldControl(
    children: Array<TemplateNode>,
): TemplateElement {
    return html.createElement(
        "div",
        { class: "cdx-field__control" },
        children,
    );
}

/**
 * Wraps a field label in its Codex container.
 */
export function buildLabelContainer(label: TemplateNode): TemplateElement {
    return html.createElement("div", { class: "cdx-label" }, [label]);
}

/**
 * Builds a button with escaped label text.
 */
export function buildButton(
    label: string,
    attributes: TemplateAttributes,
): TemplateElement {
    return buildTextElement("button", attributes, label);
}

/**
 * Builds an element containing one escaped text node.
 */
export function buildTextElement(
    tagName: string,
    attributes: TemplateAttributes,
    text: string,
): TemplateElement {
    const textNode = html.createEscapedText(text);
    return html.createElement(tagName, attributes, [textNode]);
}

/**
 * Builds one field label for an input.
 */
export function buildInputLabel(label: string, id: string): TemplateElement {
    return buildTextElement(
        "label",
        { class: "avgp-label-text", for: id },
        label,
    );
}

/**
 * Builds one field label without an associated form control.
 */
export function buildPlainLabel(label: string): TemplateElement {
    return buildTextElement("span", { class: "avgp-label-text" }, label);
}

/**
 * Builds a stable input ID.
 */
export function buildInputId(name: string, value: string): string {
    return `avgp-${String(name)}-${String(value || "")
        .replace(/[^a-z0-9]+/giu, "-")
        .replace(/^-|-$/gu, "")
        .toLowerCase()}`;
}

/**
 * Gets one required dialog element.
 */
export function requireElement<T extends Element = HTMLElement>(
    root: ParentNode,
    selector: string,
): T {
    const element = root.querySelector<T>(selector);

    if (element == null) {
        throw new Error(`Required dialog element is missing: ${selector}`);
    }

    return element;
}

/**
 * Updates a comparison textarea when it exists.
 */
export function updateComparisonTextarea(
    root: HTMLElement,
    selector: string,
    value: string,
): void {
    const textarea = root.querySelector<HTMLTextAreaElement>(selector);

    if (textarea != null) {
        textarea.value = value;
    }
}
