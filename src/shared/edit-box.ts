/**
 * Shared access to the active MediaWiki source edit box.
 */

const EDIT_BOX_SELECTOR = "#wpTextbox1";
const EDIT_BOX_BACKEND_KEY = Symbol.for("mediawiki-gadgets.edit-box-backend");
const codeMirrorEditors = new Set<CodeMirrorEditor>();
let hooksRegistered = false;

export interface CodeMirrorEditor {
    isActive?: boolean;
    focus?: () => void;
    surface?: VisualEditorSurface | null;
    textarea?: HTMLTextAreaElement | null;
    view?: {
        dispatch?: (transaction: {
            changes: { from: number; insert: string; to: number };
            scrollIntoView?: boolean;
            selection?: { anchor: number; head?: number };
        }) => void;
        focus?: () => void;
        scrollDOM?: {
            scrollLeft: number;
            scrollTop: number;
        };
        state?: {
            doc?: { length: number; toString(): string };
            selection?: {
                main?: {
                    anchor?: number;
                    from: number;
                    head?: number;
                    to: number;
                };
            };
        };
    };
}

export interface VisualEditorFragment {
    collapseToEnd(): VisualEditorFragment;
    expandLinearSelection(scope: "root"): VisualEditorFragment;
    getSelection?(): {
        getRange(): { end: number; start: number };
    };
    insertContent(text: string): VisualEditorFragment;
    select(): VisualEditorFragment;
}

interface VisualEditorScrollContainer {
    scrollLeft(): number;
    scrollLeft(value: number): unknown;
    scrollTop(): number;
    scrollTop(value: number): unknown;
}

export interface VisualEditorSurface {
    getDom(): string | Document;
    getMode(): string;
    getModel(): {
        getFragment(): VisualEditorFragment;
        getLinearFragment(
            range: unknown,
            noAutoSelect?: boolean,
        ): VisualEditorFragment;
        getRangeFromSourceOffsets(from: number, to?: number): unknown;
        getSourceOffsetFromOffset(offset: number): number;
    };
    getView(): {
        focus(): void;
        getSurface?(): {
            $scrollContainer?: VisualEditorScrollContainer;
        };
    };
}

interface VisualEditorGlobal {
    Range: new (start: number, end?: number) => unknown;
    init?: {
        target?: {
            active?: boolean;
            getSurface?: () => VisualEditorSurface | null;
        };
    };
}

/**
 * Editor-independent access to a MediaWiki source edit box.
 */
export interface EditBox {
    readonly element: HTMLTextAreaElement | null;
    focus(): void;
    read(): string;
    replaceSelection(text: string): void;
    write(text: string): void;
}

/**
 * Operations supplied by an editor backed by a native textarea.
 */
export interface EditBoxBackend {
    focus(): void;
    read(): string;
    replaceSelection(text: string): void;
    write(text: string): void;
    writePreservingPosition(text: string): void;
}

/**
 * Registers an enhanced editor for one native backing textarea.
 *
 * The symbol-keyed property remains discoverable when separate gadgets
 * bundle their own copies of this shared module.
 *
 * @param element - Native backing textarea.
 * @param backend - Enhanced editor operations.
 * @returns Registration cleanup callback.
 */
export function registerEditBoxBackend(
    element: HTMLTextAreaElement,
    backend: EditBoxBackend,
): () => void {
    const target = element as unknown as Record<PropertyKey, unknown>;
    const previous = target[EDIT_BOX_BACKEND_KEY];
    target[EDIT_BOX_BACKEND_KEY] = backend;

    return function unregisterEditBoxBackend(): void {
        if (target[EDIT_BOX_BACKEND_KEY] !== backend) {
            return;
        }
        if (previous == null) {
            delete target[EDIT_BOX_BACKEND_KEY];
            return;
        }
        target[EDIT_BOX_BACKEND_KEY] = previous;
    };
}

/**
 * Starts tracking MediaWiki CodeMirror instances.
 *
 * MediaWiki hooks retain their most recent firing, so late-loaded
 * gadgets also receive the active editor.
 */
