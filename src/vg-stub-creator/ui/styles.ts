/**
 * Installs styles for the vg-stub-creator dialogs.
 */

import { VG_STUB_CREATOR_DIALOG_STYLES } from "#gadget/ui/dialogs/index.ts";

/**
 * Adds dialog styles to the current page.
 *
 * @returns Result when the function
 *   adds dialog styles to the current page.
 */
export function addDialogStyles(): void {
    if (VG_STUB_CREATOR_DIALOG_STYLES !== "") {
        mw.util.addCSS(VG_STUB_CREATOR_DIALOG_STYLES);
    }
}
