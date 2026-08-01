/** Lazy, construct-focused wikitext queries and builders. */

import { findWikitextComments, type WikitextComment } from "./comments.ts";
import { findWikilinkRanges, type WikilinkRange } from "./links.ts";
import {
    findOpaqueRanges,
    type SourceRange,
    type WikitextOptions,
} from "./opaque-ranges.ts";
import { findNamedRefTag, findRefTags, type RefTag } from "./references.ts";
import {
    findWikitableRanges,
    parseWikitable,
    type ParsedWikitable,
} from "./tables.ts";
import {
    findWikitextTags,
    parseTagAttributes,
    type WikitextTag,
    type WikitextTagOptions,
} from "./tags.ts";
import {
    findTemplateParameterRanges,
    type TemplateParameterRange,
} from "./template-parameters.ts";
import {
    buildTemplate,
    findTemplateCalls,
    findTopLevelEquals,
    normalizeTemplateName,
    parseTemplateCall,
    splitTopLevel,
    splitTopLevelRanges,
    type ParsedTemplateCall,
    type TemplateBuildOptions,
    type TemplateBuildParameters,
    type TopLevelRange,
} from "./templates.ts";

export interface WikitextQueryOptions extends WikitextOptions {
    voidTags?: readonly string[];
}

export interface WikitextCollection<T> {
    getAll(): T[];
    getFirst(): T | undefined;
}

export interface WikitextNamedCollection<T> {
    getAll(name?: string): T[];
    getFirst(name?: string): T | undefined;
}

export interface WikitextReferenceCollection {
    getAll(): RefTag[];
    getFirst(name?: string, group?: string): RefTag | undefined;
}

export interface WikitextTemplateStatic {
    build(
        name: string,
        parameters?: TemplateBuildParameters,
        options?: TemplateBuildOptions,
    ): string;
    normalizeName(name: string): string;
    parse(raw: string, start?: number): ParsedTemplateCall;
}

export interface WikitextTagStatic {
    parseAttributes(source: string): Record<string, string>;
}

export interface WikitextQuery {
    comment: WikitextCollection<WikitextComment>;
    findTopLevelEquals(): number;
    link: WikitextCollection<WikilinkRange>;
    opaque: WikitextCollection<SourceRange>;
    reference: WikitextReferenceCollection;
    source: string;
    split(separator: string): string[];
    splitRanges(separator: string): TopLevelRange[];
    table: WikitextCollection<ParsedWikitable>;
    tag: WikitextNamedCollection<WikitextTag>;
    template: WikitextNamedCollection<ParsedTemplateCall>;
    templateParameter: WikitextCollection<TemplateParameterRange>;
}

export interface WikitextFactory {
    (source: string, options?: WikitextQueryOptions): WikitextQuery;
    tag: WikitextTagStatic;
    template: WikitextTemplateStatic;
}

/**
 * Creates lazy construct queries over one source string.
 *
 * No document tree is created. Each method invokes one focused scanner.
 *
 * @param source - Wikitext source.
 * @param options - Literal and void tag overrides.
 * @returns Source-bound construct query functions.
 */
function queryWikitext(
    source: string,
    options: WikitextQueryOptions = {},
): WikitextQuery {
    const scanOptions: WikitextOptions = options.literalTags
        ? { literalTags: options.literalTags }
        : {};
    return Object.freeze({
        comment: createCollection(() => findWikitextComments(source)),
        findTopLevelEquals: () => findTopLevelEquals(source, scanOptions),
        link: createCollection(() => findWikilinkRanges(source, scanOptions)),
        opaque: createCollection(() => findOpaqueRanges(source, scanOptions)),
        reference: createReferenceCollection(source, scanOptions),
        source,
        split: (separator: string) =>
            splitTopLevel(source, separator, scanOptions),
        splitRanges: (separator: string) =>
            splitTopLevelRanges(source, separator, scanOptions),
        table: createCollection(() => getTables(source, scanOptions)),
        tag: createTagCollection(source, options),
        template: createTemplateCollection(source, scanOptions),
        templateParameter: createCollection(() =>
            findTemplateParameterRanges(source, scanOptions),
        ),
    });
}

function createCollection<T>(getAll: () => T[]): WikitextCollection<T> {
    return Object.freeze({
        getAll,
        getFirst: () => getAll()[0],
    });
}

function createTemplateCollection(
    source: string,
    options: WikitextOptions,
): WikitextNamedCollection<ParsedTemplateCall> {
    function getAll(name?: string): ParsedTemplateCall[] {
        const templates = findTemplateCalls(source, options);
        if (name == null) {
            return templates;
        }
        const expected = normalizeTemplateName(name);
        return expected === ""
            ? []
            : templates.filter(
                  (template) =>
                      normalizeTemplateName(template.name) === expected,
              );
    }
    return Object.freeze({
        getAll,
        getFirst: (name?: string) => getAll(name)[0],
    });
}

function createTagCollection(
    source: string,
    options: WikitextQueryOptions,
): WikitextNamedCollection<WikitextTag> {
    function getAll(name?: string): WikitextTag[] {
        const tagOptions: WikitextTagOptions = {
            ...(options.literalTags == null
                ? {}
                : { literalTags: options.literalTags }),
            ...(options.voidTags == null
                ? {}
                : { voidTags: options.voidTags }),
            ...(name == null ? {} : { tagNames: [name] }),
        };
        return findWikitextTags(source, tagOptions);
    }
    return Object.freeze({
        getAll,
        getFirst: (name?: string) => getAll(name)[0],
    });
}

function createReferenceCollection(
    source: string,
    options: WikitextOptions,
): WikitextReferenceCollection {
    const getAll = () => findRefTags(source, options);
    return Object.freeze({
        getAll,
        getFirst(name?: string, group?: string) {
            return name == null
                ? getAll()[0]
                : findNamedRefTag(source, name, group, options);
        },
    });
}

function getTables(
    source: string,
    options: WikitextOptions,
): ParsedWikitable[] {
    return findWikitableRanges(source, options).map((range) =>
        parseWikitable(
            source.slice(range.start, range.end),
            range.start,
            options,
        ),
    );
}

const staticTemplate = Object.freeze({
    build: buildTemplate,
    normalizeName: normalizeTemplateName,
    parse: parseTemplateCall,
});
const staticTag = Object.freeze({ parseAttributes: parseTagAttributes });

export const wikitext: WikitextFactory = Object.assign(queryWikitext, {
    tag: staticTag,
    template: staticTemplate,
});
Object.freeze(wikitext);

export type { WikitextComment } from "./comments.ts";
export type { WikilinkRange } from "./links.ts";
export type { SourceRange, WikitextOptions } from "./opaque-ranges.ts";
export type { RefTag } from "./references.ts";
export type {
    ParsedWikitable,
    ParsedWikitableCaption,
    ParsedWikitableCell,
    ParsedWikitableRow,
} from "./tables.ts";
export type { WikitextTag } from "./tags.ts";
export type { TemplateParameterRange } from "./template-parameters.ts";
export type {
    ParsedTemplateCall,
    ParsedTemplateParameter,
    TemplateBuildOptions,
    TemplateBuildParameter,
    TemplateBuildParameters,
    TemplateStyle,
    TopLevelRange,
} from "./templates.ts";