export function registerEditBoxHooks(): void {
    if (hooksRegistered || typeof mw === "undefined") {
        return;
    }

    hooksRegistered = true;
    mw.hook("ext.CodeMirror.ready").add(trackCodeMirror);
    mw.hook("ext.CodeMirror.toggle").add(trackCodeMirrorToggle);
    mw.hook("ext.CodeMirror.destroy").add(removeCodeMirrorForTextarea);
}

/**
 * Gets an adapter for the page's active source editor.
 *
 * @param root - Document containing the native edit box.
 * @returns Active edit-box adapter, when present.
 */
export function getEditBox(root: Document = document): EditBox | null {
    registerEditBoxHooks();
    const element = root.querySelector<HTMLTextAreaElement>(EDIT_BOX_SELECTOR);
    const surface = getVisualEditorSurface();

    if (element == null && surface == null) {
        return null;
    }

    return createEditBox(element);
}

/**
 * Creates an adapter that resolves the active editor on each operation.
 *
 * @param element - Native backing textarea, when present.
 * @returns Edit-box adapter.
 */
export function createEditBox(element: HTMLTextAreaElement | null): EditBox {
    return new ActiveEditBox(element);
}

/**
 * Replaces editor text while retaining its selection and viewport.
 *
 * @param editor - Active edit-box adapter.
 * @param text - New document text.
 */
export function writePreservingPosition(editor: EditBox, text: string): void {
    const backend = getEditBoxBackend(editor.element);
    if (backend != null) {
        backend.writePreservingPosition(text);
        return;
    }

    const codeMirror = findCodeMirror(editor.element);
    if (codeMirror != null) {
        writeCodeMirrorPreservingPosition(codeMirror, text);
        return;
    }

    const surface = getVisualEditorSurface();
    if (surface != null) {
        writeVisualEditorPreservingPosition(surface, text);
        return;
    }

    if (editor.element != null) {
        writeNativePreservingPosition(editor.element, text);
        return;
    }

    editor.write(text);
}

/**
 * Adapter that resolves the active editor backend for each operation.
 */
class ActiveEditBox implements EditBox {
    public readonly element: HTMLTextAreaElement | null;

    public constructor(element: HTMLTextAreaElement | null) {
        this.element = element;
    }

    public focus(): void {
        const backend = getEditBoxBackend(this.element);
        if (backend != null) {
            backend.focus();
            return;
        }

        const codeMirror = findCodeMirror(this.element);
        if (codeMirror != null) {
            focusCodeMirror(codeMirror);
            return;
        }

        const surface = getVisualEditorSurface();
        if (surface != null) {
            surface.getView().focus();
            return;
        }

        this.element?.focus();
    }

    public read(): string {
        const backend = getEditBoxBackend(this.element);
        if (backend != null) {
            return backend.read();
        }

        const codeMirror = findCodeMirror(this.element);
        if (codeMirror != null) {
            return readCodeMirror(codeMirror);
        }

        const surface = getVisualEditorSurface();
        if (surface != null) {
            const dom = surface.getDom();
            return String(dom);
        }

        return this.element?.value ?? "";
    }

    public replaceSelection(text: string): void {
        const backend = getEditBoxBackend(this.element);
        if (backend != null) {
            backend.replaceSelection(text);
            return;
        }

        const codeMirror = findCodeMirror(this.element);
        if (codeMirror != null) {
            replaceCodeMirrorSelection(codeMirror, text);
            return;
        }

        const surface = getVisualEditorSurface();
        if (surface != null) {
            surface
                .getModel()
                .getFragment()
                .insertContent(text)
                .collapseToEnd()
                .select();
            return;
        }

        if (this.element != null) {
            replaceNativeSelection(this.element, text);
        }
    }

    public write(text: string): void {
        const backend = getEditBoxBackend(this.element);
        if (backend != null) {
            backend.write(text);
            return;
        }

        const codeMirror = findCodeMirror(this.element);
        if (codeMirror != null) {
            writeCodeMirror(codeMirror, text);
            return;
        }

        const surface = getVisualEditorSurface();
        if (surface != null) {
            writeVisualEditor(surface, text);
            return;
        }

        if (this.element != null) {
            this.element.value = text;
            dispatchValueEvents(this.element);
        }
    }
}

