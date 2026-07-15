/** Tests shared MediaWiki edit-box backends. */

import assert from "node:assert/strict";
import test from "node:test";

import { editBox } from "#shared";

const { createEditBox, registerEditBoxHooks } = editBox;

test("reads and writes a native source textarea", () => {
    const events: string[] = [];
    let focused = false;
    // noinspection JSUnusedGlobalSymbols
    const textarea = Object.assign(new EventTarget(), {
        focus() {
            focused = true;
        },
        value: "before",
    }) as unknown as HTMLTextAreaElement;
    textarea.addEventListener("input", (event) => events.push(event.type));
    textarea.addEventListener("change", (event) => events.push(event.type));

    const editor = createEditBox(textarea);
    assert.equal(editor.read(), "before");

    editor.write("after");
    editor.focus();

    assert.equal(textarea.value, "after");
    assert.deepEqual(events, ["input", "change"]);
    assert.equal(focused, true);
});

test("uses an active CodeMirror document", () => {
    const hooks = installMediaWikiHookMock();
    registerEditBoxHooks();
    const textarea = { value: "stale" } as HTMLTextAreaElement;
    const fixture = createCodeMirrorFixture(textarea);
    const { codeMirror, state } = fixture;
    hooks.get("ext.CodeMirror.ready")?.(codeMirror);

    const editor = createEditBox(textarea);
    assert.equal(editor.read(), "CodeMirror source");
    editor.write("updated source");
    editor.focus();

    assert.equal(editor.read(), "updated source");
    assert.equal(textarea.value, "stale");
    assert.equal(state.focused, true);
    hooks.get("ext.CodeMirror.toggle")?.(false, codeMirror);
    delete (globalThis as { mw?: unknown }).mw;
});

test("uses VisualEditor's active source surface without a textarea", () => {
    const fixture = createVisualEditorFixture();
    const { state, surface } = fixture;
    class Range {
        public readonly start: number;

        public constructor(start: number) {
            this.start = start;
        }
    }
    // noinspection JSUnusedGlobalSymbols
    (globalThis as { ve?: unknown }).ve = {
        Range,
        init: { target: { active: true, getSurface: () => surface } },
    };

    const editor = createEditBox(null);
    assert.equal(editor.read(), "VisualEditor source");
    editor.write("updated source");
    editor.focus();

    assert.equal(editor.read(), "updated source");
    assert.equal(state.rangeStart, 0);
    assert.equal(state.focused, true);
    delete (globalThis as { ve?: unknown }).ve;
});

/**
 * Creates a stateful CodeMirror test wrapper.
 *
 * @param textarea - Bound native textarea.
 * @returns CodeMirror wrapper and observable state.
 */
// noinspection JSUnusedGlobalSymbols
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
    const view = {
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
    const codeMirror = { isActive: true, textarea, view };
    return { codeMirror, state };
}

/**
 * Creates a stateful VisualEditor source surface.
 *
 * @returns VisualEditor surface and observable state.
 */
// noinspection JSUnusedGlobalSymbols
function createVisualEditorFixture() {
    const state = {
        focused: false,
        rangeStart: -1,
        text: "VisualEditor source",
    };
    const fragment = {
        expandLinearSelection(scope: string) {
            assert.equal(scope, "root");
            return this;
        },
        insertContent(value: string) {
            state.text = value;
        },
    };
    const model = {
        getLinearFragment(range: { start: number }, noAutoSelect: boolean) {
            state.rangeStart = range.start;
            assert.equal(noAutoSelect, true);
            return fragment;
        },
    };
    const view = {
        focus() {
            state.focused = true;
        },
    };
    const surface = {
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
// noinspection JSUnusedGlobalSymbols
function installMediaWikiHookMock(): Map<string, (...args: any[]) => void> {
    const hooks = new Map<string, (...args: any[]) => void>();
    (globalThis as { mw?: unknown }).mw = {
        hook(name: string) {
            return {
                add(callback: (...args: any[]) => void) {
                    hooks.set(name, callback);
                },
            };
        },
    };
    return hooks;
}
