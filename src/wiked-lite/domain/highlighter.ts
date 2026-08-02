/** Pure wikitext classification for the enhanced editor surface. */

import {
    wikitext,
    type ParsedTemplateCall,
    type ParsedTemplateParameter,
    type SourceRange,
} from "#shared/wikitext";

export interface HighlightSegment {
    classNames: string[];
    end: number;
    href?: string;
    missingTitle?: string;
    referenceSource?: string;
    start: number;
    text: string;
}

export interface HighlightOptions {
    databaseName?: string;
    linkHelpers?: boolean;
    namespaceIds?: Readonly<Record<string, number>>;
}

interface DecoratedRange extends SourceRange {
    className: string;
    href?: string;
    missingTitle?: string;
    priority: number;
    referenceSource?: string;
}

interface EmphasisState {
    bold?: number;
    italic?: number;
}

const REFERENCE_TEMPLATE_NAMES = new Set(["r", "sfn"]);
const EFN_PATTERN = /^efn(?:$|[- /])/u;
const LINK_HELPER_PATTERN = /^(?:tsl|translink|link-[a-z0-9-]+)$/u;
const HIGHLIGHT_LITERAL_TAGS = [
    "chem",
    "graph",
    "hiero",
    "math",
    "nowiki",
    "poem",
    "pre",
    "score",
    "source",
    "syntaxhighlight",
    "templatedata",
    "timeline",
] as const;
const LITERAL_TOKEN_CLASSES: Readonly<Record<string, string>> = {
    chem: "wiked-lite-token--math",
    graph: "wiked-lite-token--pre",
    hiero: "wiked-lite-token--score",
    math: "wiked-lite-token--math",
    nowiki: "wiked-lite-token--nowiki",
    poem: "wiked-lite-token--pre",
    pre: "wiked-lite-token--block-literal",
    score: "wiked-lite-token--score",
    source: "wiked-lite-token--block-literal",
    syntaxhighlight: "wiked-lite-token--block-literal",
    templatedata: "wiked-lite-token--pre",
    timeline: "wiked-lite-token--score",
};
const FALLBACK_NAMESPACE_IDS: Readonly<Record<string, number>> = {
    category: 14,
    file: 6,
    image: 6,
};
const NON_VISIBLE_LINK_TOKEN_CLASSES = new Set([
    "wiked-lite-token--html-tag",
    "wiked-lite-token--parameter",
    "wiked-lite-token--template-delimiter",
    "wiked-lite-token--template-name",
    "wiked-lite-token--wiki-markup",
]);
const NOTE_TA_NAMES = new Set([
    "noteta",
    "ta",
    "noteat",
    "noteta/default",
    "note ta",
    "noteta-lite",
    "ta-lite",
    "tal",
]);
const EN_IMAGE_TEMPLATE_NAMES = normalizeNames([
    "Multiple image",
    "Auto images",
    "Autoimages",
    "Double image",
    "Double image stack",
    "Double images",
    "Doubleimage",
    "Dual image",
    "Four images",
    "Mehrere Bilder",
    "MImage",
    "Mim",
    "Mimg",
    "Mulitple images",
    "Multi image",
    "Multiimage",
    "Multimage",
    "Multimg",
    "Multiple iamge",
    "Multiple images",
    "Multiple video",
    "Multipleimage",
    "Multipleimages",
    "Multipic",
    "Triple image",
    "Tripleimage",
    "Vertical images list",
]);
const ZH_IMAGE_TEMPLATE_NAMES = normalizeNames([
    "Multiple image",
    "Auto images",
    "MI",
    "Multiple images",
    "Multipleimage",
    "並列圖像",
    "并列图像",
    "多个图像",
    "多图",
    "多图并列",
    "File2",
    "File",
    "Image",
    "图像",
    "圖片",
    "文件",
    "文件2",
    "FileTA",
    "ImageTA",
]);

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
    const linkHelpers = options.linkHelpers === true;
    const databaseName = options.databaseName ?? "";
    const ranges = [
        ...createOpaqueDecorations(source),
        ...createTagDecorations(source),
        ...createTemplateDecorations(source, linkHelpers, databaseName),
        ...createReferenceDecorations(source),
        ...createLinkDecorations(
            source,
            options.namespaceIds ?? FALLBACK_NAMESPACE_IDS,
        ),
        ...createLanguageConversionDecorations(source, linkHelpers),
        ...createEmphasisDecorations(source),
        ...createPatternDecorations(source),
    ];
    return partitionRanges(source, ranges);
}

