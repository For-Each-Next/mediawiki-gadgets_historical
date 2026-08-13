import { attachReferenceTooltips } from "wiked-lite/ui/reference-tooltip.ts";
import { installWikEdLiteFrameStyles } from "wiked-lite/ui/styles.ts";

import "./wiked.ts";

const REFERENCE_SOURCE =
    "<ref>{{cite web|title=Example|url=https://example.test}}</ref>";

(globalThis as any).__wikedTooltip = { mount: mountReferenceTooltip };

function mountReferenceTooltip(): void {
    installWikEdLiteFrameStyles(document);
    const editor = document.createElement("div");
    const reference = document.createElement("span");
    const overlay = document.createElement("div");
    editor.className = "wiked-lite-editor";
    editor.contentEditable = "true";
    reference.dataset.reference = REFERENCE_SOURCE;
    reference.textContent = REFERENCE_SOURCE;
    reference.style.position = "absolute";
    reference.style.left = "300px";
    reference.style.top = "500px";
    reference.style.width = "120px";
    overlay.className = "wiked-lite-frame-overlay";
    editor.append(reference);
    document.body.replaceChildren(editor, overlay);
    attachReferenceTooltips({
        delay: 0,
        editor,
        getNamespaceSource: () => null,
        getSource: () => REFERENCE_SOURCE,
        overlay,
    });
}
