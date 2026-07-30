/**
 * End-to-end citation formatting and list-defined-reference conversion.
 */

import {
    appendCitationLocator,
    cleanValue,
    formatCitationTemplate,
    getCitationIdentity,
    type CitationIdentity,
} from "./citation.ts";
import { formatGenericCitationTemplate } from "./generic-citation.ts";
import {
    captureContainerPrefixes,
    createEmptyReferenceContainer,
    findReferenceContainers,
    getContainingGroup,
    getTrailingContainerText,
    isTagInContainers,
    type ReferenceContainer,
} from "./reference-containers.ts";
import {
    escapeReferenceName,
    formatReferenceGroupAttribute,
    stripOptionalReferenceNameQuotes,
} from "./ref-attributes.ts";
import {
    getCanonicalTemplateName,
    isCitationTemplate,
    isEditableCitationTemplate,
    isMetadataFreeCitationTemplate,
    normalizeTemplateName,
} from "./templates.ts";
import type {
    CitationLayout,
    CitationTemplate,
    CitationTemplateDataMap,
    TextReplacement,
} from "./types.ts";
import {
    applyReplacements,
    findRefTags,
    findTemplateCalls,
    type ParsedTemplateCall,
    type RefTag,
} from "./wikitext.ts";
import {
    findCitationFormattingProtectedRanges,
    isInWikitextRanges,
} from "./protected-wikitext.ts";

const REFERENCE_SECTION_COMMENT = new RegExp(
    String.raw`<!--\s*(?:` +
        String.raw`§\s+(?:[\d.]+(?:\s+.*?)?|A\s+Unused references)|` +
        String.raw`Section\s+[\d.]+(?::.*?)?|Unused refs)\s*-->`,
    "gu",
);
const REFERENCE_SECTION_BANNER_COMMENT = new RegExp(
    String.raw`<!-- -* (?:` +
        String.raw`§\s+(?:[\d.]+(?:\s+.*?)?|A\s+Unused references)|` +
        String.raw`Section\s+[\d.]+(?::.*?)?|Unused refs) -* -->`,
    "gu",
);
const LEGACY_REFERENCE_SECTION_BANNER_COMMENT = new RegExp(
    String.raw`<!-- -*\r?\n---- +` +
        String.raw`(?:Section\s+[\d.]+(?::.*?)?|Unused refs) +----` +
        String.raw`\r?\n-* -->`,
    "gu",
);
const OLDER_REFERENCE_SECTION_BANNER_COMMENT =
    /<!-- -*\r?\n-* (?:Section\s+[\d.]+(?::.*?)?|Unused refs) -*\r?\n-* -->/gu;
const LEGACY_REFERENCE_SECTION_COMMENT =
    /<!--\s*==\s*(?:lead|Unused refs|.*?)\s*==\s*-->/gu;
const HTML_COMMENT = /<!--[\s\S]*?-->/gu;
const SECTION_COMMENT_WIDTH = 79;
const CITATION_MAINTENANCE_TEMPLATES = new Set(["cbignore", "dead link"]);
const LOWERCASE_ALPHABET = "abcdefghijklmnopqrstuvwxyz";

interface ReferenceDefinition {
    finalName: string;
    formattedContent: string;
    formattingStatus: ReferenceFormattingStatus;
    group: string;
    identity?: CitationIdentity;
    oldName: string;
    order: number;
    section: string;
    sectionOrder: number;
    tag: RefTag;
    trailingText: string;
}

type ReferenceFormattingStatus = "formatted" | "unsupported";

interface PlainDefinitionOptions {
    content: string;
    group: string;
    oldName: string;
    order: number;
    tag: RefTag;
    trailingText: string;
}

interface ReferenceDefinitionOptions {
    containingGroup: string;
    layout: CitationLayout;
    order: number;
    shortCitationSources: Map<string, CitationIdentity>;
    tag: RefTag;
    templateData: CitationTemplateDataMap;
    trailingText: string;
}

interface FormattedCitation {
    citation: CitationTemplate;
    identity?: CitationIdentity;
    text: string;
}

interface ReferenceCitationCalls {
    calls: ParsedTemplateCall[];
    wholeBody: boolean;
}

/**
 * Summary returned with transformed wikitext.
 */
export interface CitationFormatResult {
    citationsFormatted: number;
    individualReferencesFound: number;
    referenceCallsFound: number;
    referenceTagsRenamed: number;
    referencesNotFormatted: number;
    referencesMoved: number;
    rTemplatesFound: number;
    text: string;
}

/**
 * Returns citation template names present in ref tags.
 *
 * @param text - Source wikitext.
 * @returns Used normalized template names.
 */
export function findUsedCitationTemplates(text: string): string[] {
    return findUsedTemplateNames(
        text,
        isCitationTemplate,
        normalizeTemplateName,
    );
}

/**
 * Returns unknown Cite-prefixed template names needing live metadata.
 */
export function findUsedMetadataFreeCitationTemplates(text: string): string[] {
    return findUsedTemplateNames(
        text,
        isMetadataFreeCitationTemplate,
        getCanonicalTemplateName,
    );
}

function findUsedTemplateNames(
    text: string,
    matches: (name: string) => boolean,
    normalizeName: (name: string) => string,
): string[] {
    const protectedRanges = findCitationFormattingProtectedRanges(text);
    const calls = findTemplateCalls(text);
    const isUsedCitation = function isUsedCitation(call: ParsedTemplateCall) {
        const result =
            matches(call.name) &&
            !isInWikitextRanges(call.start, protectedRanges);
        return result;
    };
    const usedCalls = calls.filter(isUsedCitation);
    const normalizeUsedTemplateName = (call: ParsedTemplateCall) =>
        normalizeName(call.name);
    const names = usedCalls.map(normalizeUsedTemplateName);
    const uniqueNames = new Set(names);
    const result = Array.from(uniqueNames);
    return result;
}

/**
 * Formats citations and converts all full refs to list definitions.
 *
 * @param source - Article source wikitext.
 * @param templateData - Metadata for used citation templates.
 * @param layout - Citation-template output layout.
 * @param leadSectionLabel - Localized article-lead label.
 * @returns Formatted source and operation counts.
 */