function createReferenceDecorations(source: string): DecoratedRange[] {
    const query = createHighlightQuery(source);
    const definitionRegions = query.tags
        .getAll("references")
        .filter((tag) => tag.closed && !tag.selfClosing);
    return query.tags
        .getAll("ref")
        .filter(
            (tag) =>
                !definitionRegions.some(
                    (region) =>
                        region.contentStart <= tag.start &&
                        tag.end <= region.contentEnd,
                ),
        )
        .map(function decorate(tag) {
            const end = tag.closed ? tag.end : tag.contentStart;
            return {
                className: "wiked-lite-token--reference",
                end,
                priority: 80,
                referenceSource: source.slice(tag.start, end),
                start: tag.start,
            };
        });
}

function createOpaqueDecorations(source: string): DecoratedRange[] {
    const query = createHighlightQuery(source);
    const literalRanges = query.tag
        .getAll()
        .filter((tag) => tag.protectedContent)
        .map(function decorate(tag) {
            return {
                className:
                    LITERAL_TOKEN_CLASSES[tag.name] ?? "wiked-lite-token--pre",
                end: tag.end,
                priority: 100,
                start: tag.start,
            };
        });
    const comments = query.comment
        .getAll()
        .filter((comment) => !isInsideRange(comment, literalRanges))
        .map(function decorate(comment) {
            return {
                ...comment,
                className: "wiked-lite-token--comment",
                priority: 100,
            };
        });
    return [...literalRanges, ...comments];
}

function isInsideRange(inner: SourceRange, ranges: SourceRange[]): boolean {
    return ranges.some(
        (range) => range.start <= inner.start && inner.end <= range.end,
    );
}

function createTagDecorations(source: string): DecoratedRange[] {
    return createHighlightQuery(source)
        .tag.getAll()
        .flatMap(function decorate(tag) {
            const ranges: DecoratedRange[] = [
                {
                    className: "wiked-lite-token--html-tag",
                    end: tag.contentStart,
                    priority: 40,
                    start: tag.start,
                },
            ];
            if (!tag.selfClosing && tag.contentEnd < tag.end) {
                ranges.push({
                    className: "wiked-lite-token--html-tag",
                    end: tag.end,
                    priority: 40,
                    start: tag.contentEnd,
                });
            }
            return ranges;
        });
}

function createTemplateDecorations(
    source: string,
    linkHelpersEnabled: boolean,
    databaseName: string,
): DecoratedRange[] {
    return createHighlightQuery(source)
        .template.getAll()
        .flatMap(function decorate(template) {
            const name = wikitext.template.normalizeName(template.name);
            const isReferencePreview = REFERENCE_TEMPLATE_NAMES.has(name);
            const isLinkHelper = linkHelpersEnabled && isLinkHelperName(name);
            const decoration: DecoratedRange = {
                end: template.end,
                start: template.start,
                className: getTemplateClass(
                    name,
                    template.depth,
                    databaseName,
                ),
                href: `/wiki/Template:${encodeTitle(template.name)}`,
                priority: 30 + template.depth,
                referenceSource: isReferencePreview ? template.raw : undefined,
            };
            return [
                decoration,
                ...createTemplateDelimiterDecorations(template),
                ...createTemplateSyntaxDecorations(source, template),
                ...(isLinkHelper
                    ? createLinkHelperDecorations(source, template, name)
                    : []),
                ...createNoteTAConversionDecorations(
                    source,
                    template,
                    name,
                    linkHelpersEnabled,
                ),
            ];
        });
}

