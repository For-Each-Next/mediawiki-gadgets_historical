/** MediaWiki source-editor integration for wikEd Lite. */

import { formatWikitext } from "#gadget/domain/formatter.ts";
import { highlightWikitext } from "#gadget/domain/highlighter.ts";
import {
    buildReferencePreview,
    type ReferencePreviewField,
} from "#gadget/domain/reference-preview.ts";
import { msg } from "#gadget/i18n/index.ts";
import {
    createFormatterDialogComponent,
    type FormatterDialogSelection,
} from "#gadget/ui/dialogs/formatter-dialog.ts";
import {
    registerFormatterComponents,
    type ResourceLoaderRequire,
    type VueApp,
} from "#gadget/ui/codex.ts";
import { installWikEdLiteStyles } from "#gadget/ui/styles.ts";

const TEXTAREA_ID = "wpTextbox1";
const TOOL_ID = "wiked-lite-format";
const HOST_ID = "wiked-lite-dialog-host";

export interface EditorServices {
    findMissingLinks(source: string): Promise<Set<string>>;
    resolveRedirects(source: string): Promise<string>;
}

interface EditorController {
    destroy(): void;
    focus(): void;
    getSelection(): { end: number; start: number };
    replace(start: number, end: number, value: string): void;
    setMissingLinks(titles: Set<string>): void;
}

const controllers = new WeakMap<HTMLTextAreaElement, EditorController>();
let activeDialogCleanup: (() => void) | null = null;
let referenceTooltipHideTimer = 0;

/**
 * Discovers source editors and adds the formatter action.
 *
 * @param services - Injected service adapters.
 */
export function startEditorIntegration(services: EditorServices): void {
    void initialize(services).catch(function report(error) {
        console.error("wikEd Lite could not start", error);
    });
}

async function initialize(services: EditorServices): Promise<void> {
    await waitForDocument();
    await mw.loader.using(["mediawiki.api", "mediawiki.util"]);
    installWikEdLiteStyles();
    installEditor();
    installTool(services);
    mw.hook("wikipage.content").add(function refresh(): void {
        installEditor();
        installTool(services);
    });
    mw.hook("ve.wikitextInteractive").add(installEditor);
}

function installEditor(): void {
    const textarea = document.getElementById(TEXTAREA_ID);
    if (!(textarea instanceof HTMLTextAreaElement)) {
        return;
    }
    const existing = controllers.get(textarea);
    if (existing != null) {
        if (isIncompatibleEditor(textarea)) {
            existing.destroy();
            controllers.delete(textarea);
        }
        return;
    }
    if (isIncompatibleEditor(textarea)) {
        return;
    }
    controllers.set(textarea, createEditorController(textarea));
}

function isIncompatibleEditor(textarea: HTMLTextAreaElement): boolean {
    if (window.wikEd?.useWikEd === true) {
        return true;
    }
    const style = window.getComputedStyle(textarea);
    return style.display === "none" || style.visibility === "hidden";
}

