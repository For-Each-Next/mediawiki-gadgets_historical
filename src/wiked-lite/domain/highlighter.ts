/** Pure wikitext classification for the enhanced editor surface. */

import {
    formatNamespaceTitle,
    getNamespaceId,
    getNamespacePrefixes,
    stripNamespacePrefix,
    wikitext,
    type NamespaceSource,
    type ParsedTemplateCall,
    type ParsedTemplateParameter,
    type SourceRange,
    type TopLevelRange,
    type WikitextTag,
} from "#shared/wikitext";
import {
    classifyTemplateHead,
    type TemplateHeadSyntax,
} from "#gadget/domain/magic-words.ts";

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
    namespaceSource?: NamespaceSource;
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

interface CssScanState {
    comment: boolean;
    parentheses: number;
    quote: string;
}

interface ReferenceNestingContext {
    referenceBodies: SourceRange[];
    resetRegions: SourceRange[];
}

interface TemplateDecorationContext {
    databaseName: string;
    linkHelpersEnabled: boolean;
    namespaceSource: NamespaceSource;
    referenceNesting: ReferenceNestingContext;
    templates: ParsedTemplateCall[];
}

interface TemplateNestingRegion extends SourceRange {
    baseDepth: number;
}

const REFERENCE_TEMPLATE_NAMES = new Set(["r", "sfn"]);
const EFN_PATTERN = /^efn(?:$|[- /])/u;
const LINK_HELPER_PATTERN = /^(?:tsl|translink|link-[a-z0-9-]+)$/u;
const HIGHLIGHT_LITERAL_TAGS = [
    "chem",
    "graph",
    "hiero",
    "mapframe",
    "math",
    "nowiki",
    "poem",
    "pre",
    "score",
    "source",
    "syntaxhighlight",
    "templatedata",
    "templatestyles",
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
const NON_VISIBLE_LINK_TOKEN_CLASSES = new Set([
    "wiked-lite-token--html-tag",
    "wiked-lite-token--module-name",
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
const FILE_LITERAL_OPTIONS = new Set([
    "baseline",
    "border",
    "bottom",
    "center",
    "centre",
    "enframed",
    "frame",
    "framed",
    "frameless",
    "left",
    "loop",
    "middle",
    "muted",
    "none",
    "right",
    "sub",
    "sup",
    "super",
    "text-bottom",
    "text-top",
    "thumb",
    "thumbnail",
    "top",
    "upright",
]);
const FILE_NAMED_OPTIONS = new Set([
    "alt",
    "class",
    "disablecontrols",
    "end",
    "lang",
    "link",
    "lossy",
    "page",
    "start",
    "thumb",
    "thumbnail",
    "thumbtime",
    "upright",
]);
const FILE_SPACED_OPTIONS = new Set(["page", "upright"]);
const FILE_SIZE_OPTION_PATTERN = /^(?:(\d+)(?:x(\d+))?|x(\d+))[ \t]*px$/u;
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
    const namespaceSource = options.namespaceSource ?? "enwiki";
    const databaseName =
        options.databaseName ??
        (typeof namespaceSource === "string"
            ? namespaceSource
            : namespaceSource.databaseName);
    const referenceNesting = createReferenceNestingContext(
        source,
        namespaceSource,
    );
    const ranges = [
        ...createOpaqueDecorations(source),
        ...createTagDecorations(source),
        ...createTemplateDecorations(
            source,
            linkHelpers,
            databaseName,
            referenceNesting,
            namespaceSource,
        ),
        ...createReferenceNestingDecorations(referenceNesting),
        ...createReferenceDecorations(source, referenceNesting),
        ...createLinkDecorations(source, namespaceSource),
        ...createLanguageConversionDecorations(source, linkHelpers),
        ...createEmphasisDecorations(source),
        ...createPatternDecorations(source),
    ];
    return partitionRanges(source, ranges);
}

/**
 * Collects local targets from supported interlanguage-link helpers.
 *
 * @param source - Source text.
 * @param namespaceSource - Database-scoped namespace data.
 * @returns Unique local page targets.
 */
export function collectLinkHelperTitles(
    source: string,
    namespaceSource: NamespaceSource = "enwiki",
): string[] {
    const titles = createHighlightQuery(source)
        .template.getAll()
        .flatMap(function getTarget(template) {
            const name = normalizeCurrentTemplateName(
                template.name,
                namespaceSource,
            );
            const parameters = indexTemplateParameters(template);
            const descriptor = getLinkHelperDescriptor(name, parameters);
            const target = parameters.get(descriptor?.targetKey ?? "")?.value;
            const title =
                target == null ? undefined : normalizeMissingTitle(target);
            return title == null ? [] : [title.replaceAll("_", " ")];
        });
    return [...new Set(titles)];
}

function createReferenceNestingContext(
    source: string,
    namespaceSource: NamespaceSource,
): ReferenceNestingContext {
    const query = createHighlightQuery(source);
    const nativeRegions = query.tags
        .getAll("references")
        .filter((tag) => !tag.selfClosing)
        .map((tag) => ({ end: tag.contentEnd, start: tag.contentStart }));
    const templateRegions = getReferenceTemplateRegions(
        query.templates.getAll(),
        namespaceSource,
    );
    const resetRegions = [...nativeRegions, ...templateRegions].filter(
        (region) => region.start < region.end,
    );
    const definitionTags = query.tags
        .getAll("ref")
        .filter((tag) =>
            resetRegions.some((region) => containsRange(region, tag)),
        );
    const referenceBodies = definitionTags
        .filter((tag) => !tag.selfClosing && tag.contentStart < tag.contentEnd)
        .map((tag) => ({ end: tag.contentEnd, start: tag.contentStart }));
    return { referenceBodies, resetRegions };
}

function getReferenceTemplateRegions(
    templates: ParsedTemplateCall[],
    namespaceSource: NamespaceSource,
): SourceRange[] {
    return templates
        .filter(
            (template) =>
                normalizeCurrentTemplateName(
                    template.name,
                    namespaceSource,
                ) === "reflist",
        )
        .flatMap((template) =>
            template.params
                .filter(
                    (parameter) =>
                        !parameter.positional &&
                        /^(?:list|refs)$/iu.test(parameter.name),
                )
                .map((parameter) => ({
                    end: parameter.valueEnd,
                    start: parameter.valueStart,
                })),
        );
}

function createReferenceNestingDecorations(
    context: ReferenceNestingContext,
): DecoratedRange[] {
    const referenceBodies = context.referenceBodies.flatMap((range) =>
        subtractDecoratedRanges(
            {
                ...range,
                className: "wiked-lite-token--template-1",
                priority: 30,
            },
            context.resetRegions.filter(
                (region) =>
                    region.start < range.end &&
                    range.start < region.end &&
                    !containsRange(region, range),
            ),
        ),
    );
    return [
        ...context.resetRegions.map((range) => ({
            ...range,
            className: "wiked-lite-token--template-0",
            priority: 29,
        })),
        ...referenceBodies,
    ];
}

function createReferenceDecorations(
    source: string,
    context: ReferenceNestingContext,
): DecoratedRange[] {
    const query = createHighlightQuery(source);
    return query.tags
        .getAll("ref")
        .filter(
            (tag) =>
                !context.resetRegions.some((region) =>
                    containsRange(region, tag),
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

function containsRange(outer: SourceRange, inner: SourceRange): boolean {
    return outer.start <= inner.start && inner.end <= outer.end;
}

function trimSourceRange(
    source: string,
    initialStart: number,
    initialEnd: number,
): SourceRange {
    let start = initialStart;
    let end = initialEnd;
    while (start < end && /\s/u.test(source[start] ?? "")) {
        start += 1;
    }
    while (start < end && /\s/u.test(source[end - 1] ?? "")) {
        end -= 1;
    }
    return { end, start };
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
    const tags = createHighlightQuery(source).tag.getAll();
    const ancestors: SourceRange[] = [];
    const ranges: DecoratedRange[] = [];
    for (const tag of tags) {
        removeCompletedTagAncestors(ancestors, tag);
        const depth = ancestors.length;
        ranges.push(...decorateTag(source, tag, depth));
        if (tag.closed && !tag.selfClosing) {
            ancestors.push(tag);
        }
    }
    return ranges;
}

function removeCompletedTagAncestors(
    ancestors: SourceRange[],
    tag: SourceRange,
): void {
    while (ancestors.length > 0) {
        const parent = ancestors.at(-1);
        if (parent != null && containsRange(parent, tag)) {
            return;
        }
        ancestors.pop();
    }
}

function decorateTag(
    source: string,
    tag: WikitextTag,
    depth: number,
): DecoratedRange[] {
    const visibleDepth = Math.min(depth, 4);
    const ranges: DecoratedRange[] = [
        {
            className: "wiked-lite-token--html-tag",
            end: tag.contentStart,
            priority: 40,
            start: tag.start,
        },
    ];
    if (
        tag.closed &&
        !tag.protectedContent &&
        tag.contentStart < tag.contentEnd &&
        depth <= 4
    ) {
        ranges.push({
            className: `wiked-lite-token--html-content-${visibleDepth}`,
            end: tag.contentEnd,
            priority: 30 + visibleDepth,
            start: tag.contentStart,
        });
    }
    if (!tag.selfClosing && tag.contentEnd < tag.end) {
        ranges.push({
            className: "wiked-lite-token--html-tag",
            end: tag.end,
            priority: 40,
            start: tag.contentEnd,
        });
    }
    return [
        ...ranges,
        ...createTagAttributeDecorations(source, tag.start, tag.contentStart),
    ];
}

function createTagAttributeDecorations(
    source: string,
    openingStart: number,
    openingEnd: number,
): DecoratedRange[] {
    const opening = source.slice(openingStart, openingEnd);
    const tagName = /^<\s*[\p{L}\p{N}:-]+/u.exec(opening)?.[0];
    if (tagName == null) {
        return [];
    }
    const attributesStart = openingStart + tagName.length;
    const attributes = source.slice(attributesStart, openingEnd - 1);
    const pattern =
        /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/gu;
    return [...attributes.matchAll(pattern)].flatMap((match) =>
        decorateTagAttribute(source, attributesStart, match),
    );
}

function decorateTagAttribute(
    source: string,
    attributesStart: number,
    match: RegExpMatchArray,
): DecoratedRange[] {
    const enteredName = match[1];
    const name = enteredName?.toLocaleLowerCase();
    if (enteredName == null || (name !== "lang" && name !== "style")) {
        return [];
    }
    const nameStart = attributesStart + (match.index ?? 0);
    const nameRange: DecoratedRange = {
        className: "wiked-lite-token--parameter",
        end: nameStart + enteredName.length,
        priority: 101,
        start: nameStart,
    };
    const valueRange = getTagAttributeValueRange(attributesStart, match);
    return name !== "style" || valueRange == null
        ? [nameRange]
        : [
              nameRange,
              ...createCssDisplayDecorations(
                  source,
                  valueRange.start,
                  valueRange.end,
              ),
          ];
}

function getTagAttributeValueRange(
    attributesStart: number,
    match: RegExpMatchArray,
): SourceRange | null {
    const value = match[2] ?? match[3] ?? match[4];
    const equals = match[0].indexOf("=");
    if (value == null || equals < 0) {
        return null;
    }
    let valueOffset = equals + 1;
    while (/\s/u.test(match[0][valueOffset] ?? "")) {
        valueOffset += 1;
    }
    if (match[0][valueOffset] === '"' || match[0][valueOffset] === "'") {
        valueOffset += 1;
    }
    const start = attributesStart + (match.index ?? 0) + valueOffset;
    return { end: start + value.length, start };
}

function createCssDisplayDecorations(
    source: string,
    start: number,
    end: number,
): DecoratedRange[] {
    const style = source.slice(start, end);
    const scanStyle = maskCssWikitext(style);
    const separators = findCssTopLevelSeparators(scanStyle, ";");
    const boundaries = [-1, ...separators, style.length];
    const ranges: DecoratedRange[] = [];
    for (let index = 0; index < boundaries.length - 1; index += 1) {
        const declarationStart = (boundaries[index] ?? -1) + 1;
        const declarationEnd = boundaries[index + 1] ?? style.length;
        const declaration = scanStyle.slice(declarationStart, declarationEnd);
        const colon = findCssTopLevelSeparators(declaration, ":")[0];
        if (colon == null) {
            continue;
        }
        const property = trimSourceRange(
            source,
            start + declarationStart,
            start + declarationStart + colon,
        );
        if (
            source.slice(property.start, property.end).toLowerCase() !==
            "display"
        ) {
            continue;
        }
        ranges.push({
            ...property,
            className: "wiked-lite-token--language-variant",
            priority: 102,
        });
    }
    return ranges;
}

function maskCssWikitext(source: string): string {
    const query = createHighlightQuery(source);
    return maskSourceRanges(source, [
        ...query.comment.getAll(),
        ...query.opaque.getAll(),
        ...query.template.getAll(),
        ...query.link.getAll(),
        ...createTagMarkupRanges(source),
    ]);
}

function findCssTopLevelSeparators(
    source: string,
    separator: string,
): number[] {
    const separators: number[] = [];
    const state: CssScanState = { comment: false, parentheses: 0, quote: "" };
    for (let index = 0; index < source.length; index += 1) {
        const nextIndex = consumeCssProtectedSequence(source, index, state);
        if (nextIndex != null) {
            index = nextIndex - 1;
            continue;
        }
        const character = source[index] ?? "";
        if (character === "(") {
            state.parentheses += 1;
        } else if (character === ")") {
            state.parentheses = Math.max(0, state.parentheses - 1);
        } else if (character === separator && state.parentheses === 0) {
            separators.push(index);
        }
    }
    return separators;
}

function consumeCssProtectedSequence(
    source: string,
    index: number,
    state: CssScanState,
): number | undefined {
    const character = source[index] ?? "";
    const next = source[index + 1] ?? "";
    if (state.comment) {
        if (character === "*" && next === "/") {
            state.comment = false;
            return index + 2;
        }
        return index + 1;
    }
    if (state.quote !== "") {
        if (character === "\\") {
            return index + 2;
        }
        if (character === state.quote) {
            state.quote = "";
        }
        return index + 1;
    }
    if (character === "/" && next === "*") {
        state.comment = true;
        return index + 2;
    }
    if (character === '"' || character === "'") {
        state.quote = character;
        return index + 1;
    }
    return character === "\\" ? index + 2 : undefined;
}

function createTemplateDecorations(
    source: string,
    linkHelpersEnabled: boolean,
    databaseName: string,
    referenceNesting: ReferenceNestingContext,
    namespaceSource: NamespaceSource,
): DecoratedRange[] {
    const templates = createHighlightQuery(source).template.getAll();
    const context = {
        databaseName,
        linkHelpersEnabled,
        namespaceSource,
        referenceNesting,
        templates,
    };
    return templates.flatMap((template) =>
        decorateTemplate(source, template, context),
    );
}

function decorateTemplate(
    source: string,
    template: ParsedTemplateCall,
    context: TemplateDecorationContext,
): DecoratedRange[] {
    const name = normalizeCurrentTemplateName(
        template.name,
        context.namespaceSource,
    );
    const depth = getEffectiveTemplateDepth(
        template,
        context.templates,
        context.referenceNesting,
    );
    const ranges = [
        createTemplateMainDecoration(template, name, depth, context),
        ...createTemplateDelimiterDecorations(template, depth),
        ...createTemplateSyntaxDecorations(
            source,
            template,
            depth,
            context.databaseName,
            context.namespaceSource,
        ),
        ...(context.linkHelpersEnabled && isLinkHelperName(name)
            ? createLinkHelperDecorations(source, template, name)
            : []),
        ...createNoteTAConversionDecorations(
            source,
            template,
            name,
            context.linkHelpersEnabled,
        ),
    ];
    return clipOuterTemplateDecorations(ranges, template, [
        ...context.referenceNesting.resetRegions,
        ...context.referenceNesting.referenceBodies,
    ]);
}

function createTemplateMainDecoration(
    template: ParsedTemplateCall,
    name: string,
    depth: number,
    context: TemplateDecorationContext,
): DecoratedRange {
    return {
        end: template.end,
        start: template.start,
        className: getTemplateClass(name, depth, context.databaseName),
        priority: 30 + depth,
        referenceSource: REFERENCE_TEMPLATE_NAMES.has(name)
            ? template.raw
            : undefined,
    };
}

function getTemplateTitle(
    value: string,
    namespaceSource: NamespaceSource,
): string {
    const title = value.trim();
    if (title.startsWith(":")) {
        return title.slice(1).trimStart();
    }
    const separator = title.indexOf(":");
    if (separator >= 0) {
        const enteredPrefix = title.slice(0, separator).trim();
        const namespaceId = getNamespaceId(namespaceSource, enteredPrefix);
        if (namespaceId != null) {
            const remainder = title.slice(separator + 1).trim();
            const prefix =
                getNamespacePrefixes(namespaceSource, namespaceId)[0] ??
                enteredPrefix;
            return prefix === "" ? remainder : `${prefix}:${remainder}`;
        }
    }
    return formatNamespaceTitle(title, namespaceSource, 10);
}

function getTemplateHref(
    value: string,
    namespaceSource: NamespaceSource,
): string {
    return `/wiki/${encodeTitle(getTemplateTitle(value, namespaceSource))}`;
}

function normalizeCurrentTemplateName(
    value: string,
    namespaceSource: NamespaceSource,
): string {
    return stripNamespacePrefix(value, namespaceSource, 10)
        .replaceAll("_", " ")
        .trim()
        .replace(/\s+/gu, " ")
        .toLowerCase();
}

function getEffectiveTemplateDepth(
    template: ParsedTemplateCall,
    templates: ParsedTemplateCall[],
    context: ReferenceNestingContext,
): number {
    const nesting = findInnermostTemplateNestingRegion(template, context);
    if (nesting == null) {
        return template.depth;
    }
    const ancestors = templates.filter(
        (candidate) =>
            candidate !== template &&
            containsRange(nesting, candidate) &&
            candidate.start < template.start &&
            template.end < candidate.end,
    );
    return nesting.baseDepth + ancestors.length;
}

function findInnermostTemplateNestingRegion(
    inner: SourceRange,
    context: ReferenceNestingContext,
): TemplateNestingRegion | undefined {
    const regions = [
        ...context.resetRegions.map((range) => ({ ...range, baseDepth: 0 })),
        ...context.referenceBodies.map((range) => ({
            ...range,
            baseDepth: 1,
        })),
    ];
    return regions
        .filter((range) => containsRange(range, inner))
        .toSorted(
            (left, right) => left.end - left.start - (right.end - right.start),
        )[0];
}

function clipOuterTemplateDecorations(
    ranges: DecoratedRange[],
    template: ParsedTemplateCall,
    resetRegions: SourceRange[],
): DecoratedRange[] {
    const childRegions = resetRegions.filter(
        (region) =>
            region.start < template.end &&
            template.start < region.end &&
            !containsRange(region, template),
    );
    if (childRegions.length === 0) {
        return ranges;
    }
    return ranges.flatMap((range) =>
        subtractDecoratedRanges(range, childRegions),
    );
}

function subtractDecoratedRanges(
    range: DecoratedRange,
    exclusions: SourceRange[],
): DecoratedRange[] {
    let pieces = [range];
    for (const exclusion of mergeSourceRanges(exclusions)) {
        pieces = pieces.flatMap(function subtract(piece) {
            if (piece.end <= exclusion.start || exclusion.end <= piece.start) {
                return [piece];
            }
            const before =
                piece.start < exclusion.start
                    ? [{ ...piece, end: exclusion.start }]
                    : [];
            const after =
                exclusion.end < piece.end
                    ? [{ ...piece, start: exclusion.end }]
                    : [];
            return [...before, ...after];
        });
    }
    return pieces;
}

function createTemplateDelimiterDecorations(
    template: ParsedTemplateCall,
    depth: number,
): DecoratedRange[] {
    const priority = 49 + depth;
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
    depth: number,
    databaseName: string,
    namespaceSource: NamespaceSource,
): DecoratedRange[] {
    const priority = 50 + depth;
    const nameStart = source.indexOf(
        template.name,
        Math.min(template.start + 2, template.end),
    );
    const head =
        nameStart >= template.start && nameStart < template.end
            ? createTemplateHeadDecorations(
                  source,
                  classifyTemplateHead(
                      template.name,
                      template.params.length > 0,
                      databaseName,
                  ),
                  nameStart,
                  priority,
                  namespaceSource,
              )
            : [];
    return [
        ...head,
        ...createTemplateParameterNameDecorations(source, template, priority),
    ];
}

function createTemplateParameterNameDecorations(
    source: string,
    template: ParsedTemplateCall,
    priority: number,
): DecoratedRange[] {
    const ranges: DecoratedRange[] = [];
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

function createTemplateHeadDecorations(
    source: string,
    syntax: TemplateHeadSyntax,
    nameStart: number,
    priority: number,
    namespaceSource: NamespaceSource,
): DecoratedRange[] {
    const ranges = createTemplateModifierDecorations(
        syntax,
        nameStart,
        priority,
    );
    if (syntax.kind === "template") {
        return [
            ...ranges,
            ...createTemplateTargetDecoration(
                source,
                syntax.target,
                nameStart,
                priority,
                namespaceSource,
            ),
        ];
    }
    return [
        ...ranges,
        ...createMagicWordDecorations(
            source,
            syntax,
            nameStart,
            priority,
            namespaceSource,
        ),
    ];
}

function createMagicWordDecorations(
    source: string,
    syntax: Extract<TemplateHeadSyntax, { kind: "magic-word" }>,
    nameStart: number,
    priority: number,
    namespaceSource: NamespaceSource,
): DecoratedRange[] {
    return [
        createParserFunctionDecoration(syntax.magicWord, nameStart, priority),
        ...createModuleNameDecoration(
            source,
            syntax.invoke ? syntax.argument : undefined,
            nameStart,
            priority,
            namespaceSource,
        ),
    ];
}

function createTemplateModifierDecorations(
    syntax: TemplateHeadSyntax,
    nameStart: number,
    priority: number,
): DecoratedRange[] {
    return [
        ...syntax.modifiers.map((range) =>
            createParserFunctionDecoration(range, nameStart, priority),
        ),
        ...syntax.separators.map((range) =>
            createParserFunctionDecoration(range, nameStart, priority),
        ),
    ];
}

function createParserFunctionDecoration(
    range: SourceRange,
    offset: number,
    priority: number,
): DecoratedRange {
    return {
        className: "wiked-lite-token--parser-function",
        end: offset + range.end,
        priority,
        start: offset + range.start,
    };
}

function createTemplateTargetDecoration(
    source: string,
    targetRange: SourceRange,
    nameStart: number,
    priority: number,
    namespaceSource: NamespaceSource,
): DecoratedRange[] {
    const target = source.slice(
        nameStart + targetRange.start,
        nameStart + targetRange.end,
    );
    return target === ""
        ? []
        : [
              {
                  className: "wiked-lite-token--template-name",
                  end: nameStart + targetRange.end,
                  href: getTemplateHref(target, namespaceSource),
                  priority,
                  start: nameStart + targetRange.start,
              },
          ];
}

function createModuleNameDecoration(
    source: string,
    module: SourceRange | undefined,
    nameStart: number,
    priority: number,
    namespaceSource: NamespaceSource,
): DecoratedRange[] {
    if (module == null) {
        return [];
    }
    const moduleName = source.slice(
        nameStart + module.start,
        nameStart + module.end,
    );
    const href = getModuleHref(moduleName, namespaceSource);
    return href == null
        ? []
        : [
              {
                  className: "wiked-lite-token--module-name",
                  end: nameStart + module.end,
                  href,
                  priority,
                  start: nameStart + module.start,
              },
          ];
}

function getModuleHref(
    value: string,
    namespaceSource: NamespaceSource,
): string | undefined {
    const prefix = getNamespacePrefixes(namespaceSource, 828)[0];
    if (value === "" || /[#<>{}\[\]|\n\r]/u.test(value) || prefix == null) {
        return undefined;
    }
    const title = `${prefix}:${value}`;
    return `/wiki/${encodeTitle(title)}`;
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
        normalizeMissingTitle(target.value),
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
    missingTitle?: string,
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
        missingTitle,
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
    namespaceSource: NamespaceSource,
): DecoratedRange[] {
    return createHighlightQuery(source)
        .link.getAll()
        .flatMap((range) => decorateLink(source, range, namespaceSource));
}

function decorateLink(
    source: string,
    range: SourceRange,
    namespaceSource: NamespaceSource,
): DecoratedRange[] {
    const contentStart = range.start + 2;
    const contentEnd = range.end - 2;
    const inner = source.slice(contentStart, contentEnd);
    const parts = splitHighlightRanges(inner, "|");
    const target = parts[0]?.value.trim() ?? "";
    const namespaceId = getLinkNamespaceId(target, namespaceSource);
    const className = getLinkClass(namespaceId);
    const href = `/wiki/${encodeTitle(target.replace(/^:/u, ""))}`;
    const ranges: DecoratedRange[] = [
        { ...range, className, href, priority: 20 },
        ...createLinkMarkupDecorations(contentStart, contentEnd, range, parts),
        ...createLinkTargetDecorations(
            source,
            contentStart,
            parts,
            target,
            className,
        ),
        ...createEmbeddedLinkDecorations(
            source,
            contentStart,
            parts,
            namespaceId,
        ),
    ];
    ranges.push(
        createLinkTextDecoration(contentStart, contentEnd, parts, namespaceId),
    );
    return ranges;
}

function createLinkTargetDecorations(
    source: string,
    contentStart: number,
    parts: ReturnType<ReturnType<typeof createHighlightQuery>["splitRanges"]>,
    target: string,
    className: string,
): DecoratedRange[] {
    const targetRange = parts[0];
    const missingTitle = normalizeMissingTitle(target);
    if (targetRange == null || missingTitle == null) {
        return [];
    }
    const range = trimSourceRange(
        source,
        contentStart + targetRange.start,
        contentStart + targetRange.end,
    );
    return range.start === range.end
        ? []
        : [
              {
                  ...range,
                  className,
                  missingTitle,
                  priority: 22,
              },
          ];
}

function createEmbeddedLinkDecorations(
    source: string,
    contentStart: number,
    parts: ReturnType<ReturnType<typeof createHighlightQuery>["splitRanges"]>,
    namespaceId: number | undefined,
): DecoratedRange[] {
    const targetRange = parts[0];
    if (namespaceId !== 6 || targetRange == null) {
        return [];
    }
    return [
        {
            className: "wiked-lite-token--file",
            end: contentStart + targetRange.end,
            priority: 25,
            start: contentStart + targetRange.start,
        },
        ...createFileOptionDecorations(source, contentStart, parts),
    ];
}

function createFileOptionDecorations(
    source: string,
    contentStart: number,
    parts: ReturnType<ReturnType<typeof createHighlightQuery>["splitRanges"]>,
): DecoratedRange[] {
    return parts
        .slice(1)
        .flatMap((part) => decorateFileOption(source, contentStart, part));
}

function decorateFileOption(
    source: string,
    contentStart: number,
    part: TopLevelRange,
): DecoratedRange[] {
    const optionStart = contentStart + part.start;
    const optionRange = trimSourceRange(
        source,
        optionStart,
        contentStart + part.end,
    );
    const option = source.slice(optionRange.start, optionRange.end);
    if (FILE_LITERAL_OPTIONS.has(option) || isFileSizeOption(option)) {
        return [createParameterRange(optionRange)];
    }
    const spacedKey = getFileSpacedOptionKey(option);
    if (spacedKey != null) {
        return [
            createParameterRange({
                end: optionRange.start + spacedKey.length,
                start: optionRange.start,
            }),
        ];
    }
    return decorateNamedFileOption(option, optionRange);
}

function isFileSizeOption(option: string): boolean {
    const match = FILE_SIZE_OPTION_PATTERN.exec(option);
    return match != null && match.slice(1).every(isPositiveFileDimension);
}

function isPositiveFileDimension(dimension: string | undefined): boolean {
    return dimension == null || Number(dimension) > 0;
}

function decorateNamedFileOption(
    option: string,
    optionRange: SourceRange,
): DecoratedRange[] {
    const equals = getFirstTopLevelSeparator(option, "=") ?? -1;
    if (equals < 0) {
        return [];
    }
    const name = option.slice(0, equals);
    if (!FILE_NAMED_OPTIONS.has(name)) {
        return [];
    }
    const nameRange = {
        end: optionRange.start + equals,
        start: optionRange.start,
    };
    return [
        createParameterRange(nameRange),
        createDelimiterRange(
            optionRange.start + equals,
            optionRange.start + equals + 1,
            49,
        ),
    ];
}

function getFileSpacedOptionKey(option: string): string | undefined {
    const match = /^(\S+) (?=\S)/u.exec(option);
    const key = match?.[1];
    return key != null && FILE_SPACED_OPTIONS.has(key) ? key : undefined;
}

function createParameterRange(range: SourceRange): DecoratedRange {
    return {
        ...range,
        className: "wiked-lite-token--parameter",
        priority: 50,
    };
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
    namespaceSource: NamespaceSource,
): number | undefined {
    if (rawTarget.startsWith(":")) {
        return undefined;
    }
    const title = rawTarget.split("#", 1)[0] ?? "";
    const colon = title.indexOf(":");
    if (colon < 0) {
        return undefined;
    }
    return getNamespaceId(namespaceSource, title.slice(0, colon));
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
                ...decorateLanguageVariants(source, start + 2, end - 2),
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
        if (!eligible) {
            return [];
        }
        const range = decorateParameterValue(
            source,
            parameter,
            "wiked-lite-token--language-conversion",
        );
        if (range == null) {
            return [];
        }
        const variants = decorateLanguageVariants(
            source,
            range.start,
            range.end,
        );
        return variants.length === 0 ? [] : [range, ...variants];
    });
}

function decorateLanguageVariants(
    source: string,
    start: number,
    end: number,
): DecoratedRange[] {
    return findConversionKeyRanges(source, start, end).map((range) => ({
        ...range,
        className: "wiked-lite-token--language-variant",
        priority: 55,
    }));
}

function findConversionKeyRanges(
    source: string,
    start: number,
    end: number,
): SourceRange[] {
    const body = source.slice(start, end);
    return splitHighlightRanges(body, ";").flatMap(function findKey(part) {
        const key = findConversionDeclarationKey(part.value);
        return key == null
            ? []
            : [
                  {
                      end: start + part.start + key.end,
                      start: start + part.start + key.start,
                  },
              ];
    });
}

function findConversionDeclarationKey(
    declaration: string,
): SourceRange | null {
    const ordinary = findConversionDestinationKey(declaration, 0);
    const arrow = findConversionArrow(declaration);
    if (arrow == null || (ordinary != null && ordinary.colon < arrow.start)) {
        return ordinary?.range ?? null;
    }
    return (
        findConversionDestinationKey(declaration, arrow.end)?.range ??
        ordinary?.range ??
        null
    );
}

function findConversionDestinationKey(
    declaration: string,
    destinationStart: number,
): { colon: number; range: SourceRange } | null {
    const destination = declaration.slice(destinationStart);
    const colon = getFirstTopLevelSeparator(destination, ":");
    if (colon == null) {
        return null;
    }
    const keySource = destination.slice(0, colon);
    const keyParts = splitHighlightRanges(keySource, "|");
    const keyPart = keyParts.at(-1);
    if (keyPart == null) {
        return null;
    }
    const keyStart = destinationStart + keyPart.start;
    const enteredKey = declaration.slice(
        keyStart,
        destinationStart + keyPart.end,
    );
    const scanKey = maskSourceRanges(
        enteredKey,
        createHighlightQuery(enteredKey).comment.getAll(),
    );
    const keyRange = trimSourceRange(scanKey, 0, scanKey.length);
    const key = scanKey.slice(keyRange.start, keyRange.end);
    const range = {
        end: keyStart + keyRange.end,
        start: keyStart + keyRange.start,
    };
    return /^[\p{L}\p{N}_-]+$/u.test(key)
        ? { colon: destinationStart + colon, range }
        : null;
}

function findConversionArrow(declaration: string): SourceRange | undefined {
    const query = createHighlightQuery(declaration);
    const masked = maskSourceRanges(declaration, [
        ...query.opaque.getAll(),
        ...createTagMarkupRanges(declaration),
    ]);
    const maskedQuery = createHighlightQuery(masked);
    const equalsParts = maskedQuery.splitRanges("=");
    const literalArrows = equalsParts
        .slice(0, -1)
        .flatMap((part) =>
            declaration[part.end + 1] === ">"
                ? [{ end: part.end + 2, start: part.end }]
                : [],
        );
    const encodedArrows = maskedQuery.templates
        .getAll()
        .flatMap((template) =>
            template.depth === 0 &&
            wikitext.template.normalizeName(template.name) === "=" &&
            declaration[template.end] === ">"
                ? [{ end: template.end + 1, start: template.start }]
                : [],
        );
    return [...literalArrows, ...encodedArrows].toSorted(
        (left, right) => left.start - right.start,
    )[0];
}

function getFirstTopLevelSeparator(
    source: string,
    separator: string,
): number | undefined {
    const parts = splitHighlightRanges(source, separator);
    return parts.length > 1 ? parts[0]?.end : undefined;
}

function splitHighlightRanges(
    source: string,
    separator: string,
): TopLevelRange[] {
    const query = createHighlightQuery(source);
    const masked = maskSourceRanges(source, [
        ...query.opaque.getAll(),
        ...createTagMarkupRanges(source),
    ]);
    return createHighlightQuery(masked)
        .splitRanges(separator)
        .map((range) => ({
            ...range,
            value: source.slice(range.start, range.end),
        }));
}

function createTagMarkupRanges(source: string): SourceRange[] {
    return createHighlightQuery(source)
        .tags.getAll()
        .flatMap(function getMarkup(tag) {
            const ranges: SourceRange[] = [
                { end: tag.contentStart, start: tag.start },
            ];
            if (!tag.selfClosing && tag.contentEnd < tag.end) {
                ranges.push({ end: tag.end, start: tag.contentEnd });
            }
            return ranges;
        });
}

function maskSourceRanges(source: string, ranges: SourceRange[]): string {
    let cursor = 0;
    let masked = "";
    for (const range of mergeSourceRanges(ranges)) {
        masked += source.slice(cursor, range.start);
        masked += " ".repeat(range.end - range.start);
        cursor = range.end;
    }
    return masked + source.slice(cursor);
}

function isNoteTAName(name: string): boolean {
    return NOTE_TA_NAMES.has(name) || /^全文字[詞词][轉转][換换]$/u.test(name);
}

function createPatternDecorations(source: string): DecoratedRange[] {
    const patterns: Array<[RegExp, string, number]> = [
        [/https?:\/\/[^\s<>\]}|]+/giu, "wiked-lite-token--url", 5],
    ];
    return [
        ...createListDecorations(source),
        ...createExternalLinkDecorations(source),
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

function createExternalLinkDecorations(source: string): DecoratedRange[] {
    return findBracketedExternalLinks(source).flatMap(function decorate(link) {
        const ranges: DecoratedRange[] = [
            {
                ...link.target,
                className: "wiked-lite-token--url",
                href: link.href,
                priority: 5,
            },
        ];
        if (link.label.start < link.label.end) {
            ranges.push({
                ...link.label,
                className: "wiked-lite-token--url",
                href: link.href,
                priority: 5,
            });
        }
        return ranges;
    });
}

function findBracketedExternalLinks(source: string): Array<{
    end: number;
    href: string;
    label: SourceRange;
    start: number;
    target: SourceRange;
}> {
    const pattern = /\[(?:https?:)?\/\/[^\s<>\]]+(?:[^\S\n]+[^\]\n]*)?\]/giu;
    return [...source.matchAll(pattern)].map(function parse(match) {
        const start = match.index ?? 0;
        const end = start + match[0].length;
        const targetStart = start + 1;
        const targetEnd = findExternalLinkTargetEnd(source, targetStart, end);
        return {
            end,
            href: source.slice(targetStart, targetEnd),
            label: trimSourceRange(source, targetEnd, end - 1),
            start,
            target: { end: targetEnd, start: targetStart },
        };
    });
}

function findExternalLinkTargetEnd(
    source: string,
    start: number,
    end: number,
): number {
    let cursor = start;
    while (cursor < end - 1 && !/\s/u.test(source[cursor] ?? "")) {
        cursor += 1;
    }
    return cursor;
}

function createListDecorations(source: string): DecoratedRange[] {
    const markers = findListMarkers(source);
    const ranges: DecoratedRange[] = markers.map(function decorate(match) {
        const start = match.index ?? 0;
        return {
            className: "wiked-lite-token--list",
            end: start + match[0].length,
            priority: 10,
            start,
        };
    });
    const scanSource = createListScanSource(source, markers);
    for (const marker of markers) {
        if (!marker[0].includes(";")) {
            continue;
        }
        const markerEnd = (marker.index ?? 0) + marker[0].length;
        const lineEnd = scanSource.indexOf("\n", markerEnd);
        const end = lineEnd < 0 ? scanSource.length : lineEnd;
        const separator = findDefinitionSeparator(scanSource, markerEnd, end);
        if (separator != null) {
            ranges.push({
                className: "wiked-lite-token--list",
                end: separator + 1,
                priority: 10,
                start: separator,
            });
        }
    }
    return ranges;
}

function findListMarkers(source: string): RegExpMatchArray[] {
    return [...source.matchAll(/^[^\S\n]*[#*:;]+/gmu)];
}

function createListScanSource(
    source: string,
    markers: RegExpMatchArray[],
): string {
    const query = createHighlightQuery(source);
    const markerStarts = markers.map((marker) => marker.index ?? 0);
    const nestedTemplates = query.template
        .getAll()
        .filter(
            (template) =>
                !markerStarts.some(
                    (start) => template.start < start && start < template.end,
                ),
        );
    return maskSourceRanges(source, [
        ...query.comment.getAll(),
        ...query.opaque.getAll(),
        ...nestedTemplates,
        ...query.link.getAll(),
        ...query.tag.getAll(),
        ...findBracketedExternalLinks(source),
    ]);
}

function findDefinitionSeparator(
    source: string,
    start: number,
    end: number,
): number | undefined {
    let fallback: number | undefined;
    let separator = source.indexOf(":", start);
    while (separator >= 0 && separator < end) {
        if (isUrlSchemeColon(source, start, separator)) {
            separator = source.indexOf(":", separator + 1);
            continue;
        }
        if (isSpacedDefinitionSeparator(source, separator)) {
            return separator;
        }
        fallback ??= separator;
        separator = source.indexOf(":", separator + 1);
    }
    return fallback;
}

function isSpacedDefinitionSeparator(source: string, colon: number): boolean {
    return (
        /[^\S\n]/u.test(source[colon - 1] ?? "") ||
        /[^\S\n]/u.test(source[colon + 1] ?? "")
    );
}

function isUrlSchemeColon(
    source: string,
    lineStart: number,
    colon: number,
): boolean {
    if (source.slice(colon + 1, colon + 3) !== "//") {
        return false;
    }
    const before = source.slice(lineStart, colon);
    return /(?:^|\s)[a-z][a-z\d+.-]*$/iu.test(before);
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
        const target = splitHighlightRanges(inner, "|")[0];
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
    const pattern = /^(={1,6})([^\n]+?)\1[^\S\n]*$/gmu;
    return [...source.matchAll(pattern)].flatMap(function decorate(match) {
        const start = match.index;
        const level = match[1].length;
        const range = {
            end: start + match[0].length,
            start,
        };
        const ranges: DecoratedRange[] = [
            {
                ...range,
                className: "wiked-lite-token--heading",
                priority: 10,
            },
            {
                ...range,
                className: `wiked-lite-token--heading-${level}`,
                priority: 11,
            },
        ];
        return [
            ...ranges,
            ...createHeadingTextDecoration(source, match, level),
        ];
    });
}

function createHeadingTextDecoration(
    source: string,
    match: RegExpMatchArray,
    level: number,
): DecoratedRange[] {
    if (level !== 2 && level !== 3) {
        return [];
    }
    const contentStart = (match.index ?? 0) + (match[1]?.length ?? 0);
    const content = match[2] ?? "";
    const range = trimSourceRange(
        source,
        contentStart,
        contentStart + content.length,
    );
    return range.start === range.end
        ? []
        : [
              {
                  ...range,
                  className: "wiked-lite-token--heading-text",
                  priority: 12,
              },
          ];
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
    const opaque = active.find((range) => range.priority === 100);
    const visible =
        opaque == null
            ? active
            : [...active.filter((range) => range.priority > 100), opaque];
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