// eslint-disable-next-line max-lines-per-function
export function formatCitationWikitext(
    source: string,
    templateData: CitationTemplateDataMap,
    layout: CitationLayout = "block",
    leadSectionLabel: string = "Lead",
): CitationFormatResult {
    const rTemplatesFound = countRUseTemplates(source);
    const rConverted = convertRTemplates(source);
    const protectedRanges = findCitationFormattingProtectedRanges(rConverted);
    const isUnprotectedContainer = function isUnprotectedContainer(
        container: ReferenceContainer,
    ) {
        return !isInWikitextRanges(container.start, protectedRanges);
    };
    const containers = findReferenceContainers(rConverted).filter(
        isUnprotectedContainer,
    );
    const isUnprotectedRefTag = (tag: RefTag) =>
        !isInWikitextRanges(tag.start, protectedRanges);
    const tags = findRefTags(rConverted).filter(isUnprotectedRefTag);
    captureContainerPrefixes(containers, tags, rConverted);
    const definitions = buildReferenceDefinitions(
        tags,
        containers,
        templateData,
        rConverted,
        layout,
    );
    assignReferenceSections(
        definitions,
        tags,
        containers,
        rConverted,
        leadSectionLabel,
    );
    assignCitationNames(definitions);
    assignLinkedCitationNames(definitions, rConverted, templateData);
    assignFallbackNames(definitions);
    ensureUniqueReferenceNames(definitions);
    const replacements = buildAllReplacements(tags, containers, definitions);
    let text = applyReplacements(rConverted, replacements);
    text = appendMissingReferenceContainers(text, containers, definitions);

    const result = summarizeFormatting(
        definitions,
        tags,
        containers,
        text,
        rTemplatesFound,
    );
    return result;
}

/**
 * Summarizes a completed citation-formatting pass.
 *
 * @param definitions - Reference definitions after naming.
 * @param tags - Parsed reference tags.
 * @param containers - Existing reference-list containers.
 * @param text - Transformed source wikitext.
 * @param rTemplatesFound - Number of converted R templates.
 * @returns Transformed source and operation counts.
 */
function summarizeFormatting(
    definitions: ReferenceDefinition[],
    tags: RefTag[],
    containers: ReferenceContainer[],
    text: string,
    rTemplatesFound: number,
): CitationFormatResult {
    const individual = uniqueDefinitions(definitions);
    const isTagOutsideContainers = (tag: RefTag) =>
        !isTagInContainers(tag, containers);
    const isDefinitionOutsideContainers =
        function isDefinitionOutsideContainers(
            definition: ReferenceDefinition,
        ) {
            return !isTagInContainers(definition.tag, containers);
        };
    const result: CitationFormatResult = {
        citationsFormatted: individual.filter(
            (definition) => definition.formattingStatus === "formatted",
        ).length,
        individualReferencesFound: individual.length,
        referenceCallsFound: tags.filter(isTagOutsideContainers).length,
        referenceTagsRenamed: countRenamedReferenceTags(
            tags,
            definitions,
            containers,
        ),
        referencesNotFormatted: individual.filter(
            (definition) => definition.formattingStatus === "unsupported",
        ).length,
        referencesMoved: definitions.filter(isDefinitionOutsideContainers)
            .length,
        rTemplatesFound,
        text,
    };
    return result;
}

/**
 * Counts source ref tags whose names change in the formatted output.
 *
 * Full definitions remain represented after moving to a reference list.
 * Reuse tags inside a rebuilt list do not, so they are excluded.
 */
function countRenamedReferenceTags(
    tags: RefTag[],
    definitions: ReferenceDefinition[],
    containers: ReferenceContainer[],
): number {
    const definitionsByStart = new Map(
        definitions.map((definition) => [definition.tag.start, definition]),
    );
    const oldNameMap = buildOldNameMap(definitions);
    return tags.filter(function isRenamed(tag) {
        const oldName = tag.attributes.name || "";
        const definition = definitionsByStart.get(tag.start);
        if (definition != null) {
            return definition.finalName !== oldName;
        }
        if (isTagInContainers(tag, containers)) {
            return false;
        }
        const group = tag.attributes.group || "";
        const finalName =
            oldNameMap.get(`${group}\u0000${oldName}`) ?? oldName;
        return finalName !== oldName;
    }).length;
}

/**
 * Builds reference records for every full ref tag.
 *
 * @param tags - Parsed ref tags.
 * @param containers - Reference-list containers.
 * @param templateData - Citation metadata.
 * @param source - Source wikitext.
 * @param layout - Citation-template output layout.
 * @returns Full reference definitions.
 */
function buildReferenceDefinitions(
    tags: RefTag[],
    containers: ReferenceContainer[],
    templateData: CitationTemplateDataMap,
    source: string,
    layout: CitationLayout,
): ReferenceDefinition[] {
    const hasContent = function hasContent(tag: RefTag) {
        return !tag.selfClosing && tag.content.trim() !== "";
    };
    const fullTags = tags.filter(hasContent);
    const shortCitationSources = buildShortCitationSourceMap(
        source,
        templateData,
    );
    const buildDefinition = function buildDefinition(
        tag: RefTag,
        order: number,
    ) {
        const group = getContainingGroup(tag, containers);
        const trailingText = getTrailingContainerText(
            tag,
            containers,
            fullTags,
            source,
        );
        const result = createReferenceDefinition({
            containingGroup: group,
            layout,
            order,
            shortCitationSources,
            tag,
            templateData,
            trailingText,
        });
        return result;
    };
    const result = fullTags.map(buildDefinition);
    return result;
}

/**
 * Builds tag and list-container replacements.
 *
 * @param tags - Parsed ref tags.
 * @param containers - Reference-list containers.
 * @param definitions - Full reference definitions.
 * @returns Non-overlapping replacements.
 */
function buildAllReplacements(
    tags: RefTag[],
    containers: ReferenceContainer[],
    definitions: ReferenceDefinition[],
): TextReplacement[] {
    const oldNameMap = buildOldNameMap(definitions);
    const tagReplacements = buildTagReplacements(
        tags,
        definitions,
        containers,
        oldNameMap,
    );
    const containerReplacements = buildContainerReplacements(
        containers,
        definitions,
    );
    const result = removeNestedReplacements([
        ...tagReplacements,
        ...containerReplacements,
    ]);
    return result;
}

/**
 * Builds one reference record and formats a whole citation body.
 *
 * @param options - Tag, formatting context, and container context.
 * @returns Reference definition.
 */