/**
 * Gets an enhanced editor registered for a native backing textarea.
 *
 * @param element - Native backing textarea.
 * @returns Registered enhanced editor operations.
 */
function getEditBoxBackend(
    element: HTMLTextAreaElement | null,
): EditBoxBackend | null {
    if (element == null) {
        return null;
    }
    const target = element as unknown as Record<PropertyKey, unknown>;
    const backend = target[EDIT_BOX_BACKEND_KEY];
    return isEditBoxBackend(backend) ? backend : null;
}

/**
 * Checks a symbol-keyed enhanced-editor registration.
 *
 * @param value - Candidate registration.
 * @returns Whether every edit-box operation is available.
 */
function isEditBoxBackend(value: unknown): value is EditBoxBackend {
    return (
        typeof value === "object" &&
        value != null &&
        "focus" in value &&
        typeof value.focus === "function" &&
        "read" in value &&
        typeof value.read === "function" &&
        "replaceSelection" in value &&
        typeof value.replaceSelection === "function" &&
        "write" in value &&
        typeof value.write === "function" &&
        "writePreservingPosition" in value &&
        typeof value.writePreservingPosition === "function"
    );
}

/**
 * Reads the current MediaWiki source text.
 *
 * @returns Current source text, or an empty string without an edit box.
 */
export function readEditBox(): string {
    return getEditBox()?.read() ?? "";
}

/**
 * Tracks an initialized CodeMirror instance.
 *
 * @param editor - MediaWiki CodeMirror wrapper.
 */
function trackCodeMirror(editor: CodeMirrorEditor): void {
    codeMirrorEditors.add(editor);
}

/**
 * Tracks CodeMirror activation changes.
 *
 * @param enabled - Whether the editor is active.
 * @param editor - MediaWiki CodeMirror wrapper.
 */
function trackCodeMirrorToggle(
    enabled: boolean,
    editor: CodeMirrorEditor,
): void {
    if (enabled) {
        codeMirrorEditors.add(editor);
        return;
    }

    codeMirrorEditors.delete(editor);
}

/**
 * Removes destroyed CodeMirror instances for a textarea.
 *
 * @param textarea - Restored native textarea.
 */
function removeCodeMirrorForTextarea(textarea: HTMLTextAreaElement): void {
    for (const editor of codeMirrorEditors) {
        if (editor.textarea === textarea) {
            codeMirrorEditors.delete(editor);
        }
    }
}

/**
 * Finds the active CodeMirror bound to the page textarea or VE surface.
 *
 * @param element - Page edit textarea.
 * @returns Matching CodeMirror wrapper.
 */
function findCodeMirror(
    element: HTMLTextAreaElement | null,
): CodeMirrorEditor | null {
    const surface = getVisualEditorSurface();

    for (const editor of codeMirrorEditors) {
        if (
            isCodeMirrorTarget(editor, element, surface) &&
            isCodeMirrorUsable(editor)
        ) {
            return editor;
        }
    }

    return null;
}

/**
 * Checks whether CodeMirror belongs to the active editor target.
 *
 * @param editor - Candidate CodeMirror wrapper.
 * @param element - Page edit textarea.
 * @param surface - Active VisualEditor source surface.
 * @returns Whether the wrapper targets the current editor.
 */
function isCodeMirrorTarget(
    editor: CodeMirrorEditor,
    element: HTMLTextAreaElement | null,
    surface: VisualEditorSurface | null,
): boolean {
    const matchesTextarea = Boolean(element) && editor.textarea === element;
    const matchesSurface = Boolean(surface) && editor.surface === surface;
    return matchesTextarea || matchesSurface;
}

/**
 * Checks whether a CodeMirror wrapper has an active view.
 *
 * @param editor - Candidate CodeMirror wrapper.
 * @returns Whether its document view can be used.
 */
function isCodeMirrorUsable(editor: CodeMirrorEditor): boolean {
    return (editor.isActive ?? true) && Boolean(editor.view);
}

/**
 * Reads a CodeMirror 6 document.
 *
 * @param editor - Active CodeMirror wrapper.
 * @returns Current document text.
 */