// eslint-disable-next-line max-lines-per-function
function createEditorController(
    textarea: HTMLTextAreaElement,
): EditorController {
    const editor = document.createElement("div");
    const missingTitles = new Set<string>();
    const hadNativeClass = textarea.classList.contains("wiked-lite-native");
    let rendering = false;
    let composing = false;
    let timer = 0;
    editor.className = "wiked-lite-editor";
    editor.contentEditable = "plaintext-only";
    editor.role = "textbox";
    editor.ariaMultiLine = "true";
    editor.ariaLabel = getEditorLabel(textarea);
    editor.spellcheck = textarea.spellcheck;
    copyTextareaPresentation(textarea, editor);
    editor.style.height = `${Math.max(textarea.offsetHeight, 256)}px`;
    textarea.before(editor);
    textarea.classList.add("wiked-lite-native");

    function render(preserveSelection = true): void {
        const selection = preserveSelection
            ? getSelectionOffsets(editor)
            : { end: textarea.selectionEnd, start: textarea.selectionStart };
        rendering = true;
        renderSegments(editor, textarea.value, missingTitles);
        setSelectionOffsets(editor, selection.start, selection.end);
        rendering = false;
    }

    function scheduleRender(): void {
        window.clearTimeout(timer);
        const delay = window.wikEdLiteConfig?.highlightDelay ?? 100;
        timer = window.setTimeout(render, delay);
    }

    editor.addEventListener("input", function synchronize(): void {
        if (rendering || composing) {
            return;
        }
        textarea.value = readEditableText(editor);
        dispatchNativeInput(textarea);
        scheduleRender();
    });
    editor.addEventListener("compositionstart", function begin(): void {
        composing = true;
    });
    editor.addEventListener("compositionend", function finish(): void {
        composing = false;
        textarea.value = readEditableText(editor);
        dispatchNativeInput(textarea);
        scheduleRender();
    });
    function updateFromNative(): void {
        if (!rendering) {
            scheduleRender();
        }
    }
    textarea.addEventListener("input", updateFromNative);
    editor.addEventListener("click", openModifiedTarget);
    editor.addEventListener("pointerover", function show(event): void {
        clearReferenceTooltipHideTimer();
        showReferenceTooltip(editor, textarea.value, event);
    });
    editor.addEventListener("pointerout", scheduleReferenceTooltipHide);
    render(false);

    return {
        destroy() {
            window.clearTimeout(timer);
            textarea.removeEventListener("input", updateFromNative);
            if (!hadNativeClass) {
                textarea.classList.remove("wiked-lite-native");
            }
            editor.remove();
        },
        focus() {
            editor.focus({ preventScroll: true });
        },
        getSelection() {
            return getSelectionOffsets(editor);
        },
        replace(start, end, value) {
            textarea.setRangeText(value, start, end, "select");
            textarea.setSelectionRange(start, start + value.length);
            dispatchNativeInput(textarea);
            render(false);
            editor.focus({ preventScroll: true });
        },
        setMissingLinks(titles) {
            missingTitles.clear();
            titles.forEach((title) =>
                missingTitles.add(normalizeTitle(title)),
            );
            render();
        },
    };
}

function copyTextareaPresentation(
    textarea: HTMLTextAreaElement,
    editor: HTMLElement,
): void {
    const style = window.getComputedStyle(textarea);
    editor.dir = textarea.dir || style.direction;
    editor.lang = textarea.lang || document.documentElement.lang;
    editor.style.border = style.border;
    editor.style.borderRadius = style.borderRadius;
    editor.style.fontFamily = style.fontFamily;
    editor.style.fontSize = style.fontSize;
    editor.style.fontWeight = style.fontWeight;
    editor.style.letterSpacing = style.letterSpacing;
    editor.style.lineHeight = style.lineHeight;
    editor.style.padding = style.padding;
    editor.style.resize = style.resize;
    editor.style.tabSize = style.tabSize;
    editor.style.setProperty("--wiked-lite-foreground", style.color);
    editor.style.setProperty("--wiked-lite-caret", style.caretColor);
    if (style.backgroundColor !== "rgba(0, 0, 0, 0)") {
        editor.style.setProperty(
            "--wiked-lite-background",
            style.backgroundColor,
        );
    }
}

function renderSegments(
    editor: HTMLElement,
    source: string,
    missingTitles: Set<string>,
): void {
    const fragment = document.createDocumentFragment();
    const limit = window.wikEdLiteConfig?.maxLiveHighlightLength ?? 300_000;
    if (source.length > limit) {
        editor.replaceChildren(document.createTextNode(source));
        return;
    }
    const linkHelpers = mw.config.get("wgDBname") === "zhwiki";
    for (const segment of highlightWikitext(source, { linkHelpers })) {
        if (segment.classNames.length === 0) {
            fragment.append(document.createTextNode(segment.text));
            continue;
        }
        const span = document.createElement("span");
        span.className = segment.classNames.join(" ");
        span.textContent = segment.text;
        if (segment.href != null) {
            span.dataset.href = segment.href;
            markMissingLink(span, segment.href, missingTitles);
        }
        if (segment.referenceSource != null) {
            span.dataset.reference = segment.referenceSource;
        }
        fragment.append(span);
    }
    editor.replaceChildren(fragment);
}

