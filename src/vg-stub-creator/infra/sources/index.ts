/**
 * Public entry point for external source adapters.
 */

export {
    createCitationStore,
    type CitationStore,
    type CitationStoreOptions,
} from "./citation-store.ts";
export {
    fetchSourceReferences,
    prepareManagedCitationRows,
} from "./source-references.ts";
