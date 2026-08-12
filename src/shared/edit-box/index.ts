/** Shared access to the active MediaWiki source edit box. */

import {
    findCodeMirror,
    focusCodeMirror,
    readCodeMirror,
    registerCodeMirrorHooks,
    replaceCodeMirrorSelection,
    writeCodeMirror,
    writeCodeMirrorPreservingPosition,
} from "./code-mirror.ts";
import type { EditBox, EditBoxBackend } from "./contracts.ts";
import {
    replaceNativeSelection,
    writeNative,
    writeNativePreservingPosition,
} from "./native.ts";
import {
    getVisualEditorSurface,
    writeVisualEditor,
    writeVisualEditorPreservingPosition,
} from "./visual-editor.ts";

export type {
    CodeMirrorEditor,
    EditBox,
    EditBoxBackend,
    VisualEditorFragment,
    VisualEditorSurface,
} from "./contracts.ts";

const EDIT_BOX_SELECTOR = "#wpTextbox1";
const EDIT_BOX_BACKEND_KEY = Symbol.for("mediawiki-gadgets.edit-box-backend");

/** Registers enhanced operations for one native backing textarea. */
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

/** Starts tracking MediaWiki CodeMirror instances. */
export function registerEditBoxHooks(): void {
    registerCodeMirrorHooks();
}

/** Gets an adapter for the page's active source editor. */
export function getEditBox(root: Document = document): EditBox | null {
    registerEditBoxHooks();
    const element = root.querySelector<HTMLTextAreaElement>(EDIT_BOX_SELECTOR);
    const surface = getVisualEditorSurface();
    if (element == null && surface == null) {
        return null;
    }
    return createEditBox(element);
}

/** Creates an adapter that resolves the editor for each operation. */
export function createEditBox(element: HTMLTextAreaElement | null): EditBox {
    return new ActiveEditBox(element);
}

/** Replaces editor text while retaining its selection and viewport. */
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

/** Reads the current MediaWiki source text. */
export function readEditBox(): string {
    return getEditBox()?.read() ?? "";
}

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
            return String(surface.getDom());
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
            replaceVisualEditorSelection(surface, text);
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
            writeNative(this.element, text);
        }
    }
}

function replaceVisualEditorSelection(
    surface: NonNullable<ReturnType<typeof getVisualEditorSurface>>,
    text: string,
): void {
    surface
        .getModel()
        .getFragment()
        .insertContent(text)
        .collapseToEnd()
        .select();
}

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
