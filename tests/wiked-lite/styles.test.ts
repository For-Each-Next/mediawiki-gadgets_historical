import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const styles = await readFile(
    new URL("../../src/wiked-lite/ui/styles.css", import.meta.url),
    "utf8",
);
const editorSource = await readFile(
    new URL("../../src/wiked-lite/ui/editor.ts", import.meta.url),
    "utf8",
);
const styleSource = await readFile(
    new URL("../../src/wiked-lite/ui/styles.ts", import.meta.url),
    "utf8",
);
const tooltipSource = await readFile(
    new URL("../../src/wiked-lite/ui/reference-tooltip.ts", import.meta.url),
    "utf8",
);

test("highlight colors retain the original wikEd palette", () => {
    assert.match(
        styles,
        /\.wiked-lite-token--html-tag\s*\{[^}]*rgb\(232, 232, 232\)/su,
    );
    assert.match(
        styles,
        /\.wiked-lite-token--reference\s*\{[^}]*rgb\(243, 225, 247\)/su,
    );
    assert.match(
        styles,
        /\.wiked-lite-token--footnote\s*\{[^}]*rgb\(230, 242, 255\)/su,
    );
    const nestedReferencePattern = new RegExp(
        String.raw`\.wiked-lite-token--footnote` +
            String.raw`\.wiked-lite-token--reference\s*\{` +
            String.raw`[^}]*rgb\(243, 225, 247\)`,
        "su",
    );
    assert.match(styles, nestedReferencePattern);
    assert.match(
        styles,
        /\.wiked-lite-token--math\s*\{[^}]*rgb\(232, 240, 255\)/su,
    );
    assert.match(
        styles,
        /\.wiked-lite-token--nowiki\s*\{[^}]*rgb\(248, 232, 232\)/su,
    );
    assert.match(
        styles,
        /\.wiked-lite-token--file[^}]*rgba\(199, 255, 149, 0\.75\)/su,
    );
});

test("magic words and module names retain wikEd colors", () => {
    assert.match(
        styles,
        /\.wiked-lite-token--parser-function\s*\{[^}]*rgb\(255, 0, 0\)/su,
    );
    assert.match(
        styles,
        /\.wiked-lite-token--module-name,[^}]*rgb\(85, 0, 153\)/su,
    );
});

test("HTML content backgrounds darken with nesting depth", () => {
    const depthColors = [
        [246, "96"],
        [228, "88"],
        [218, "83.5"],
    ] as const;
    for (const [depth, [color, backgroundWeight]] of depthColors.entries()) {
        const rule = getStyleRule(`.wiked-lite-token--html-content-${depth}`);
        assert.match(
            rule,
            new RegExp(
                `background:\\s*rgb\\(${color}, ${color}, ${color}\\)`,
                "u",
            ),
        );
        assert.ok(
            rule.includes(`var(--wiked-lite-background) ${backgroundWeight}%`),
        );
        assert.match(rule, /var\(--wiked-lite-foreground\)/u);
    }
    const cappedRule = getStyleRule(
        ".wiked-lite-token--html-content-3,\n" +
            ".wiked-lite-token--html-content-4",
        true,
    );
    assert.match(cappedRule, /rgb\(208, 208, 208\)/u);
    assert.ok(cappedRule.includes("var(--wiked-lite-background) 79%"));
    assert.match(cappedRule, /var\(--wiked-lite-foreground\)/u);
    assert.ok(
        styles.lastIndexOf(".wiked-lite-token--html-content-4") <
            styles.indexOf(".wiked-lite-token--html-tag"),
    );
});

test("heading underlines and language variants retain text styling", () => {
    const headingRules = [
        [
            ".wiked-lite-token--heading-2.wiked-lite-token--heading-text",
            "double",
        ],
        [
            ".wiked-lite-token--heading-3.wiked-lite-token--heading-text",
            "solid",
        ],
    ] as const;

    for (const [selector, decorationStyle] of headingRules) {
        const rule = getStyleRule(selector);

        assert.match(rule, /text-decoration-line:\s*underline/u);
        assert.match(
            rule,
            new RegExp(`text-decoration-style:\\s*${decorationStyle}`, "u"),
        );
        assert.match(rule, /text-underline-offset:\s*0\.2em/u);
    }
    assert.match(
        getStyleRule(".wiked-lite-token--language-variant"),
        /font-style:\s*italic/u,
    );
});

