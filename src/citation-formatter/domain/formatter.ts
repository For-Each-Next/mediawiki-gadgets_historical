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
import type { CitationTemplateDataMap, TextReplacement } from "./types.ts";
import {
    applyReplacements,
    findRefTags,
    findTemplateCalls,
    parseTagAttributes,
    type ParsedTemplateCall,
    type RefTag,
} from "./wikitext.ts";

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

/**
 * Summary returned with transformed wikitext.
 */
export interface CitationFormatResult {
    citationsFormatted: number;
    referencesMoved: number;
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

    assignFallbackNames(definitions);
    assignCitationNames(definitions);
    ensureUniqueReferenceNames(definitions);
    const replacements = buildAllReplacements(tags, containers, definitions);
    let text = applyReplacements(rConverted, replacements);
    text = appendMissingReferenceContainers(text, containers, definitions);

    const result: CitationFormatResult = {
        citationsFormatted: definitions.filter(
            (definition) => definition.identity != null,
        ).length,
        referencesMoved: definitions.filter(
            (definition) => !isTagInContainers(definition.tag, containers),
        ).length,
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
    const citationCall = findWholeCitationCall(trimmed);
    if (citationCall == null) {
        return buildPlainDefinition(plainOptions);
    }
    const name = normalizeTemplateName(citationCall.name);
    const metadata = templateData[name];
    if (metadata == null) {
        return buildPlainDefinition(plainOptions);
    }
    const formatted = formatCitationTemplate(citationCall.raw, metadata);
    const identity = getCitationIdentity(formatted.citation);
    const result: ReferenceDefinition = {
        finalName: identity.baseName,
        formattedContent: formatted.text,
        group,
        identity,
        oldName: tag.attributes.name || "",
        order,
        tag,
        trailingText,
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
    const result = {
        finalName: "",
        formattedContent: content,
        group,
        oldName,
        order,
        tag,
        trailingText,
    };
    return result;
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
function findWholeCitationCall(text: string): ParsedTemplateCall | undefined {
    const result = findTemplateCalls(text).find(
        function isWholeCitation(call) {
            const result =
                call.start === 0 &&
                call.end === text.length &&
                isCitationTemplate(call.name);
            return result;
        },
    );
    return result;
}

/**
 * Assigns author/date, year-letter, and locator names.
 *
 * @param definitions - Mutable reference definitions.
 */
function assignCitationNames(definitions: ReferenceDefinition[]): void {
    const citationDefinitions = definitions.filter(
        function isCitationDefinition(definition) {
            return definition.identity != null;
        },
    );
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
        signatures.forEach(function nameSameSource(
            [_signature, sameSource],
            index,
        ) {
            const suffix = needsYearSuffix ? alphabeticSuffix(index) : "";
            for (const definition of sameSource) {
                const identity = definition.identity as CitationIdentity;
                definition.finalName = appendCitationLocator(
                    `${identity.baseName}${suffix}`,
                    identity.locator,
                );
            }
        });
    }
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
 * Builds a native references tag or reflist call.
 *
 * @param container - Target container.
 * @param definitions - Group definitions.
 * @returns List-defined-reference container.
 */
function buildReferenceContainer(
    container: ReferenceContainer,
    definitions: ReferenceDefinition[],
): string {
    const rows =
        container.prefixText + definitions.map(buildDefinitionTag).join("\n");
    if (container.kind === "references") {
        let group = "";
        if (container.group !== "") {
            group = ` group="${escapeAttribute(container.group)}"`;
        }
        if (rows === "") {
            return `<references${group} />`;
        }
        return `<references${group}>\n${rows}\n</references>`;
    }

    const otherParams = container.namedParams
        .filter(([name]) => !["group", "list", "refs"].includes(name))
        .map(([name, value]) => `| ${name} = ${value}`);
    const groupParam =
        container.group === "" ? [] : [`| group = ${container.group}`];
    if (rows === "") {
        return [`{{reflist`, ...groupParam, ...otherParams, "}}"].join("\n");
    }
    const result = [
        "{{reflist",
        ...groupParam,
        ...otherParams,
        "| list =",
        rows,
        "}}",
    ].join("\n");
    return result;
}

/**
 * Builds one full named ref definition.
 *
 * @param definition - Reference definition.
 * @returns Full ref tag.
 */
function buildDefinitionTag(definition: ReferenceDefinition): string {
    const name = escapeAttribute(definition.finalName);
    const tag = `<ref name="${name}">${definition.formattedContent}</ref>`;
    return `${tag}${definition.trailingText}`;
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
    return `<ref name="${escapeAttribute(name)}"${groupAttribute} />`;
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
    const protectedRanges = findProtectedRanges(text);
    const replacements = findTemplateCalls(text)
        .filter(function isConvertibleR(call) {
            const result =
                normalizeTemplateName(call.name) === "r" &&
                !isInRanges(call.start, protectedRanges);
            return result;
        })
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
        const name = escapeAttribute(definitionName);
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