// eslint-disable-next-line max-lines-per-function
function createReferenceDefinition({
    containingGroup,
    layout,
    order,
    shortCitationSources,
    tag,
    templateData,
    trailingText,
}: ReferenceDefinitionOptions): ReferenceDefinition {
    const group = tag.attributes.group || containingGroup;
    const trimmed = tag.content.trim();
    const plainOptions = {
        content: trimmed,
        group,
        oldName: tag.attributes.name || "",
        order,
        tag,
        trailingText,
    };
    const citationCalls = findReferenceCitationCalls(trimmed);
    const citations = formatCitationCalls(
        citationCalls.calls,
        templateData,
        layout,
    );
    if (citations == null || citations.length === 0) {
        const identity = getShortCitationIdentity(
            trimmed,
            shortCitationSources,
        );
        if (identity != null) {
            return buildFormattedDefinition(plainOptions, trimmed, identity);
        }
        return buildIdentityFreeDefinition(
            plainOptions,
            trimmed,
            "unsupported",
        );
    }
    const content = replaceCitationCalls(
        trimmed,
        citationCalls.calls,
        citations,
    );
    if (!citationCalls.wholeBody) {
        return buildIdentityFreeDefinition(plainOptions, content, "formatted");
    }
    const allHaveIdentity = citations.every(
        (citation) => citation.identity != null,
    );
    if (citations.length > 1 && allHaveIdentity) {
        return buildBundledDefinition(plainOptions, citations);
    }
    const identity = citations[0].identity;
    if (citations.length > 1 || identity == null) {
        return buildIdentityFreeDefinition(plainOptions, content, "formatted");
    }
    return buildFormattedDefinition(plainOptions, content, identity);
}

/**
 * Formats citation calls while retaining surrounding reference text.
 *
 * @param content - Complete trimmed reference body.
 * @param calls - Citation calls within the body.
 * @param formatted - Formatted citation calls.
 * @returns Formatted body retaining surrounding maintenance templates.
 */
function replaceCitationCalls(
    content: string,
    calls: ParsedTemplateCall[],
    formatted: FormattedCitation[],
): string {
    const replacements = calls.map((call, index) => ({
        end: call.end,
        start: call.start,
        text: formatted[index].text,
    }));
    const result = applyReplacements(content, replacements);
    return result;
}

/**
 * Formats supported citation calls or rejects the whole set.
 *
 * @param calls - Whole-body citation calls.
 * @param templateData - Citation metadata.
 * @param layout - Citation-template output layout.
 * @returns Formatted citations, or undefined when one is unsupported.
 */
function formatCitationCalls(
    calls: ParsedTemplateCall[],
    templateData: CitationTemplateDataMap,
    layout: CitationLayout,
): FormattedCitation[] | undefined {
    const result: FormattedCitation[] = [];
    for (const call of calls) {
        if (isCitationTemplate(call.name)) {
            const metadata = templateData[normalizeTemplateName(call.name)];
            if (metadata == null) {
                return undefined;
            }
            const formatted = formatCitationTemplate(
                call.raw,
                metadata,
                layout,
            );
            result.push({
                ...formatted,
                identity: getCitationIdentity(formatted.citation),
            });
            continue;
        }
        if (!isMetadataFreeCitationTemplate(call.name)) {
            return undefined;
        }
        const metadata = templateData[getCanonicalTemplateName(call.name)];
        const formatted = formatGenericCitationTemplate(
            call.raw,
            layout,
            metadata,
        );
        result.push(formatted);
    }
    return result;
}

/**
 * Indexes citation templates that define an explicit CITEREF anchor.
 *
 * @param source - Complete article wikitext.
 * @param templateData - Citation metadata.
 * @returns Citation identities keyed by normalized anchor.
 */
function buildShortCitationSourceMap(
    source: string,
    templateData: CitationTemplateDataMap,
): Map<string, CitationIdentity> {
    const result = new Map<string, CitationIdentity>();
    const protectedRanges = findCitationFormattingProtectedRanges(source);
    for (const call of findTemplateCalls(source)) {
        if (
            !isCitationTemplate(call.name) ||
            isInWikitextRanges(call.start, protectedRanges)
        ) {
            continue;
        }
        const metadata = templateData[normalizeTemplateName(call.name)];
        if (metadata == null) {
            continue;
        }
        const refParam = call.params.find(function isRefParam(param) {
            const name = param.name.toLocaleLowerCase("en-US");
            return !param.positional && name === "ref";
        });
        if (refParam == null) {
            continue;
        }
        const anchor = normalizeShortCitationAnchor(refParam.value);
        if (!anchor.startsWith("citeref ")) {
            continue;
        }
        const formatted = formatCitationTemplate(call.raw, metadata);
        const identity = getCitationIdentity(formatted.citation);
        result.set(anchor, identity);
    }
    return result;
}

/**
 * Resolves a whole short-citation link to its source identity.
 *
 * @param content - Complete reference body.
 * @param sourceMap - Citation identities keyed by normalized anchor.
 * @returns Source identity with the short citation's locator.
 */
function getShortCitationIdentity(
    content: string,
    sourceMap: Map<string, CitationIdentity>,
): CitationIdentity | null {
    const linked = parseLinkedCitation(content);
    if (linked == null) {
        return null;
    }
    const anchor = normalizeShortCitationAnchor(linked.target);
    const sourceIdentity = sourceMap.get(anchor);
    if (sourceIdentity == null) {
        return null;
    }
    return {
        ...sourceIdentity,
        forceLocator: true,
        locator: linked.locator,
    };
}

/**
 * Normalizes a CITEREF link target for source lookup.
 *
 * @param value - Entered anchor or ref value.
 * @returns Case-insensitive, space-normalized anchor.
 */
function normalizeShortCitationAnchor(value: string): string {
    return value
        .replace(/_/gu, " ")
        .replace(/\s+/gu, " ")
        .trim()
        .toLocaleLowerCase("en-US");
}

/**
 * Builds a multiline cite-bundle definition and combined APA key.
 *
 * @param options - Shared reference definition fields.
 * @param citations - Formatted bundled citations.
 * @returns Bundled reference definition.
 */
function buildBundledDefinition(
    options: PlainDefinitionOptions,
    citations: FormattedCitation[],
): ReferenceDefinition {
    const identities = getBundledIdentities(citations);
    const formatIdentityName = function formatIdentityName(
        identity: CitationIdentity,
    ) {
        return appendCitationLocator(identity.baseName, identity.locator);
    };
    const names = identities.map(formatIdentityName);
    const signatures = identities.map((item) => item.sourceSignature);
    const identity: CitationIdentity = {
        author: identities.map((item) => item.author).join("; "),
        baseName: names.join("; "),
        locator: "",
        sourceSignature: JSON.stringify(signatures),
        year: identities.map((item) => item.year).join("; "),
    };
    const content = formatCitationBundle(citations);
    const result = buildFormattedDefinition(options, content, identity);
    return result;
}

/**
 * Adds initials when bundled citations contain equal author keys.
 *
 * @param citations - Formatted bundled citations.
 * @returns Disambiguated citation identities.
 */
