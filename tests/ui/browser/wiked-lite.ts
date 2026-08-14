import {
    attachReferenceTooltips,
    type ReferenceTooltipController,
} from "wiked-lite/ui/reference-tooltip.ts";
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
