/** Pure wikitext classification for the enhanced editor surface. */

import {
    wikitext,
    type ParsedTemplateCall,
    type SourceRange,
} from "#shared/wikitext";

export interface HighlightSegment {
    classNames: string[];
    end: number;
    href?: string;
    referenceSource?: string;
    start: number;
    text: string;
}

export interface HighlightOptions {
    linkHelpers?: boolean;
}

interface DecoratedRange extends SourceRange {
    className: string;
    href?: string;
    priority: number;
    referenceSource?: string;
}

const REFERENCE_TEMPLATE_NAMES = new Set(["r", "ref", "rp", "sfn"]);
const EFN_PATTERN = /^(?:efn|notelist)(?:\b|[- ])/u;
const LINK_HELPER_PATTERN = /^(?:tsl|translink|link-[a-z0-9-]+)$/u;

/**
 * Classifies wikitext without creating or injecting HTML.
 *
 * @param source - Source text.
 * @param options - Operation options.
 * @returns Resulting values.
 */
export function highlightWikitext(
    source: string,
    options: HighlightOptions = {},
): HighlightSegment[] {
    const ranges = [
        ...createOpaqueDecorations(source),
        ...createTemplateDecorations(source, options.linkHelpers === true),
        ...createPatternDecorations(source),
    ];
    return partitionRanges(source, ranges);
}

function createOpaqueDecorations(source: string): DecoratedRange[] {
    return wikitext(source)
        .opaque.getAll()
        .map(function decorate(range) {
            const text = source.slice(range.start, range.end);
            return {
                ...range,
                className: text.startsWith("<!--")
                    ? "wiked-lite-token--comment"
                    : "wiked-lite-token--literal",
                priority: 100,
            };
        });
}

function createTemplateDecorations(
    source: string,
    linkHelpersEnabled: boolean,
): DecoratedRange[] {
    return wikitext(source)
        .template.getAll()
        .flatMap(function decorate(template) {
            const name = wikitext.template.normalizeName(template.name);
            const isReference = REFERENCE_TEMPLATE_NAMES.has(name);
            const isEfn = EFN_PATTERN.test(name);
            const isLinkHelper =
                linkHelpersEnabled && LINK_HELPER_PATTERN.test(name);
            const decoration: DecoratedRange = {
                end: template.end,
                start: template.start,
                className: getTemplateClass(
                    name,
                    template.depth,
                    isLinkHelper,
                ),
                href: isLinkHelper
                    ? getLinkHelperHref(template.raw)
                    : `/wiki/Template:${encodeTitle(template.name)}`,
                priority: 30 + template.depth,
                referenceSource:
                    isReference || isEfn ? template.raw : undefined,
            };
            return [
                decoration,
                ...createTemplateSyntaxDecorations(source, template),
            ];
        });
}

function createTemplateSyntaxDecorations(
    source: string,
    template: ParsedTemplateCall,
): DecoratedRange[] {
    const priority = 50 + template.depth;
    const ranges: DecoratedRange[] = [];
    const nameStart = source.indexOf(
        template.name,
        Math.min(template.start + 2, template.end),
    );
    if (nameStart >= template.start && nameStart < template.end) {
        ranges.push({
            className: "wiked-lite-token--template-name",
            end: nameStart + template.name.length,
            priority,
            start: nameStart,
        });
    }
    for (const parameter of template.params) {
        if (parameter.positional) {
            continue;
        }
        const nameEnd = Math.max(parameter.start, parameter.valueStart - 1);
        const parameterStart = source.indexOf(parameter.name, parameter.start);
        if (parameterStart < parameter.start || parameterStart >= nameEnd) {
            continue;
        }
        ranges.push({
            className: "wiked-lite-token--parameter",
            end: parameterStart + parameter.name.length,
            priority,
            start: parameterStart,
        });
    }
    return ranges;
}

