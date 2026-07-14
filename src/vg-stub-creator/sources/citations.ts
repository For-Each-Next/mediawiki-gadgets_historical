/**
 * Fetches Citoid metadata and formats it as citation template wikitext.
 */

import { FIELD_REFERENCE_DATA } from "../shared/utils.ts";

const CITOID_ENDPOINT = "/api/rest_v1/data/citation/zotero/";
const CITATION_RULES = getCitationRules();
const DATE_PARTS_LENGTH = 10;
const UNKNOWN_PARAM_ORDER_OFFSET = 10000;


/**
 * Builds a cite template from the first Citoid result for a URL.
 *
 * @param url - Source URL to resolve through Citoid.
 * @param options - Fetch and formatting options.
 * @param options.fetcher - Fetch implementation.
 * @param options.now - Date used for access-date.
 * @param options.cache - Citation cache keyed by source URL.
 * @returns Generated citation template wikitext.
 */
export async function fetchCiteTemplate(
    url: string,
    options: any = {},
): Promise<string> {
    const cachedTemplate = getCachedCiteTemplate(url, options);

    if (cachedTemplate != null) {
        return cachedTemplate;
    }

    const fetcher = options.fetcher || fetch;
    const response = await fetcher(buildCitoidUrl(url), {
        headers: {
            accept: "application/json",
        },
    });

    if (!response.ok) {
        if (response.status === 404) {
            const citeTemplate = await buildFallbackCiteWebTemplate(url, {
                fetcher,
                now: options.now,
                rules: options.rules,
            });

            setCachedCiteTemplate(url, citeTemplate, options);

            return citeTemplate;
        }

        throw new Error(`Citoid request failed: HTTP ${response.status}`);
    }

    const citeTemplate = buildCiteTemplate(
        getFirstCitation(await response.json()),
        {
            now: options.now,
            rules: options.rules,
            url,
        },
    );

    setCachedCiteTemplate(url, citeTemplate, options);

    return citeTemplate;
}


/**
 * Builds the Citoid REST URL for a source URL.
 *
 * @param url - Source URL to resolve through Citoid.
 * @returns Citoid request URL.
 */
export function buildCitoidUrl(url: string): string {
    const trimmedUrl = url.trim();

    if (trimmedUrl === "") {
        throw new Error("Enter a URL before fetching a citation.");
    }

    return `${CITOID_ENDPOINT}${encodeURIComponent(trimmedUrl)}`;
}


/**
 * Gets a cached cite template for a URL.
 *
 * @param url - Source URL.
 * @param options - Fetch and formatting options.
 * @param options.cache - Citation cache keyed by source URL.
 * @returns Cached cite template.
 */
function getCachedCiteTemplate(url: string, options: any): string | undefined {
    if (options.cache == null) {
        return undefined;
    }

    return options.cache[normalizeCitationCacheKey(url)];
}


/**
 * Stores a generated cite template for a URL.
 *
 * @param url - Source URL.
 * @param citeTemplate - Generated cite template.
 * @param options - Fetch and formatting options.
 * @param options.cache - Citation cache keyed by source URL.
 * @returns */
function setCachedCiteTemplate(
    url: string,
    citeTemplate: string,
    options: any,
): void {
    if (options.cache == null) {
        return;
    }

    options.cache[normalizeCitationCacheKey(url)] = citeTemplate;
}


/**
 * Normalizes the cache key for one source URL.
 *
 * @param url - Source URL.
 * @returns Cache key.
 */
function normalizeCitationCacheKey(url: string): string {
    return url.trim();
}


/**
 * Handles build cite template.
 *
 * Builds citation template wikitext from one Zotero-style citation
 * object.
 *
 * @param citation - Zotero-style citation data.
 * @param options - Formatting options.
 * @param options.now - Date used for access-date.
 * @param options.url - Fallback source URL.
 * @returns Citation template wikitext.
 *
 */
