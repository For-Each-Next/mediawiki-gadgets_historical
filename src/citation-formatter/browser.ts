/**
 * Browser entry point for the MediaWiki gadget bundle.
 */

import { start } from "#gadget/main.ts";

if (typeof mw !== "undefined" && typeof mw.loader?.using === "function") {
    mountWhenMediaWikiIsReady();
    mw.hook("ve.wikitextInteractive").add(mountWhenMediaWikiIsReady);
}

/** Loads the portlet API before mounting the editor command. */
function mountWhenMediaWikiIsReady(): void {
    void mw.loader
        .using("mediawiki.util")
        .then(start)
        .catch(function reportStartupFailure(error: unknown): void {
            console.error("Citation Formatter failed to start.", error);
        });
}
