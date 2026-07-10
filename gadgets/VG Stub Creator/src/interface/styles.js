/* eslint-disable */

/**
 * Installs styles for the vg-stub-creator dialogs.
 */

const DIALOG_CSS =
    typeof __VG_STUB_CREATOR_DIALOG_CSS__ === "undefined"
        ? ""
        : __VG_STUB_CREATOR_DIALOG_CSS__;

/**
 * Adds dialog styles to the current page.
 *
 * @returns {void}
 */
export function addDialogStyles() {
    if (DIALOG_CSS !== "") {
        mw.util.addCSS(DIALOG_CSS);
    }
}