export function buildCiteTemplate(citation: any, options: any = {}): string {
    const values = applyCitationRules(buildCitationValues(citation, options), {
        rules: options.rules || CITATION_RULES,
        sourceUrl: options.url,
    });
    const params = sortCitationParamEntries(
        Object.entries(values).filter(hasTemplateValue),
    );

    return formatTemplateCall(getTemplateName(citation.itemType), params);
}


/**
 * Parses one generated citation template into editable parts.
 *
 * @param text - Citation template wikitext.
 * @returns Parsed template name and parameter rows.
 */
export function parseCiteTemplate(text: string): any {
    const parts = splitTemplateParts(text);
    const [template, ...params] = parts;

    return {
        params: sortCitationParams(params.map(parseTemplateParam)),
        template: trimFieldText(template) || "cite web",
    };
}


/**
 * Builds citation template wikitext from editable parts.
 *
 * @param parts - Editable citation parts.
 * @param parts.params - Editable parameter rows.
 * @param parts.template - Citation template name.
 * @returns Citation template wikitext.
 */
export function buildCiteTemplateFromParts(parts: any): string {
    const template = trimFieldText(parts?.template) || "cite web";
    const params = sortCitationParams(parts?.params || []).filter(
        function callback(param) {
            return hasTemplateValue([param.name, param.value]);
        },
    );

    return formatTemplateCall(
        template,
        params.map((param) => [param.name, param.value]),
    );
}


/**
 * Sorts citation parameter rows by local TemplateData order.
 *
 * @param params - Citation parameter rows.
 * @returns Sorted citation parameter rows.
 */
export function sortCitationParams(params: Array<any>): Array<any> {
    return params
        .map((param, index) => ({ ...param, _index: index }))
        .sort(compareCitationParams)
        .map(({ _index, ...param }) => param);
}


/**
 * Builds a minimal cite web template when Citoid cannot resolve a URL.
 *
 * @param url - Source URL.
 * @param options - Formatting options.
 * @param options.fetcher - Fetch implementation.
 * @param options.now - Date used for access-date.
 * @returns Generated cite web template wikitext.
 */
async function buildFallbackCiteWebTemplate(
    url: string,
    options: any = {},
): Promise<string> {
    const trimmedUrl = normalizeCitationCacheKey(url);

    return buildCiteTemplate(
        {
            itemType: "webpage",
            title: await selectValue(
                isSteamUrl(trimmedUrl),
                async function trueBranch() {
                    return "";
                },
                async function falseBranch() {
                    return await fetchFallbackTitle(trimmedUrl, options);
                },
            ),
            url: trimmedUrl,
            websiteTitle: getFallbackWebsiteTitle(url),
        },
        {
            now: options.now,
            rules: options.rules || CITATION_RULES,
            url,
        },
    );
}


/**
 * Checks whether a source URL is on Steam.
 *
 * @param url - Source URL.
 * @returns Whether the source is a Steam URL.
 */
function isSteamUrl(url: string): boolean {
    return parseUrl(url)?.hostname === "store.steampowered.com";
}


/**
 * Fetches the source page title for a fallback citation.
 *
 * @param url - Source URL.
 * @param options - Fetch options.
 * @param options.fetcher - Fetch implementation.
 * @returns Page title, or an empty string when
 * unavailable.
 */
async function fetchFallbackTitle(url: string, options: any): Promise<string> {
    const fetcher = options.fetcher || fetch;

    try {
        const response = await fetcher(url, {
            headers: {
                accept: "text/html",
            },
        });

        if (!response.ok) {
            return "";
        }

        return extractHtmlTitle(await response.text());
    } catch (_error) {
        return "";
    }
}


/**
 * Extracts a document title from HTML text.
 *
 * @param html - HTML source.
 * @returns Extracted title, or an empty string.
 */
function extractHtmlTitle(html: string): string {
    const match = String(html || "").match(
        /<title\b[^>]*>([\s\S]*?)<\/title>/iu,
    );

    if (match == null) {
        return "";
    }

    return decodeHtmlEntities(match[1].replace(/\s+/gu, " ").trim());
}


