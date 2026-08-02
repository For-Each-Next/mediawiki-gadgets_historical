/** MediaWiki source-editor integration for wikEd Lite. */

import { formatWikitext } from "#gadget/domain/formatter.ts";
import { highlightWikitext } from "#gadget/domain/highlighter.ts";
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
import { attachReferenceTooltips } from "#gadget/ui/reference-tooltip.ts";
import {
    installWikEdLiteFrameStyles,
    installWikEdLiteStyles,
} from "#gadget/ui/styles.ts";

const TEXTAREA_ID = "wpTextbox1";
const TOOL_ID = "wiked-lite-format";
const HOST_ID = "wiked-lite-dialog-host";
const EDITOR_FRAME_SOURCE =
    '<!doctype html><html><head><meta charset="UTF-8">' +
    "</head><body></body></html>";
const EDITOR_FRAME_LOAD_TIMEOUT = 5_000;

export interface EditorServices {
    findMissingLinks(source: string): Promise<{
        linkClasses: string[];
        titles: Set<string>;
    }>;
    resolveRedirects(source: string): Promise<string>;
}

interface EditorController {
    destroy(): void;
    focus(): void;
    getSelection(): { end: number; start: number };
    isAttached(): boolean;
    replace(start: number, end: number, value: string): void;
    setMissingLinks(titles: Set<string>, color?: string): void;
}

interface EditorSurface {
    editor: HTMLElement;
    frame: HTMLIFrameElement;
    overlay: HTMLElement;
}

const controllers = new WeakMap<HTMLTextAreaElement, EditorController>();
const pendingEditors = new WeakSet<HTMLTextAreaElement>();
let activeDialogCleanup: (() => void) | null = null;

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
        if (existing.isAttached() && !isIncompatibleEditor(textarea)) {
            return;
        }
        existing.destroy();
        controllers.delete(textarea);
    }
    if (isIncompatibleEditor(textarea)) {
        return;
    }
    if (pendingEditors.has(textarea)) {
        return;
    }
    pendingEditors.add(textarea);
    void createEditorController(textarea).then(
        function register(controller): void {
            pendingEditors.delete(textarea);
            if (
                !controller.isAttached() ||
                controllers.has(textarea) ||
                isIncompatibleEditor(textarea)
            ) {
                controller.destroy();
                return;
            }
            controllers.set(textarea, controller);
        },
        function report(error): void {
            pendingEditors.delete(textarea);
            console.error("wikEd Lite could not initialize its editor", error);
        },
    );
}

function isIncompatibleEditor(textarea: HTMLTextAreaElement): boolean {
    if (window.wikEd?.useWikEd === true) {
        return true;
    }
    const style = window.getComputedStyle(textarea);
    return style.display === "none" || style.visibility === "hidden";
}

async function createEditorController(
    textarea: HTMLTextAreaElement,
): Promise<EditorController> {
    const surface = await createEditorSurface(textarea);
    try {
        return initializeEditorController(textarea, surface);
    } catch (error) {
        surface.frame.remove();
        throw error;
    }
}

