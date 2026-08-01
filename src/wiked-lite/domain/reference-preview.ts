/** Resolves highlighted references into compact citation previews. */

import * as shortFootnotes from "#shared/citation/short-footnotes";
import { wikitext } from "#shared/wikitext";

export interface ReferencePreview {
    referenceLabel: string;
    rows: ReferencePreviewRow[];
    templateName: string;
}

export interface ReferencePreviewField {
    displayValue?: string;
    href?: string;
    name: string;
    value: string;
}

export interface ReferencePreviewRow {
    fields: ReferencePreviewField[];
}

interface PersonParameter {
    index: number;
    side: "first" | "last";
}

interface PersonPair {
    first?: PersonParameter;
    last?: PersonParameter;
}

interface ResolvedReference {
    label: string;
    source: string;
}

const PERSON_PARAMETER_PATTERN = /^(.+-)?(last|first)(\d*)$/iu;
const HTTP_URL_PATTERN = /https?:\/\/[^\s<>{}\[\]|"']+/u;

/**
 * Builds a preview for a ref tag or reference-like template.
 *
 * @param articleSource - Complete article wikitext.
 * @param referenceSource - Reference wikitext.
 * @returns Built preview for a ref tag or reference-like template.
 */
export function buildReferencePreview(
    articleSource: string,
    referenceSource: string,
): ReferencePreview | null {
    const resolved = resolveReferenceSource(articleSource, referenceSource);
    const citation = findCitationTemplate(resolved.source);
    if (citation === "") {
        return null;
    }
    const parsed = wikitext.template.parse(citation);
    const entered = parsed.params.filter(
        (parameter) => parameter.value !== "",
    );
    const originalUrl = entered.findLast(
        (parameter) => parameter.name.toLowerCase() === "url",
    )?.value;
    const fields = entered.map(function buildField(parameter) {
        const field: ReferencePreviewField = {
            name: parameter.name,
            value: parameter.value,
        };
        if (parameter.name.toLowerCase() !== "archive-url") {
            return field;
        }
        const href = findHttpUrl(parameter.value);
        return {
            ...field,
            ...(href === "" ? {} : { href }),
            displayValue: shortenArchiveUrl(parameter.value, originalUrl),
        };
    });
    return {
        referenceLabel: resolved.label,
        rows: pairPersonFields(fields),
        templateName: wikitext.template.normalizeName(parsed.name),
    };
}

function resolveReferenceSource(
    article: string,
    reference: string,
): ResolvedReference {
    const template = resolveTemplateReference(article, reference);
    if (template != null) {
        return template;
    }
    const ref = wikitext(reference)
        .reference.getAll()
        .find((tag) => tag.start === 0 && tag.end === reference.length);
    if (ref == null) {
        return { label: "", source: reference };
    }
    const label = ref.attributes.name ?? "";
    if (!ref.selfClosing) {
        return { label, source: ref.content };
    }
    return {
        label,
        source: findNamedReferenceContent(
            article,
            label,
            ref.attributes.group,
        ),
    };
}

function resolveTemplateReference(
    article: string,
    reference: string,
): ResolvedReference | null {
    if (!reference.startsWith("{{")) {
        return null;
    }
    const parsed = wikitext.template.parse(reference);
    const name = wikitext.template.normalizeName(parsed.name);
    if (name === "sfn") {
        const label = parsed.params
            .filter((parameter) => parameter.positional)
            .map((parameter) => parameter.value)
            .filter(Boolean)
            .join(", ");
        return {
            label,
            source: shortFootnotes.resolveShortFootnoteCitation(
                article,
                reference,
            ),
        };
    }
    if (name !== "r") {
        return null;
    }
    const label = parsed.params.find(
        (parameter) => parameter.name === "1",
    )?.value;
    return {
        label: label ?? "",
        source: findNamedReferenceContent(article, label ?? ""),
    };
}

function findNamedReferenceContent(
    source: string,
    name: string,
    group?: string,
): string {
    return wikitext(source).reference.getFirst(name, group)?.content ?? "";
}

function findCitationTemplate(source: string): string {
    for (const template of wikitext(source).template.getAll()) {
        const name = wikitext.template.normalizeName(template.name);
        if (/^(?:cite(?:\s|$)|citation$)/u.test(name)) {
            return template.raw;
        }
    }
    return "";
}

function pairPersonFields(
    fields: ReferencePreviewField[],
): ReferencePreviewRow[] {
    const pairs = collectPersonPairs(fields);
    const replacements = new Map<number, ReferencePreviewField[]>();
    const consumed = new Set<number>();
    for (const pair of pairs.values()) {
        if (pair.first == null || pair.last == null) {
            continue;
        }
        const index = Math.min(pair.first.index, pair.last.index);
        consumed.add(pair.first.index);
        consumed.add(pair.last.index);
        replacements.set(index, [
            fields[pair.last.index],
            fields[pair.first.index],
        ]);
    }
    return fields.flatMap(function pair(field, index) {
        const replacement = replacements.get(index);
        if (replacement != null) {
            return [{ fields: replacement }];
        }
        return consumed.has(index) ? [] : [{ fields: [field] }];
    });
}

function collectPersonPairs(
    fields: ReferencePreviewField[],
): Map<string, PersonPair> {
    const pairs = new Map<string, PersonPair>();
    fields.forEach(function collect(field, index) {
        const match = field.name.match(PERSON_PARAMETER_PATTERN);
        if (match == null) {
            return;
        }
        const prefix = (match[1] ?? "").toLowerCase();
        const side = match[2].toLowerCase() as PersonParameter["side"];
        const key = `${prefix}\0${match[3]}`;
        const pair = pairs.get(key) ?? {};
        pair[side] ??= { index, side };
        pairs.set(key, pair);
    });
    return pairs;
}

function shortenArchiveUrl(
    archiveUrl: string,
    originalUrl: string | undefined,
): string {
    const archive = withoutHtmlComments(archiveUrl);
    const original = withoutHtmlComments(originalUrl ?? "");
    if (archive === "" || original === "" || !archive.includes(original)) {
        return archive;
    }
    return archive.replace(original, "...");
}

function withoutHtmlComments(value: string): string {
    return value
        .replace(/<!--[\s\S]*?-->/gu, " ")
        .replace(/\s+/gu, " ")
        .trim();
}

function findHttpUrl(value: string): string {
    return withoutHtmlComments(value).match(HTTP_URL_PATTERN)?.[0] ?? "";
}