function readCodeMirror(editor: CodeMirrorEditor): string {
    return editor.view?.state?.doc?.toString() ?? "";
}

/**
 * Replaces a CodeMirror 6 document in one transaction.
 *
 * @param editor - Active CodeMirror wrapper.
 * @param text - New document text.
 */
function writeCodeMirror(editor: CodeMirrorEditor, text: string): void {
    const view = editor.view;
    const doc = view?.state?.doc;

    if (typeof view?.dispatch !== "function" || doc == null) {
        throw new Error("The active CodeMirror document is unavailable.");
    }

    view.dispatch({
        changes: { from: 0, insert: text, to: doc.length },
    });
}

/**
 * Replaces a CodeMirror document while retaining its selection and
 * viewport.
 *
 * @param editor - Active CodeMirror wrapper.
 * @param text - New document text.
 */
function writeCodeMirrorPreservingPosition(
    editor: CodeMirrorEditor,
    text: string,
): void {
    const view = editor.view;
    const doc = view?.state?.doc;

    if (typeof view?.dispatch !== "function" || doc == null) {
        throw new Error("The active CodeMirror document is unavailable.");
    }

    const selection = view.state?.selection?.main;
    const anchor = selection?.anchor ?? selection?.from ?? 0;
    const head = selection?.head ?? selection?.to ?? anchor;
    const scrollLeft = view.scrollDOM?.scrollLeft;
    const scrollTop = view.scrollDOM?.scrollTop;
    view.dispatch({
        changes: { from: 0, insert: text, to: doc.length },
        selection: {
            anchor: clampEditBoxOffset(anchor, text),
            head: clampEditBoxOffset(head, text),
        },
    });
    restoreDomScroll(view.scrollDOM, scrollLeft, scrollTop);
}

/**
 * Replaces the active CodeMirror 6 selection in one transaction.
 *
 * @param editor - Active CodeMirror wrapper.
 * @param text - Replacement text.
 */
function replaceCodeMirrorSelection(
    editor: CodeMirrorEditor,
    text: string,
): void {
    const view = editor.view;
    const doc = view?.state?.doc;

    if (typeof view?.dispatch !== "function" || doc == null) {
        throw new Error("The active CodeMirror document is unavailable.");
    }

    const selection = view.state?.selection?.main;
    const from = selection?.from ?? doc.length;
    const to = selection?.to ?? from;
    view.dispatch({
        changes: { from, insert: text, to },
        scrollIntoView: true,
        selection: { anchor: from + text.length },
    });
}

/**
 * Focuses an active CodeMirror editor.
 *
 * @param editor - Active CodeMirror wrapper.
 */
function focusCodeMirror(editor: CodeMirrorEditor): void {
    if (typeof editor.focus === "function") {
        editor.focus();
        return;
    }

    editor.view?.focus?.();
}

/**
 * Gets VisualEditor's active 2017 wikitext surface.
 *
 * @returns Active source surface, when available.
 */
function getVisualEditorSurface(): VisualEditorSurface | null {
    const visualEditor = (
        globalThis as typeof globalThis & { ve?: VisualEditorGlobal }
    ).ve;
    const target = visualEditor?.init?.target;
    const surface = target?.getSurface?.() ?? null;

    if (target?.active !== true || surface?.getMode() !== "source") {
        return null;
    }

    return surface;
}

/**
 * Replaces the full VisualEditor source document.
 *
 * @param surface - Active 2017 wikitext surface.
 * @param text - New source text.
 */
function writeVisualEditor(surface: VisualEditorSurface, text: string): void {
    const visualEditor = (
        globalThis as typeof globalThis & { ve?: VisualEditorGlobal }
    ).ve;
    const Range = visualEditor?.Range;

    if (Range == null) {
        throw new Error("The VisualEditor source range API is unavailable.");
    }

    const range = new Range(0);
    surface
        .getModel()
        .getLinearFragment(range, true)
        .expandLinearSelection("root")
        .insertContent(text);
}

/**
 * Replaces a VisualEditor source document while retaining its selection
 * and viewport.
 *
 * @param surface - Active VisualEditor source surface.
 * @param text - New source text.
 */
