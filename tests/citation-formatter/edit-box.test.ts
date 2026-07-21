/** Tests shared MediaWiki edit-box backends. */

import assert from "node:assert/strict";
import test from "node:test";

import { editBox } from "#shared";

const { createEditBox, registerEditBoxHooks } = editBox;

const testCallbackB = () => {
    const events: string[] = [];
    let focused = false;
    function focus(): void {
        focused = true;
    }
    const eventTarget = new EventTarget();
    const textarea = Object.assign(eventTarget, {
        focus,
        value: "before",
    }) as unknown as HTMLTextAreaElement;
    const recordEvent = (event: Event) => events.push(event.type);
    textarea.addEventListener("input", recordEvent);
    textarea.addEventListener("change", recordEvent);

    const editor = createEditBox(textarea);
    const initialText = editor.read();
    assert.equal(initialText, "before");

    editor.write("after");
    editor.focus();

    assert.equal(textarea.value, "after");
    assert.deepEqual(events, ["input", "change"]);
    assert.equal(focused, true);
};
test("reads and writes a native source textarea", testCallbackB);

const testCallbackA = () => {
    const hooks = installMediaWikiHookMock();
    registerEditBoxHooks();
    const textarea = { value: "stale" } as HTMLTextAreaElement;
    const fixture = createCodeMirrorFixture(textarea);
    const { codeMirror, state } = fixture;
    hooks.get("ext.CodeMirror.ready")?.(codeMirror);

    const editor = createEditBox(textarea);
    const initialText = editor.read();
    assert.equal(initialText, "CodeMirror source");
    editor.write("updated source");
    editor.focus();

    const updatedText = editor.read();
    assert.equal(updatedText, "updated source");
    assert.equal(textarea.value, "stale");
    assert.equal(state.focused, true);
    hooks.get("ext.CodeMirror.toggle")?.(false, codeMirror);
    delete (globalThis as { mw?: unknown }).mw;
};
test("uses an active CodeMirror document", testCallbackA);

const testCallback = () => {
    const fixture = createVisualEditorFixture();
    const { state, surface } = fixture;
    class Range {
        public readonly start: number;

        public constructor(start: number) {
            this.start = start;
        }
    }
    function getSurface(): editBox.VisualEditorSurface {
        return surface;
    }
    (globalThis as { ve?: unknown }).ve = {
        Range,
        init: { target: { active: true, getSurface } },
    };

    const editor = createEditBox(null);
    const initialText = editor.read();
    assert.equal(initialText, "VisualEditor source");
    editor.write("updated source");
    editor.focus();

    const updatedText = editor.read();
    assert.equal(updatedText, "updated source");
    assert.equal(state.rangeStart, 0);
    assert.equal(state.focused, true);
    delete (globalThis as { ve?: unknown }).ve;
};
test(
    "uses VisualEditor's active source surface without a textarea",
    testCallback,
);

/**
 * Creates a stateful CodeMirror test wrapper.
 *
 * @param textarea - Bound native textarea.
 * @returns CodeMirror wrapper and observable state.
 */
function createCodeMirrorFixture(textarea: HTMLTextAreaElement) {
    const state = { focused: false, text: "CodeMirror source" };
    const doc = {
        get length() {
            return state.text.length;
        },
        toString() {
            return state.text;
        },
    };
    const view: NonNullable<editBox.CodeMirrorEditor["view"]> = {
        dispatch(transaction: {
            changes: { from: number; insert: string; to: number };
        }) {
            assert.deepEqual(transaction.changes, {
                from: 0,
                insert: "updated source",
                to: 17,
            });
            state.text = transaction.changes.insert;
        },
        focus() {
            state.focused = true;
        },
        state: { doc },
    };
    const codeMirror: editBox.CodeMirrorEditor = {
        isActive: true,
        textarea,
        view,
    };
    return { codeMirror, state };
}

/**
 * Creates a stateful VisualEditor source surface.
 *
 * @returns VisualEditor surface and observable state.
 */
function createVisualEditorFixture() {
    const state = {
        focused: false,
        rangeStart: -1,
        text: "VisualEditor source",
    };
    const fragment: editBox.VisualEditorFragment = {
        expandLinearSelection(scope: string) {
            assert.equal(scope, "root");
            return this;
        },
        insertContent(value: string) {
            state.text = value;
        },
    };
    function getLinearFragment(
        range: { start: number },
        noAutoSelect: boolean,
    ): editBox.VisualEditorFragment {
        state.rangeStart = range.start;
        assert.equal(noAutoSelect, true);
        return fragment;
    }
    function focus(): void {
        state.focused = true;
    }
    const model = { getLinearFragment };
    const view = { focus };
    const surface: editBox.VisualEditorSurface = {
        getDom: () => state.text,
        getMode: () => "source",
        getModel: () => model,
        getView: () => view,
    };
    return { state, surface };
}

/**
 * Installs a minimal MediaWiki hook registry.
 *
 * @returns Hook callbacks keyed by hook name.
 */
function installMediaWikiHookMock(): Map<string, (...args: any[]) => void> {
    const hooks = new Map<string, (...args: any[]) => void>();
    function hook(name: string) {
        function add(callback: (...args: any[]) => void): void {
            hooks.set(name, callback);
        }
        return { add };
    }
    (globalThis as { mw?: unknown }).mw = { hook };
    return hooks;
}
