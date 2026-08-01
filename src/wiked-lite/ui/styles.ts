/** Installs the build-injected wikEd Lite stylesheet once. */

import { FORMATTER_DIALOG_STYLES } from "#gadget/ui/dialogs/index.ts";

let installed = false;

/** Adds package styles through MediaWiki's nonce-aware helper. */
export function installWikEdLiteStyles(): void {
    if (installed) {
        return;
    }
    const styles =
        typeof __WIKED_LITE_STYLES__ === "undefined"
            ? ""
            : __WIKED_LITE_STYLES__;
    mw.util.addCSS(`${styles}\n${FORMATTER_DIALOG_STYLES}`);
    installed = true;
}
