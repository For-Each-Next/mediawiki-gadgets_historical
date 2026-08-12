/** Resolves overlapping highlights into lossless source segments. */

import type { SourceRange } from "#shared/wikitext";

export interface HighlightSegment {
    classNames: string[];
    end: number;
    href?: string;
    missingTitle?: string;
    referenceSource?: string;
    start: number;
    text: string;
}

export interface HighlightRange extends SourceRange {
    className: string;
    href?: string;
    missingTitle?: string;
    priority: number;
    referenceSource?: string;
}

const NON_VISIBLE_LINK_TOKEN_CLASSES = new Set([
    "wiked-lite-token--html-tag",
    "wiked-lite-token--module-name",
    "wiked-lite-token--parameter",
    "wiked-lite-token--template-delimiter",
    "wiked-lite-token--template-name",
    "wiked-lite-token--wiki-markup",
]);

/** Produces ordered source segments from overlapping ranges. */
export function partitionHighlightRanges(
    source: string,
    ranges: HighlightRange[],
): HighlightSegment[] {
    const boundaries = new Set([0, source.length]);
    const starts = new Map<number, HighlightRange[]>();
    const ends = new Map<number, HighlightRange[]>();
    for (const range of ranges) {
        boundaries.add(range.start);
        boundaries.add(range.end);
        addRangeBoundary(starts, range.start, range);
        addRangeBoundary(ends, range.end, range);
    }
    const points = [...boundaries].sort((left, right) => left - right);
    const segments: HighlightSegment[] = [];
    const active = new Set<HighlightRange>();
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
    boundaries: Map<number, HighlightRange[]>,
    point: number,
    range: HighlightRange,
): void {
    const matches = boundaries.get(point) ?? [];
    matches.push(range);
    boundaries.set(point, matches);
}

function createSegment(
    source: string,
    start: number,
    end: number,
    ranges: HighlightRange[],
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
    ranges: HighlightRange[],
    classNames: string[],
): string | undefined {
    if (classNames.some((name) => NON_VISIBLE_LINK_TOKEN_CLASSES.has(name))) {
        return undefined;
    }
    return ranges.find((range) => range.missingTitle != null)?.missingTitle;
}