function getTemplateClass(
    name: string,
    depth: number,
    isLinkHelper: boolean,
): string {
    if (REFERENCE_TEMPLATE_NAMES.has(name)) {
        return "wiked-lite-token--reference";
    }
    if (EFN_PATTERN.test(name)) {
        return "wiked-lite-token--footnote";
    }
    if (isLinkHelper) {
        return "wiked-lite-token--link-helper";
    }
    return `wiked-lite-token--template-${Math.min(depth, 4)}`;
}

function createPatternDecorations(source: string): DecoratedRange[] {
    const patterns: Array<[RegExp, string, number]> = [
        [
            /<ref\b[^>]*>[\s\S]*?<\/ref\s*>|<ref\b[^>]*\/>/giu,
            "wiked-lite-token--reference",
            80,
        ],
        [/\[\[[\s\S]*?\]\]/gu, "wiked-lite-token--link", 20],
        [/^\s*[#*:;]+/gmu, "wiked-lite-token--list", 10],
        [/^\s*[|!]\s?.*$/gmu, "wiked-lite-token--table", 10],
        [/https?:\/\/[^\s<>\]}|]+/giu, "wiked-lite-token--url", 5],
    ];
    return [
        ...patterns.flatMap(([pattern, className, priority]) =>
            [...source.matchAll(pattern)].map(function decorate(match) {
                const start = match.index;
                return {
                    className,
                    end: start + match[0].length,
                    href: getPatternHref(match[0], className),
                    priority,
                    referenceSource:
                        className === "wiked-lite-token--reference"
                            ? match[0]
                            : undefined,
                    start,
                };
            }),
        ),
        ...createHeadingDecorations(source),
    ];
}

function createHeadingDecorations(source: string): DecoratedRange[] {
    const pattern = /^(={1,6})[^\n]+?\1\s*$/gmu;
    return [...source.matchAll(pattern)].flatMap(function decorate(match) {
        const start = match.index;
        const range = {
            end: start + match[0].length,
            start,
        };
        return [
            {
                ...range,
                className: "wiked-lite-token--heading",
                priority: 10,
            },
            {
                ...range,
                className: `wiked-lite-token--heading-${match[1].length}`,
                priority: 11,
            },
        ];
    });
}

function getPatternHref(text: string, className: string): string | undefined {
    if (className === "wiked-lite-token--url") {
        return text;
    }
    if (className !== "wiked-lite-token--link") {
        return undefined;
    }
    const target = text.slice(2, -2).split("|")[0]?.trim();
    return target === "" ? undefined : `/wiki/${encodeTitle(target ?? "")}`;
}

function getLinkHelperHref(template: string): string | undefined {
    const parts = wikitext(template.slice(2, -2)).split("|");
    const target = parts[1]?.trim();
    return target === "" ? undefined : `/wiki/${encodeTitle(target ?? "")}`;
}

function partitionRanges(
    source: string,
    ranges: DecoratedRange[],
): HighlightSegment[] {
    const boundaries = new Set([0, source.length]);
    for (const range of ranges) {
        boundaries.add(range.start);
        boundaries.add(range.end);
    }
    const points = [...boundaries].sort((left, right) => left - right);
    const segments: HighlightSegment[] = [];
    for (let index = 0; index < points.length - 1; index += 1) {
        const start = points[index];
        const end = points[index + 1];
        if (start !== end) {
            segments.push(createSegment(source, start, end, ranges));
        }
    }
    return segments;
}

function createSegment(
    source: string,
    start: number,
    end: number,
    ranges: DecoratedRange[],
): HighlightSegment {
    const active = ranges
        .filter((range) => range.start <= start && range.end >= end)
        .sort((left, right) => right.priority - left.priority);
    const visible = active[0]?.priority === 100 ? [active[0]] : active;
    return {
        classNames: [...new Set(visible.map((range) => range.className))],
        end,
        href: visible.find((range) => range.href != null)?.href,
        referenceSource: visible.find((range) => range.referenceSource != null)
            ?.referenceSource,
        start,
        text: source.slice(start, end),
    };
}

function encodeTitle(title: string): string {
    return encodeURIComponent(title.replaceAll(" ", "_")).replaceAll(
        "%2F",
        "/",
    );
}
