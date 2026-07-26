/**
 * Browser entry point and public citation-formatter API.
 */

export {
    formatCitations,
    manageCitations,
    manageCitationsWithResult,
} from "#me/app/format.ts";
export {
    findUsedCitationTemplates,
    formatCitationWikitext,
} from "#me/domain/formatter.ts";
export { normalizeEnglishDate } from "#me/domain/citation.ts";

import { mountCitationFormatter } from "#me/ui/editor.ts";

if (typeof mw !== "undefined" && typeof mw.loader?.using === "function") {
    void mw.loader.using("mediawiki.util").then(mountCitationFormatter);
    mw.hook("ve.wikitextInteractive").add(mountCitationFormatter);
}
