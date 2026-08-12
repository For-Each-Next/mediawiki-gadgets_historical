/** Public facade for Stub Creator's wikitext capabilities. */

export {
    buildLinkText,
    buildTemplateCall,
    buildTemplateText,
    type TemplateParam,
    type TemplateParamValue,
} from "#gadget/domain/wikitext/builders.ts";
export {
    formatPrefixedValue,
    getWikilinkParts,
    getWikilinkValue,
    hasFirstLevelFieldSeparator,
    isWikilinkValue,
    parsePrefixedValue,
    splitFieldValues,
    splitLookupFieldValues,
    splitSourceUrls,
    trimValue,
    uniqueValues,
    type PrefixedValue,
    type WikilinkParts,
} from "#gadget/domain/wikitext/field-values.ts";
export {
    getReferenceDefinition,
    getReferenceEntry,
    getReferenceValues,
    type ReferenceAlias,
    type ReferenceDefinition,
    type ReferenceEntry,
} from "#gadget/domain/wikitext/reference-data.ts";