function getBundledIdentities(
    citations: FormattedCitation[],
): CitationIdentity[] {
    const getIdentity = function getIdentity(item: FormattedCitation) {
        return getCitationIdentity(item.citation);
    };
    const identities = citations.map(getIdentity);
    const groupByFirstAuthor = function groupByFirstAuthor(
        identity: CitationIdentity,
    ) {
        return getFirstAuthorKey(identity.author);
    };
    const counts = Map.groupBy(identities, groupByFirstAuthor);
    const disambiguateIdentity = function disambiguateIdentity(
        item: FormattedCitation,
        index: number,
    ) {
        const identity = identities[index];
        const key = getFirstAuthorKey(identity.author);
        let disambiguated = identity;
        if ((counts.get(key)?.length || 0) > 1) {
            disambiguated = getCitationIdentity(item.citation, true);
        }
        return disambiguated;
    };
    const result = citations.map(disambiguateIdentity);
    return result;
}

/**
 * Gets the first family name from a formatted author key.
 *
 * @param author - Formatted author component.
 * @returns First family-name key.
 */
function getFirstAuthorKey(author: string): string {
    return author.split(/ & | et al\.$/u, 1)[0];
}

/**
 * Serializes a multiline unbulleted citation bundle.
 *
 * @param citations - Formatted bundled citations.
 * @returns Cite-bundle wikitext.
 */
function formatCitationBundle(citations: FormattedCitation[]): string {
    const formatItem = function formatItem(
        item: FormattedCitation,
        index: number,
    ) {
        const indented = item.text.replace(/\n/gu, "\n    ");
        return `  | ${index + 1} = ${indented}`;
    };
    const items = citations.map(formatItem);
    return ["{{Unbulleted list citebundle", ...items, "}}"].join("\n");
}

/**
 * Builds a formatted citation definition.
 *
 * @param options - Shared reference definition fields.
 * @param content - Formatted citation content.
 * @param identity - Semantic citation identity.
 * @returns Formatted reference definition.
 */
function buildFormattedDefinition(
    options: PlainDefinitionOptions,
    content: string,
    identity: CitationIdentity,
): ReferenceDefinition {
    const result: ReferenceDefinition = {
        finalName: identity.baseName,
        formattedContent: content,
        formattingStatus: "formatted",
        group: options.group,
        identity,
        oldName: options.oldName,
        order: options.order,
        section: "",
        sectionOrder: Number.MAX_SAFE_INTEGER,
        tag: options.tag,
        trailingText: options.trailingText,
    };
    return result;
}

/**
 * Builds a formatted or unsupported definition without an identity.
 *
 * @param options - Shared definition fields.
 * @param content - Preserved or generically formatted reference text.
 * @param formattingStatus - Summary classification.
 * @returns Identity-free reference definition.
 */
function buildIdentityFreeDefinition(
    options: PlainDefinitionOptions,
    content: string,
    formattingStatus: ReferenceFormattingStatus,
): ReferenceDefinition {
    const { group, oldName, order, tag, trailingText } = options;
    const result: ReferenceDefinition = {
        finalName: "",
        formattedContent: content,
        formattingStatus,
        group,
        oldName,
        order,
        section: "",
        sectionOrder: Number.MAX_SAFE_INTEGER,
        tag,
        trailingText,
    };
    return result;
}

/**
 * Assigns definitions to article sections by their earliest prose use.
 *
 * @param definitions - Mutable reference definitions.
 * @param tags - Parsed reference tags.
 * @param containers - Reference-list containers.
 * @param source - Article source wikitext.
 * @param leadSectionLabel - Localized article-lead label.
 */
function assignReferenceSections(
    definitions: ReferenceDefinition[],
    tags: RefTag[],
    containers: ReferenceContainer[],
    source: string,
    leadSectionLabel: string,
): void {
    const headings = findSectionHeadings(source);
    for (const definition of definitions) {
        const position = getDefinitionUsePosition(
            definition,
            tags,
            containers,
        );
        definition.sectionOrder = position;
        if (position === Number.MAX_SAFE_INTEGER) {
            definition.section = "§ A Unused references";
        } else {
            definition.section = getSectionAtPosition(
                position,
                headings,
                leadSectionLabel,
            );
        }
    }
}

interface SectionHeading {
    label: string;
    start: number;
}

/**
 * Finds active section headings in source order.
 *
 * @param source - Article source wikitext.
 * @returns Section heading positions and names.
 */
function findSectionHeadings(source: string): SectionHeading[] {
    const protectedRanges = findCitationFormattingProtectedRanges(source);
    const headings: SectionHeading[] = [];
    const counters = [0, 0, 0, 0, 0];
    const pattern = /^(={2,6})\s*(.*?)\s*\1\s*$/gmu;
    for (const match of source.matchAll(pattern)) {
        const start = match.index || 0;
        if (isInWikitextRanges(start, protectedRanges)) {
            continue;
        }
        const depth = match[1].length - 2;
        counters[depth] += 1;
        counters.fill(0, depth + 1);
        const number = counters.slice(0, depth + 1).join(".");
        const name = match[2].trim();
        headings.push({ label: `§ ${number} ${name}`, start });
    }
    return headings;
}

/**
 * Finds the earliest prose use of a definition.
 *
 * @param definition - Reference definition.
 * @param tags - Parsed reference tags.
 * @param containers - Reference-list containers.
 * @returns Source position, or max-safe integer when unused.
 */
function getDefinitionUsePosition(
    definition: ReferenceDefinition,
    tags: RefTag[],
    containers: ReferenceContainer[],
): number {
    if (!isTagInContainers(definition.tag, containers)) {
        return definition.tag.start;
    }
    if (definition.oldName === "") {
        return Number.MAX_SAFE_INTEGER;
    }
    const isMatchingReuse = function isMatchingReuse(tag: RefTag) {
        const group = tag.attributes.group || "";
        const result =
            !isTagInContainers(tag, containers) &&
            tag.attributes.name === definition.oldName &&
            group === definition.group;
        return result;
    };
    const reuse = tags.find(isMatchingReuse);
    return reuse?.start ?? Number.MAX_SAFE_INTEGER;
}

/**
 * Resolves a source position to its nearest preceding section.
 *
 * @param position - Source offset.
 * @param headings - Article section headings.
 * @param leadSectionLabel - Localized article-lead label.
 * @returns Numbered section label or lead section.
 */
function getSectionAtPosition(
    position: number,
    headings: SectionHeading[],
    leadSectionLabel: string,
): string {
    const heading = headings.findLast(
        (candidate) => candidate.start < position,
    );
    return heading?.label || `§ 0 ${leadSectionLabel}`;
}