function createTemplateDelimiterDecorations(
    template: ParsedTemplateCall,
): DecoratedRange[] {
    const priority = 49 + template.depth;
    const ranges = [
        createDelimiterRange(template.start, template.start + 2, priority),
        createDelimiterRange(template.end - 2, template.end, priority),
    ];
    for (const parameter of template.params) {
        ranges.push(
            createDelimiterRange(
                parameter.start - 1,
                parameter.start,
                priority,
            ),
        );
        if (!parameter.positional) {
            ranges.push(
                createDelimiterRange(
                    parameter.valueStart - 1,
                    parameter.valueStart,
                    priority,
                ),
            );
        }
    }
    return ranges;
}

function createDelimiterRange(
    start: number,
    end: number,
    priority: number,
): DecoratedRange {
    return {
        className: "wiked-lite-token--template-delimiter",
        end,
        priority,
        start,
    };
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
    databaseName: string,
): string {
    if (REFERENCE_TEMPLATE_NAMES.has(name)) {
        return "wiked-lite-token--reference";
    }
    if (EFN_PATTERN.test(name)) {
        return "wiked-lite-token--footnote";
    }
    if (isImageTemplate(name, databaseName)) {
        return "wiked-lite-token--image-template";
    }
    return `wiked-lite-token--template-${Math.min(depth, 4)}`;
}

function isImageTemplate(name: string, databaseName: string): boolean {
    if (databaseName === "enwiki") {
        return EN_IMAGE_TEMPLATE_NAMES.has(name);
    }
    return databaseName === "zhwiki" && ZH_IMAGE_TEMPLATE_NAMES.has(name);
}

function createLinkHelperDecorations(
    source: string,
    template: ParsedTemplateCall,
    name: string,
): DecoratedRange[] {
    const parameters = indexTemplateParameters(template);
    const descriptor = getLinkHelperDescriptor(name, parameters);
    if (descriptor == null) {
        return [];
    }
    const target = parameters.get(descriptor.targetKey);
    if (target == null || target.value === "") {
        return [];
    }
    const href = `/wiki/${encodeTitle(target.value)}`;
    const targetClass =
        descriptor.displayKey === ""
            ? "wiked-lite-token--link-helper"
            : "wiked-lite-token--link";
    const targetRange = decorateParameterValue(
        source,
        target,
        targetClass,
        href,
    );
    const display = parameters.get(descriptor.displayKey);
    const displayRange =
        display == null
            ? null
            : decorateParameterValue(
                  source,
                  display,
                  "wiked-lite-token--link-helper",
                  href,
              );
    return [targetRange, displayRange].filter(isDecoratedRange);
}

function indexTemplateParameters(
    template: ParsedTemplateCall,
): Map<string, ParsedTemplateParameter> {
    return new Map(
        template.params.map((parameter) => [
            parameter.name.toLowerCase(),
            parameter,
        ]),
    );
}

function getLinkHelperDescriptor(
    name: string,
    parameters: ReadonlyMap<string, ParsedTemplateParameter>,
): { displayKey: string; targetKey: string } | null {
    const has = (key: string) => (parameters.get(key)?.value ?? "") !== "";
    if (name === "tsl" || name === "translink") {
        return { displayKey: has("4") ? "4" : "", targetKey: "3" };
    }
    if (name === "link-wikidata" || name === "link-wd") {
        return {
            displayKey: has("2") ? "2" : "",
            targetKey: has("title") ? "title" : "page",
        };
    }
    if (/^(?:ill|illm|interlanguage link multi)$/u.test(name)) {
        return { displayKey: has("lt") ? "lt" : "", targetKey: "1" };
    }
    if (!isLinkHelperName(name)) {
        return null;
    }
    return {
        displayKey: has("d") ? "d" : has("3") ? "3" : "",
        targetKey: "1",
    };
}

