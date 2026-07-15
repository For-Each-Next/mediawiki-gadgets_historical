/**
 * Shared access to the active MediaWiki source edit box.
 */

const EDIT_BOX_SELECTOR = "#wpTextbox1";
const codeMirrorEditors = new Set<CodeMirrorEditor>();
let hooksRegistered = false;

interface CodeMirrorEditor {
    isActive?: boolean;
    focus?: () => void;
    surface?: VisualEditorSurface | null;
    textarea?: HTMLTextAreaElement | null;
    view?: {
        dispatch?: (transaction: {
            changes: { from: number; insert: string; to: number };
        }) => void;
        focus?: () => void;
        state?: { doc?: { length: number; toString(): string } };
    };
}

interface VisualEditorFragment {
    expandLinearSelection(scope: "root"): VisualEditorFragment;
    insertContent(text: string): unknown;
}

interface VisualEditorSurface {
    getDom(): string | Document;
    getMode(): string;
    getModel(): {
        getLinearFragment(
            range: unknown,
            noAutoSelect?: boolean,
        ): VisualEditorFragment;
    };
    getView(): { focus(): void };
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
    write(text: string): void;
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
 * Adapter that resolves the active editor backend for each operation.
 */
class ActiveEditBox implements EditBox {
    public readonly element: HTMLTextAreaElement | null;

    public constructor(element: HTMLTextAreaElement | null) {
        this.element = element;
    }

    public focus(): void {
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
        const codeMirror = findCodeMirror(this.element);
        if (codeMirror != null) {
            return readCodeMirror(codeMirror);
        }

        const surface = getVisualEditorSurface();
        if (surface != null) {
            return String(surface.getDom());
        }

        return this.element?.value ?? "";
    }

    public write(text: string): void {
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
 * Reads the current MediaWiki source text.
 *
 * @returns Current source text, or an empty string without an edit box.
 */
export function readEditBox(): string {
    return getEditBox()?.read() ?? "";
}

/**
 * Replaces the current MediaWiki source text.
 *
 * @param text - New source text.
 * @returns Whether an edit box was available.
 */
export function writeEditBox(text: string): boolean {
    const editBox = getEditBox();

    if (editBox == null) {
        return false;
    }

    editBox.write(text);
    return true;
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
        const isTarget =
            (element != null && editor.textarea === element) ||
            (surface != null && editor.surface === surface);
        if (isTarget && editor.isActive !== false && editor.view != null) {
            return editor;
        }
    }

    return null;
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

    surface
        .getModel()
        .getLinearFragment(new Range(0), true)
        .expandLinearSelection("root")
        .insertContent(text);
}

/**
 * Notifies native-textarea integrations after a value replacement.
 *
 * @param element - Updated textarea.
 */
function dispatchValueEvents(element: HTMLTextAreaElement): void {
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
}

registerEditBoxHooks();
