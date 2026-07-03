/* eslint-disable */

/**
 * Installs styles for the create-vg-stub dialogs.
 */

const DIALOG_CSS =
    typeof __CREATE_VG_STUB_DIALOG_CSS__ === "undefined"
        ? ""
        : __CREATE_VG_STUB_DIALOG_CSS__;

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