/**
 * Decodes common HTML entities from title text.
 *
 * @param text - Encoded title text.
 * @returns Decoded title text.
 */
function decodeHtmlEntities(text: string): string {
    return text
        .replace(/&#(\d+);/gu, function callback(_match, code) {
            return String.fromCodePoint(Number(code));
        })
        .replace(/&#x([\da-f]+);/giu, function callback(_match, code) {
            return String.fromCodePoint(Number.parseInt(code, 16));
        })
        .replace(/&quot;/gu, '"')
        .replace(/&apos;/gu, "'")
        .replace(/&amp;/gu, "&")
        .replace(/&lt;/gu, "<")
        .replace(/&gt;/gu, ">");
}


/**
 * Handles get fallback website title.
 *
 * Gets a website title for a fallback citation from the source URL
 * hostname.
 *
 * @param url - Source URL.
 * @returns Source URL hostname, or an empty string.
 *
 */
function getFallbackWebsiteTitle(url: string): string {
    const parsedUrl = parseUrl(normalizeCitationCacheKey(url));

    return (parsedUrl?.hostname || "").replace(/^www\./u, "");
}


/**
 * Gets bundled citation cleanup rules.
 *
 * @returns Site-specific citation cleanup rules.
 */
function getCitationRules(): Array<any> {
    return FIELD_REFERENCE_DATA["citation-rules"];
}


/**
 * Gets bundled citation TemplateData order and aliases.
 *
 * @returns Citation TemplateData subset.
 */
function getCitationTemplateData(): any {
    return FIELD_REFERENCE_DATA["citation-template"];
}


/**
 * Gets the first Citoid citation from a response body.
 *
 * @param citations - Citoid response body.
 * @returns First citation object.
 */
function getFirstCitation(citations: Array<any>): any {
    if (!Array.isArray(citations) || citations.length === 0) {
        throw new Error("Citoid did not return citation data.");
    }

    return citations[0];
}


/**
 * Builds normalized citation template values.
 *
 * @param citation - Zotero-style citation data.
 * @param options - Formatting options.
 * @param options.now - Date used for access-date.
 * @param options.url - Fallback source URL.
 * @returns Template parameter values.
 */
function buildCitationValues(citation: any, options: any): any {
    return {
        accessDate: formatAccessDate(options.now),
        author: formatCreators(citation.creators, "author"),
        date: citation.date,
        language: citation.language,
        publisher: citation.publisher,
        title: normalizeCitationTitle(citation.title),
        url: citation.url || options.url,
        via: citation.via,
        website: citation.websiteTitle || citation.publicationTitle,
    };
}


/**
 * Removes generated titles that are only a URL.
 *
 * @param title - Generated citation title.
 * @returns Normalized citation title.
 */
function normalizeCitationTitle(title: string): string {
    const value = trimFieldText(title);

    return parseUrl(value) == null ? value : "";
}


/**
 * Applies site-specific cleanup rules to citation values.
 *
 * @param values - Citation template values.
 * @param options - Rule matching options.
 * @param options.rules - Available cleanup rules.
 * @param options.sourceUrl - Original user-entered source
 * URL.
 * @returns Cleaned citation template values.
 */
function applyCitationRules(values: any, options: any): any {
    const rules = getMatchingRules(
        options.rules,
        options.sourceUrl || values.url,
    );
    const initialValues = selectValue(
        options.sourceUrl == null ||
            rules.some((rule) => rule.redirect === true),
        function trueBranch() {
            return values;
        },
        function falseBranch() {
            return {
                ...values,
                url: normalizeCitationCacheKey(options.sourceUrl),
            };
        },
    );

    return rules.reduce(
        applyCitationRule.bind(null, options.sourceUrl),
        initialValues,
    );
}