// eslint-disable-next-line max-lines-per-function
function initializeEditorController(
    textarea: HTMLTextAreaElement,
    surface: EditorSurface,
): EditorController {
    const { editor, frame, overlay } = surface;
    const missingTitles = new Set<string>();
    const hadNativeClass = textarea.classList.contains("wiked-lite-native");
    const hadNativeFocus = document.activeElement === textarea;
    const nativeAriaHidden = textarea.getAttribute("aria-hidden");
    const nativeTabIndex = textarea.getAttribute("tabindex");
    const form = textarea.form;
    let rendering = false;
    let composing = false;
    let timer = 0;
    let destroyed = false;
    let controller: EditorController | null = null;
    const referenceTooltips = attachReferenceTooltips({
        delay: window.wikEdLiteConfig?.referenceTooltipDelay,
        editor,
        getSource: () => textarea.value,
        overlay,
    });
    const connectionObserver = new MutationObserver(
        function removeDetachedEditor(): void {
            if (isEditorFrameAttached(frame, textarea)) {
                return;
            }
            if (
                controller != null &&
                controllers.get(textarea) === controller
            ) {
                controllers.delete(textarea);
            }
            destroy();
        },
    );

    function render(preserveSelection = true): void {
        window.clearTimeout(timer);
        timer = 0;
        const selection = preserveSelection
            ? getSelectionOffsets(editor)
            : { end: textarea.selectionEnd, start: textarea.selectionStart };
        referenceTooltips.dismiss();
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
        if (rendering) {
            return;
        }
        referenceTooltips.dismiss();
        if (composing) {
            return;
        }
        textarea.value = readEditableText(editor);
        dispatchNativeInput(textarea);
        scheduleRender();
    });
    editor.addEventListener("compositionstart", function begin(): void {
        window.clearTimeout(timer);
        timer = 0;
        referenceTooltips.dismiss();
        composing = true;
    });
    editor.addEventListener("compositionend", function finish(): void {
        composing = false;
        referenceTooltips.dismiss();
        textarea.value = readEditableText(editor);
        dispatchNativeInput(textarea);
        scheduleRender();
    });
    function updateFromNative(): void {
        if (rendering) {
            return;
        }
        referenceTooltips.dismiss();
        if (!composing) {
            scheduleRender();
        }
    }

    function flushComposition(): void {
        if (!composing) {
            return;
        }
        textarea.value = readEditableText(editor);
        dispatchNativeInput(textarea);
    }

    function destroy(): void {
        if (destroyed) {
            return;
        }
        const focusedSelection =
            editor.ownerDocument.activeElement === editor
                ? getSelectionOffsets(editor)
                : null;
        destroyed = true;
        window.clearTimeout(timer);
        connectionObserver.disconnect();
        textarea.removeEventListener("input", updateFromNative);
        form?.removeEventListener("submit", flushComposition, true);
        flushComposition();
        try {
            referenceTooltips.destroy();
        } finally {
            restoreAttribute(textarea, "aria-hidden", nativeAriaHidden);
            restoreAttribute(textarea, "tabindex", nativeTabIndex);
            if (!hadNativeClass) {
                textarea.classList.remove("wiked-lite-native");
            }
            frame.remove();
            restoreNativeFocus(textarea, focusedSelection);
        }
    }

    controller = {
        destroy,
        focus() {
            editor.focus({ preventScroll: true });
        },
        getSelection() {
            return getSelectionOffsets(editor);
        },
        isAttached() {
            return isEditorFrameAttached(frame, textarea);
        },
        replace(start, end, value) {
            textarea.setRangeText(value, start, end, "select");
            textarea.setSelectionRange(start, start + value.length);
            dispatchNativeInput(textarea);
            render(false);
            editor.focus({ preventScroll: true });
        },
        setMissingLinks(titles, color = "") {
            missingTitles.clear();
            titles.forEach((title) =>
                missingTitles.add(normalizeTitle(title)),
            );
            if (color !== "") {
                editor.style.setProperty("--wiked-lite-missing-link", color);
            }
            render();
        },
    };
    try {
        textarea.addEventListener("input", updateFromNative);
        form?.addEventListener("submit", flushComposition, true);
        editor.addEventListener("click", openModifiedTarget);
        render(false);
        frame.dataset.wikedReady = "true";
        if (hadNativeFocus) {
            editor.focus({ preventScroll: true });
        }
        textarea.classList.add("wiked-lite-native");
        textarea.setAttribute("aria-hidden", "true");
        textarea.setAttribute("tabindex", "-1");
        connectionObserver.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });
    } catch (error) {
        destroy();
        throw error;
    }
    return controller;
}

async function createEditorSurface(
    textarea: HTMLTextAreaElement,
): Promise<EditorSurface> {
    const frame = document.createElement("iframe");
    const label = getEditorLabel(textarea);
    frame.className = "wiked-editor-frame";
    frame.classList.add("wiked-lite-frame");
    frame.title = label;
    frame.setAttribute("aria-label", label);
    frame.style.height = `${Math.max(textarea.offsetHeight, 256)}px`;
    try {
        const target = await loadFrameDocument(frame, textarea);
        const editor = target.createElement("main");
        const overlay = target.createElement("div");
        target.documentElement.lang =
            textarea.lang || document.documentElement.lang;
        target.body.className = "wiked-lite-frame-document";
        editor.className = "wiked-lite-editor";
        editor.contentEditable = "plaintext-only";
        editor.role = "textbox";
        editor.ariaMultiLine = "true";
        editor.ariaLabel = label;
        editor.spellcheck = textarea.spellcheck;
        overlay.className = "wiked-lite-frame-overlay";
        target.body.replaceChildren(editor, overlay);
        installWikEdLiteFrameStyles(target);
        copyTextareaPresentation(textarea, frame, editor);
        return { editor, frame, overlay };
    } catch (error) {
        frame.remove();
        throw error;
    }
}

function loadFrameDocument(
    frame: HTMLIFrameElement,
    textarea: HTMLTextAreaElement,
): Promise<Document> {
    return new Promise(function load(resolve, reject) {
        new EditorFrameLoader(frame, textarea, resolve, reject).start();
    });
}

class EditorFrameLoader {
    private readonly observer: MutationObserver;
    private settled = false;
    private timeout = 0;