function isLinkHelperName(name: string): boolean {
    return (
        name === "le" ||
        name === "lj" ||
        name === "link-wikidata" ||
        name === "link-wd" ||
        /^(?:ill|illm|interlanguage link multi)$/u.test(name) ||
        /^(?:internal link helper|ilh)\/[a-z0-9-]+$/u.test(name) ||
        LINK_HELPER_PATTERN.test(name) ||
        /^[a-z0-9-]+-link$/u.test(name)
    );
}

function decorateParameterValue(
    source: string,
    parameter: ParsedTemplateParameter,
    className: string,
    href?: string,
): DecoratedRange | null {
    if (parameter.value === "") {
        return null;
    }
    const start = source.indexOf(parameter.value, parameter.valueStart);
    if (start < parameter.valueStart || start >= parameter.valueEnd) {
        return null;
    }
    return {
        className,
        end: start + parameter.value.length,
        href,
        priority: 45,
        start,
    };
}

function isDecoratedRange(
    range: DecoratedRange | null,
): range is DecoratedRange {
    return range != null;
}

function createLinkDecorations(
    source: string,
    namespaceIds: Readonly<Record<string, number>>,
): DecoratedRange[] {
    return createHighlightQuery(source)
        .link.getAll()
        .flatMap((range) => decorateLink(source, range, namespaceIds));
}

function decorateLink(
    source: string,
    range: SourceRange,
    namespaceIds: Readonly<Record<string, number>>,
): DecoratedRange[] {
    const contentStart = range.start + 2;
    const contentEnd = range.end - 2;
    const inner = source.slice(contentStart, contentEnd);
    const parts = createHighlightQuery(inner).splitRanges("|");
    const target = parts[0]?.value.trim() ?? "";
    const namespaceId = getLinkNamespaceId(target, namespaceIds);
    const className = getLinkClass(namespaceId);
    const href = `/wiki/${encodeTitle(target.replace(/^:/u, ""))}`;
    const ranges: DecoratedRange[] = [
        { ...range, className, href, priority: 20 },
        ...createLinkMarkupDecorations(contentStart, contentEnd, range, parts),
    ];
    const targetRange = parts[0];
    if (namespaceId === 6 && targetRange != null) {
        ranges.push({
            className: "wiked-lite-token--file",
            end: contentStart + targetRange.end,
            priority: 25,
            start: contentStart + targetRange.start,
        });
    }
    ranges.push(
        createLinkTextDecoration(
            contentStart,
            contentEnd,
            parts,
            target,
            namespaceId,
        ),
    );
    return ranges;
}

function createLinkMarkupDecorations(
    contentStart: number,
    contentEnd: number,
    range: SourceRange,
    parts: ReturnType<ReturnType<typeof createHighlightQuery>["splitRanges"]>,
): DecoratedRange[] {
    const ranges = [
        createMarkupRange(range.start, contentStart),
        createMarkupRange(contentEnd, range.end),
    ];
    for (let index = 1; index < parts.length; index += 1) {
        const previous = parts[index - 1];
        const current = parts[index];
        if (previous != null && current != null) {
            ranges.push(
                createMarkupRange(
                    contentStart + previous.end,
                    contentStart + current.start,
                ),
            );
        }
    }
    return ranges;
}

function createLinkTextDecoration(
    contentStart: number,
    contentEnd: number,
    parts: ReturnType<ReturnType<typeof createHighlightQuery>["splitRanges"]>,
    target: string,
    namespaceId: number | undefined,
): DecoratedRange {
    const targetRange = parts[0];
    const displayRange =
        namespaceId === 6 || namespaceId === 14
            ? targetRange
            : parts.length > 1
              ? parts[1]
              : targetRange;
    return {
        className: "wiked-lite-token--link-text",
        end:
            displayRange == null
                ? contentEnd
                : contentStart + displayRange.end,
        missingTitle: normalizeMissingTitle(target),
        priority: 21,
        start:
            displayRange == null
                ? contentStart
                : contentStart + displayRange.start,
    };
}

