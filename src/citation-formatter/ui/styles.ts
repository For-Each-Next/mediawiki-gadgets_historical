/** Installs citation-manager styles bundled with the gadget. */

let installed = false;

/** Adds source-manager styles to the page once. */
export function addManagerStyles(): void {
    if (installed) {
        return;
    }
    const css = getManagerCss();
    if (css !== "") {
        mw.util.addCSS(css);
    }
    installed = true;
}

/** Gets CSS injected by the gadget build. */
function getManagerCss(): string {
    if (typeof __CITATION_FORMATTER_MANAGER_CSS__ === "undefined") {
        return "";
    }
    return __CITATION_FORMATTER_MANAGER_CSS__;
}
