/**
 * Browser entry point for the MediaWiki gadget bundle.
 */

import { start } from "#gadget/main.ts";
import {
    reportStartupFailure,
    startExecutionTimer,
} from "#gadget/infra/logger.ts";

const finishLoading = startExecutionTimer("loaded");
if (typeof mw !== "undefined" && typeof mw.loader?.using === "function") {
    mountWhenMediaWikiIsReady();
    mw.hook("ve.wikitextInteractive").add(mountWhenMediaWikiIsReady);
}

/** Loads the portlet API before mounting the editor command. */
function mountWhenMediaWikiIsReady(): void {
    void mw.loader
        .using("mediawiki.util")
        .then(start)
        .then(finishLoading)
        .catch(reportStartupFailure);
}
