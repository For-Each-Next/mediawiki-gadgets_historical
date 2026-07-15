/** Public entry point for external source adapters. */

export { createCitationStore, type CitationStore } from "./citation-store.ts";
export {
    fetchSourceReferences,
    getEnteredSourceUrls,
    prepareManagedCitationRows,
} from "./source-references.ts";
