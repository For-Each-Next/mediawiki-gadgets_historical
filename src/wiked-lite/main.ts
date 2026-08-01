/** Composes the wikEd Lite browser runtime. */

import {
    applyWikiLinkRedirects,
    collectWikiLinkTitles,
    lookupWikiLinks,
} from "#gadget/infra/wiki-links.ts";
import { startEditorIntegration } from "#gadget/ui/editor.ts";

/** Starts editor discovery and the formatter portlet action. */
export function start(): void {
    startEditorIntegration({
        async findMissingLinks(source) {
            const result = await lookupWikiLinks(
                new mw.Api(),
                collectWikiLinkTitles(source),
            );
            return result.missing;
        },
        async resolveRedirects(source) {
            const result = await lookupWikiLinks(
                new mw.Api(),
                collectWikiLinkTitles(source),
            );
            return applyWikiLinkRedirects(source, result.redirects);
        },
    });
}
