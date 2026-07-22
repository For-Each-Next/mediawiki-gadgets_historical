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
import { isCitationTemplate, normalizeTemplateName } from "./templates.ts";
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
    parseTagAttributes,
    type ParsedTemplateCall,
    type RefTag,
} from "./wikitext.ts";

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

interface ReferenceContainer {
    contentEnd: number;
    contentStart: number;
    end: number;
    group: string;
    kind: "references" | "reflist";
    namedParams: Array<[string, string]>;
    prefixText: string;
    start: number;
}

interface ReferenceDefinition {
    finalName: string;
    formattedContent: string;
    group: string;
    identity?: CitationIdentity;
    oldName: string;
    order: number;
    section: string;
    sectionOrder: number;
    tag: RefTag;
    trailingText: string;
}

interface PlainDefinitionOptions {
    content: string;
    group: string;
    oldName: string;
    order: number;
    tag: RefTag;
    trailingText: string;
}

interface FormattedCitation {
    citation: CitationTemplate;
    text: string;
}

/**
 * Summary returned with transformed wikitext.
 */
export interface CitationFormatResult {
    citationsFormatted: number;
    individualReferencesFound: number;
    referenceCallsFound: number;
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
    const protectedRanges = findProtectedRanges(text);
    const calls = findTemplateCalls(text);
    const filterCallbackN = function isUsedCitation(call: ParsedTemplateCall) {
        const result =
            isCitationTemplate(call.name) &&
            !isInRanges(call.start, protectedRanges);
        return result;
    };
    const usedCalls = calls.filter(filterCallbackN);
    const mapCallbackL = (call: ParsedTemplateCall) =>
        normalizeTemplateName(call.name);
    const names = usedCalls.map(mapCallbackL);
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
 * @returns Formatted source and operation counts.
 */
// eslint-disable-next-line max-lines-per-function
export function formatCitationWikitext(
    source: string,
    templateData: CitationTemplateDataMap,
    layout: CitationLayout = "block",
): CitationFormatResult {
    const rTemplatesFound = countRUseTemplates(source);
    const rConverted = convertRTemplates(source);
    const protectedRanges = findProtectedRanges(rConverted);
    const filterCallbackM = function isUnprotectedContainer(
        container: ReferenceContainer,
    ) {
        return !isInRanges(container.start, protectedRanges);
    };
    const containers =
        findReferenceContainers(rConverted).filter(filterCallbackM);
    const filterCallbackL = (tag: RefTag) =>
        !isInRanges(tag.start, protectedRanges);
    const tags = findRefTags(rConverted).filter(filterCallbackL);
    captureContainerPrefixes(containers, tags, rConverted);
    const definitions = buildReferenceDefinitions(
        tags,
        containers,
        templateData,
        rConverted,
        layout,
    );
    assignReferenceSections(definitions, tags, containers, rConverted);
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
    const filterCallbackJ = (tag: RefTag) =>
        !isTagInContainers(tag, containers);
    const filterCallbackK = function isDefinitionOutsideContainers(
        definition: ReferenceDefinition,
    ) {
        return !isTagInContainers(definition.tag, containers);
    };
    const result: CitationFormatResult = {
        citationsFormatted: individual.filter(
            (definition) => definition.identity != null,
        ).length,
        individualReferencesFound: individual.length,
        referenceCallsFound: tags.filter(filterCallbackJ).length,
        referencesNotFormatted: individual.filter(
            (definition) => definition.identity == null,
        ).length,
        referencesMoved: definitions.filter(filterCallbackK).length,
        rTemplatesFound,
        text,
    };
    return result;
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
    const filterCallbackI = function hasContent(tag: RefTag) {
        return !tag.selfClosing && tag.content.trim() !== "";
    };
    const fullTags = tags.filter(filterCallbackI);
    const shortCitationSources = buildShortCitationSourceMap(
        source,
        templateData,
    );
    const mapCallbackK = function buildDefinition(tag: RefTag, order: number) {
        const group = getContainingGroup(tag, containers);
        const trailingText = getTrailingContainerText(
            tag,
            containers,
            fullTags,
            source,
        );
        const result = createReferenceDefinition(
            tag,
            order,
            templateData,
            group,
            trailingText,
            shortCitationSources,
            layout,
        );
        return result;
    };
    const result = fullTags.map(mapCallbackK);
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
 * @param tag - Full ref tag.
 * @param order - Definition source order.
 * @param templateData - Citation metadata.
 * @param containingGroup - Enclosing reference-list group.
 * @param trailingText - Material following a list definition.
 * @param shortCitationSources - Citation identities keyed by
 *   CITEREF anchor.
 * @param layout - Citation-template output layout.
 * @returns Reference definition.
 */
// eslint-disable-next-line max-lines-per-function, max-params
function createReferenceDefinition(
    tag: RefTag,
    order: number,
    templateData: CitationTemplateDataMap,
    containingGroup: string,
    trailingText: string,
    shortCitationSources: Map<string, CitationIdentity>,
    layout: CitationLayout,
): ReferenceDefinition {
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
    const citationCalls = findWholeCitationCalls(trimmed);
    const citations = formatCitationCalls(citationCalls, templateData, layout);
    if (citations == null || citations.length === 0) {
        const identity = getShortCitationIdentity(
            trimmed,
            shortCitationSources,
        );
        if (identity != null) {
            return buildFormattedDefinition(plainOptions, trimmed, identity);
        }
        return buildPlainDefinition(plainOptions);
    }
    if (citations.length > 1) {
        return buildBundledDefinition(plainOptions, citations);
    }
    const formatted = citations[0];
    const identity = getCitationIdentity(formatted.citation);
    const content = replaceSingleCitation(
        trimmed,
        citationCalls[0],
        formatted,
    );
    return buildFormattedDefinition(plainOptions, content, identity);
}

/**
 * Formats a citation while retaining adjacent maintenance templates.
 *
 * @param content - Complete trimmed reference body.
 * @param call - Citation call within the body.
 * @param formatted - Formatted citation call.
 * @returns Formatted body retaining surrounding maintenance templates.
 */
function replaceSingleCitation(
    content: string,
    call: ParsedTemplateCall,
    formatted: FormattedCitation,
): string {
    const result = applyReplacements(content, [
        { end: call.end, start: call.start, text: formatted.text },
    ]);
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
        const metadata = templateData[normalizeTemplateName(call.name)];
        if (metadata == null) {
            return undefined;
        }
        const formatted = formatCitationTemplate(call.raw, metadata, layout);
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
    const protectedRanges = findProtectedRanges(source);
    for (const call of findTemplateCalls(source)) {
        if (isInRanges(call.start, protectedRanges)) {
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
    const mapCallbackJ = function formatIdentityName(
        identity: CitationIdentity,
    ) {
        return appendCitationLocator(identity.baseName, identity.locator);
    };
    const names = identities.map(mapCallbackJ);
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
    const mapCallbackI = function getIdentity(item: FormattedCitation) {
        return getCitationIdentity(item.citation);
    };
    const identities = citations.map(mapCallbackI);
    const groupByCallback = function groupByFirstAuthor(
        identity: CitationIdentity,
    ) {
        return getFirstAuthorKey(identity.author);
    };
    const counts = Map.groupBy(identities, groupByCallback);
    const mapCallbackH = function disambiguate(
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
    const result = citations.map(mapCallbackH);
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
    const mapCallbackG = function formatItem(
        item: FormattedCitation,
        index: number,
    ) {
        const indented = item.text.replace(/\n/gu, "\n    ");
        return `  | ${index + 1} = ${indented}`;
    };
    const items = citations.map(mapCallbackG);
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
 * Builds an unparseable note definition.
 *
 * @param options - Plain definition fields.
 * @returns Plain reference definition.
 */
function buildPlainDefinition(
    options: PlainDefinitionOptions,
): ReferenceDefinition {
    const { content, group, oldName, order, tag, trailingText } = options;
    const result: ReferenceDefinition = {
        finalName: "",
        formattedContent: content,
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
 */
function assignReferenceSections(
    definitions: ReferenceDefinition[],
    tags: RefTag[],
    containers: ReferenceContainer[],
    source: string,
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
            definition.section = getSectionAtPosition(position, headings);
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
    const protectedRanges = findProtectedRanges(source);
    const headings: SectionHeading[] = [];
    const counters = [0, 0, 0, 0, 0];
    const pattern = /^(={2,6})\s*(.*?)\s*\1\s*$/gmu;
    for (const match of source.matchAll(pattern)) {
        const start = match.index || 0;
        if (isInRanges(start, protectedRanges)) {
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
    const findCallback = function isMatchingReuse(tag: RefTag) {
        const group = tag.attributes.group || "";
        const result =
            !isTagInContainers(tag, containers) &&
            tag.attributes.name === definition.oldName &&
            group === definition.group;
        return result;
    };
    const reuse = tags.find(findCallback);
    return reuse?.start ?? Number.MAX_SAFE_INTEGER;
}

/**
 * Resolves a source position to its nearest preceding section.
 *
 * @param position - Source offset.
 * @param headings - Article section headings.
 * @returns Numbered section label or lead section.
 */
function getSectionAtPosition(
    position: number,
    headings: SectionHeading[],
): string {
    const heading = headings.findLast(
        (candidate) => candidate.start < position,
    );
    return heading?.label || "§ 0 Lead";
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
    const protectedRanges = findProtectedRanges(source);
    for (const call of findTemplateCalls(source)) {
        if (isInRanges(call.start, protectedRanges)) {
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
 * Finds a supported citation occupying an entire ref body.
 *
 * @param text - Trimmed ref content.
 * @returns Whole citation call when present.
 */
function findWholeCitationCalls(text: string): ParsedTemplateCall[] {
    const filterCallbackH = function isCitationCall(call: ParsedTemplateCall) {
        return isCitationTemplate(call.name);
    };
    const candidates = findTemplateCalls(text).filter(filterCallbackH);
    const filterCallbackG = function isTopLevel(
        candidate: ParsedTemplateCall,
    ) {
        const result = !isNestedTemplateCall(candidate, candidates);
        return result;
    };
    const calls = candidates.filter(filterCallbackG);
    let cursor = 0;
    const gaps: string[] = [];
    for (const call of calls) {
        const gap = text.slice(cursor, call.start);
        gaps.push(gap);
        cursor = call.end;
    }
    const trailing = text.slice(cursor);
    gaps.push(trailing);
    const everyCallback = (gap: string) => gap.trim() === "";
    const onlyWhitespace = gaps.every(everyCallback);
    const onlyMaintenance =
        calls.length === 1 && gaps.every(isCitationMaintenanceText);
    const result = onlyWhitespace || onlyMaintenance ? calls : [];
    return result;
}

/**
 * Checks whether text contains only citation maintenance templates.
 *
 * @param text - Text adjacent to a citation call.
 * @returns Whether no prose or unsupported templates are present.
 */
function isCitationMaintenanceText(text: string): boolean {
    const allCalls = findTemplateCalls(text);
    const filterCallbackF = function isTopLevel(call: ParsedTemplateCall) {
        const nested = isNestedTemplateCall(call, allCalls);
        return !nested;
    };
    const calls = allCalls.filter(filterCallbackF);
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
    const filterCallbackE = function isBodyTag(tag: RefTag) {
        return !isTagInContainers(tag, containers);
    };
    const mapCallbackF = function replaceTag(tag: RefTag) {
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
    const result = tags.filter(filterCallbackE).map(mapCallbackF);
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
    const mapCallbackE = function replaceContainer(
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
    const result = containers.map(mapCallbackE);
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
    const filterCallbackD = function isFirstDefinition(
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
    const result = definitions.filter(filterCallbackD);
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
    let group = "";
    if (container.group !== "") {
        group = ` group="${escapeAttribute(container.group)}"`;
    }
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
    const flatMapCallback = function findGeneralComments(value: string) {
        const matches = value.matchAll(HTML_COMMENT);
        const comments = Array.from(matches, ([comment]) => comment);
        const general = comments.filter(isGeneralReferenceComment);
        return general;
    };
    const result = values.flatMap(flatMapCallback);
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
    const fromCallback = function buildSection([name, items]: [
        string,
        ReferenceDefinition[],
    ]) {
        const rows = items.map(buildDefinitionTag).join("\n");
        return `${formatReferenceSectionBanner(name)}\n\n${rows}`;
    };
    const sections = Array.from(groups, fromCallback);
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
    const someCallback = function matchesPattern(pattern: RegExp) {
        return pattern.test(comment);
    };
    const result = patterns.some(someCallback);
    return result;
}

/**
 * Builds one full named ref definition.
 *
 * @param definition - Reference definition.
 * @returns Full ref tag.
 */
function buildDefinitionTag(definition: ReferenceDefinition): string {
    const name = escapeRefName(definition.finalName);
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
    const groupAttribute =
        group === "" ? "" : ` group="${escapeAttribute(group)}"`;
    return `<ref name="${escapeRefName(name)}"${groupAttribute} />`;
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
    const filterCallbackC = function isMissingGroup(group: string) {
        return !existingGroups.has(group);
    };
    const missingGroups = allDefinitionGroups.filter(filterCallbackC);
    if (missingGroups.length === 0) {
        return text;
    }
    const mapCallbackD = function buildMissingList(group: string) {
        const grouped = definitions.filter(function hasGroup(definition) {
            return definition.group === group;
        });
        const container = createEmptyReferenceContainer(group);
        const unique = uniqueDefinitions(grouped);
        const result = buildReferenceContainer(container, unique);
        return result;
    };
    const additions = missingGroups.map(mapCallbackD);
    return `${text.trimEnd()}\n\n${additions.join("\n\n")}\n`;
}

/**
 * Builds a target for an appended native references list.
 *
 * @param group - Reference group.
 * @returns Empty references container.
 */
function createEmptyReferenceContainer(group: string): ReferenceContainer {
    const result: ReferenceContainer = {
        contentEnd: 0,
        contentStart: 0,
        end: 0,
        group,
        kind: "references",
        namedParams: [],
        prefixText: "",
        start: 0,
    };
    return result;
}

/**
 * Finds native references tags and reflist templates.
 *
 * @param text - Source wikitext.
 * @returns Reference-list containers.
 */
function findReferenceContainers(text: string): ReferenceContainer[] {
    const result: ReferenceContainer[] = [];
    const referencesPattern =
        /<references\b([^>]*?)(?:\/>|>([\s\S]*?)<\/references\s*>)/giu;
    for (const match of text.matchAll(referencesPattern)) {
        const attributes = parseTagAttributes(match[1]);
        const contentEnd = getReferencesContentEnd(match);
        const contentStart = getReferencesContentStart(match);
        result.push({
            contentEnd,
            contentStart,
            end: (match.index || 0) + match[0].length,
            group: attributes.group || "",
            kind: "references",
            namedParams: [],
            prefixText: "",
            start: match.index || 0,
        });
    }
    for (const call of findTemplateCalls(text)) {
        if (normalizeTemplateName(call.name) !== "reflist") {
            continue;
        }
        const container = buildReflistContainer(call);
        result.push(container);
    }
    return result.sort((left, right) => left.start - right.start);
}

/**
 * Builds a reference container from a reflist template.
 *
 * @param call - Parsed reflist call.
 * @returns Reflist reference container.
 */
function buildReflistContainer(call: ParsedTemplateCall): ReferenceContainer {
    const mapCallbackC = function normalizeParam(
        param: ParsedTemplateCall["params"][number],
    ) {
        return [param.name.toLocaleLowerCase("en-US"), param.value];
    };
    const namedParams = call.params
        .filter(function isNamedParam(param) {
            return !param.positional;
        })
        .map(mapCallbackC) as Array<[string, string]>;
    const values = Object.fromEntries(namedParams);
    const listValue = values.list || values.refs || "";
    const valueOffset = listValue === "" ? 0 : call.raw.indexOf(listValue);
    const result: ReferenceContainer = {
        contentEnd: call.start + valueOffset + listValue.length,
        contentStart: call.start + valueOffset,
        end: call.end,
        group: values.group || "",
        kind: "reflist",
        namedParams,
        prefixText: "",
        start: call.start,
    };
    return result;
}

/**
 * Gets the start of a native references tag body.
 *
 * @param match - Native references match.
 * @returns Body start offset.
 */
function getReferencesContentStart(match: RegExpMatchArray): number {
    const start = match.index ?? 0;
    const openingEnd = start + match[0].indexOf(">") + 1;
    return openingEnd;
}

/**
 * Gets the end of a native references tag body.
 *
 * @param match - Native references match.
 * @returns Body end offset.
 */
function getReferencesContentEnd(match: RegExpMatchArray): number {
    const start = match.index ?? 0;
    if (match[2] == null) {
        return start + match[0].indexOf(">") + 1;
    }
    return start + match[0].lastIndexOf("</references");
}

/**
 * Captures material before the first active list definition.
 *
 * @param containers - Reference-list containers.
 * @param tags - Active ref tags.
 * @param source - Source wikitext.
 */
function captureContainerPrefixes(
    containers: ReferenceContainer[],
    tags: RefTag[],
    source: string,
): void {
    for (const container of containers) {
        const first = tags.find(function isFirstContainerTag(tag) {
            const result =
                !tag.selfClosing &&
                tag.start >= container.contentStart &&
                tag.end <= container.contentEnd;
            return result;
        });
        const end = first?.start ?? container.contentEnd;
        container.prefixText = source.slice(container.contentStart, end);
    }
}

/**
 * Captures material after a definition up to the next definition.
 *
 * @param tag - Current full ref tag.
 * @param containers - Reference-list containers.
 * @param fullTags - All full ref tags.
 * @param source - Source wikitext.
 * @returns Trailing list material.
 */
function getTrailingContainerText(
    tag: RefTag,
    containers: ReferenceContainer[],
    fullTags: RefTag[],
    source: string,
): string {
    const container = containers.find(function containsTag(candidate) {
        const result =
            tag.start >= candidate.contentStart &&
            tag.end <= candidate.contentEnd;
        return result;
    });
    if (container == null) {
        return "";
    }
    const next = fullTags.find(function isNextContainerTag(candidate) {
        const result =
            candidate.start > tag.start &&
            candidate.start < container.contentEnd;
        return result;
    });
    return source.slice(tag.end, next?.start ?? container.contentEnd);
}

/**
 * Checks whether a ref tag is inside a list container.
 *
 * @param tag - Parsed ref tag.
 * @param containers - Reference-list containers.
 * @returns Whether the tag is list-defined.
 */
function isTagInContainers(
    tag: RefTag,
    containers: ReferenceContainer[],
): boolean {
    const result = containers.some(function containsTag(container) {
        return tag.start >= container.start && tag.end <= container.end;
    });
    return result;
}

/**
 * Gets the group inherited from a containing list.
 *
 * @param tag - Parsed ref tag.
 * @param containers - Reference-list containers.
 * @returns Containing reference group.
 */
function getContainingGroup(
    tag: RefTag,
    containers: ReferenceContainer[],
): string {
    const result =
        containers.find(function containsTag(container) {
            return tag.start >= container.start && tag.end <= container.end;
        })?.group || "";
    return result;
}

/**
 * Converts r wrapper templates to native ref tags.
 *
 * @param text - Source wikitext.
 * @returns Source with native ref tags.
 */
function convertRTemplates(text: string): string {
    const mapCallbackB = function replaceR(call: ParsedTemplateCall) {
        const result = {
            end: call.end,
            start: call.start,
            text: convertRTemplate(call),
        };
        return result;
    };
    const replacements = findActiveRTemplates(text).map(mapCallbackB);
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
    const protectedRanges = findProtectedRanges(text);
    const filterCallbackB = function isActiveR(call: ParsedTemplateCall) {
        const active =
            normalizeTemplateName(call.name) === "r" &&
            !isInRanges(call.start, protectedRanges);
        return active;
    };
    const result = findTemplateCalls(text).filter(filterCallbackB);
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
    const filterCallbackA = function isUse(call: ParsedTemplateCall) {
        const contained = containers.some(function containsCall(container) {
            return call.start >= container.start && call.end <= container.end;
        });
        return !contained;
    };
    const result = findActiveRTemplates(source).filter(filterCallbackA).length;
    return result;
}

/**
 * Converts one r invocation or definition.
 *
 * @param call - Parsed r template.
 * @returns Native ref tags.
 */
function convertRTemplate(call: ParsedTemplateCall): string {
    const mapCallbackA = function normalizeParam(
        param: ParsedTemplateCall["params"][number],
    ) {
        return [param.name.toLocaleLowerCase("en-US"), param.value];
    };
    const namedEntries = call.params
        .filter(function isNamedParam(param) {
            return !param.positional;
        })
        .map(mapCallbackA);
    const named = Object.fromEntries(namedEntries);
    const positional = call.params
        .filter((param) => param.positional)
        .map((param) => param.value)
        .filter(Boolean);
    const group = named.group || named.g || "";
    const content = named.ref || named.r;
    const namedName = named.name || named.n;
    const enteredName = namedName || positional[0] || "";
    const definitionName = stripRNameQuotes(enteredName);
    if (content != null) {
        const groupAttribute =
            group === "" ? "" : ` group="${escapeAttribute(group)}"`;
        const name = escapeRefName(definitionName);
        return `<ref name="${name}"${groupAttribute}>${content}</ref>`;
    }
    const mapCallback = function buildPositionalReuse(name: string) {
        const normalizedName = stripRNameQuotes(name);
        return buildReuseTag(normalizedName, group);
    };
    const result = positional.map(mapCallback).join("");
    return result;
}

/**
 * Removes optional quotes around an r template name.
 *
 * @param value - Entered name.
 * @returns Unquoted name.
 */
function stripRNameQuotes(value: string): string {
    return value.trim().replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/u, "$1$2");
}

/**
 * Finds comments and literal wikitext regions.
 *
 * @param text - Source wikitext.
 * @returns Protected source ranges.
 */
function findProtectedRanges(text: string): Array<[number, number]> {
    const ranges: Array<[number, number]> = [];
    const pattern = new RegExp(
        "<!--[\\s\\S]*?-->|<(nowiki|pre|syntaxhighlight|source|code)" +
            "\\b[^>]*>[\\s\\S]*?<\\/\\1\\s*>",
        "giu",
    );
    for (const match of text.matchAll(pattern)) {
        ranges.push([match.index || 0, (match.index || 0) + match[0].length]);
    }
    return ranges;
}

/**
 * Checks whether an offset lies in protected source.
 *
 * @param index - Source offset.
 * @param ranges - Protected ranges.
 * @returns Whether the offset is protected.
 */
function isInRanges(index: number, ranges: Array<[number, number]>): boolean {
    return ranges.some(([start, end]) => index >= start && index < end);
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
    const filterCallback = function isOuterReplacement(
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
    const result = replacements.filter(filterCallback);
    return result;
}

/**
 * Escapes a value for a quoted tag attribute.
 *
 * @param value - Raw attribute value.
 * @returns Escaped attribute value.
 */
function escapeAttribute(value: string): string {
    return value.replace(/&/gu, "&amp;").replace(/"/gu, "&quot;");
}

/**
 * Escapes a quoted ref name while preserving valid literal ampersands.
 *
 * @param value - Raw ref name.
 * @returns Ref name safe for a quoted attribute.
 */
function escapeRefName(value: string): string {
    return value.replace(/&amp;/gu, "&").replace(/"/gu, "&quot;");
}
