import {
    attachReferenceTooltips,
    type ReferenceTooltipController,
} from "wiked-lite/ui/reference-tooltip.ts";
import type { EditorServices } from "wiked-lite/contracts/editor.ts";
// eslint-disable-next-line max-len
import { createDefaultFormatterSettings } from "wiked-lite/domain/formatter-settings.ts";
import { startEditorIntegration } from "wiked-lite/ui/editor.ts";
import { installWikEdLiteFrameStyles } from "wiked-lite/ui/styles.ts";

import "./wiked.ts";

const REFERENCE_SOURCE =
    "<ref>{{cite web|title=Example|url=https://example.test}}</ref>";

let controller: ReferenceTooltipController | null = null;

(globalThis as any).__wikedTooltip = {
    disable() {
        controller?.setEnabled(false);
    },
    enable() {
        controller?.setEnabled(true);
    },
    mount: mountReferenceTooltip,
    mountFallback() {
        mountReferenceTooltip(
            '<ref name="source"/>',
            '<ref name="source">' +
                "{{cite web|title=Whole page citation}}</ref>",
        );
    },
};

(globalThis as any).__wikedEditor = {
    inspect: inspectEditor,
    mountSparse: mountSparseEditor,
    updateNativeSparse,
};

interface EditorFixtureSnapshot {
    childElementCount: number;
    editorLength: number;
    matchesNative: boolean;
    nativeLength: number;
}

async function mountSparseEditor(
    length: number,
    tail: string,
    maxLiveHighlightLength: number | null = null,
): Promise<void> {
    installEditorMediaWikiFixture();
    window.wikEd = undefined;
    window.wikEdLiteConfig = {
        highlightDelay: 0,
        referenceTooltipDelay: 0,
        ...(maxLiveHighlightLength == null ? {} : { maxLiveHighlightLength }),
    };
    const form = document.createElement("form");
    const textarea = document.createElement("textarea");
    textarea.id = "wpTextbox1";
    textarea.ariaLabel = "Wikitext editor";
    textarea.value = createSparseSource(length, tail);
    form.append(textarea);
    document.body.replaceChildren(form);
    startEditorIntegration(createEditorServices());
    await waitForEditorFrame();
}

function updateNativeSparse(length: number, tail: string): void {
    const textarea = getNativeEditor();
    textarea.value = createSparseSource(length, tail);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function createSparseSource(length: number, tail: string): string {
    const prefixLength = length - tail.length - 1;
    if (prefixLength < 0) {
        throw new Error(
            "Sparse editor source length is shorter than its tail.",
        );
    }
    return `${"x".repeat(prefixLength)}\n${tail}`;
}

function inspectEditor(): EditorFixtureSnapshot {
    const textarea = getNativeEditor();
    const editor = getEnhancedEditor();
    const editorText = editor.textContent ?? "";
    return {
        childElementCount: editor.childElementCount,
        editorLength: editorText.length,
        matchesNative: editorText === textarea.value,
        nativeLength: textarea.value.length,
    };
}

function getNativeEditor(): HTMLTextAreaElement {
    const textarea = document.getElementById("wpTextbox1");
    if (!(textarea instanceof HTMLTextAreaElement)) {
        throw new Error("Native wikEd Lite editor fixture is missing.");
    }
    return textarea;
}

function getEnhancedEditor(): HTMLElement {
    const frame =
        document.querySelector<HTMLIFrameElement>(".wiked-lite-frame");
    const editor = frame?.contentDocument?.querySelector<HTMLElement>(
        ".wiked-lite-editor",
    );
    if (editor == null) {
        throw new Error("Enhanced wikEd Lite editor fixture is missing.");
    }
    return editor;
}

function waitForEditorFrame(): Promise<void> {
    return new Promise(function wait(resolve, reject) {
        const observer = new MutationObserver(checkReady);
        const timeout = window.setTimeout(function fail(): void {
            observer.disconnect();
            reject(new Error("Timed out waiting for the wikEd Lite editor."));
        }, 5_000);
        function checkReady(): void {
            const frame = document.querySelector<HTMLIFrameElement>(
                '.wiked-lite-frame[data-wiked-ready="true"]',
            );
            if (frame?.contentDocument == null) {
                return;
            }
            window.clearTimeout(timeout);
            observer.disconnect();
            resolve();
        }
        observer.observe(document.documentElement, {
            attributes: true,
            childList: true,
            subtree: true,
        });
        checkReady();
    });
}

function installEditorMediaWikiFixture(): void {
    const mediaWiki = (globalThis as any).mw;
    const values: Record<string, unknown> = {
        cmMode: "",
        wgAction: "edit",
        wgDBname: "testwiki",
        wgPageContentModel: "wikitext",
        wgUserLanguage: "en",
        wgWikiID: "testwiki",
    };
    const hook = {
        add() {
            return hook;
        },
        remove() {
            return hook;
        },
    };
    mediaWiki.config.get = (key: string) => values[key];
    mediaWiki.hook = () => hook;
    mediaWiki.loader.using = async () => undefined;
    mediaWiki.util.addPortletLink = () => null;
}

function createEditorServices(): EditorServices {
    const settings = {
        ...createDefaultFormatterSettings(),
        referencePreviews: false,
        smallReferenceText: false,
    };
    return {
        async findMissingLinks() {
            return {
                checkedTitles: new Set<string>(),
                linkClasses: [],
                missingTitles: new Set<string>(),
            };
        },
        getHighlightOptions: () => ({}),
        isSectionEditing: () => false,
        loadFormatterSettings: () => settings,
        async loadNamespaces() {},
        async loadPageSource() {
            return "";
        },
        logger: createFixtureLogger(),
        notify() {},
        async resolveRedirects(source) {
            return source;
        },
        saveFormatterSettings() {},
    };
}

function createFixtureLogger(): EditorServices["logger"] {
    const logger: EditorServices["logger"] = {
        child() {
            return logger;
        },
        debug() {},
        error() {},
        info() {},
        isEnabled() {
            return false;
        },
        startTimer() {
            return function stopTimer(): void {};
        },
        warn() {},
    };
    return logger;
}

function mountReferenceTooltip(
    referenceSource = REFERENCE_SOURCE,
    fallbackSource: string | null = null,
): void {
    installWikEdLiteFrameStyles(document);
    const editor = document.createElement("div");
    const reference = document.createElement("span");
    const overlay = document.createElement("div");
    editor.className = "wiked-lite-editor";
    editor.contentEditable = "true";
    reference.dataset.reference = referenceSource;
    reference.textContent = referenceSource;
    reference.style.position = "absolute";
    reference.style.left = "300px";
    reference.style.top = "500px";
    reference.style.width = "120px";
    overlay.className = "wiked-lite-frame-overlay";
    editor.append(reference);
    document.body.replaceChildren(editor, overlay);
    controller = attachReferenceTooltips({
        delay: 0,
        editor,
        getFallbackSource: () => fallbackSource,
        getNamespaceSource: () => null,
        getSource: () => referenceSource,
        overlay,
    });
}