function normalizeMissingTitle(target: string): string | undefined {
    const title = target.replace(/^:/u, "").split("#", 1)[0]?.trim();
    return title === "" ? undefined : title;
}

function createMarkupRange(start: number, end: number): DecoratedRange {
    return {
        className: "wiked-lite-token--wiki-markup",
        end,
        priority: 40,
        start,
    };
}

function getLinkClass(namespaceId: number | undefined): string {
    if (namespaceId === 6) {
        return "wiked-lite-token--file-link";
    }
    return namespaceId === 14
        ? "wiked-lite-token--category"
        : "wiked-lite-token--link";
}

function getLinkNamespaceId(
    rawTarget: string,
    namespaceIds: Readonly<Record<string, number>>,
): number | undefined {
    if (rawTarget.startsWith(":")) {
        return undefined;
    }
    const title = rawTarget.split("#", 1)[0] ?? "";
    const colon = title.indexOf(":");
    if (colon < 0) {
        return undefined;
    }
    const prefix = title
        .slice(0, colon)
        .trim()
        .toLowerCase()
        .replaceAll(" ", "_");
    return namespaceIds[prefix];
}

function createLanguageConversionDecorations(
    source: string,
    enabled: boolean,
): DecoratedRange[] {
    if (!enabled) {
        return [];
    }
    return [...source.matchAll(/-\{[\s\S]*?\}-/gu)].flatMap(
        function decorate(match) {
            const start = match.index;
            const end = start + match[0].length;
            return [
                {
                    className: "wiked-lite-token--language-conversion",
                    end,
                    priority: 35,
                    start,
                },
                ...decorateLanguageVariants(source, start, end),
            ];
        },
    );
}

function createNoteTAConversionDecorations(
    source: string,
    template: ParsedTemplateCall,
    name: string,
    enabled: boolean,
): DecoratedRange[] {
    if (!enabled || !isNoteTAName(name)) {
        return [];
    }
    return template.params.flatMap(function decorate(parameter) {
        const eligible =
            parameter.positional ||
            parameter.name === "t" ||
            /^\d+$/u.test(parameter.name);
        if (!eligible || !/\bzh(?:-[a-z0-9]+)+\s*:/iu.test(parameter.value)) {
            return [];
        }
        const range = decorateParameterValue(
            source,
            parameter,
            "wiked-lite-token--language-conversion",
        );
        return range == null
            ? []
            : [
                  range,
                  ...decorateLanguageVariants(source, range.start, range.end),
              ];
    });
}

function decorateLanguageVariants(
    source: string,
    start: number,
    end: number,
): DecoratedRange[] {
    const ranges: DecoratedRange[] = [];
    const pattern = /\bzh(?:-[a-z0-9]+)+(?=\s*:)/giu;
    pattern.lastIndex = start;
    let match = pattern.exec(source);
    while (match != null && match.index < end) {
        ranges.push({
            className: "wiked-lite-token--language-variant",
            end: match.index + match[0].length,
            priority: 55,
            start: match.index,
        });
        match = pattern.exec(source);
    }
    return ranges;
}

function isNoteTAName(name: string): boolean {
    return NOTE_TA_NAMES.has(name) || /^全文字[詞词][轉转][換换]$/u.test(name);
}