function markMissingLink(
    span: HTMLElement,
    href: string,
    missingTitles: Set<string>,
): void {
    const title = decodeURIComponent(href.replace(/^\/wiki\//u, ""));
    if (missingTitles.has(normalizeTitle(title))) {
        span.classList.add("wiked-lite-token--missing");
    }
}

function readEditableText(editor: HTMLElement): string {
    return readNodeText(editor).replace(/\n$/u, "");
}

function readNodeText(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
        return node.nodeValue ?? "";
    }
    if (node instanceof HTMLBRElement) {
        return "\n";
    }
    let text = "";
    for (const child of node.childNodes) {
        text += readNodeText(child);
        if (child instanceof HTMLDivElement && !text.endsWith("\n")) {
            text += "\n";
        }
    }
    return text;
}

function getSelectionOffsets(editor: HTMLElement): {
    end: number;
    start: number;
} {
    const selection = window.getSelection();
    if (selection == null || selection.rangeCount === 0) {
        return { end: 0, start: 0 };
    }
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.startContainer)) {
        return { end: 0, start: 0 };
    }
    return {
        end: measureOffset(editor, range.endContainer, range.endOffset),
        start: measureOffset(editor, range.startContainer, range.startOffset),
    };
}

function measureOffset(root: Node, node: Node, offset: number): number {
    const range = document.createRange();
    range.selectNodeContents(root);
    range.setEnd(node, offset);
    return range.toString().length;
}

function setSelectionOffsets(
    editor: HTMLElement,
    start: number,
    end: number,
): void {
    const range = document.createRange();
    const startPoint = findTextPoint(editor, start);
    const endPoint = findTextPoint(editor, end);
    range.setStart(startPoint.node, startPoint.offset);
    range.setEnd(endPoint.node, endPoint.offset);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
}

function findTextPoint(
    root: Node,
    requested: number,
): { node: Node; offset: number } {
    let remaining = Math.max(0, requested);
    const textNodes = collectTextNodes(root);
    for (const node of textNodes) {
        const length = node.nodeValue?.length ?? 0;
        if (remaining <= length) {
            return { node, offset: remaining };
        }
        remaining -= length;
    }
    const last = textNodes.at(-1) ?? root;
    return { node: last, offset: last.nodeValue?.length ?? 0 };
}

function collectTextNodes(root: Node): Node[] {
    const nodes: Node[] = [];
    for (const child of root.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
            nodes.push(child);
        } else {
            nodes.push(...collectTextNodes(child));
        }
    }
    return nodes;
}

function openModifiedTarget(event: MouseEvent): void {
    if (!event.ctrlKey && !event.metaKey) {
        return;
    }
    const target = event.target;
    const span =
        target instanceof Element
            ? target.closest<HTMLElement>("[data-href]")
            : null;
    if (span?.dataset.href != null) {
        event.preventDefault();
        window.open(span.dataset.href, "_blank", "noopener,noreferrer");
    }
}

function showReferenceTooltip(
    editor: HTMLElement,
    articleSource: string,
    event: PointerEvent,
): void {
    const target = event.target;
    const span =
        target instanceof Element
            ? target.closest<HTMLElement>("[data-reference]")
            : null;
    if (span == null || !editor.contains(span)) {
        return;
    }
    const preview = buildReferencePreview(
        articleSource,
        span.dataset.reference ?? "",
    );
    if (preview != null) {
        renderTooltip(preview, editor, event.clientX, event.clientY);
    }
}

function renderTooltip(
    preview: NonNullable<ReturnType<typeof buildReferencePreview>>,
    editor: HTMLElement,
    x: number,
    y: number,
): void {
    hideReferenceTooltip();
    const tooltip = document.createElement("div");
    const body = document.createElement("div");
    tooltip.className = "wiked-lite-tooltip";
    tooltip.role = "note";
    body.className = "wiked-lite-tooltip__body";
    copyTooltipPresentation(editor, tooltip);
    tooltip.append(
        createTooltipTitle(preview.templateName, preview.referenceLabel),
    );
    for (const row of preview.rows) {
        body.append(createTooltipRow(row.fields));
    }
    tooltip.append(body);
    tooltip.addEventListener("pointerenter", clearReferenceTooltipHideTimer);
    tooltip.addEventListener("pointerleave", scheduleReferenceTooltipHide);
    document.body.append(tooltip);
    const margin = 12;
    const left = Math.max(
        margin,
        Math.min(x + margin, innerWidth - tooltip.offsetWidth - margin),
    );
    const top = Math.max(
        margin,
        Math.min(y + margin, innerHeight - tooltip.offsetHeight - margin),
    );
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
}