/**
 * Applies one site-specific cleanup rule.
 *
 * @param sourceUrl - Original user-entered source URL.
 * @param values - Citation template values.
 * @param rule - Site-specific cleanup rule.
 * @returns Cleaned citation template values.
 */
function applyCitationRule(sourceUrl: string, values: any, rule: any): any {
    return (rule.fixes || []).reduce(
        applyFieldFix.bind(null, sourceUrl),
        values,
    );
}


/**
 * Applies a field fix to citation values.
 *
 * @param sourceUrl - Original user-entered source URL.
 * @param values - Citation template values.
 * @param fix - Field fix definition.
 * @param fix.action - Field fix action.
 * @param fix.field - Citation value field.
 * @param fix.operand - Optional fix
 * operand.
 * @returns Citation template values.
 */
function applyFieldFix(sourceUrl: string, values: any, fix: any): any {
    if (fix.action === "omit") {
        return applyOmitFix(values, fix);
    }

    if (fix.action === "replace") {
        return applyReplaceFix(values, fix);
    }

    if (fix.action === "set") {
        return applySetFix(values, fix);
    }

    if (fix.action === "set-from-source-query") {
        return applySetFromSourceQueryFix(sourceUrl, values, fix);
    }

    if (fix.action === "preserve-source-query") {
        return applyPreserveSourceQueryFix(sourceUrl, values, fix);
    }

    return values;
}


/**
 * Applies an omit fix to citation values.
 *
 * @param values - Citation template values.
 * @param fix - Field fix definition.
 * @param fix.field - Citation value field.
 * @param fix.operand - Value that should be omitted.
 * @returns Citation template values.
 */
function applyOmitFix(values: any, fix: any): any {
    if (fix.operand != null && values[fix.field] !== fix.operand) {
        return values;
    }

    return {
        ...values,
        [fix.field]: "",
    };
}


/**
 * Applies a regular expression replacement fix to citation values.
 *
 * @param values - Citation template values.
 * @param fix - Field fix definition.
 * @param fix.field - Citation value field.
 * @param fix.operand - Replace operand.
 * @param fix.operand.pattern - Regular expression pattern to
 * replace.
 * @param fix.operand.replacement - Replacement value.
 * @returns Citation template values.
 */
function applyReplaceFix(values: any, fix: any): any {
    return {
        ...values,
        [fix.field]: replacePattern(values[fix.field], fix),
    };
}


/**
 * Applies a static value fix to citation values.
 *
 * @param values - Citation template values.
 * @param fix - Field fix definition.
 * @param fix.field - Citation value field.
 * @param fix.operand - Replacement value.
 * @returns Citation template values.
 */
function applySetFix(values: any, fix: any): any {
    return {
        ...values,
        [fix.field]: fix.operand,
    };
}


/**
 * Maps a source URL query value to a citation value.
 *
 * @param sourceUrl - Original user-entered source URL.
 * @param values - Citation template values.
 * @param fix - Field fix definition.
 * @param fix.field - Citation value field.
 * @param fix.operand - Query mapping operand.
 * @param fix.operand.key - Query key to read.
 * @param fix.operand.values - Citation values keyed by query
 * value.
 * @returns Citation template values.
 */
function applySetFromSourceQueryFix(
    sourceUrl: string,
    values: any,
    fix: any,
): any {
    const source = parseUrl(sourceUrl);
    const operand = fix.operand || {};

    if (source == null || operand.key == null || operand.values == null) {
        return values;
    }

    const queryValue = source.searchParams.get(operand.key);
    const fieldValue = operand.values[queryValue];

    if (fieldValue == null) {
        return values;
    }

    return {
        ...values,
        [fix.field]: fieldValue,
    };
}


/**
 * Applies a preserve-source-query fix to citation values.
 *
 * @param sourceUrl - Original user-entered source URL.
 * @param values - Citation template values.
 * @param fix - Field fix definition.
 * @param fix.field - Citation value field.
 * @returns Citation template values.
 */
