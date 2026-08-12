/**
 * Citation TemplateData subsets keyed by normalized template name.
 */

import { stripNamespacePrefix } from "#shared/wiki-titles";

import citeWeb from "./cite-web.ts";

export interface CitationTemplateData {
    aliases?: Record<string, string[]>;
    paramOrder?: string[];
}

const CITATION_TEMPLATES: Record<string, CitationTemplateData> = {
    "cite web": citeWeb,
};

/**
 * Gets parameter metadata for a configured citation template.
 *
 * @param template - Template value.
 * @returns Parameter metadata for a configured citation template.
 */
export function getCitationTemplateData(
    template: string,
): CitationTemplateData | undefined {
    return CITATION_TEMPLATES[normalizeTemplateName(template)];
}

/**
 * Normalizes a citation template title for registry lookup.
 *
 * @param template - Template value.
 * @returns A citation template title for registry lookup.
 */
function normalizeTemplateName(template: string): string {
    const result = stripNamespacePrefix(String(template || ""), "zhwiki", 10)
        .replace(/[_\s]+/gu, " ")
        .toLocaleLowerCase();
    return result;
}
