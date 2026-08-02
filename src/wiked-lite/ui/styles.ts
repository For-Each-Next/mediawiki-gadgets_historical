/** Installs the build-injected wikEd Lite stylesheet once. */

import { FORMATTER_DIALOG_STYLES } from "#gadget/ui/dialogs/index.ts";

let installed = false;
let styleNonce = "";

/** Adds package styles through MediaWiki's nonce-aware helper. */
export function installWikEdLiteStyles(): void {
    if (installed) {
        return;
    }
    const sheet = mw.util.addCSS(
        `${getEditorStyles()}\n${FORMATTER_DIALOG_STYLES}`,
    );
    const owner = sheet.ownerNode;
    if (owner instanceof HTMLStyleElement) {
        styleNonce = owner.nonce;
    }
    installed = true;
}

/** Adds editor and token styles to the isolated editing document. */
export function installWikEdLiteFrameStyles(target: Document): void {
    const style = target.createElement("style");
    style.dataset.wikedLite = "editor";
    if (styleNonce !== "") {
        style.nonce = styleNonce;
    }
    style.textContent = getEditorStyles();
    target.head.append(style);
}

function getEditorStyles(): string {
    return typeof __WIKED_LITE_STYLES__ === "undefined"
        ? ""
        : __WIKED_LITE_STYLES__;
}
