/**
 * End-to-end citation formatting and list-defined-reference conversion.
 */

import {
    appendCitationLocator,
    formatCitationTemplate,
    getCitationIdentity,
    type CitationIdentity,
} from "./citation.ts";
import { isCitationTemplate, normalizeTemplateName } from "./templates.ts";
import type {
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
    const result = Array.from(
        new Set(
            findTemplateCalls(text)
                .filter(function isUsedCitation(call) {
                    const result =
                        isCitationTemplate(call.name) &&
                        !isInRanges(call.start, protectedRanges);
                    return result;
                })
                .map((call) => normalizeTemplateName(call.name)),
        ),
    );
    return result;
}

/**
 * Formats citations and converts all full refs to list definitions.
 *
 * @param source - Article source wikitext.
 * @param templateData - Metadata for used citation templates.
 * @returns Formatted source and operation counts.
 */
export function formatCitationWikitext(
    source: string,
    templateData: CitationTemplateDataMap,
): CitationFormatResult {
    const rTemplatesFound = countRUseTemplates(source);
    const rConverted = convertRTemplates(source);
    const protectedRanges = findProtectedRanges(rConverted);
    const containers = findReferenceContainers(rConverted).filter(
        (container) => !isInRanges(container.start, protectedRanges),
    );
    const tags = findRefTags(rConverted).filter(
        (tag) => !isInRanges(tag.start, protectedRanges),
    );
    captureContainerPrefixes(containers, tags, rConverted);
    const definitions = buildReferenceDefinitions(
        tags,
        containers,
        templateData,
        rConverted,
    );

    assignReferenceSections(definitions, tags, containers, rConverted);
    assignCitationNames(definitions);
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

function summarizeFormatting(
    definitions: ReferenceDefinition[],
    tags: RefTag[],
    containers: ReferenceContainer[],
    text: string,
    rTemplatesFound: number,
): CitationFormatResult {
    const individual = uniqueDefinitions(definitions);
    const result: CitationFormatResult = {
        citationsFormatted: individual.filter(
            (definition) => definition.identity != null,
        ).length,
        individualReferencesFound: individual.length,
        referenceCallsFound: tags.filter(
            (tag) => !isTagInContainers(tag, containers),
        ).length,
        referencesNotFormatted: individual.filter(
            (definition) => definition.identity == null,
        ).length,
        referencesMoved: definitions.filter(
            (definition) => !isTagInContainers(definition.tag, containers),
        ).length,
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
 * @returns Full reference definitions.
 */
function buildReferenceDefinitions(
    tags: RefTag[],
    containers: ReferenceContainer[],
    templateData: CitationTemplateDataMap,
    source: string,
): ReferenceDefinition[] {
    const fullTags = tags.filter(function hasContent(tag) {
        return !tag.selfClosing && tag.content.trim() !== "";
    });
    const result = fullTags.map(function buildDefinition(tag, order) {
        const result = createReferenceDefinition(
            tag,
            order,
            templateData,
            getContainingGroup(tag, containers),
            getTrailingContainerText(tag, containers, fullTags, source),
        );
        return result;
    });
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
 * @returns Reference definition.
 */
function createReferenceDefinition(
    tag: RefTag,
    order: number,
    templateData: CitationTemplateDataMap,
    containingGroup: string,
    trailingText: string,
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
    const citations = formatCitationCalls(citationCalls, templateData);
    if (citations == null || citations.length === 0) {
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
 * @returns Formatted citations, or undefined when one is unsupported.
 */
function formatCitationCalls(
    calls: ParsedTemplateCall[],
    templateData: CitationTemplateDataMap,
): FormattedCitation[] | undefined {
    const result: FormattedCitation[] = [];
    for (const call of calls) {
        const metadata = templateData[normalizeTemplateName(call.name)];
        if (metadata == null) {
            return undefined;
        }
        result.push(formatCitationTemplate(call.raw, metadata));
    }
    return result;
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
    const names = identities.map((identity) =>
        appendCitationLocator(identity.baseName, identity.locator),
    );
    const identity: CitationIdentity = {
        author: identities.map((item) => item.author).join("; "),
        baseName: names.join("; "),
        locator: "",
        sourceSignature: JSON.stringify(
            identities.map((item) => item.sourceSignature),
        ),
        year: identities.map((item) => item.year).join("; "),
    };
    const result = buildFormattedDefinition(
        options,
        formatCitationBundle(citations),
        identity,
    );
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
    const identities = citations.map((item) =>
        getCitationIdentity(item.citation),
    );
    const counts = Map.groupBy(identities, (identity) =>
        getFirstAuthorKey(identity.author),
    );
    const result = citations.map(function disambiguate(item, index) {
        const identity = identities[index];
        const key = getFirstAuthorKey(identity.author);
        const disambiguated =
            (counts.get(key)?.length || 0) > 1
                ? getCitationIdentity(item.citation, true)
                : identity;
        return disambiguated;
    });
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
    const items = citations.map(function formatItem(item, index) {
        const indented = item.text.replace(/\n/gu, "\n    ");
        return `  | ${index + 1} = ${indented}`;
    });
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
        definition.section =
            position === Number.MAX_SAFE_INTEGER
                ? "§ A Unused references"
                : getSectionAtPosition(position, headings);
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
    const reuse = tags.find(function isMatchingReuse(tag) {
        const group = tag.attributes.group || "";
        const result =
            !isTagInContainers(tag, containers) &&
            tag.attributes.name === definition.oldName &&
            group === definition.group;
        return result;
    });
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
 * Assigns colon-prefixed names to unparseable notes.
 *
 * @param definitions - Mutable reference definitions.
 */
function assignFallbackNames(definitions: ReferenceDefinition[]): void {
    definitions
        .filter(function isPlainDefinition(definition) {
            return definition.identity == null;
        })
        .sort(compareReferenceOrder)
        .forEach(function assignFallback(definition, index) {
            definition.finalName = `:${index + 1}`;
        });
}

/**
 * Finds a supported citation occupying an entire ref body.
 *
 * @param text - Trimmed ref content.
 * @returns Whole citation call when present.
 */
function findWholeCitationCalls(text: string): ParsedTemplateCall[] {
    const candidates = findTemplateCalls(text).filter((call) =>
        isCitationTemplate(call.name),
    );
    const calls = candidates.filter(function isTopLevel(candidate) {
        const result = !isNestedTemplateCall(candidate, candidates);
        return result;
    });
    let cursor = 0;
    const gaps: string[] = [];
    for (const call of calls) {
        gaps.push(text.slice(cursor, call.start));
        cursor = call.end;
    }
    gaps.push(text.slice(cursor));
    const onlyWhitespace = gaps.every((gap) => gap.trim() === "");
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
    const calls = allCalls.filter(function isTopLevel(call) {
        const nested = isNestedTemplateCall(call, allCalls);
        return !nested;
    });
    let cursor = 0;
    for (const call of calls) {
        if (
            text.slice(cursor, call.start).trim() !== "" ||
            !CITATION_MAINTENANCE_TEMPLATES.has(
                normalizeTemplateName(call.name),
            )
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
        const signatures = Array.from(
            Map.groupBy(
                groupedDefinitions,
                (definition) => definition.identity?.sourceSignature || "",
            ).entries(),
        ).sort((left, right) => left[1][0].order - right[1][0].order);
        const needsYearSuffix = signatures.length > 1;
        for (let index = 0; index < signatures.length; index += 1) {
            const sameSource = signatures[index][1];
            assignSameSourceNames(sameSource, index, needsYearSuffix);
        }
    }
}

function assignSameSourceNames(
    definitions: ReferenceDefinition[],
    index: number,
    needsYearSuffix: boolean,
): void {
    const firstIdentity = definitions[0].identity as CitationIdentity;
    const locators = new Set(definitions.map(getDefinitionLocator));
    const needsLocator = locators.size > 1;
    const separator = firstIdentity.year === "n.d." ? "-" : "";
    const suffix = needsYearSuffix
        ? `${separator}${alphabeticSuffix(index)}`
        : "";

    for (const definition of definitions) {
        const identity = definition.identity as CitationIdentity;
        const locator = needsLocator ? identity.locator : "";
        definition.finalName = appendCitationLocator(
            `${identity.baseName}${suffix}`,
            locator,
        );
    }
}

function isCitationDefinition(definition: ReferenceDefinition): boolean {
    return definition.identity != null;
}

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
        result = String.fromCharCode(97 + (value % 26)) + result;
        value = Math.floor(value / 26) - 1;
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
    const definitionsByStart = new Map(
        definitions.map(function indexDefinition(definition) {
            return [definition.tag.start, definition];
        }),
    );
    const result = tags
        .filter(function isBodyTag(tag) {
            return !isTagInContainers(tag, containers);
        })
        .map(function replaceTag(tag) {
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
        });
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
    const result = containers.map(function replaceContainer(container) {
        const isFirst = !firstByGroup.has(container.group);
        firstByGroup.add(container.group);
        let text = "";
        if (isFirst) {
            const grouped = definitions.filter(function hasGroup(definition) {
                return definition.group === container.group;
            });
            text = buildReferenceContainer(
                container,
                uniqueDefinitions(grouped),
            );
        }
        return { end: container.end, start: container.start, text };
    });
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
    const result = definitions.filter(function isFirstDefinition(definition) {
        const key = [definition.finalName, definition.formattedContent].join(
            "\u0000",
        );
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
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
    const group =
        container.group === ""
            ? ""
            : ` group="${escapeAttribute(container.group)}"`;
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
    const result = values.flatMap(function findGeneralComments(value) {
        const comments = Array.from(
            value.matchAll(HTML_COMMENT),
            ([comment]) => comment,
        );
        const general = comments.filter(function isGeneral(comment) {
            return !isReferenceSectionComment(comment);
        });
        return general;
    });
    return result;
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
    const sections = Array.from(groups, function buildSection([name, items]) {
        const rows = items.map(buildDefinitionTag).join("\n");
        return `${formatReferenceSectionBanner(name)}\n\n${rows}`;
    });
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
    const result =
        REFERENCE_SECTION_BANNER_COMMENT.test(comment) ||
        LEGACY_REFERENCE_SECTION_BANNER_COMMENT.test(comment) ||
        OLDER_REFERENCE_SECTION_BANNER_COMMENT.test(comment) ||
        REFERENCE_SECTION_COMMENT.test(comment) ||
        LEGACY_REFERENCE_SECTION_COMMENT.test(comment);
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
    const existingGroups = new Set(
        containers.map(function getContainerGroup(container) {
            return container.group;
        }),
    );
    const missingGroups = Array.from(
        new Set(
            definitions.map(function getDefinitionGroup(definition) {
                return definition.group;
            }),
        ),
    ).filter(function isMissingGroup(group) {
        return !existingGroups.has(group);
    });
    if (missingGroups.length === 0) {
        return text;
    }
    const additions = missingGroups.map(function buildMissingList(group) {
        const grouped = definitions.filter(function hasGroup(definition) {
            return definition.group === group;
        });
        const result = buildReferenceContainer(
            createEmptyReferenceContainer(group),
            uniqueDefinitions(grouped),
        );
        return result;
    });
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
        result.push({
            contentEnd: getReferencesContentEnd(match),
            contentStart: getReferencesContentStart(match),
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
        result.push(buildReflistContainer(call));
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
    const namedParams = call.params
        .filter(function isNamedParam(param) {
            return !param.positional;
        })
        .map(function normalizeParam(param) {
            return [param.name.toLocaleLowerCase("en-US"), param.value];
        }) as Array<[string, string]>;
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
    const replacements = findActiveRTemplates(text)
        .map(function replaceR(call) {
            const result = {
                end: call.end,
                start: call.start,
                text: convertRTemplate(call),
            };
            return result;
        });
    return applyReplacements(text, removeNestedReplacements(replacements));
}

/**
 * Finds active R-template calls.
 *
 * @param text - Source wikitext.
 * @returns R calls outside protected ranges.
 */
function findActiveRTemplates(text: string): ParsedTemplateCall[] {
    const protectedRanges = findProtectedRanges(text);
    const result = findTemplateCalls(text).filter(function isActiveR(call) {
        const active =
            normalizeTemplateName(call.name) === "r" &&
            !isInRanges(call.start, protectedRanges);
        return active;
    });
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
    const result = findActiveRTemplates(source).filter(function isUse(call) {
        const contained = containers.some(function containsCall(container) {
            return call.start >= container.start && call.end <= container.end;
        });
        return !contained;
    }).length;
    return result;
}

/**
 * Converts one r invocation or definition.
 *
 * @param call - Parsed r template.
 * @returns Native ref tags.
 */
function convertRTemplate(call: ParsedTemplateCall): string {
    const named = Object.fromEntries(
        call.params
            .filter(function isNamedParam(param) {
                return !param.positional;
            })
            .map(function normalizeParam(param) {
                return [param.name.toLocaleLowerCase("en-US"), param.value];
            }),
    );
    const positional = call.params
        .filter((param) => param.positional)
        .map((param) => param.value)
        .filter(Boolean);
    const group = named.group || named.g || "";
    const content = named.ref || named.r;
    const enteredName = named.name || named.n || positional[0] || "";
    const definitionName = stripRNameQuotes(enteredName);
    if (content != null) {
        const groupAttribute =
            group === "" ? "" : ` group="${escapeAttribute(group)}"`;
        const name = escapeRefName(definitionName);
        return `<ref name="${name}"${groupAttribute}>${content}</ref>`;
    }
    const result = positional
        .map((name) => buildReuseTag(stripRNameQuotes(name), group))
        .join("");
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
    const result = replacements.filter(
        function isOuterReplacement(candidate, index) {
            const result = !replacements.some(
                function containsCandidate(other, otherIndex) {
                    const result =
                        index !== otherIndex &&
                        candidate.start >= other.start &&
                        candidate.end <= other.end &&
                        (candidate.start !== other.start ||
                            candidate.end !== other.end);
                    return result;
                },
            );
            return result;
        },
    );
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
