/** Installs Citation Formatter styles bundled with the gadget. */

let installed = false;

/** Adds the gadget stylesheet to the page once. */
export function installCitationFormatterStyles(): void {
    if (installed) {
        return;
    }
    const css = getBundledStyles();
    if (css !== "") {
        mw.util.addCSS(css);
    }
    installed = true;
}

/** Returns the stylesheet injected by the gadget build. */
function getBundledStyles(): string {
    if (typeof __CITATION_FORMATTER_STYLES__ === "undefined") {
        return "";
    }
    return __CITATION_FORMATTER_STYLES__;
}
