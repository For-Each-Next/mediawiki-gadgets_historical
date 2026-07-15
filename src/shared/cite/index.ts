/**
 * Public API for citation acquisition and reference wikitext.
 */

export {
    buildCiteTemplate,
    buildCiteTemplateFromParts,
    buildCitoidUrl,
    fetchCiteTemplate,
    parseCiteTemplate,
    sortCitationParams,
} from "./citation.ts";
export {
    buildNamedReferenceTag,
    buildReferenceReuseTag,
    buildReferencesSection,
    nameCitationReferences,
    type CitationReference,
} from "./references.ts";
