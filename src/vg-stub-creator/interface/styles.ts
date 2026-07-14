/**
 * Installs styles for the vg-stub-creator dialogs.
 */

const DIALOG_CSS = selectValue(
    typeof __VG_STUB_CREATOR_DIALOG_CSS__ === "undefined",
    function trueBranch() {
        return "";
    },
    function falseBranch() {
        return __VG_STUB_CREATOR_DIALOG_CSS__;
    },
);


/**
 * Adds dialog styles to the current page.
 *
 * @returns */
export function addDialogStyles(): void {
    if (DIALOG_CSS !== "") {
        mw.util.addCSS(DIALOG_CSS);
    }
}


/**
 * Selects a lazily evaluated value for a condition.
 *
 * @param condition - Condition to evaluate.
 * @param trueBranch - Branch used when the condition is
 * true.
 * @param falseBranch - Branch used when the condition is
 * false.
 * @returns Value returned by the selected branch.
 */
function selectValue(
    condition: unknown,
    trueBranch: (...args: any[]) => any,
    falseBranch: (...args: any[]) => any,
): any {
    if (condition) {
        return trueBranch();
    }

    return falseBranch();
}
