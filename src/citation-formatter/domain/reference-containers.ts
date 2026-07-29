/**
 * Parsing and range operations for list-defined-reference containers.
 */

import { normalizeTemplateName } from "./templates.ts";
import {
    findTemplateCalls,
    parseTagAttributes,
    type ParsedTemplateCall,
    type RefTag,
} from "./wikitext.ts";

/** One native references tag or Reflist template. */
export interface ReferenceContainer {
    contentEnd: number;
    contentStart: number;
    end: number;
    group: string;
    kind: "references" | "reflist";
    namedParams: Array<[string, string]>;
    prefixText: string;
    start: number;
}

/** Creates a synthetic target for a missing reference group. */
export function createEmptyReferenceContainer(
    group: string,
): ReferenceContainer {
    return {
        contentEnd: 0,
        contentStart: 0,
        end: 0,
        group,
        kind: "references",
        namedParams: [],
        prefixText: "",
        start: 0,
    };
}

/** Finds native references tags and Reflist templates. */
export function findReferenceContainers(text: string): ReferenceContainer[] {
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
        if (normalizeTemplateName(call.name) === "reflist") {
            result.push(buildReflistContainer(call));
        }
    }
    return result.sort((left, right) => left.start - right.start);
}

/** Captures text before each container's first active definition. */
export function captureContainerPrefixes(
    containers: ReferenceContainer[],
    tags: RefTag[],
    source: string,
): void {
    for (const container of containers) {
        const first = tags.find(function isFirstContainerTag(tag) {
            return (
                !tag.selfClosing &&
                tag.start >= container.contentStart &&
                tag.end <= container.contentEnd
            );
        });
        const end = first?.start ?? container.contentEnd;
        container.prefixText = source.slice(container.contentStart, end);
    }
}

/** Captures material after a definition up to the next definition. */
export function getTrailingContainerText(
    tag: RefTag,
    containers: ReferenceContainer[],
    fullTags: RefTag[],
    source: string,
): string {
    const container = containers.find(function containsTag(candidate) {
        return (
            tag.start >= candidate.contentStart &&
            tag.end <= candidate.contentEnd
        );
    });
    if (container == null) {
        return "";
    }
    const next = fullTags.find(function isNextContainerTag(candidate) {
        return (
            candidate.start > tag.start &&
            candidate.start < container.contentEnd
        );
    });
    return source.slice(tag.end, next?.start ?? container.contentEnd);
}

/** Checks whether a ref tag is inside a list container. */
export function isTagInContainers(
    tag: RefTag,
    containers: ReferenceContainer[],
): boolean {
    return containers.some(
        (container) =>
            tag.start >= container.start && tag.end <= container.end,
    );
}

/** Gets the group inherited from a containing reference list. */
export function getContainingGroup(
    tag: RefTag,
    containers: ReferenceContainer[],
): string {
    return (
        containers.find(
            (container) =>
                tag.start >= container.start && tag.end <= container.end,
        )?.group || ""
    );
}

/** Builds a reference container from one Reflist template. */
function buildReflistContainer(call: ParsedTemplateCall): ReferenceContainer {
    const namedParams = call.params
        .filter((param) => !param.positional)
        .map(
            (param) =>
                [param.name.toLocaleLowerCase("en-US"), param.value] as [
                    string,
                    string,
                ],
        );
    const values = Object.fromEntries(namedParams);
    const listValue = values.list || values.refs || "";
    const valueOffset = listValue === "" ? 0 : call.raw.indexOf(listValue);
    return {
        contentEnd: call.start + valueOffset + listValue.length,
        contentStart: call.start + valueOffset,
        end: call.end,
        group: values.group || "",
        kind: "reflist",
        namedParams,
        prefixText: "",
        start: call.start,
    };
}

/** Gets the start of a native references tag body. */
function getReferencesContentStart(match: RegExpMatchArray): number {
    const start = match.index ?? 0;
    return start + match[0].indexOf(">") + 1;
}

/** Gets the end of a native references tag body. */
function getReferencesContentEnd(match: RegExpMatchArray): number {
    const start = match.index ?? 0;
    if (match[2] == null) {
        return start + match[0].indexOf(">") + 1;
    }
    return start + match[0].lastIndexOf("</references");
}