function applyPreserveSourceQueryFix(
    sourceUrl: string,
    values: any,
    fix: any,
): any {
    return {
        ...values,
        [fix.field]: preserveSourceQuery(
            values[fix.field],
            sourceUrl,
            fix.operand,
        ),
    };
}


/**
 * Replaces a pattern in a value when possible.
 *
 * @param value - Value to update.
 * @param fix - Field fix definition.
 * @param fix.operand - Replace operand.
 * @param fix.operand.pattern - Regular expression pattern to
 * replace.
 * @param fix.operand.replacement - Replacement value.
 * @returns Value with the pattern replaced.
 */
function replacePattern(value: string, fix: any): string {
    const operand = fix.operand || {};

    if (value == null || operand.pattern == null) {
        return value;
    }

    return value.replace(
        new RegExp(operand.pattern, "u"),
        operand.replacement || "",
    );
}


/**
 * Preserves the original source query when Citoid omits it.
 *
 * @param citationUrl - URL returned by Citoid.
 * @param sourceUrl - Original user-entered source URL.
 * @param keys - Query keys to preserve.
 * @returns URL with original query values restored when
 * possible.
 */
function preserveSourceQuery(
    citationUrl: string,
    sourceUrl: string,
    keys: Array<string>,
): string {
    const citation = parseUrl(citationUrl);
    const source = parseUrl(sourceUrl);

    if (citation == null || source == null) {
        return citationUrl;
    }

    if (source.search === "") {
        return citationUrl;
    }

    getSourceQueryKeys(source, keys).forEach(
        preserveSourceQueryKey.bind(null, citation, source),
    );

    return citation.toString();
}


/**
 * Gets source query keys that should be preserved.
 *
 * @param source - Original source URL.
 * @param keys - Query keys to preserve.
 * @returns Query keys to preserve.
 */
function getSourceQueryKeys(source: URL, keys: Array<string>): Array<string> {
    if (Array.isArray(keys)) {
        return keys;
    }

    return Array.from(source.searchParams.keys());
}


/**
 * Preserves one query value from the source URL.
 *
 * @param citation - Citation URL returned by Citoid.
 * @param source - Original source URL.
 * @param key - Query key to preserve.
 * @returns */
function preserveSourceQueryKey(
    citation: URL,
    source: URL,
    key: string,
): void {
    if (citation.searchParams.has(key) || !source.searchParams.has(key)) {
        return;
    }

    citation.searchParams.set(key, source.searchParams.get(key));
}


/**
 * Gets cleanup rules matching a URL host.
 *
 * @param rules - Available cleanup rules.
 * @param url - URL used to match cleanup rules.
 * @returns Matching cleanup rules.
 */
function getMatchingRules(rules: Array<any>, url: string): Array<any> {
    const globalRules = rules.filter(isGlobalRule);
    const parsedUrl = parseUrl(url);

    if (parsedUrl == null) {
        return globalRules;
    }

    return rules.filter(isMatchingRule.bind(null, parsedUrl.hostname));
}


/**
 * Checks whether a cleanup rule applies to all citations.
 *
 * @param rule - Cleanup rule.
 * @returns Whether the rule is global.
 */
function isGlobalRule(rule: any): boolean {
    return rule.host == null;
}


/**
 * Checks whether a cleanup rule matches a host.
 *
 * @param hostname - URL hostname.
 * @param rule - Site-specific cleanup rule.
 * @returns Whether the rule matches the host.
 */
function isMatchingRule(hostname: string, rule: any): boolean {
    return rule.host == null || hostname === rule.host;
}


/**
 * Parses a URL, returning null for invalid values.
 *
 * @param url - URL to parse.
 * @returns Parsed URL.
 */
function parseUrl(url: string): URL | null {
    try {
        return new URL(url);
    } catch (_error) {
        return null;
    }
}


/**
 * Checks whether a template parameter should be emitted.
 *
 * @param entry - Template parameter entry.
 * @returns Whether the value is present.
 */
