/**
 * Adapts Codex textareas and MediaWiki CodeMirror instances.
 */

/**
 * Gets the MediaWiki ResourceLoader object when it can load CodeMirror.
 *
 * @returns ResourceLoader object.
 */
export function getCodeMirrorLoader(): any | undefined {
    if (typeof mw === "undefined" || typeof mw.loader?.using !== "function") {
        return undefined;
    }

    return mw.loader;
}

/**
 * Finds the native textarea for a Codex TextArea ref.
 *
 * @param element - Vue template ref value.
 * @returns Textarea element.
 */
export function findTextareaElement(
    element: any,
): HTMLTextAreaElement | undefined {
    if (element == null) {
        return undefined;
    }

    if (element.tagName === "TEXTAREA") {
        return element;
    }

    if (element.$el != null) {
        return findTextareaElement(element.$el);
    }

    if (typeof element.querySelector === "function") {
        return element.querySelector("textarea") || undefined;
    }

    return undefined;
}

/**
 * Reads text from a CodeMirror wrapper or its backing textarea.
 *
 * @param editor - CodeMirror editor instance.
 * @param textarea - Backing textarea.
 * @returns Current source text.
 */
export function getCodeMirrorText(
    editor: any,
    textarea: HTMLTextAreaElement,
): string {
    if (typeof editor.getValue === "function") {
        return editor.getValue();
    }

    if (typeof editor.getText === "function") {
        return editor.getText();
    }

    if (editor.view?.state?.doc != null) {
        return String(editor.view.state.doc);
    }

    return textarea.value;
}

/**
 * Writes text to a CodeMirror wrapper or its backing textarea.
 *
 * @param editor - CodeMirror editor instance.
 * @param textarea - Backing textarea.
 * @param text - Source text.
 */
export function setCodeMirrorText(
    editor: any,
    textarea: HTMLTextAreaElement,
    text: string,
): void {
    if (typeof editor.setValue === "function") {
        editor.setValue(text);
        return;
    }

    if (typeof editor.setText === "function") {
        editor.setText(text);
        return;
    }

    const view = editor.view;
    const doc = view?.state?.doc;

    if (typeof view?.dispatch === "function" && doc != null) {
        view.dispatch({
            changes: {
                from: 0,
                insert: text,
                to: doc.length,
            },
        });
        return;
    }

    textarea.value = text;
}