    constructor(
        private readonly frame: HTMLIFrameElement,
        private readonly textarea: HTMLTextAreaElement,
        private readonly resolve: (target: Document) => void,
        private readonly reject: (reason: unknown) => void,
    ) {
        this.observer = new MutationObserver(() => this.validateAttachment());
    }

    start(): void {
        try {
            this.timeout = window.setTimeout(() => {
                this.fail(
                    new Error(
                        "wikEd Lite timed out loading its editor frame.",
                    ),
                );
            }, EDITOR_FRAME_LOAD_TIMEOUT);
            this.frame.addEventListener("load", this.initialize, {
                once: true,
            });
            this.frame.addEventListener("error", this.failFrameLoad, {
                once: true,
            });
            this.observer.observe(document.documentElement, {
                childList: true,
                subtree: true,
            });
            this.frame.srcdoc = EDITOR_FRAME_SOURCE;
            this.textarea.before(this.frame);
        } catch (error) {
            this.fail(error);
        }
    }

    private readonly initialize = (): void => {
        if (!isEditorFrameAttached(this.frame, this.textarea)) {
            this.fail(new Error("The source editor moved while loading."));
            return;
        }
        const target = this.frame.contentDocument;
        if (target == null) {
            this.fail(
                new Error("wikEd Lite could not access its editor frame."),
            );
            return;
        }
        this.settled = true;
        this.cleanup();
        this.resolve(target);
    };

    private readonly failFrameLoad = (): void => {
        this.fail(new Error("wikEd Lite could not load its editor frame."));
    };

    private validateAttachment(): void {
        if (!isEditorFrameAttached(this.frame, this.textarea)) {
            this.fail(
                new Error("The source editor was removed while loading."),
            );
        }
    }

    private fail(reason: unknown): void {
        if (this.settled) {
            return;
        }
        this.settled = true;
        this.cleanup();
        this.reject(reason);
    }

    private cleanup(): void {
        window.clearTimeout(this.timeout);
        this.observer.disconnect();
        this.frame.removeEventListener("load", this.initialize);
        this.frame.removeEventListener("error", this.failFrameLoad);
    }
}

function isEditorFrameAttached(
    frame: HTMLIFrameElement,
    textarea: HTMLTextAreaElement,
): boolean {
    return (
        frame.isConnected &&
        textarea.isConnected &&
        frame.parentNode === textarea.parentNode &&
        frame.nextSibling === textarea
    );
}

function restoreAttribute(
    element: HTMLElement,
    name: string,
    value: string | null,
): void {
    if (value == null) {
        element.removeAttribute(name);
        return;
    }
    element.setAttribute(name, value);
}

function restoreNativeFocus(
    textarea: HTMLTextAreaElement,
    selection: { end: number; start: number } | null,
): void {
    if (
        selection == null ||
        !textarea.isConnected ||
        isIncompatibleEditor(textarea)
    ) {
        return;
    }
    textarea.setSelectionRange(selection.start, selection.end);
    textarea.focus({ preventScroll: true });
}

function copyTextareaPresentation(
    textarea: HTMLTextAreaElement,
    frame: HTMLIFrameElement,
    editor: HTMLElement,
): void {
    const style = window.getComputedStyle(textarea);
    const background = findOpaqueBackground(textarea, style);
    const direction = textarea.dir || style.direction;
    editor.dir = direction;
    editor.lang = frame.contentDocument?.documentElement.lang ?? "";
    editor.ownerDocument.documentElement.dir = direction;
    editor.ownerDocument.body.dir = direction;
    frame.style.border = style.border;
    frame.style.borderRadius = style.borderRadius;
    frame.style.resize = style.resize;
    frame.style.setProperty("--wiked-lite-background", background);
    frame.style.setProperty("--wiked-lite-foreground", style.color);
    editor.style.fontFamily = style.fontFamily;
    editor.style.fontSize = style.fontSize;
    editor.style.fontWeight = style.fontWeight;
    editor.style.letterSpacing = style.letterSpacing;
    editor.style.lineHeight = style.lineHeight;
    editor.style.padding = style.padding;
    editor.style.tabSize = style.tabSize;
    editor.style.setProperty("--wiked-lite-foreground", style.color);
    editor.style.setProperty(
        "--wiked-lite-caret",
        style.caretColor === "auto" ? style.color : style.caretColor,
    );
    editor.style.setProperty("--wiked-lite-background", background);
    editor.ownerDocument.body.style.setProperty(
        "--wiked-lite-background",
        background,
    );
}