test("iframe styles include emphasis and reference popovers", () => {
    assert.match(styles, /\.wiked-lite-frame\s*\{/u);
    assert.match(
        styles,
        /\.wiked-lite-frame:not\(\[data-wiked-ready="true"\]\)/u,
    );
    assert.match(
        styles,
        /\.wiked-lite-token--bold\s*\{[^}]*font-weight:\s*bold/su,
    );
    assert.match(
        styles,
        /\.wiked-lite-token--italic\s*\{[^}]*font-style:\s*italic/su,
    );
    assert.match(styles, /\.wiked-lite-tooltip__tail\s*\{/u);
    assert.match(
        styles,
        /\.wiked-lite-tooltip__surface\s*\{[^}]*max-height:\s*44vh/su,
    );
    assert.match(styles, /\.wiked-lite-tooltip--above\s*\{/u);
    assert.match(styles, /\.wiked-lite-tooltip--below\s*\{/u);
    assert.match(styles, /\.wiked-lite-tooltip__note\s*\{/u);
});

test("the enhanced editing surface is an iframe-owned document", () => {
    assert.match(editorSource, /document\.createElement\("iframe"\)/u);
    assert.match(editorSource, /frame\.className = "wiked-editor-frame"/u);
    assert.match(editorSource, /frame\.classList\.add\("wiked-lite-frame"\)/u);
    assert.match(editorSource, /frame\.setAttribute\("aria-label", label\)/u);
    assert.match(
        editorSource,
        /<!doctype html><html><head><meta charset="UTF-8">/u,
    );
    assert.match(editorSource, /frame\.srcdoc = EDITOR_FRAME_SOURCE/u);
    assert.match(
        editorSource,
        /this\.frame\.addEventListener\("load", this\.initialize/u,
    );
    const listenerIndex = editorSource.indexOf(
        'this.frame.addEventListener("load", this.initialize',
    );
    const sourceIndex = editorSource.indexOf(
        "this.frame.srcdoc = EDITOR_FRAME_SOURCE;",
    );
    const insertionIndex = editorSource.indexOf(
        "this.textarea.before(this.frame);",
    );
    assert.ok(listenerIndex !== -1);
    assert.ok(listenerIndex < sourceIndex);
    assert.ok(sourceIndex < insertionIndex);
    assert.match(editorSource, /await loadFrameDocument\(frame, textarea\)/u);
    assert.match(editorSource, /target\.createElement\("main"\)/u);
    assert.match(
        editorSource,
        /target\.body\.replaceChildren\(editor, overlay\)/u,
    );
    assert.match(styleSource, /installWikEdLiteFrameStyles/u);
    assert.match(styleSource, /target\.head\.append\(style\)/u);
    assert.match(styleSource, /style\.nonce = styleNonce/u);
    assert.match(
        editorSource,
        /render\(false\);\s*frame\.dataset\.wikedReady = "true"/u,
    );
});

test("the ready iframe removes the native editor from Find-in-page", () => {
    const nativeRule = getStyleRule(".wiked-lite-native");
    assert.match(nativeRule, /display:\s*none\s*!important/u);
    assert.match(
        editorSource,
        /textarea\.classList\.remove\("wiked-lite-native"\)/u,
    );
    assert.match(
        editorSource,
        /textarea\.classList\.add\("wiked-lite-native"\)/u,
    );
    const managedChecks = editorSource.match(
        /isIncompatibleEditor\(textarea, true\)/gu,
    );
    const readyIndex = editorSource.indexOf(
        'frame.dataset.wikedReady = "true";',
    );
    const concealIndex = editorSource.indexOf(
        'textarea.classList.add("wiked-lite-native");',
        readyIndex,
    );
    assert.equal(managedChecks?.length, 2);
    assert.ok(readyIndex !== -1);
    assert.ok(concealIndex > readyIndex);
});

test("iframe teardown restores the native source editor", () => {
    assert.match(editorSource, /pendingEditors\.has\(textarea\)/u);
    assert.match(
        editorSource,
        /const connectionObserver = new MutationObserver/u,
    );
    assert.match(editorSource, /this\.observer = new MutationObserver/u);
    assert.match(editorSource, /EDITOR_FRAME_LOAD_TIMEOUT/u);
    assert.match(editorSource, /existing\.isAttached\(\)/u);
    assert.match(editorSource, /document\.activeElement === textarea/u);
    assert.match(editorSource, /editor\.focus\(\{ preventScroll: true \}\)/u);
    assert.match(
        editorSource,
        /textarea\.setAttribute\("aria-hidden", "true"\)/u,
    );
    assert.match(editorSource, /textarea\.setAttribute\("tabindex", "-1"\)/u);
    assert.match(
        editorSource,
        /restoreAttribute\(textarea, "aria-hidden", nativeAriaHidden\)/u,
    );
    assert.match(
        editorSource,
        /restoreAttribute\(textarea, "tabindex", nativeTabIndex\)/u,
    );
    assert.match(editorSource, /form\?\.addEventListener\("submit"/u);
    assert.match(editorSource, /flushComposition\(\)/u);
});

test("iframe teardown returns live focus and selection safely", () => {
    assert.match(
        editorSource,
        /editor\.ownerDocument\.activeElement === editor/u,
    );
    assert.match(editorSource, /\? getSelectionOffsets\(editor\)/u);
    assert.match(editorSource, /selection == null/u);
    assert.match(editorSource, /!textarea\.isConnected/u);
    assert.match(editorSource, /isIncompatibleEditor\(textarea\)/u);
    const restoreAriaIndex = editorSource.indexOf(
        'restoreAttribute(textarea, "aria-hidden", nativeAriaHidden);',
    );
    const restoreTabIndex = editorSource.indexOf(
        'restoreAttribute(textarea, "tabindex", nativeTabIndex);',
    );
    const restoreFocusIndex = editorSource.indexOf(
        "restoreNativeFocus(textarea, focusedSelection);",
    );
    assert.ok(restoreAriaIndex !== -1);
    assert.ok(restoreTabIndex !== -1);
    assert.ok(restoreFocusIndex !== -1);
    assert.ok(restoreAriaIndex < restoreFocusIndex);
    assert.ok(restoreTabIndex < restoreFocusIndex);
    const selectionIndex = editorSource.indexOf(
        "textarea.setSelectionRange(selection.start, selection.end);",
        restoreFocusIndex,
    );
    const nativeFocusIndex = editorSource.indexOf(
        "textarea.focus({ preventScroll: true });",
        selectionIndex,
    );
    assert.ok(selectionIndex !== -1);
    assert.ok(nativeFocusIndex !== -1);
    assert.ok(selectionIndex < nativeFocusIndex);
});

test("popup code preserves pending hovers and remeasures height", () => {
    assert.match(
        tooltipSource,
        /if \(popup != null\) \{\s*positionPopup\(\);\s*\}/su,
    );
    assert.match(
        tooltipSource,
        /surface\.style\.removeProperty\("max-height"\)/u,
    );
    assert.match(tooltipSource, /const renderedHeight = popup\.offsetHeight/u);
});

function getStyleRule(selector: string, last = false): string {
    const opening = `${selector} {`;
    const start = last ? styles.lastIndexOf(opening) : styles.indexOf(opening);
    const end = styles.indexOf("}", start + opening.length);

    assert.notEqual(start, -1, `Missing stylesheet rule ${selector}`);
    assert.notEqual(end, -1, `Unclosed stylesheet rule ${selector}`);
    return styles.slice(start + opening.length, end);
}