/**
 * Names plain linked citations from citation templates with
 * explicit refs.
 *
 * @param definitions - Mutable reference definitions.
 * @param source - Complete article wikitext.
 * @param templateData - Citation metadata.
 */
function assignLinkedCitationNames(
    definitions: ReferenceDefinition[],
    source: string,
    templateData: CitationTemplateDataMap,
): void {
    const identities = buildExplicitCitationRefMap(source, templateData);
    for (const definition of definitions) {
        if (definition.identity != null || definition.finalName !== "") {
            continue;
        }
        const linked = parseLinkedCitation(definition.formattedContent);
        if (linked == null) {
            continue;
        }
        const key = normalizeCitationRefKey(linked.target);
        const identity = identities.get(key);
        if (identity == null) {
            continue;
        }
        definition.finalName = appendCitationLocator(
            identity.baseName,
            linked.locator,
        );
    }
}

/**
 * Indexes citation identities by their explicit ref parameters.
 *
 * @param source - Complete article wikitext.
 * @param templateData - Citation metadata.
 * @returns Citation identities keyed by normalized ref value.
 */
function buildExplicitCitationRefMap(
    source: string,
    templateData: CitationTemplateDataMap,
): Map<string, CitationIdentity> {
    const result = new Map<string, CitationIdentity>();
    const protectedRanges = findCitationFormattingProtectedRanges(source);
    for (const call of findTemplateCalls(source)) {
        if (isInWikitextRanges(call.start, protectedRanges)) {
            continue;
        }
        if (!isCitationTemplate(call.name)) {
            continue;
        }
        const name = normalizeTemplateName(call.name);
        const metadata = templateData[name];
        if (metadata == null) {
            continue;
        }
        const formatted = formatCitationTemplate(call.raw, metadata);
        const entries = formatted.citation.params.map((param) => [
            param.name,
            param.value,
        ]);
        const values = Object.fromEntries(entries) as Record<string, string>;
        const enteredRef = values.ref?.trim() || "";
        if (enteredRef === "") {
            continue;
        }
        const key = normalizeCitationRefKey(enteredRef);
        if (!result.has(key)) {
            result.set(key, getCitationIdentity(formatted.citation));
        }
    }
    return result;
}

/**
 * Parses a reference body containing only an internal citation link.
 *
 * @param content - Complete reference body.
 * @returns Link target and cleaned locator.
 */