function hasTemplateValue(entry: [string, any]): boolean {
    const [_key, value] = entry;

    return value != null && String(value).trim() !== "";
}


/**
 * Sorts citation parameter entries by local TemplateData order.
 *
 * @param entries - Citation parameter entries.
 * @returns Sorted parameter entries.
 */
function sortCitationParamEntries(
    entries: Array<[string, any]>,
): Array<Array<string>> {
    return sortCitationParams(
        entries.map(function callback([name, value]) {
            return {
                name: formatTemplateKey(name),
                value,
            };
        }),
    ).map((param) => [param.name, param.value]);
}


/**
 * Formats one template parameter.
 *
 * @param entry - Template parameter entry.
 * @param options - Formatting options.
 * @param options.formatKey - Whether to convert camelCase
 * keys.
 * @returns Template parameter wikitext.
 */
function formatTemplateParam(entry: Array<string>, options: any = {}): string {
    const [key, value] = entry;
    const name = options.formatKey === false ? key : formatTemplateKey(key);

    return `|${name}=${escapeTemplateValue(String(value))}`;
}


/**
 * Formats one citation template call.
 *
 * @param template - Template name.
 * @param params - Template parameter entries.
 * @returns Template wikitext.
 */
function formatTemplateCall(
    template: string,
    params: Array<Array<string>>,
): string {
    const name = trimFieldText(template) || "cite web";

    if (name.toLocaleLowerCase() === "cite web") {
        return `{{${name}\n${params
            .map(formatIndentedTemplateParam)
            .join("\n")}\n}}`;
    }

    return [
        "{{",
        name,
        "",
        params
            .map((param) => formatTemplateParam(param, { formatKey: false }))
            .join(""),
        "}}",
    ].join("");
}


/**
 * Formats one indented template parameter.
 *
 * @param entry - Template parameter entry.
 * @returns Template parameter wikitext.
 */
function formatIndentedTemplateParam(entry: Array<string>): string {
    const [key, value] = entry;

    return `  | ${key} = ${escapeTemplateValue(String(value))}`;
}


/**
 * Formats a JavaScript key as a citation template parameter.
 *
 * @param key - Citation value key.
 * @returns Template parameter key.
 */
function formatTemplateKey(key: string): string {
    return key.replace(/[A-Z]/gu, "-$&").toLocaleLowerCase();
}


/**
 * Escapes values that would otherwise break a template parameter.
 *
 * @param value - Template parameter value.
 * @returns Escaped template parameter value.
 */
function escapeTemplateValue(value: string): string {
    return value.trim().replace(/\|/gu, "{{!}}");
}


/**
 * Splits a single citation template into template and parameter parts.
 *
 * @param text - Citation template wikitext.
 * @returns Template parts.
 */
function splitTemplateParts(text: string): Array<string> {
    const value = trimFieldText(text);
    const body = selectValue(
        value.startsWith("{{") && value.endsWith("}}"),
        function trueBranch() {
            return value.slice(2, -2);
        },
        function falseBranch() {
            return value;
        },
    );
    const parts = [];
    let depth = 0;
    let start = 0;

    for (let index = 0; index < body.length; index += 1) {
        const pair = body.slice(index, index + 2);

        if (pair === "{{") {
            depth += 1;
            index += 1;
            continue;
        }

        if (pair === "}}" && depth > 0) {
            depth -= 1;
            index += 1;
            continue;
        }

        if (body[index] === "|" && depth === 0) {
            parts.push(body.slice(start, index));
            start = index + 1;
        }
    }

    parts.push(body.slice(start));

    return parts;
}


/**
 * Parses one template parameter part.
 *
 * @param text - Template parameter text.
 * @returns Editable citation parameter row.
 */
function parseTemplateParam(text: string): any {
    const separator = text.indexOf("=");

    if (separator === -1) {
        return {
            name: trimFieldText(text),
            value: "",
        };
    }

    return {
        name: trimFieldText(text.slice(0, separator)),
        value: trimFieldText(text.slice(separator + 1)),
    };
}


