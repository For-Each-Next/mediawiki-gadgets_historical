/** Shared citation acquisition, metadata, and wikitext helpers. */

import * as wikitext from "./wikitext.ts";
import citationTemplateData from "./citation-template-data/index.ts";
import citeBookTemplateData from "./citation-template-data/cite-book.ts";
import citeWebTemplateData from "./citation-template-data/cite-web.ts";

export * from "./citoid.ts";
export * from "./language-code.ts";
export * from "./short-footnotes.ts";
export * from "./template-data.ts";
export * from "./wikitext.ts";
export type {
    CitationTemplateData,
    CitationTemplateDataMap,
} from "./citation-template-data/types.ts";

export {
    citationTemplateData,
    citeBookTemplateData,
    citeWebTemplateData,
    wikitext,
};