function writeVisualEditorPreservingPosition(
    surface: VisualEditorSurface,
    text: string,
): void {
    const model = surface.getModel();
    const selection = model.getFragment().getSelection?.().getRange();
    const sourceSelection =
        selection == null
            ? null
            : {
                  end: model.getSourceOffsetFromOffset(selection.end),
                  start: model.getSourceOffsetFromOffset(selection.start),
              };
    const scrollContainer = surface.getView().getSurface?.().$scrollContainer;
    const scrollLeft = scrollContainer?.scrollLeft();
    const scrollTop = scrollContainer?.scrollTop();

    writeVisualEditor(surface, text);

    if (sourceSelection != null) {
        const range = model.getRangeFromSourceOffsets(
            clampEditBoxOffset(sourceSelection.start, text),
            clampEditBoxOffset(sourceSelection.end, text),
        );
        model.getLinearFragment(range, true).select();
    }
    restoreVisualEditorScroll(scrollContainer, scrollLeft, scrollTop);
}

/**
 * Replaces native textarea text while retaining its selection and
 * viewport.
 *
 * @param element - Updated textarea.
 * @param text - New document text.
 */
function writeNativePreservingPosition(
    element: HTMLTextAreaElement,
    text: string,
): void {
    const selectionStart = element.selectionStart;
    const selectionEnd = element.selectionEnd;
    const selectionDirection = element.selectionDirection;
    const scrollLeft = element.scrollLeft;
    const scrollTop = element.scrollTop;

    element.value = text;
    element.setSelectionRange(
        clampEditBoxOffset(selectionStart, text),
        clampEditBoxOffset(selectionEnd, text),
        selectionDirection,
    );
    dispatchValueEvents(element);
    restoreDomScroll(element, scrollLeft, scrollTop);
}

/**
 * Restores a DOM editor's scroll offsets when both were available.
 *
 * @param element - Editor scroll element.
 * @param scrollLeft - Previous horizontal offset.
 * @param scrollTop - Previous vertical offset.
 */
function restoreDomScroll(
    element:
        | {
              scrollLeft: number;
              scrollTop: number;
          }
        | undefined,
    scrollLeft: number | undefined,
    scrollTop: number | undefined,
): void {
    if (element == null || scrollLeft == null || scrollTop == null) {
        return;
    }
    element.scrollLeft = scrollLeft;
    element.scrollTop = scrollTop;
}

/**
 * Restores a VisualEditor jQuery scroll container.
 *
 * @param container - VisualEditor scroll container.
 * @param scrollLeft - Previous horizontal offset.
 * @param scrollTop - Previous vertical offset.
 */
function restoreVisualEditorScroll(
    container: VisualEditorScrollContainer | undefined,
    scrollLeft: number | undefined,
    scrollTop: number | undefined,
): void {
    if (container == null || scrollLeft == null || scrollTop == null) {
        return;
    }
    container.scrollLeft(scrollLeft);
    container.scrollTop(scrollTop);
}

/**
 * Keeps an editor offset within the replacement document.
 *
 * @param offset - Previous document offset.
 * @param text - Replacement document.
 * @returns Clamped offset.
 */
function clampEditBoxOffset(offset: number, text: string): number {
    return Math.max(0, Math.min(offset, text.length));
}

/**
 * Replaces the native textarea selection and leaves the caret after the
 * inserted text.
 *
 * @param element - Updated textarea.
 * @param text - Replacement text.
 */
function replaceNativeSelection(
    element: HTMLTextAreaElement,
    text: string,
): void {
    const from = element.selectionStart ?? element.value.length;
    const to = element.selectionEnd ?? from;
    const caret = from + text.length;
    element.value =
        element.value.slice(0, from) + text + element.value.slice(to);
    element.setSelectionRange(caret, caret);
    dispatchValueEvents(element);
}

/**
 * Notifies native-textarea integrations after a value replacement.
 *
 * @param element - Updated textarea.
 */
function dispatchValueEvents(element: HTMLTextAreaElement): void {
    const inputEvent = new Event("input", { bubbles: true });
    element.dispatchEvent(inputEvent);
    const changeEvent = new Event("change", { bubbles: true });
    element.dispatchEvent(changeEvent);
}