function findOpaqueBackground(
    element: HTMLElement,
    computedStyle: CSSStyleDeclaration,
): string {
    let current: HTMLElement | null = element;
    let style = computedStyle;
    while (current != null) {
        const color = style.backgroundColor;
        if (
            color !== "" &&
            color !== "transparent" &&
            color !== "rgba(0, 0, 0, 0)"
        ) {
            return color;
        }
        current = current.parentElement;
        if (current != null) {
            style = window.getComputedStyle(current);
        }
    }
    return "rgb(255, 255, 255)";
}

function renderSegments(
    editor: HTMLElement,
    source: string,
    missingTitles: Set<string>,
): void {
    const target = editor.ownerDocument;
    const fragment = target.createDocumentFragment();
    const limit = window.wikEdLiteConfig?.maxLiveHighlightLength ?? 300_000;
    if (source.length > limit) {
        editor.replaceChildren(target.createTextNode(source));
        return;
    }
    const databaseName = String(mw.config.get("wgDBname") ?? "");
    const linkHelpers = databaseName === "zhwiki";
    const namespaceIds = mw.config.get("wgNamespaceIds") as Record<
        string,
        number
    >;
    const segments = highlightWikitext(source, {
        databaseName,
        linkHelpers,
        namespaceIds,
    });
    appendHighlightedSegments(target, fragment, segments, missingTitles);
    editor.replaceChildren(fragment);
}

function appendHighlightedSegments(
    target: Document,
    fragment: DocumentFragment,
    segments: ReturnType<typeof highlightWikitext>,
    missingTitles: Set<string>,
): void {
    for (const segment of segments) {
        if (segment.classNames.length === 0) {
            fragment.append(target.createTextNode(segment.text));
            continue;
        }
        const span = target.createElement("span");
        span.className = segment.classNames.join(" ");
        span.textContent = segment.text;
        if (segment.href != null) {
            span.dataset.href = segment.href;
        }
        if (segment.missingTitle != null) {
            markMissingLink(span, segment.missingTitle, missingTitles);
        }
        if (segment.referenceSource != null) {
            span.dataset.reference = segment.referenceSource;
        }
        fragment.append(span);
    }
}

function markMissingLink(
    span: HTMLElement,
    title: string,
    missingTitles: Set<string>,
): void {
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
    if (node.nodeName === "BR") {
        return "\n";
    }
    let text = "";
    for (const child of node.childNodes) {
        text += readNodeText(child);
        if (isEditableLine(child) && !text.endsWith("\n")) {
            text += "\n";
        }
    }
    return text;
}

function isEditableLine(node: Node): boolean {
    return node.nodeName === "DIV" || node.nodeName === "P";
}

function getSelectionOffsets(editor: HTMLElement): {
    end: number;
    start: number;
} {
    const selection = editor.ownerDocument.getSelection();
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
    const range = root.ownerDocument?.createRange();
    if (range == null) {
        return 0;
    }
    range.selectNodeContents(root);
    range.setEnd(node, offset);
    return range.toString().length;
}

function setSelectionOffsets(
    editor: HTMLElement,
    start: number,
    end: number,
): void {
    const range = editor.ownerDocument.createRange();
    const startPoint = findTextPoint(editor, start);
    const endPoint = findTextPoint(editor, end);
    range.setStart(startPoint.node, startPoint.offset);
    range.setEnd(endPoint.node, endPoint.offset);
    const selection = editor.ownerDocument.getSelection();
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
    const target = eventElement(event.target);
    const span = target?.closest<HTMLElement>("[data-href]") ?? null;
    if (span?.dataset.href != null) {
        event.preventDefault();
        window.open(span.dataset.href, "_blank", "noopener,noreferrer");
    }
}

function eventElement(target: EventTarget | null): Element | null {
    if (target == null || !("nodeType" in target)) {
        return null;
    }
    const node = target as Node;
    return node.nodeType === 1 ? (node as Element) : node.parentElement;
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
        controller?.setMissingLinks(
            missing.titles,
            siteMissingLinkColor(missing.linkClasses),
        );
    } else {
        controller?.setMissingLinks(new Set());
    }
    notifyFormattingResult(formatted !== source, selected);
}

function siteMissingLinkColor(linkClasses: string[]): string {
    const host =
        document.querySelector(".mw-parser-output") ??
        document.querySelector("#mw-content-text") ??
        document.body;
    if (host == null) {
        return "";
    }
    const probe = document.createElement("a");
    const classes = new Set(
        linkClasses.map((name) => String(name).trim()).filter(Boolean),
    );
    classes.add("new");
    probe.className = [...classes].join(" ");
    probe.href = "#";
    probe.textContent = "wikEd";
    probe.ariaHidden = "true";
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.pointerEvents = "none";
    host.append(probe);
    const color = window.getComputedStyle(probe).color;
    probe.remove();
    return color;
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