function createPatternDecorations(source: string): DecoratedRange[] {
    const patterns: Array<[RegExp, string, number]> = [
        [/^\s*[#*:;]+/gmu, "wiked-lite-token--list", 10],
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
        ...createTableDecorations(source),
        ...createHeadingDecorations(source),
    ];
}

function createTableDecorations(source: string): DecoratedRange[] {
    const query = createHighlightQuery(source);
    const tables = query.table.getAll();
    const parameterDelimiters = new Set(
        query.template
            .getAll()
            .flatMap((template) => template.params)
            .map((parameter) => parameter.start - 1),
    );
    return [...source.matchAll(/^\s*[|!]\s?.*$/gmu)]
        .filter((match) =>
            isTableSyntaxLine(match, tables, parameterDelimiters),
        )
        .map(function decorate(match) {
            const start = match.index ?? 0;
            return {
                className: "wiked-lite-token--table",
                end: start + match[0].length,
                priority: 10,
                start,
            };
        });
}

function isTableSyntaxLine(
    match: RegExpMatchArray,
    tables: SourceRange[],
    parameterDelimiters: ReadonlySet<number>,
): boolean {
    const start = match.index ?? 0;
    const markerOffset = match[0].search(/[|!]/u);
    const marker = start + markerOffset;
    return (
        !parameterDelimiters.has(marker) &&
        tables.some((table) => table.start <= start && start < table.end)
    );
}

function createEmphasisDecorations(source: string): DecoratedRange[] {
    const query = createHighlightQuery(source);
    const protectedRanges = mergeSourceRanges([
        ...query.comment.getAll(),
        ...query.opaque.getAll(),
        ...query.tag.getAll().flatMap(function protectTagMarkup(tag) {
            const ranges: SourceRange[] = [
                { end: tag.contentStart, start: tag.start },
            ];
            if (tag.contentEnd < tag.end) {
                ranges.push({ end: tag.end, start: tag.contentEnd });
            }
            return ranges;
        }),
        ...createTemplateEmphasisExclusions(source, query.template.getAll()),
        ...createLinkEmphasisExclusions(source, query.link.getAll()),
    ]);
    const ranges: DecoratedRange[] = [];
    const state: EmphasisState = {};
    let protectedIndex = 0;
    for (const match of source.matchAll(/'{2,}|\n/gu)) {
        if (match[0] === "\n") {
            resetEmphasisState(state);
            continue;
        }
        const markerStart = match.index ?? 0;
        while (protectedRanges[protectedIndex]?.end <= markerStart) {
            protectedIndex += 1;
        }
        decorateEmphasisMarker(
            markerStart,
            match[0].length,
            state,
            protectedRanges[protectedIndex],
            ranges,
        );
    }
    return ranges;
}

function createTemplateEmphasisExclusions(
    source: string,
    templates: ParsedTemplateCall[],
): SourceRange[] {
    return templates.flatMap(function protectTemplateSyntax(template) {
        const ranges: SourceRange[] = [];
        const nameStart = source.indexOf(template.name, template.start + 2);
        if (nameStart >= 0 && nameStart < template.end) {
            ranges.push({
                end: nameStart + template.name.length,
                start: nameStart,
            });
        }
        for (const parameter of template.params) {
            if (!parameter.positional) {
                ranges.push({
                    end: parameter.valueStart,
                    start: parameter.start,
                });
            }
        }
        return ranges;
    });
}

function createLinkEmphasisExclusions(
    source: string,
    links: SourceRange[],
): SourceRange[] {
    return links.flatMap(function protectLinkTarget(link) {
        const contentStart = link.start + 2;
        const inner = source.slice(contentStart, link.end - 2);
        const target = createHighlightQuery(inner).splitRanges("|")[0];
        return target == null
            ? []
            : [
                  {
                      end: contentStart + target.end,
                      start: contentStart + target.start,
                  },
              ];
    });
}

function mergeSourceRanges(ranges: SourceRange[]): SourceRange[] {
    const merged: SourceRange[] = [];
    const sorted = ranges
        .filter((range) => range.start < range.end)
        .toSorted((left, right) => left.start - right.start);
    for (const range of sorted) {
        const previous = merged.at(-1);
        if (previous == null || previous.end < range.start) {
            merged.push({ ...range });
        } else {
            previous.end = Math.max(previous.end, range.end);
        }
    }
    return merged;
}

function decorateEmphasisMarker(
    markerStart: number,
    length: number,
    state: EmphasisState,
    protectedRange: SourceRange | undefined,
    ranges: DecoratedRange[],
): void {
    if (
        (length !== 2 && length !== 3 && length !== 5) ||
        (protectedRange != null &&
            protectedRange.start <= markerStart &&
            markerStart < protectedRange.end)
    ) {
        return;
    }
    const markerEnd = markerStart + length;
    ranges.push(createMarkupRange(markerStart, markerEnd));
    toggleEmphasis(state, length, markerEnd, markerStart, ranges);
}

function resetEmphasisState(state: EmphasisState): void {
    delete state.bold;
    delete state.italic;
}

function toggleEmphasis(
    state: EmphasisState,
    markerLength: number,
    contentStart: number,
    contentEnd: number,
    ranges: DecoratedRange[],
): void {
    if (markerLength === 3 || markerLength === 5) {
        toggleEmphasisStyle(state, "bold", contentStart, contentEnd, ranges);
    }
    if (markerLength === 2 || markerLength === 5) {
        toggleEmphasisStyle(state, "italic", contentStart, contentEnd, ranges);
    }
}

function toggleEmphasisStyle(
    state: EmphasisState,
    style: keyof EmphasisState,
    contentStart: number,
    contentEnd: number,
    ranges: DecoratedRange[],
): void {
    const start = state[style];
    if (start == null) {
        state[style] = contentStart;
        return;
    }
    ranges.push({
        className: `wiked-lite-token--${style}`,
        end: contentEnd,
        priority: 15,
        start,
    });
    delete state[style];
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

function partitionRanges(
    source: string,
    ranges: DecoratedRange[],
): HighlightSegment[] {
    const boundaries = new Set([0, source.length]);
    const starts = new Map<number, DecoratedRange[]>();
    const ends = new Map<number, DecoratedRange[]>();
    for (const range of ranges) {
        boundaries.add(range.start);
        boundaries.add(range.end);
        addRangeBoundary(starts, range.start, range);
        addRangeBoundary(ends, range.end, range);
    }
    const points = [...boundaries].sort((left, right) => left - right);
    const segments: HighlightSegment[] = [];
    const active = new Set<DecoratedRange>();
    for (let index = 0; index < points.length - 1; index += 1) {
        const start = points[index];
        const end = points[index + 1];
        starts.get(start)?.forEach((range) => active.add(range));
        ends.get(start)?.forEach((range) => active.delete(range));
        if (start !== end) {
            segments.push(createSegment(source, start, end, [...active]));
        }
    }
    return segments;
}

function addRangeBoundary(
    boundaries: Map<number, DecoratedRange[]>,
    point: number,
    range: DecoratedRange,
): void {
    const matches = boundaries.get(point) ?? [];
    matches.push(range);
    boundaries.set(point, matches);
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
    const classNames = [...new Set(visible.map((range) => range.className))];
    return {
        classNames,
        end,
        href: visible.find((range) => range.href != null)?.href,
        missingTitle: getVisibleMissingTitle(visible, classNames),
        referenceSource: visible.find((range) => range.referenceSource != null)
            ?.referenceSource,
        start,
        text: source.slice(start, end),
    };
}

function getVisibleMissingTitle(
    ranges: DecoratedRange[],
    classNames: string[],
): string | undefined {
    if (classNames.some((name) => NON_VISIBLE_LINK_TOKEN_CLASSES.has(name))) {
        return undefined;
    }
    return ranges.find((range) => range.missingTitle != null)?.missingTitle;
}

function encodeTitle(title: string): string {
    return encodeURIComponent(title.replaceAll(" ", "_")).replaceAll(
        "%2F",
        "/",
    );
}

function createHighlightQuery(source: string) {
    return wikitext(source, { literalTags: HIGHLIGHT_LITERAL_TAGS });
}

function normalizeNames(names: string[]): Set<string> {
    return new Set(names.map((name) => wikitext.template.normalizeName(name)));
}
