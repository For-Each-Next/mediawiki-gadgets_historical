/** Tests shared MediaWiki edit-box backends. */

import assert from "node:assert/strict";
import test from "node:test";

import * as editBox from "#shared/edit-box";

const { createEditBox, registerEditBoxHooks } = editBox;

const testNativeTextareaBackend = () => {
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
test("reads and writes a native source textarea", testNativeTextareaBackend);

test("replaces selected and collapsed native textarea ranges", () => {
    const events: string[] = [];
    const textarea = new EventTarget() as HTMLTextAreaElement;
    textarea.value = "before";
    textarea.selectionStart = 1;
    textarea.selectionEnd = 4;
    textarea.setSelectionRange = (start: number, end: number) => {
        textarea.selectionStart = start;
        textarea.selectionEnd = end;
    };
    textarea.addEventListener("input", (event) => events.push(event.type));
    textarea.addEventListener("change", (event) => events.push(event.type));

    const editor = createEditBox(textarea);
    editor.replaceSelection("X");

    assert.equal(textarea.value, "bXre");
    assert.equal(textarea.selectionStart, 2);
    assert.equal(textarea.selectionEnd, 2);

    editor.replaceSelection("!");

    assert.equal(textarea.value, "bX!re");
    assert.equal(textarea.selectionStart, 3);
    assert.equal(textarea.selectionEnd, 3);
    assert.deepEqual(events, ["input", "change", "input", "change"]);
});

const testCodeMirrorBackend = () => {
    const hooks = installMediaWikiHookMock();
    registerEditBoxHooks();
    const textarea = { value: "stale" } as HTMLTextAreaElement;
    const fixture = createCodeMirrorFixture(textarea);
    const { codeMirror, state } = fixture;
    hooks.get("ext.CodeMirror.ready")?.(codeMirror);

    const editor = createEditBox(textarea);
    const initialText = editor.read();
    assert.equal(initialText, "CodeMirror source");
    editor.replaceSelection("Wiki");

    assert.equal(editor.read(), "CodeWiki source");
    assert.deepEqual(state.transactions[0], {
        changes: { from: 4, insert: "Wiki", to: 10 },
        scrollIntoView: true,
        selection: { anchor: 8 },
    });
    assert.deepEqual(state.selection, { from: 8, to: 8 });

    editor.write("updated source");
    editor.focus();

    const updatedText = editor.read();
    assert.equal(updatedText, "updated source");
    assert.equal(textarea.value, "stale");
    assert.equal(state.focused, true);
    hooks.get("ext.CodeMirror.toggle")?.(false, codeMirror);
    delete (globalThis as { mw?: unknown }).mw;
};
test("uses an active CodeMirror document", testCodeMirrorBackend);

const testVisualEditorBackend = () => {
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
    editor.replaceSelection("Wiki");

    assert.equal(editor.read(), "VisualWiki source");
    assert.equal(state.currentFragmentCalls, 1);
    assert.equal(state.collapsedToEnd, 1);
    assert.equal(state.selected, 1);
    assert.equal(state.selectionStart, 10);
    assert.equal(state.selectionEnd, 10);

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
    testVisualEditorBackend,
);

interface CodeMirrorTransaction {
    changes: { from: number; insert: string; to: number };
    scrollIntoView?: boolean;
    selection?: { anchor: number };
}

interface CodeMirrorFixtureState {
    focused: boolean;
    selection: { from: number; to: number };
    text: string;
    transactions: CodeMirrorTransaction[];
}

interface VisualEditorFixtureState {
    collapsedToEnd: number;
    currentFragmentCalls: number;
    focused: boolean;
    rangeStart: number;
    selected: number;
    selectionEnd: number;
    selectionStart: number;
    text: string;
}

/**
 * Creates a stateful CodeMirror test wrapper.
 *
 * @param textarea - Bound native textarea.
 * @returns CodeMirror wrapper and observable state.
 */
function createCodeMirrorFixture(textarea: HTMLTextAreaElement) {
    const state: CodeMirrorFixtureState = {
        focused: false,
        selection: { from: 4, to: 10 },
        text: "CodeMirror source",
        transactions: [],
    };
    const doc = {
        get length() {
            return state.text.length;
        },
        toString() {
            return state.text;
        },
    };
    const view: NonNullable<editBox.CodeMirrorEditor["view"]> = {
        dispatch(transaction: CodeMirrorTransaction) {
            applyCodeMirrorTransaction(state, transaction);
        },
        focus() {
            state.focused = true;
        },
        state: {
            doc,
            selection: {
                get main() {
                    return state.selection;
                },
            },
        },
    };
    const codeMirror: editBox.CodeMirrorEditor = {
        isActive: true,
        textarea,
        view,
    };
    return { codeMirror, state };
}

function applyCodeMirrorTransaction(
    state: CodeMirrorFixtureState,
    transaction: CodeMirrorTransaction,
): void {
    const { from, insert, to } = transaction.changes;
    state.transactions.push(transaction);
    state.text = state.text.slice(0, from) + insert + state.text.slice(to);
    if (transaction.selection != null) {
        state.selection = {
            from: transaction.selection.anchor,
            to: transaction.selection.anchor,
        };
    }
}

/**
 * Creates a stateful VisualEditor source surface.
 *
 * @returns VisualEditor surface and observable state.
 */
function createVisualEditorFixture() {
    const state: VisualEditorFixtureState = {
        collapsedToEnd: 0,
        currentFragmentCalls: 0,
        focused: false,
        rangeStart: -1,
        selected: 0,
        selectionEnd: 12,
        selectionStart: 6,
        text: "VisualEditor source",
    };
    const { currentFragment, rootFragment } =
        createVisualEditorFragments(state);
    function getLinearFragment(
        range: { start: number },
        noAutoSelect: boolean,
    ): editBox.VisualEditorFragment {
        state.rangeStart = range.start;
        assert.equal(noAutoSelect, true);
        return rootFragment;
    }
    function focus(): void {
        state.focused = true;
    }
    const model = {
        getFragment: () => currentFragment,
        getLinearFragment,
    };
    const view = { focus };
    const surface: editBox.VisualEditorSurface = {
        getDom: () => state.text,
        getMode: () => "source",
        getModel: () => model,
        getView: () => view,
    };
    return { state, surface };
}

function createVisualEditorFragments(state: VisualEditorFixtureState) {
    return {
        currentFragment: createCurrentVisualEditorFragment(state),
        rootFragment: createRootVisualEditorFragment(state),
    };
}

function createRootVisualEditorFragment(
    state: VisualEditorFixtureState,
): editBox.VisualEditorFragment {
    return {
        collapseToEnd() {
            return this;
        },
        expandLinearSelection(scope: string) {
            assert.equal(scope, "root");
            return this;
        },
        insertContent(value: string) {
            state.text = value;
            return this;
        },
        select() {
            return this;
        },
    };
}

function createCurrentVisualEditorFragment(
    state: VisualEditorFixtureState,
): editBox.VisualEditorFragment {
    return {
        collapseToEnd() {
            state.collapsedToEnd += 1;
            return this;
        },
        expandLinearSelection() {
            throw new Error("The current fragment should not be expanded.");
        },
        insertContent(value: string) {
            state.currentFragmentCalls += 1;
            state.text =
                state.text.slice(0, state.selectionStart) +
                value +
                state.text.slice(state.selectionEnd);
            state.selectionStart += value.length;
            state.selectionEnd = state.selectionStart;
            return this;
        },
        select() {
            state.selected += 1;
            return this;
        },
    };
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