function copyTooltipPresentation(
    editor: HTMLElement,
    tooltip: HTMLElement,
): void {
    const style = window.getComputedStyle(editor);
    tooltip.style.setProperty("--wiked-lite-tooltip-foreground", style.color);
    if (style.backgroundColor !== "rgba(0, 0, 0, 0)") {
        tooltip.style.setProperty(
            "--wiked-lite-tooltip-background",
            style.backgroundColor,
        );
    }
    const editorFontSize = Number.parseFloat(style.fontSize);
    if (Number.isFinite(editorFontSize)) {
        tooltip.style.fontSize = `${editorFontSize * 0.82}px`;
    }
}

function createTooltipRow(fields: ReferencePreviewField[]): HTMLElement {
    const row = document.createElement("div");
    row.className = "wiked-lite-tooltip__row";
    if (fields.length > 1) {
        row.classList.add("wiked-lite-tooltip__row--paired");
    }
    for (const field of fields) {
        const key = document.createElement("span");
        const value = document.createElement("span");
        key.className = "wiked-lite-tooltip__key";
        value.className = "wiked-lite-tooltip__value";
        key.textContent = field.name;
        appendTooltipValue(value, field);
        row.append(key, value);
    }
    return row;
}

function appendTooltipValue(
    container: HTMLElement,
    field: ReferencePreviewField,
): void {
    const text = field.displayValue ?? field.value;
    if (field.href != null) {
        const link = createTooltipLink(field.href, text);
        if (link != null) {
            container.append(link);
            return;
        }
    }
    const pattern = /<!--[\s\S]*?-->|https?:\/\/[^\s<>{}\[\]|"']+/gu;
    let cursor = 0;
    for (const match of text.matchAll(pattern)) {
        const index = match.index;
        container.append(document.createTextNode(text.slice(cursor, index)));
        if (match[0].startsWith("<!--")) {
            const comment = document.createElement("span");
            comment.className = "wiked-lite-tooltip__comment";
            comment.textContent = match[0];
            container.append(comment);
        } else {
            container.append(
                createTooltipLink(match[0], match[0]) ??
                    document.createTextNode(match[0]),
            );
        }
        cursor = index + match[0].length;
    }
    container.append(document.createTextNode(text.slice(cursor)));
}

function createTooltipLink(
    href: string,
    text: string,
): HTMLAnchorElement | null {
    let url: URL;
    try {
        url = new URL(href);
    } catch {
        return null;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
        return null;
    }
    const anchor = document.createElement("a");
    anchor.className = "wiked-lite-tooltip__link";
    anchor.href = url.href;
    anchor.rel = "noopener noreferrer";
    anchor.target = "_blank";
    anchor.textContent = text;
    return anchor;
}

function createTooltipTitle(
    templateName: string,
    referenceLabel: string,
): HTMLElement {
    const title = document.createElement("div");
    title.className = "wiked-lite-tooltip__title";
    title.append(
        document.createTextNode(
            templateName.replace(/^./u, (character) =>
                character.toLocaleUpperCase(),
            ),
        ),
    );
    if (referenceLabel !== "") {
        const reference = document.createElement("span");
        reference.className = "wiked-lite-tooltip__reference";
        reference.textContent = ` (${referenceLabel})`;
        title.append(reference);
    }
    return title;
}

function hideReferenceTooltip(): void {
    clearReferenceTooltipHideTimer();
    document.querySelector(".wiked-lite-tooltip")?.remove();
}

function clearReferenceTooltipHideTimer(): void {
    window.clearTimeout(referenceTooltipHideTimer);
    referenceTooltipHideTimer = 0;
}

function scheduleReferenceTooltipHide(): void {
    clearReferenceTooltipHideTimer();
    referenceTooltipHideTimer = window.setTimeout(hideReferenceTooltip, 180);
}

function installTool(services: EditorServices): void {
    if (document.getElementById(TOOL_ID) != null || !isSourcePage()) {
        return;
    }
    const item = addToolToPortlet("p-cactions") ?? addToolToPortlet("p-tb");
    const link = item?.matches("a") ? item : item?.querySelector("a");
    link?.addEventListener("click", function activate(event): void {
        event.preventDefault();
        void openFormatter(services);
    });
}

function addToolToPortlet(portlet: string): HTMLElement | null {
    return mw.util.addPortletLink(
        portlet,
        "#",
        msg("tool.name"),
        TOOL_ID,
        msg("tool.description"),
    );
}

function isSourcePage(): boolean {
    const model = mw.config.get("wgPageContentModel");
    const action = mw.config.get("wgAction");
    return model === "wikitext" && (action === "edit" || action === "submit");
}

async function openFormatter(services: EditorServices): Promise<void> {
    const textarea = document.getElementById(TEXTAREA_ID);
    if (!(textarea instanceof HTMLTextAreaElement)) {
        mw.notify(msg("feedback.noEditor"), { type: "warn" });
        return;
    }
    activeDialogCleanup?.();
    const require = (await mw.loader.using([
        "vue",
        "@wikimedia/codex",
    ])) as ResourceLoaderRequire;
    mountFormatterDialog(require, textarea, services);
}

function mountFormatterDialog(
    require: ResourceLoaderRequire,
    textarea: HTMLTextAreaElement,
    services: EditorServices,
): void {
    const Vue = require("vue");
    const Codex = require("@wikimedia/codex");
    const host = document.createElement("div");
    let application: VueApp | null = null;
    host.id = HOST_ID;
    document.documentElement.append(host);
    function cleanup(): void {
        application?.unmount();
        host.remove();
        activeDialogCleanup = null;
    }
    const component = createFormatterDialogComponent(Vue, {
        onClose: cleanup,
        onSubmit: (selection) =>
            applyFormatting(textarea, selection, services),
    });
    application = Vue.createMwApp(component);
    registerFormatterComponents(application, Codex);
    application.mount(host);
    activeDialogCleanup = cleanup;
}

async function applyFormatting(
    textarea: HTMLTextAreaElement,
    selection: FormatterDialogSelection,
    services: EditorServices,
): Promise<void> {
    const controller = controllers.get(textarea);
    const range = controller?.getSelection() ?? {
        end: textarea.selectionEnd,
        start: textarea.selectionStart,
    };
    const selected = range.start !== range.end;
    const source = selected
        ? textarea.value.slice(range.start, range.end)
        : textarea.value;
    let formatted = formatWikitext(source, selection.formatter).text;
    if (selection.resolveRedirects) {
        formatted = await services.resolveRedirects(formatted);
    }
    if (formatted !== source) {
        writeFormattedSource(textarea, range, formatted, selected);
    }
    if (selection.highlightMissing) {
        const missing = await services.findMissingLinks(textarea.value);
        controller?.setMissingLinks(missing);
    } else {
        controller?.setMissingLinks(new Set());
    }
    notifyFormattingResult(formatted !== source, selected);
}

function writeFormattedSource(
    textarea: HTMLTextAreaElement,
    range: { end: number; start: number },
    formatted: string,
    selected: boolean,
): void {
    const controller = controllers.get(textarea);
    const start = selected ? range.start : 0;
    const end = selected ? range.end : textarea.value.length;
    if (controller != null) {
        controller.replace(start, end, formatted);
        return;
    }
    textarea.setRangeText(formatted, start, end, "select");
    dispatchNativeInput(textarea);
    textarea.focus({ preventScroll: true });
}

function notifyFormattingResult(changed: boolean, selected: boolean): void {
    const message = !changed
        ? msg("feedback.noChanges")
        : msg(selected ? "feedback.selection" : "feedback.whole");
    mw.notify(message, { type: changed ? "success" : "info" });
}

function dispatchNativeInput(textarea: HTMLTextAreaElement): void {
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function normalizeTitle(title: string): string {
    return title.replaceAll("_", " ").trim().toLowerCase();
}

function getEditorLabel(textarea: HTMLTextAreaElement): string {
    return (
        textarea.getAttribute("aria-label") ??
        textarea.labels?.[0]?.textContent?.trim() ??
        "Wikitext editor"
    );
}

function waitForDocument(): Promise<void> {
    if (document.readyState !== "loading") {
        return Promise.resolve();
    }
    return new Promise(function ready(resolve) {
        document.addEventListener(
            "DOMContentLoaded",
            function resolveReady(): void {
                resolve();
            },
            { once: true },
        );
    });
}