/**
 * Compares citation parameters by local TemplateData order.
 *
 * @param left - Left parameter row.
 * @param right - Right parameter row.
 * @returns Sort comparison result.
 */
function compareCitationParams(left: any, right: any): number {
    return (
        getParamOrderIndex(left.name) - getParamOrderIndex(right.name) ||
        left._index - right._index
    );
}


/**
 * Gets a parameter order index, resolving aliases to canonical names.
 *
 * @param name - Citation parameter name.
 * @returns Parameter order index.
 */
function getParamOrderIndex(name: string): number {
    const paramOrder = getCitationTemplateData().paramOrder || [];
    const canonical = getCanonicalParamName(name);
    const index = paramOrder.indexOf(canonical);

    if (index !== -1) {
        return index;
    }

    return UNKNOWN_PARAM_ORDER_OFFSET;
}


/**
 * Resolves a parameter alias to its canonical TemplateData key.
 *
 * @param name - Citation parameter name.
 * @returns Canonical parameter name when known.
 */
function getCanonicalParamName(name: string): string {
    const value = trimFieldText(name);
    const aliases = getCitationTemplateData().aliases || {};

    if (Object.hasOwn(aliases, value)) {
        return value;
    }

    return (
        Object.entries(aliases).find(function callback(entry) {
            return (entry[1] as string[]).includes(value);
        })?.[0] || value
    );
}


/**
 * Trims text-like citation fields.
 *
 * @param value - Raw field value.
 * @returns Trimmed field text.
 */
function trimFieldText(value: any): string {
    return String(value || "").trim();
}


/**
 * Gets the citation template name for a Zotero item type.
 *
 * @param itemType - Zotero item type.
 * @returns Citation template name.
 */
function getTemplateName(itemType: string): string {
    if (itemType === "journalArticle") {
        return "cite journal";
    }

    if (itemType === "book" || itemType === "bookSection") {
        return "cite book";
    }

    if (itemType === "newspaperArticle" || itemType === "magazineArticle") {
        return "cite news";
    }

    return "cite web";
}


/**
 * Formats matching creators as a joined author string.
 *
 * @param creators - Zotero creator data.
 * @param type - Creator type to include.
 * @returns Joined creator names.
 */
function formatCreators(creators: Array<any>, type: string): string {
    if (!Array.isArray(creators)) {
        return "";
    }

    return creators
        .filter(isCreatorType.bind(null, type))
        .map(formatCreator)
        .join("; ");
}


/**
 * Checks whether a creator has the requested type.
 *
 * @param type - Creator type to include.
 * @param creator - Zotero creator data.
 * @returns Whether the creator matches.
 */
function isCreatorType(type: string, creator: any): boolean {
    return creator.creatorType === type;
}


/**
 * Formats one Zotero creator.
 *
 * @param creator - Zotero creator data.
 * @returns Creator display text.
 */
function formatCreator(creator: any): string {
    if (creator.name != null) {
        return creator.name;
    }

    return [creator.firstName, creator.lastName].filter(Boolean).join(" ");
}


/**
 * Formats the access date for citation templates.
 *
 * @param date - Date used for access-date.
 * @returns ISO date string.
 */
function formatAccessDate(date: Date): string {
    const accessDate = date || new Date();

    return accessDate.toISOString().slice(0, DATE_PARTS_LENGTH);
}


/**
 * Selects a lazily evaluated value for a condition.
 *
 * @param condition - Condition to evaluate.
 * @param trueBranch - Branch used when the condition is
 * true.
 * @param falseBranch - Branch used when the condition is
 * false.
 * @returns Value returned by the selected branch.
 */
function selectValue(
    condition: unknown,
    trueBranch: (...args: any[]) => any,
    falseBranch: (...args: any[]) => any,
): any {
    if (condition) {
        return trueBranch();
    }

    return falseBranch();
}