function parseLinkedCitation(
    content: string,
): { locator: string; target: string } | null {
    const match = content.match(
        /^\s*\[\[\s*#([^|\]]+)(?:\|[^\]]*)?\]\]\s*(?:,\s*)?([\s\S]*?)\s*$/u,
    );
    if (match == null) {
        return null;
    }
    const locator = cleanValue(match[2]).replace(/^[,;:]\s*/u, "");
    return { locator, target: match[1] };
}

/**
 * Normalizes a citation ref value for link-target lookup.
 *
 * @param value - Entered ref value or link target.
 * @returns Case-insensitive underscore-normalized key.
 */
function normalizeCitationRefKey(value: string): string {
    return value
        .trim()
        .replace(/^#/u, "")
        .replace(/[\s_]+/gu, "_")
        .toLocaleLowerCase("en-US");
}

/**
 * Assigns colon-prefixed names to unparseable notes.
 *
 * @param definitions - Mutable reference definitions.
 */
function assignFallbackNames(definitions: ReferenceDefinition[]): void {
    let anonymousIndex = 0;
    const reservedNames = new Set<string>();
    for (const definition of definitions) {
        if (definition.oldName !== "") {
            reservedNames.add(definition.oldName);
        }
        if (definition.finalName !== "") {
            reservedNames.add(definition.finalName);
        }
    }
    definitions
        .filter(function isPlainDefinition(definition) {
            return definition.identity == null;
        })
        .sort(compareReferenceOrder)
        .forEach(function assignFallback(definition) {
            if (definition.finalName !== "") {
                return;
            }
            if (definition.oldName !== "") {
                definition.finalName = definition.oldName;
                return;
            }
            let name: string;
            do {
                anonymousIndex += 1;
                name = `:${anonymousIndex}`;
            } while (reservedNames.has(name));
            definition.finalName = name;
            reservedNames.add(name);
        });
}

/**
 * Finds top-level editable citations and checks ref-body coverage.
 *
 * @param text - Trimmed ref content.
 * @returns Calls plus whole-body coverage.
 */
function findReferenceCitationCalls(text: string): ReferenceCitationCalls {
    const isCitationCall = function isCitationCall(call: ParsedTemplateCall) {
        return isEditableCitationTemplate(call.name);
    };
    const candidates = findTemplateCalls(text).filter(isCitationCall);
    const isTopLevel = function isTopLevel(candidate: ParsedTemplateCall) {
        const result = !isNestedTemplateCall(candidate, candidates);
        return result;
    };
    const calls = candidates.filter(isTopLevel);
    let cursor = 0;
    const gaps: string[] = [];
    for (const call of calls) {
        const gap = text.slice(cursor, call.start);
        gaps.push(gap);
        cursor = call.end;
    }
    const trailing = text.slice(cursor);
    gaps.push(trailing);
    const isWhitespace = (gap: string) => gap.trim() === "";
    const onlyWhitespace = gaps.every(isWhitespace);
    const onlyMaintenance =
        calls.length === 1 && gaps.every(isCitationMaintenanceText);
    return { calls, wholeBody: onlyWhitespace || onlyMaintenance };
}

/**
 * Checks whether text contains only citation maintenance templates.
 *
 * @param text - Text adjacent to a citation call.
 * @returns Whether no prose or unsupported templates are present.
 */
function isCitationMaintenanceText(text: string): boolean {
    const allCalls = findTemplateCalls(text);
    const isTopLevel = function isTopLevel(call: ParsedTemplateCall) {
        const nested = isNestedTemplateCall(call, allCalls);
        return !nested;
    };
    const calls = allCalls.filter(isTopLevel);
    let cursor = 0;
    for (const call of calls) {
        const normalizedName = normalizeTemplateName(call.name);
        if (
            text.slice(cursor, call.start).trim() !== "" ||
            !CITATION_MAINTENANCE_TEMPLATES.has(normalizedName)
        ) {
            return false;
        }
        cursor = call.end;
    }
    return text.slice(cursor).trim() === "";
}

/**
 * Checks whether one parsed call is contained by another.
 *
 * @param call - Candidate child call.
 * @param calls - Calls from the same wikitext fragment.
 * @returns Whether the candidate is nested.
 */
function isNestedTemplateCall(
    call: ParsedTemplateCall,
    calls: ParsedTemplateCall[],
): boolean {
    for (const other of calls) {
        if (
            other !== call &&
            call.start >= other.start &&
            call.end <= other.end
        ) {
            return true;
        }
    }
    return false;
}

/**
 * Assigns author/date, year-letter, and locator names.
 *
 * @param definitions - Mutable reference definitions.
 */
function assignCitationNames(definitions: ReferenceDefinition[]): void {
    const citationDefinitions = definitions
        .filter(isCitationDefinition)
        .sort(compareReferenceOrder);
    const baseGroups = Map.groupBy(
        citationDefinitions,
        function getBaseGroup(definition) {
            return `${definition.group}\u0000${definition.identity?.baseName}`;
        },
    );

    for (const groupedDefinitions of baseGroups.values()) {
        const signatureGroups = Map.groupBy(
            groupedDefinitions,
            (definition) => definition.identity?.sourceSignature || "",
        );
        const signatureEntries = signatureGroups.entries();
        const signatures = Array.from(signatureEntries).sort(
            (left, right) => left[1][0].order - right[1][0].order,
        );
        const needsYearSuffix = signatures.length > 1;
        for (let index = 0; index < signatures.length; index += 1) {
            const sameSource = signatures[index][1];
            assignSameSourceNames(sameSource, index, needsYearSuffix);
        }
    }
}

/**
 * Assigns suffixes and locators to definitions sharing one source.
 *
 * @param definitions - Definitions with the same source signature.
 * @param index - Zero-based signature index within the base-name group.
 * @param needsYearSuffix - Whether distinct sources share the
 *   base name.
 */
function assignSameSourceNames(
    definitions: ReferenceDefinition[],
    index: number,
    needsYearSuffix: boolean,
): void {
    const firstIdentity = definitions[0].identity as CitationIdentity;
    const locatorValues = definitions.map(getDefinitionLocator);
    const locators = new Set(locatorValues);
    const forceLocator = definitions.some(
        (definition) => definition.identity?.forceLocator === true,
    );
    const needsLocator = locators.size > 1 || forceLocator;
    const separator = firstIdentity.year === "n.d." ? "-" : "";
    let suffix = "";
    if (needsYearSuffix) {
        suffix = `${separator}${alphabeticSuffix(index)}`;
    }

    for (const definition of definitions) {
        const identity = definition.identity as CitationIdentity;
        const locator = needsLocator ? identity.locator : "";
        definition.finalName = appendCitationLocator(
            `${identity.baseName}${suffix}`,
            locator,
        );
    }
}

/**
 * Checks whether a reference definition has citation identity metadata.
 *
 * @param definition - Reference definition.
 * @returns Whether citation identity metadata is present.
 */
function isCitationDefinition(definition: ReferenceDefinition): boolean {
    return definition.identity != null;
}

/**
 * Gets the locator from a citation reference definition.
 *
 * @param definition - Citation reference definition.
 * @returns Citation locator.
 */
function getDefinitionLocator(definition: ReferenceDefinition): string {
    return (definition.identity as CitationIdentity).locator;
}

/**
 * Converts an index to a, b, ... z, aa suffixes.
 *
 * @param index - Zero-based source index.
 * @returns Alphabetic suffix.
 */
function alphabeticSuffix(index: number): string {
    let value = index;
    let result = "";
    do {
        const position = value % LOWERCASE_ALPHABET.length;
        result = LOWERCASE_ALPHABET[position] + result;
        value = Math.floor(value / LOWERCASE_ALPHABET.length) - 1;
    } while (value >= 0);
    return result;
}

/**
 * Disambiguates equal names that have different content.
 *
 * @param definitions - Mutable reference definitions.
 */
function ensureUniqueReferenceNames(definitions: ReferenceDefinition[]): void {
    const seen = new Map<string, string>();
    const counters = new Map<string, number>();
    for (const definition of definitions) {
        const key = `${definition.group}\u0000${definition.finalName}`;
        const priorContent = seen.get(key);
        if (
            priorContent == null ||
            priorContent === definition.formattedContent
        ) {
            seen.set(key, definition.formattedContent);
            continue;
        }
        const next = (counters.get(key) || 1) + 1;
        counters.set(key, next);
        definition.finalName = `${definition.finalName} ${next}`;
        seen.set(
            `${definition.group}\u0000${definition.finalName}`,
            definition.formattedContent,
        );
    }
}

/**
 * Maps old group/name pairs to generated names.
 *
 * @param definitions - Reference definitions.
 * @returns Old-to-new name map.
 */
function buildOldNameMap(
    definitions: ReferenceDefinition[],
): Map<string, string> {
    const result = new Map<string, string>();
    for (const definition of definitions) {
        if (definition.oldName !== "") {
            result.set(
                `${definition.group}\u0000${definition.oldName}`,
                definition.finalName,
            );
        }
    }
    return result;
}

/**
 * Replaces body definitions and updates reuse names.
 *
 * @param tags - Parsed ref tags.
 * @param definitions - Full reference definitions.
 * @param containers - Reference-list containers.
 * @param oldNameMap - Old-to-new reference names.
 * @returns Ref-tag replacements.
 */
function buildTagReplacements(
    tags: RefTag[],
    definitions: ReferenceDefinition[],
    containers: ReferenceContainer[],
    oldNameMap: Map<string, string>,
): TextReplacement[] {
    const definitionEntries = definitions.map(
        function indexDefinition(definition) {
            return [definition.tag.start, definition] as const;
        },
    );
    const definitionsByStart = new Map(definitionEntries);
    const isBodyTag = function isBodyTag(tag: RefTag) {
        return !isTagInContainers(tag, containers);
    };
    const buildTagReplacement = function buildTagReplacement(tag: RefTag) {
        const group = tag.attributes.group || "";
        const definition = definitionsByStart.get(tag.start);
        if (definition != null) {
            const result = {
                end: tag.end,
                start: tag.start,
                text: buildReuseTag(definition.finalName, group),
            };
            return result;
        }
        const oldName = tag.attributes.name || "";
        const name = oldNameMap.get(`${group}\u0000${oldName}`) || oldName;
        const result = {
            end: tag.end,
            start: tag.start,
            text: name === "" ? tag.raw : buildReuseTag(name, group),
        };
        return result;
    };
    const result = tags.filter(isBodyTag).map(buildTagReplacement);
    return result;
}

/**
 * Rebuilds the first reference-list container for each group.
 *
 * @param containers - Reference-list containers.
 * @param definitions - Full reference definitions.
 * @returns Container replacements.
 */
function buildContainerReplacements(
    containers: ReferenceContainer[],
    definitions: ReferenceDefinition[],
): TextReplacement[] {
    const firstByGroup = new Set<string>();
    const buildContainerReplacement = function buildContainerReplacement(
        container: ReferenceContainer,
    ) {
        const isFirst = !firstByGroup.has(container.group);
        firstByGroup.add(container.group);
        let text = "";
        if (isFirst) {
            const grouped = definitions.filter(function hasGroup(definition) {
                return definition.group === container.group;
            });
            const unique = uniqueDefinitions(grouped);
            text = buildReferenceContainer(container, unique);
        }
        return { end: container.end, start: container.start, text };
    };
    const result = containers.map(buildContainerReplacement);
    return result;
}

/**
 * Removes duplicate name/content definitions in source order.
 *
 * @param definitions - Reference definitions.
 * @returns Unique reference definitions.
 */
function uniqueDefinitions(
    definitions: ReferenceDefinition[],
): ReferenceDefinition[] {
    const seen = new Set<string>();
    const isFirstDefinition = function isFirstDefinition(
        definition: ReferenceDefinition,
    ) {
        const key = [definition.finalName, definition.formattedContent].join(
            "\u0000",
        );
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    };
    const result = definitions.filter(isFirstDefinition);
    return result;
}

/**
 * Builds a native references tag.
 *
 * @param container - Target container.
 * @param definitions - Group definitions.
 * @returns List-defined-reference container.
 */
function buildReferenceContainer(
    container: ReferenceContainer,
    definitions: ReferenceDefinition[],
): string {
    const rows = buildSectionedDefinitionRows(container, definitions);
    const comments = getContainerGeneralComments(container, definitions);
    const group = formatReferenceGroupAttribute(container.group);
    if (rows === "") {
        return [`<references${group} responsive />`, ...comments].join("\n");
    }
    const parts = [
        `<references${group} responsive>\n`,
        rows,
        "",
        "</references>",
        ...comments,
    ];
    return parts.join("\n");
}

/**
 * Collects list-body comments for output after the list.
 *
 * @param container - Source reference container.
 * @param definitions - Definitions rendered in the container.
 * @returns Non-navigation HTML comments in source order.
 */
function getContainerGeneralComments(
    container: ReferenceContainer,
    definitions: ReferenceDefinition[],
): string[] {
    const values = [
        container.prefixText,
        ...definitions.map((definition) => definition.trailingText),
    ];
    const findGeneralComments = function findGeneralComments(value: string) {
        const matches = value.matchAll(HTML_COMMENT);
        const comments = Array.from(matches, ([comment]) => comment);
        const general = comments.filter(isGeneralReferenceComment);
        return general;
    };
    const result = values.flatMap(findGeneralComments);
    return result;
}

/**
 * Checks whether an HTML comment is general reference-list content.
 *
 * @param comment - HTML comment text.
 * @returns Whether the comment is not reference-section navigation.
 */
function isGeneralReferenceComment(comment: string): boolean {
    return !isReferenceSectionComment(comment);
}

/**
 * Builds section-labeled definition rows for one reference list.
 *
 * @param container - Target reference container.
 * @param definitions - Group definitions.
 * @returns Sectioned list body.
 */
function buildSectionedDefinitionRows(
    container: ReferenceContainer,
    definitions: ReferenceDefinition[],
): string {
    const prefix = stripReferenceSectionComments(container.prefixText).trim();
    const sorted = [...definitions].sort(compareReferenceOrder);
    const groups = Map.groupBy(sorted, (definition) => definition.section);
    const buildSection = function buildSection([name, items]: [
        string,
        ReferenceDefinition[],
    ]) {
        const rows = items.map(buildDefinitionTag).join("\n");
        return `${formatReferenceSectionBanner(name)}\n\n${rows}`;
    };
    const sections = Array.from(groups, buildSection);
    return [prefix, ...sections].filter(Boolean).join("\n\n");
}

/**
 * Sorts by first use and retains source order for exact ties.
 *
 * @param left - Left definition.
 * @param right - Right definition.
 * @returns Sort comparison.
 */
function compareReferenceOrder(
    left: ReferenceDefinition,
    right: ReferenceDefinition,
): number {
    const byFirstUse = left.sectionOrder - right.sectionOrder;
    return byFirstUse || left.order - right.order;
}

/**
 * Builds a centered reference section marker.
 *
 * @param name - Numbered section label.
 * @returns A 79-column HTML comment containing the section marker.
 */
function formatReferenceSectionBanner(name: string): string {
    const label = ` ${name} `;
    const delimiters = "<!--  -->".length;
    const available = SECTION_COMMENT_WIDTH - delimiters - label.length;
    const fill = Math.max(0, available);
    const left = Math.floor(fill / 2);
    const right = fill - left;
    return `<!-- ${"-".repeat(left)}${label}${"-".repeat(right)} -->`;
}

/**
 * Removes section-navigation comments before regenerating them.
 *
 * @param value - Existing reference-list text.
 * @returns Text without section-navigation comments.
 */
function stripReferenceSectionComments(value: string): string {
    const result = value
        .replace(REFERENCE_SECTION_BANNER_COMMENT, "")
        .replace(LEGACY_REFERENCE_SECTION_BANNER_COMMENT, "")
        .replace(OLDER_REFERENCE_SECTION_BANNER_COMMENT, "")
        .replace(REFERENCE_SECTION_COMMENT, "")
        .replace(LEGACY_REFERENCE_SECTION_COMMENT, "")
        .replace(HTML_COMMENT, "");
    return result;
}

/**
 * Checks whether a comment is generated reference-section navigation.
 *
 * @param comment - Complete HTML comment.
 * @returns Whether the comment is a generated section marker.
 */
function isReferenceSectionComment(comment: string): boolean {
    REFERENCE_SECTION_BANNER_COMMENT.lastIndex = 0;
    LEGACY_REFERENCE_SECTION_BANNER_COMMENT.lastIndex = 0;
    OLDER_REFERENCE_SECTION_BANNER_COMMENT.lastIndex = 0;
    REFERENCE_SECTION_COMMENT.lastIndex = 0;
    LEGACY_REFERENCE_SECTION_COMMENT.lastIndex = 0;
    const patterns = [
        REFERENCE_SECTION_BANNER_COMMENT,
        LEGACY_REFERENCE_SECTION_BANNER_COMMENT,
        OLDER_REFERENCE_SECTION_BANNER_COMMENT,
        REFERENCE_SECTION_COMMENT,
        LEGACY_REFERENCE_SECTION_COMMENT,
    ];
    const matchesPattern = function matchesPattern(pattern: RegExp) {
        return pattern.test(comment);
    };
    const result = patterns.some(matchesPattern);
    return result;
}

/**
 * Builds one full named ref definition.
 *
 * @param definition - Reference definition.
 * @returns Full ref tag.
 */
function buildDefinitionTag(definition: ReferenceDefinition): string {
    const name = escapeReferenceName(definition.finalName);
    const tag = `<ref name="${name}">${definition.formattedContent}</ref>`;
    const trailing = stripReferenceSectionComments(definition.trailingText);
    return `${tag}${trailing}`.trimEnd();
}

/**
 * Builds one self-closing ref reuse tag.
 *
 * @param name - Generated reference name.
 * @param group - Reference group.
 * @returns Self-closing ref tag.
 */
function buildReuseTag(name: string, group: string): string {
    const groupAttribute = formatReferenceGroupAttribute(group);
    return `<ref name="${escapeReferenceName(name)}"${groupAttribute} />`;
}

/**
 * Appends lists for groups without an existing target.
 *
 * @param text - Transformed source.
 * @param containers - Existing list containers.
 * @param definitions - Reference definitions.
 * @returns Source with missing lists appended.
 */
function appendMissingReferenceContainers(
    text: string,
    containers: ReferenceContainer[],
    definitions: ReferenceDefinition[],
): string {
    const containerGroups = containers.map(
        function getContainerGroup(container) {
            return container.group;
        },
    );
    const existingGroups = new Set(containerGroups);
    const definitionGroups = definitions.map(
        function getDefinitionGroup(definition) {
            return definition.group;
        },
    );
    const uniqueDefinitionGroups = new Set(definitionGroups);
    const allDefinitionGroups = Array.from(uniqueDefinitionGroups);
    const isMissingGroup = function isMissingGroup(group: string) {
        return !existingGroups.has(group);
    };
    const missingGroups = allDefinitionGroups.filter(isMissingGroup);
    if (missingGroups.length === 0) {
        return text;
    }
    const buildMissingList = function buildMissingList(group: string) {
        const grouped = definitions.filter(function hasGroup(definition) {
            return definition.group === group;
        });
        const container = createEmptyReferenceContainer(group);
        const unique = uniqueDefinitions(grouped);
        const result = buildReferenceContainer(container, unique);
        return result;
    };
    const additions = missingGroups.map(buildMissingList);
    return `${text.trimEnd()}\n\n${additions.join("\n\n")}\n`;
}

/**
 * Converts r wrapper templates to native ref tags.
 *
 * @param text - Source wikitext.
 * @returns Source with native ref tags.
 */
function convertRTemplates(text: string): string {
    const buildRTemplateReplacement = function buildRTemplateReplacement(
        call: ParsedTemplateCall,
    ) {
        const result = {
            end: call.end,
            start: call.start,
            text: convertRTemplate(call),
        };
        return result;
    };
    const replacements = findActiveRTemplates(text).map(
        buildRTemplateReplacement,
    );
    const outerReplacements = removeNestedReplacements(replacements);
    return applyReplacements(text, outerReplacements);
}

/**
 * Finds active R-template calls.
 *
 * @param text - Source wikitext.
 * @returns R calls outside protected ranges.
 */
function findActiveRTemplates(text: string): ParsedTemplateCall[] {
    const protectedRanges = findCitationFormattingProtectedRanges(text);
    const isActiveR = function isActiveR(call: ParsedTemplateCall) {
        const active =
            normalizeTemplateName(call.name) === "r" &&
            !isInWikitextRanges(call.start, protectedRanges);
        return active;
    };
    const result = findTemplateCalls(text).filter(isActiveR);
    return result;
}

/**
 * Counts active R calls outside reference-list containers.
 *
 * @param source - Original article source.
 * @returns R call count before conversion.
 */
function countRUseTemplates(source: string): number {
    const containers = findReferenceContainers(source);
    const isOutsideReferenceContainer = function isOutsideReferenceContainer(
        call: ParsedTemplateCall,
    ) {
        const contained = containers.some(function containsCall(container) {
            return call.start >= container.start && call.end <= container.end;
        });
        return !contained;
    };
    const result = findActiveRTemplates(source).filter(
        isOutsideReferenceContainer,
    ).length;
    return result;
}

/**
 * Converts one r invocation or definition.
 *
 * @param call - Parsed r template.
 * @returns Native ref tags.
 */
function convertRTemplate(call: ParsedTemplateCall): string {
    const normalizeNamedParam = function normalizeNamedParam(
        param: ParsedTemplateCall["params"][number],
    ) {
        return [param.name.toLocaleLowerCase("en-US"), param.value];
    };
    const namedEntries = call.params
        .filter(function isNamedParam(param) {
            return !param.positional;
        })
        .map(normalizeNamedParam);
    const named = Object.fromEntries(namedEntries);
    const positional = call.params
        .filter((param) => param.positional)
        .map((param) => param.value)
        .filter(Boolean);
    const group = named.group || named.g || "";
    const content = named.ref || named.r;
    const namedName = named.name || named.n;
    const enteredName = namedName || positional[0] || "";
    const definitionName = stripOptionalReferenceNameQuotes(enteredName);
    if (content != null) {
        const groupAttribute = formatReferenceGroupAttribute(group);
        const name = escapeReferenceName(definitionName);
        return `<ref name="${name}"${groupAttribute}>${content}</ref>`;
    }
    const buildPositionalReuse = function buildPositionalReuse(name: string) {
        const normalizedName = stripOptionalReferenceNameQuotes(name);
        return buildReuseTag(normalizedName, group);
    };
    const result = positional.map(buildPositionalReuse).join("");
    return result;
}

/**
 * Removes replacements covered by a larger replacement.
 *
 * @param replacements - Candidate source replacements.
 * @returns Outer non-overlapping replacements.
 */
function removeNestedReplacements(
    replacements: TextReplacement[],
): TextReplacement[] {
    const isOuterReplacement = function isOuterReplacement(
        candidate: TextReplacement,
        index: number,
    ) {
        const result = !replacements.some(
            function containsCandidate(other, otherIndex) {
                const differentEntry = index !== otherIndex;
                const startsInside =
                    differentEntry && candidate.start >= other.start;
                const endsInside = startsInside && candidate.end <= other.end;
                const differentRange =
                    candidate.start !== other.start ||
                    candidate.end !== other.end;
                return endsInside && differentRange;
            },
        );
        return result;
    };
    const result = replacements.filter(isOuterReplacement);
    return result;
}
