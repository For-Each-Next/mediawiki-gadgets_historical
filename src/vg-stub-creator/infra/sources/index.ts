/**
 * Public entry point for external source adapters.
 */

export { createCitationStore, type CitationStore } from "./citation-store.ts";
export {
    fetchSourceReferences,
    prepareManagedCitationRows,
} from "./source-references.ts";
export { getEnteredSourceUrls } from "#gadget/domain/source-fields.ts";
