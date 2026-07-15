/** Wikitext and generated prose builders. */

import type { AggregateScoreRecord, SourceTags } from "#stub/article";
import { buildNameSourceReferenceKey } from "#stub/local/form-values.ts";
import { get as getTerminology } from "#stub/terms";
import { cite, wikitext } from "#shared";

const { buildTemplateCall, buildTemplateText, trimValue, uniqueValues } =
    wikitext;
const { buildReferencesSection } = cite;

const textTemplates = {
    // Punctuation shared by prose and normalized field display.
    shared: {
        conjunction: "和",
        enumerationSeparator: "、",
        portal: "电子游戏",
    },

    // Reusable title, year, and series formatting patterns.
    patterns: {
        // Generic page and category title candidates.
        titleGame: "{title}游戏",
        titleSeries: "{title}系列",
        titleSeriesVideoGames: "{title}系列电子游戏",
        titleVideoGames: "{title}电子游戏",

        // Release-year phrases and category.
        yearFuture: "未来电子游戏",
        yearPlanned: "预定于{year}年推出的",
        yearReleased: "{year}年",
        yearUnreleased: "尚未推出的",

        // Series display text used in prose.
        derivativeWorkDisplayTitle: "《{title}》衍生作品",
        seriesDisplayTitle: "《{title}》系列",
    },

    // Text shown in the generated article's main prose paragraph.
    prose: {
        // Complete paragraph from four sentence outputs.
        text: "{sentence1}{sentence2}{sentence3}{sentence4}",

        // Sentence 1 joins sentence 1a and optional sentence 1b.
        sentence1: "{text}。",
        sentence1Separator: "，",

        // Sentence 1a: titles, release year, and genre.
        sentence1a: "{titles}是{yearGenre}",
        countedSentence1a: "是{yearGenre}",
        titles: "《'''{name}'''》{foreignTitle}",
        foreignTitle: "（{title}{sourceTag}）",
        yearGenre: "{prefix}[[电子游戏]]{sourceTag}",
        fallbackYearGenrePrefix: "一款",
        genreClass: "{genreText}类",

        // Sentence 1b: developer and publisher attribution.
        sentence1b: "由{roleText}{sourceTag}",
        developed: "{developers}开发",
        developedAndPublished: "{developers}开发及发行",
        developedThenPublished: "{developers}开发、{publishers}发行",
        published: "{publishers}发行",

        // Sentence 2: supported platforms and game series.
        sentence2:
            "作品对应{platformText}平台{platformSourceTag}{seriesClause}。",
        seriesClause: "，属于{seriesText}{seriesSourceTag}",
        seriesOnly: "作品属于{seriesText}{seriesSourceTag}。",
        seriesTitle: "「{value}」",

        // Sentence 3: aggregate review scores.
        sentence3: "游戏的{clauses}。",
        scoreSeparator: "，",
        metacritic: "[[Metacritic]]汇总得分为{score}/100",
        metacriticPlatformEdition: "（{label}版）",
        openCritic: "[[OpenCritic]]评测推荐率为{score}%",

        // Sentence 4: user-entered appended prose.
        sentence4: "{text}{sourceTag}",
        sentence4WithPeriod: "{text}{sourceTag}。",
    },

    // Heading shown above generated citation definitions.
    referencesHeading: "参考文献",

    // Text shown on generated company-category helper pages.
    handlers: {
        // Company category page title and prose.
        allCompaniesCategory: "各公司电子游戏",
        companyCategoryDescription:
            "本分類收錄由[[{company}]]開發、發行的電子遊戲作品。",
    },
};

/**
 * Formats generated text from the injected JSONC template catalog.
 */

const TEXT_TEMPLATES = textTemplates;

/**
 * Gets one template value by dotted key.
 *
 * @param key - Dotted template key.
 * @returns Template string.
 */
export function getTextTemplate(key: string): string {
    const value = resolveTemplateValue(TEXT_TEMPLATES, key.split("."));

    if (typeof value !== "string") {
        throw new Error(`Missing text template: ${key}`);
    }

    return value;
}

/**
 * Resolves nested paths while allowing literal dots in property names.
 *
 * @param data - Current template object.
 * @param parts - Remaining dotted-key parts.
 * @returns Resolved value.
 */
function resolveTemplateValue(data: any, parts: Array<string>): any {
    if (data == null || parts.length === 0) {
        return data;
    }

    for (let length = parts.length; length > 0; length -= 1) {
        const property = parts.slice(0, length).join(".");

        if (Object.hasOwn(data, property)) {
            return resolveTemplateValue(data[property], parts.slice(length));
        }
    }

    return undefined;
}

/**
 * Substitutes named placeholders in one text template.
 *
 * @param key - Dotted template key.
 * @param values - Placeholder values.
 * @returns Formatted text.
 */
export function formatText(key: string, values: any = {}): string {
    const template = getTextTemplate(key);
    const result = template.replace(
        /\{([A-Za-z][A-Za-z0-9]*)\}/gu,
        function callback(placeholder, name) {
            if (!Object.hasOwn(values, name)) {
                return placeholder;
            }

            return String(values[name] ?? "");
        },
    );

    return result;
}

/**
 * Composes complete prose sentences from optional clauses.
 */

/**
 * Joins sentence 1a and optional sentence 1b.
 *
 * @param sentence1a - Title, year, and genre clause.
 * @param sentence1b - Company attribution clause.
 * @returns Complete first sentence.
 */
export function buildSentence1Text(
    sentence1a: string,
    sentence1b: string = "",
): string {
    const separator = getTextTemplate("prose.sentence1Separator");
    const text = [sentence1a, sentence1b].filter(Boolean).join(separator);
    const values = {
        text,
    };
    const sentence = formatText("prose.sentence1", values);

    return sentence;
}

export interface AggregateScoresParams {
    metacriticPlatform?: string;
    metacriticScore?: string;
    metacriticSourceTag?: string;
    openCriticRecommend?: string;
    openCriticSourceTag?: string;
}

interface NormalizedMetacriticScore {
    platform: string;
    score: string;
}

/**
 * Builds aggregate review score sentence text.
 *
 * @param params - Aggregate score parameters.
 * @param params.metacriticPlatform - Metacritic platform.
 * @param params.metacriticScore - Metacritic score.
 * @param params.metacriticSourceTag - Metacritic source tag.
 * @param params.openCriticRecommend - OpenCritic
 * recommendation
 * rate.
 * @param params.openCriticSourceTag - OpenCritic source tag.
 * @returns Aggregate score sentence, or an empty string.
 */
export function buildAggScoresText(params: AggregateScoresParams): string {
    const clauses = [
        buildMetacriticClause(params),
        buildOpenCriticClause(params),
    ].filter(Boolean);

    if (clauses.length === 0) {
        return "";
    }

    return formatText("prose.sentence3", {
        clauses: clauses.join(getTextTemplate("prose.scoreSeparator")),
    });
}

/**
 * Builds Metacritic score text.
 *
 * @param params - Aggregate score parameters.
 * @param params.metacriticPlatform - Metacritic platform.
 * @param params.metacriticScore - Metacritic score.
 * @param params.metacriticSourceTag - Metacritic source tag.
 * @returns Metacritic clause, or an empty string.
 */
function buildMetacriticClause(params: AggregateScoresParams): string {
    const { platform, score } = normalizeMetacriticScoreParams(params);

    if (!hasDigit(score)) {
        return "";
    }

    return (
        formatText("prose.metacritic", { score }) +
        buildPlatformEditionText(platform) +
        (params.metacriticSourceTag || "")
    );
}

/**
 * Builds OpenCritic score text.
 *
 * @param params - Aggregate score parameters.
 * @param params.openCriticRecommend - OpenCritic
 * recommendation
 * rate.
 * @param params.openCriticSourceTag - OpenCritic source tag.
 * @returns OpenCritic clause, or an empty string.
 */
function buildOpenCriticClause(params: AggregateScoresParams): string {
    const score = trimValue(params.openCriticRecommend || "");

    if (!hasDigit(score)) {
        return "";
    }

    return (
        formatText("prose.openCritic", { score }) +
        (params.openCriticSourceTag || "")
    );
}

/**
 * Normalizes Metacritic score inputs.
 *
 * @param params - Aggregate score parameters.
 * @param params.metacriticPlatform - Metacritic platform.
 * @param params.metacriticScore - Metacritic score.
 * @returns Normalized platform and score values.
 */
function normalizeMetacriticScoreParams(
    params: AggregateScoresParams,
): NormalizedMetacriticScore {
    const platform = trimValue(params.metacriticPlatform || "");
    const score = trimValue(params.metacriticScore || "");

    if (!hasDigit(score) && hasDigit(platform)) {
        return {
            platform: score,
            score: platform,
        };
    }

    return {
        platform,
        score,
    };
}

/**
 * Builds platform edition text for Metacritic.
 *
 * @param platform - Platform value.
 * @returns Platform edition text, or an empty string.
 */
function buildPlatformEditionText(platform: string): string {
    const label = getPlatformLabel(platform);

    if (label === "") {
        return "";
    }

    return formatText("prose.metacriticPlatformEdition", {
        label,
    });
}

/**
 * Gets an unlinked platform label.
 *
 * @param platform - Platform value.
 * @returns Unlinked platform label.
 */
function getPlatformLabel(platform: string): string {
    const value = trimValue(platform || "");

    if (value === "") {
        return "";
    }

    return getTerminology("platform", value, "name") || value;
}

/**
 * Checks whether a value contains at least one digit.
 *
 * @param value - Value to inspect.
 * @returns Whether the value contains a digit.
 */
function hasDigit(value: string): boolean {
    return /\d/u.test(value);
}

/**
 * Builds DEFAULTSORT wikitext for video game stubs.
 */

/**
 * Builds a DEFAULTSORT magic word.
 *
 * @param params - Default sort parameters.
 * @param params.title - Article title.
 * @param params.original - Original title.
 * @param params.english - English title.
 * @param params.sortKey - User-entered sort key.
 * @returns DEFAULTSORT wikitext.
 */
export function buildDefaultSortText(params: any): string {
    return `{{DEFAULTSORT:${buildDefaultSortKey(params)}}}`;
}

/**
 * Builds a default sort key.
 *
 * @param params - Default sort parameters.
 * @param params.title - Article title.
 * @param params.original - Original title.
 * @param params.english - English title.
 * @param params.sortKey - User-entered sort key.
 * @returns Sort key.
 */
export function buildDefaultSortKey(params: any): string {
    const sortKey = normalizeDefaultSortValue(params.sortKey);

    if (sortKey != null) {
        return sortKey;
    }

    const original = normalizeDefaultSortValue(params.original);

    if (original != null && !hasNonLatinLetter(original)) {
        return normalizeSortKey(original);
    }

    return normalizeSortKey(params.english || params.title);
}

/**
 * Normalizes one sort key.
 *
 * @param value - Raw sort key.
 * @returns Normalized sort key.
 */
function normalizeSortKey(value: string): string {
    return toTitleUpperCase(
        normalizeSortPunctuation(normalizeDefaultSortValue(value) || ""),
    );
}

/**
 * Normalizes easy punctuation and symbol cases for sort keys.
 *
 * @param value - Raw sort key.
 * @returns Sort key with mechanical punctuation cleanup.
 */
function normalizeSortPunctuation(value: string): string {
    return value
        .normalize("NFKC")
        .replace(/\.{3,}/gu, " ")
        .replace(/(\d)[,.](?=\d)/gu, "$1")
        .replace(/[‐‑‒–—―−]/gu, "-")
        .replace(/&/gu, " and ")
        .replace(/×/gu, " x ")
        .replace(/\bO'(?=\p{Letter})/gu, "O")
        .replace(/[^\p{Letter}\p{Mark}\p{Number}\s.'-]+/gu, " ")
        .replace(/\s+/gu, " ")
        .trim();
}

/**
 * Converts a value to title-style uppercase.
 *
 * @param value - Raw value.
 * @returns Title-style value.
 */
function toTitleUpperCase(value: string): string {
    return value
        .replace(/\s+/gu, " ")
        .replace(/\p{Letter}[\p{Letter}\p{Mark}'’-]*/gu, titleUpperWord);
}

/**
 * Converts one word to title-style uppercase.
 *
 * @param word - Word to convert.
 * @returns Title-style word.
 */
function titleUpperWord(word: string): string {
    return word
        .toLocaleLowerCase()
        .replace(/(^|-)\p{Letter}/gu, function callback(character) {
            return character.toLocaleUpperCase();
        });
}

/**
 * Checks whether a value contains a non-Latin letter.
 *
 * @param value - Value to inspect.
 * @returns Whether the value contains a non-Latin letter.
 */
function hasNonLatinLetter(value: string): boolean {
    return Array.from(value).some(isNonLatinLetter);
}

/**
 * Checks whether one character is a non-Latin letter.
 *
 * @param character - Character to inspect.
 * @returns Whether the character is a non-Latin letter.
 */
function isNonLatinLetter(character: string): boolean {
    return (
        /\p{Letter}/u.test(character) && !/\p{Script=Latin}/u.test(character)
    );
}

/**
 * Normalizes a user-entered string.
 *
 * @param value - Raw value.
 * @returns Trimmed value, or undefined when empty.
 */
function normalizeDefaultSortValue(value: string): string | undefined {
    if (value == null) {
        return undefined;
    }

    const trimmedValue = String(value).trim();

    return trimmedValue === "" ? undefined : trimmedValue;
}

/**
 * Builds category wikitext links from review rows.
 *
 * @param rows - Category review rows.
 * @returns Category link wikitext.
 */
export function buildCategoryLinks(rows: Array<any>): Array<string> {
    return rows.filter(isRenderableCategoryRow).map(buildCategoryLink);
}

/**
 * Builds category wikitext from accepted article metadata.
 *
 * @param params - Normalized article parameters.
 * @returns Category wikitext.
 */
export function buildCategoryText(params: any): string {
    const categoryText = getCategoryLinks(params).join("\n");

    if (categoryText === "") {
        return "";
    }

    const result = `${params.defaultSortText}\n${categoryText}`;

    return result;
}

/**
 * Gets category links from reviewed rows.
 *
 * @param params - Normalized article parameters.
 * @returns Category links.
 */
export function getCategoryLinks(params: any): Array<string> {
    const rows = sortCategoryRowsByProse(
        params.categoryRows || [],
        params.prose?.text || "",
    );
    const result = buildCategoryLinks(rows);

    return result;
}

/**
 * Builds stub tag wikitext from accepted article metadata.
 *
 * @param params - Normalized article parameters.
 * @returns Stub tag wikitext.
 */
export function buildStubTagText(params: any): string {
    const stubTags = getStubTagRows(params)
        .filter((row) => row.enabled)
        .map((row) => row.stubTag);
    const result = uniqueValues(stubTags).map(buildTemplateCall).join("\n");

    return result;
}

/**
 * Gets unique stub-tag review rows in related prose order.
 *
 * @param params - Normalized article parameters.
 * @returns Stub-tag review rows.
 */
export function getStubTagRows(params: any): Array<any> {
    if (Array.isArray(params.stubTagRows)) {
        return getReviewedStubTagRows(params.stubTagRows);
    }

    const rows = sortCategoryRowsByProse(
        params.categoryRows || [],
        params.prose?.text || "",
    ).filter(hasStubTag);
    const stubTags = uniqueValues(
        rows.map((row) => normalizeStubTag(row.stubTag)),
    );

    return stubTags.map(function callback(stubTag) {
        return {
            enabled: rows.some(function callback(row) {
                return (
                    normalizeStubTag(row.stubTag) === stubTag &&
                    row.stubTagEnabled === true
                );
            }),
            stubTag,
        };
    });
}

/**
 * Defines the module-level get reviewed stub tag rows.
 */
function getReviewedStubTagRows(rows) {
    const stubTags = uniqueValues(
        rows.map((row) => normalizeStubTag(row.stubTag)),
    );

    return stubTags.filter(Boolean).map(function callback(stubTag) {
        return {
            enabled: rows.some(function callback(row) {
                return (
                    normalizeStubTag(row.stubTag) === stubTag &&
                    row.enabled !== false
                );
            }),
            stubTag,
        };
    });
}

/**
 * Defines the module-level is renderable category row.
 */
function isRenderableCategoryRow(row) {
    return (
        row.enabled !== false && normalizeCategoryTitle(row.category) !== ""
    );
}

/**
 * Defines the module-level has stub tag.
 */
function hasStubTag(row) {
    return (
        normalizeCategoryTitle(row.category) !== "" &&
        normalizeStubTag(row.stubTag) !== ""
    );
}

/**
 * Sorts category rows by the first related mention in generated prose.
 *
 * @param rows - Category review rows.
 * @param prose - Generated article prose.
 * @returns Prose-ordered category rows.
 */
export function sortCategoryRowsByProse(
    rows: Array<any>,
    prose: string,
): Array<any> {
    const normalizedProse = normalizeRelatedText(stripLeadTitleText(prose));

    if (normalizedProse === "") {
        return rows;
    }

    return rows
        .map(function callback(row, index) {
            return {
                index,
                position: getCategoryProsePosition(row, normalizedProse),
                row,
            };
        })
        .sort(function callback(left, right) {
            if (left.position === right.position) {
                return left.index - right.index;
            }

            return left.position - right.position;
        })
        .map((item) => item.row);
}

/**
 * Defines the module-level get category prose position.
 */
function getCategoryProsePosition(row, prose) {
    const titles = uniqueValues([
        normalizeCategoryTitle(row.category),
        normalizeCategoryTitle(row.originalCategory),
    ]);
    const positions = titles
        .flatMap(getCategorySearchTerms)
        .map((term) => prose.indexOf(term))
        .filter((position) => position >= 0);

    return selectCategoryValue(
        positions.length === 0,
        function trueBranch() {
            return Number.POSITIVE_INFINITY;
        },
        function falseBranch() {
            return Math.min(...positions);
        },
    );
}

/**
 * Defines the module-level get category search terms.
 */
function getCategorySearchTerms(category) {
    const normalized = normalizeRelatedText(category);
    const gameSuffix = new RegExp(
        ["(?:电子游戏|電子遊戲", "|游戏|遊戲)$"].join(""),
        "u",
    );
    const stem = normalized.replace(gameSuffix, "");

    return uniqueValues([normalized, stem]).filter(Boolean);
}

/**
 * Defines the module-level strip lead title text.
 */
function stripLeadTitleText(prose) {
    return trimCategoryValue(prose)
        .replace(/^《[^》]+》(?:（[^）]+）)?/u, "")
        .replace(/^''[^']+''(?:（[^）]+）)?/u, "");
}

/**
 * Defines the module-level normalize related text.
 */
function normalizeRelatedText(value) {
    return foldChineseVariants(
        trimCategoryValue(value)
            .replace(/\[\[([^|\]]+\|)?([^\]]+)\]\]/gu, "$2")
            .replace(/[\s\u200e\u200f]/gu, "")
            .toLocaleLowerCase(),
    );
}

/**
 * Defines the module-level fold chinese variants.
 */
function foldChineseVariants(value) {
    return value
        .replace(/電/gu, "电")
        .replace(/體/gu, "体")
        .replace(/遊/gu, "游")
        .replace(/戲/gu, "戏")
        .replace(/鬥/gu, "斗");
}

/**
 * Defines the module-level build category link.
 */
function buildCategoryLink(row) {
    return `[[Category:${normalizeCategoryTitle(row.category)}]]`;
}

/**
 * Defines the module-level normalize category title.
 */
function normalizeCategoryTitle(value) {
    return trimCategoryValue(value)
        .replace(/^Category:/iu, "")
        .trim();
}

/**
 * Defines the module-level normalize stub tag.
 */
function normalizeStubTag(value) {
    return trimCategoryValue(value)
        .replace(/^\{\{/u, "")
        .replace(/\}\}$/u, "")
        .trim();
}

/**
 * Defines the module-level trim value.
 */
function trimCategoryValue(value) {
    return value == null ? "" : String(value).trim();
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
function selectCategoryValue(
    condition: unknown,
    trueBranch: (...args: any[]) => any,
    falseBranch: (...args: any[]) => any,
): any {
    if (condition) {
        return trueBranch();
    }

    return falseBranch();
}

/**
 * Builds footer maintenance templates for video game stubs.
 */

/**
 * Builds the video game portal bar and authority control templates.
 *
 * @returns Footer template wikitext.
 */
export function buildFooterTemplateText(): string {
    const portal = getTextTemplate("shared.portal");
    const text = [`{{Portal bar|${portal}}}`, "{{Authority control}}"].join(
        "\n",
    );

    return text;
}

const NAME_MARKETS = ["ww", "hans", "hant", "cn", "tw", "hk"];

/**
 * Builds an Infobox VG template.
 *
 * @param params - Infobox parameters.
 * @param params.name - Article title.
 * @param params.englishName - English title.
 * @param params.japaneseName - Japanese title.
 * @param params.originalLanguage - Original title language
 * code.
 * @param params.originalName - Original title.
 * @param params.officialNames - Official name rows.
 * @param params.commonNames - Common name rows.
 * @returns Infobox template wikitext.
 */
export function buildInfoboxText(params: any): string {
    return buildTemplateText(
        "Infobox VG",
        [
            ["onlysourced", "no"],
            ["title", normalizeInfoboxValue(params.name)],
            ["original", buildOriginalNameText(params)],
            ["japanese", buildJapaneseNameText(params)],
            ["english", buildEnglishNameText(params)],
            ["official", buildVgnText(params.officialNames)],
            ["common", buildVgnText(params.commonNames)],
        ],
        "block",
    );
}

/**
 * Builds the original title parameter for non-Japanese original names.
 *
 * @param params - Infobox parameters.
 * @param params.originalLanguage - Original title language
 * code.
 * @param params.originalName - Original title.
 * @returns Original title parameter.
 */
function buildOriginalNameText(params: any): string | undefined {
    const language = normalizeInfoboxValue(params.originalLanguage);
    const name = normalizeInfoboxValue(params.originalName);

    if (
        name == null ||
        language == null ||
        language === "ja" ||
        isSameInfoboxBaseTitle(name, params.name)
    ) {
        return undefined;
    }

    return `${language}:${name}`;
}

/**
 * Builds the Japanese title parameter.
 *
 * @param params - Infobox parameters.
 * @param params.japaneseName - Japanese title.
 * @param params.originalLanguage - Original title language
 * code.
 * @param params.originalName - Original title.
 * @returns Japanese title parameter.
 */
function buildJapaneseNameText(params: any): string | undefined {
    const japaneseName = normalizeInfoboxValue(params.japaneseName);

    if (japaneseName != null) {
        if (isSameInfoboxBaseTitle(japaneseName, params.name)) {
            return undefined;
        }

        return japaneseName;
    }

    if (normalizeInfoboxValue(params.originalLanguage) !== "ja") {
        return undefined;
    }

    const originalName = normalizeInfoboxValue(params.originalName);

    return selectInfoboxValue(
        isSameInfoboxBaseTitle(originalName, params.name),
        function trueBranch() {
            return undefined;
        },
        function falseBranch() {
            return originalName;
        },
    );
}

/**
 * Builds the English title parameter.
 *
 * @param params - Infobox parameters.
 * @param params.englishName - English title.
 * @param params.name - Article title.
 * @returns English title parameter.
 */
function buildEnglishNameText(params: any): string | undefined {
    const englishName = normalizeInfoboxValue(params.englishName);

    if (isSameInfoboxBaseTitle(englishName, params.name)) {
        return undefined;
    }

    return englishName;
}

/**
 * Builds a vgn template from localized name rows.
 *
 * @param rows - Localized name rows.
 * @returns vgn template wikitext.
 */
function buildVgnText(rows: Array<any>): string | undefined {
    const entries = (rows || []).flatMap(buildVgnEntries);

    if (entries.length === 0) {
        return undefined;
    }

    return buildTemplateText(
        "vgn",
        entries.map((entry) => [1, entry]),
    );
}

/**
 * Builds vgn entries for one localized name row.
 *
 * @param row - Localized name row.
 * @param row.name - Localized name.
 * @param row.markets - Selected market codes.
 * @param row.ref - Reference tag appended to each name.
 * @returns vgn entries.
 */
function buildVgnEntries(row: any): Array<string> {
    const name = normalizeInfoboxValue(row.name);

    if (name == null) {
        return [];
    }

    const ref = normalizeInfoboxValue(row.ref) || "";
    const markets = getSelectedMarkets(row);

    if (markets.length === 0) {
        return [`${name}${ref}`];
    }

    return markets.map((market) => `${market}:${name}${ref}`);
}

/**
 * Gets selected market codes for one localized name row.
 *
 * @param row - Localized name row.
 * @param row.markets - Selected market codes.
 * @returns Selected market codes.
 */
function getSelectedMarkets(row: any): Array<string> {
    if (Array.isArray(row.markets)) {
        return NAME_MARKETS.filter((market) => row.markets.includes(market));
    }

    return NAME_MARKETS.filter((market) => row[market] === true);
}

/**
 * Normalizes a user-entered string.
 *
 * @param value - Raw value.
 * @returns Trimmed value, or undefined when empty.
 */
function normalizeInfoboxValue(value: string): string | undefined {
    if (value == null) {
        return undefined;
    }

    const trimmedValue = String(value).trim();

    return trimmedValue === "" ? undefined : trimmedValue;
}

/**
 * Checks whether a title value duplicates the article's base title.
 *
 * @param value - Title value.
 * @param articleTitle - Article title.
 * @returns Whether the titles are equivalent.
 */
function isSameInfoboxBaseTitle(value: string, articleTitle: string): boolean {
    if (value == null) {
        return false;
    }

    return (
        normalizeInfoboxTitleForComparison(value) ===
        normalizeInfoboxTitleForComparison(articleTitle)
    );
}

/**
 * Normalizes a title for duplicate-name comparisons.
 *
 * @param title - Title text.
 * @returns Normalized title.
 */
function normalizeInfoboxTitleForComparison(title: string): string {
    return String(title || "")
        .trim()
        .replace(/ \(.+?\)$/u, "");
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
function selectInfoboxValue(
    condition: unknown,
    trueBranch: (...args: any[]) => any,
    falseBranch: (...args: any[]) => any,
): any {
    if (condition) {
        return trueBranch();
    }

    return falseBranch();
}

const ITALIC_LANGUAGE_CODES = new Set(["en", "fr"]);

/**
 * Builds the lead article name text.
 *
 * @param params - Lead name parameters.
 * @param params.englishName - English game title.
 * @param params.name - Article title.
 * @param params.originalLanguage - Original title language
 * code.
 * @param params.originalName - Original game title.
 * @param params.sourceTags - Source reference tags keyed by
 * field.
 * @returns Lead name wikitext.
 */
export function buildLeadNameText(params: any): string {
    const values = {
        foreignTitle: buildVariantNameText(params),
        name: params.name,
    };
    const text = formatText("prose.titles", values);

    return text;
}

/**
 * Builds parenthesized original or English title text.
 *
 * @param params - Lead name parameters.
 * @param params.englishName - English game title.
 * @param params.originalLanguage - Original title language
 * code.
 * @param params.originalName - Original game title.
 * @param params.sourceTags - Source reference tags keyed by
 * field.
 * @returns Parenthesized title text, or an empty string.
 */
function buildVariantNameText(params: any): string {
    if (params.originalName !== "") {
        if (isSameBaseTitle(params.originalName, params.name)) {
            return "";
        }

        return buildVariantNameVariantText({
            code: params.originalLanguage,
            name: params.originalName,
            ref: params.sourceTags.originalName || "",
        });
    }

    if (params.englishName !== "") {
        if (isSameBaseTitle(params.englishName, params.name)) {
            return "";
        }

        return buildVariantNameVariantText({
            code: "en",
            name: params.englishName,
            ref: params.sourceTags.englishName || "",
        });
    }

    return "";
}

/**
 * Builds parenthesized variant title text.
 *
 * @param variant - Variant title parameters.
 * @param variant.code - Language code.
 * @param variant.name - Variant title.
 * @param variant.ref - Source reference tag.
 * @returns Parenthesized variant title text.
 */
function buildVariantNameVariantText(variant: any): string {
    const values = {
        sourceTag: variant.ref,
        title: buildLangxTemplate(variant.code, variant.name),
    };
    const text = formatText("prose.foreignTitle", values);

    return text;
}

/**
 * Builds a langx template call.
 *
 * @param language - Language code.
 * @param text - Localized title text.
 * @returns Langx template wikitext.
 */
function buildLangxTemplate(language: string, text: string): string {
    return buildTemplateText("langx", [
        [1, language],
        [2, text],
        ["italic", buildLangxItalicParam(language)],
        ["label", "none"],
    ]);
}

/**
 * Builds the langx italic parameter for selected languages.
 *
 * @param language - Language code.
 * @returns Langx italic parameter, or an empty string.
 */
function buildLangxItalicParam(language: string): string {
    return ITALIC_LANGUAGE_CODES.has(language) ? "yes" : undefined;
}

/**
 * Checks whether a variant name duplicates the article's base title.
 *
 * @param variantName - Original or English title.
 * @param articleTitle - Article title.
 * @returns Whether the names are equivalent.
 */
function isSameBaseTitle(variantName: string, articleTitle: string): boolean {
    return (
        normalizeTitleForComparison(variantName) ===
        normalizeTitleForComparison(articleTitle)
    );
}

/**
 * Normalizes a title for duplicate-name comparisons.
 *
 * @param title - Title text.
 * @returns Normalized title.
 */
function normalizeTitleForComparison(title: string): string {
    return String(title || "")
        .trim()
        .replace(/ \(.+?\)$/u, "");
}

/**
 * Builds generated navbox wikitext for resolved template titles.
 *
 * @param titles - Resolved template titles.
 * @returns Navbox wikitext.
 */
export function buildNavboxText(titles: Array<string>): string {
    const result = titles.map(buildTemplateCall).join("\n");

    return result;
}

/**
 * Builds navbox wikitext from selected review rows.
 *
 * @param rows - Reviewed navbox rows.
 * @returns Selected navbox wikitext.
 */
export function buildReviewedNavboxText(rows: Array<any | string>): string {
    const result = rows
        .filter((row) => row?.enabled !== false)
        .map((row) => trimValue(row?.text ?? row))
        .filter(Boolean)
        .map(function callback(text) {
            return text.startsWith("{{") ? text : buildTemplateCall(text);
        })
        .join("\n");

    return result;
}

type TemplateParam = wikitext.TemplateParam;

const SIMPLIFIED_MARKETS = ["hans", "cn"];
const HONG_KONG_MARKETS = ["hk"];
const TAIWAN_MARKETS = ["hant", "tw"];

/**
 * Builds a NoteTA-lite template.
 *
 * @param params - NoteTA parameters.
 * @param params.entries - User-editable NoteTA rows.
 * @param params.namesRemoved - Whether generated name
 * conversion
 * was removed.
 * @param params.officialNames - Official name rows.
 * @returns NoteTA-lite template wikitext.
 */
export function buildNoteTaText(params: any = {}): string {
    const manualEntries = normalizeNoteTaEntries(params.entries);
    const entries = getNoteTaEntries(manualEntries);
    const conversionText = getNoteTaConversionText(entries, params);

    const text = buildTemplateText(
        "NoteTA-lite",
        sortNoteTaEntries([
            ...entries,
            {
                key: "1",
                value: conversionText,
            },
        ]).map(formatNoteTaTemplateParam),
        "block",
    );

    return text;
}

/** Gets manual NoteTA rows or the default group row. */
function getNoteTaEntries(manualEntries: Array<any>): Array<any> {
    let entries = [{ key: "G1", value: "Games" }];

    if (manualEntries.length > 0) {
        entries = manualEntries;
    }

    return entries;
}

/** Gets generated official-name conversion text when needed. */
function getNoteTaConversionText(entries, params): string | undefined {
    const suppressed =
        hasEditableNameConversionEntry(entries) ||
        params.namesRemoved === true;
    let text;

    if (!suppressed) {
        text = buildOfficialNameConversionText(params.officialNames);
    }

    return text;
}

/**
 * Handles has editable name conversion entry.
 *
 * Checks whether editable rows already include the generated name
 * conversion.
 *
 * @param entries - Normalized NoteTA rows.
 * @returns Whether name conversion has an editable row.
 *
 */
function hasEditableNameConversionEntry(entries: Array<any>): boolean {
    return entries.some(function callback(entry) {
        return entry.source === "names" || trimNoteTaText(entry.key) === "1";
    });
}

/**
 * Formats one NoteTA row as a template parameter tuple.
 *
 * @param entry - NoteTA row.
 * @returns Template parameter tuple.
 */
function formatNoteTaTemplateParam(entry: any): TemplateParam {
    const key = getTemplateParamKey(entry.key);
    const value =
        key == null ? escapeAnonymousParamValue(entry.value) : entry.value;

    return [key, value];
}

/**
 * Escapes equals signs in anonymous template parameters.
 *
 * @param value - Anonymous parameter value.
 * @returns Escaped parameter value.
 */
function escapeAnonymousParamValue(
    value: string | undefined,
): string | undefined {
    return value == null ? undefined : value.replace(/=/gu, "{{=}}");
}

/**
 * Normalizes user-editable NoteTA rows.
 *
 * @param entries - User-entered NoteTA rows.
 * @returns Normalized non-empty rows.
 */
function normalizeNoteTaEntries(entries: Array<any>): Array<any> {
    if (!Array.isArray(entries)) {
        return [];
    }

    return entries
        .map(function callback(entry) {
            return {
                key: trimNoteTaText(entry?.key),
                modified: entry?.modified === true,
                source: trimNoteTaText(entry?.source),
                value: trimNoteTaText(entry?.value),
            };
        })
        .filter((entry) => entry.key !== "" || entry.value !== "");
}

/**
 * Sorts named conversion groups before anonymous conversion rows.
 *
 * @param entries - NoteTA row objects.
 * @returns Sorted NoteTA row objects.
 */
export function sortNoteTaEntries(entries: Array<any>): Array<any> {
    return entries
        .map(function callback(entry, index) {
            return {
                ...entry,
                index,
            };
        })
        .sort(compareNoteTaEntries)
        .map(({ index: _index, ...entry }) => entry);
}

/**
 * Compares NoteTA rows by template source order.
 *
 * @param a - First NoteTA row.
 * @param b - Second NoteTA row.
 * @returns Sort order.
 */
function compareNoteTaEntries(a: any, b: any): number {
    const rankA = getNoteTaEntryRank(a);
    const rankB = getNoteTaEntryRank(b);

    return (
        rankA.group - rankB.group ||
        rankA.number - rankB.number ||
        a.index - b.index
    );
}

/**
 * Gets a sortable rank for one NoteTA row.
 *
 * @param entry - NoteTA row.
 * @returns Sort rank.
 */
function getNoteTaEntryRank(entry: any): any {
    const key = trimNoteTaText(entry.key);
    const groupMatch = key.match(/^G([1-9]\d*)$/u);
    const numberMatch = key.match(/^[1-9]\d*$/u);

    if (key === "T") {
        return createNoteTaRank(0, 0);
    }

    if (groupMatch != null) {
        return createNoteTaRank(1, Number(groupMatch[1]));
    }

    if (numberMatch != null) {
        return createNoteTaRank(2, Number(key));
    }

    if (key === "") {
        return createNoteTaRank(3, entry.index);
    }

    return createNoteTaRank(4, entry.index);
}

/** Creates a sortable NoteTA row rank. */
function createNoteTaRank(group: number, number: number): any {
    return { group, number };
}

/**
 * Converts a row key to the template parameter key.
 *
 * @param key - User-entered row key.
 * @returns Template parameter key.
 */
function getTemplateParamKey(key: string | null): string | null {
    const text = trimNoteTaText(key);

    return text === "" ? null : text;
}

/**
 * Trims NoteTA row text.
 *
 * @param value - Raw row text.
 * @returns Trimmed text.
 */
function trimNoteTaText(value: any): string {
    return String(value || "").trim();
}

/**
 * Builds a Simplified/Traditional conversion rule from official names.
 *
 * @param rows - Official name rows.
 * @returns Conversion rule, if both variants exist.
 */
export function buildOfficialNameConversionText(
    rows: Array<any>,
): string | undefined {
    const simplifiedName = findOfficialName(rows, SIMPLIFIED_MARKETS);
    const hongKongName = findOfficialName(rows, HONG_KONG_MARKETS);
    const taiwanName = findOfficialName(rows, TAIWAN_MARKETS);

    if (
        simplifiedName == null ||
        (hongKongName == null && taiwanName == null)
    ) {
        return undefined;
    }

    return [
        buildConversionEntry("cn", simplifiedName),
        buildConversionEntry("hk", hongKongName),
        buildConversionEntry("tw", taiwanName),
    ]
        .filter(Boolean)
        .join(" ");
}

/**
 * Builds one NoteTA conversion entry.
 *
 * @param region - Chinese variant region code.
 * @param value - Localized official name.
 * @returns Conversion entry.
 */
function buildConversionEntry(
    region: string,
    value: string | undefined,
): string | undefined {
    return value == null ? undefined : `zh-${region}:${value};`;
}

/**
 * Finds the first official name selected for any market in a group.
 *
 * @param rows - Official name rows.
 * @param markets - Market keys to match.
 * @returns Official name.
 */
function findOfficialName(
    rows: Array<any> = [],
    markets: Array<string>,
): string | undefined {
    return (
        rows.find((row) => hasAnyMarket(row, markets))?.name?.trim() ||
        undefined
    );
}

/**
 * Checks whether a localized name row targets any market in a group.
 *
 * @param row - Official name row.
 * @param row.markets - Selected market codes.
 * @param markets - Market keys to match.
 * @returns Whether any requested market is selected.
 */
function hasAnyMarket(row: any, markets: Array<string>): boolean {
    if (Array.isArray(row.markets)) {
        return markets.some((market) => row.markets.includes(market));
    }

    return markets.some((market) => row[market] === true);
}

/**
 * Builds references-section wikitext for video game stubs.
 */

/**
 * Builds the references section for generated citations.
 *
 * @param references - Named source references.
 * @returns References section, or an empty string.
 */
export function buildReferencesText(references: Array<any>): string {
    if (references.length === 0) {
        return "";
    }

    return buildReferencesSection(references, {
        heading: getTextTemplate("referencesHeading"),
    });
}

/**
 * Estimates generated prose length in Hanzi-equivalent sinographs.
 */

/**
 * Counts generated prose in Hanzi-equivalent sinographs.
 *
 * @param params - Article prose parameters.
 * @param params.aggScoresText - Aggregate review score
 * sentence.
 * @param params.additionalProseText - User-entered appended
 * prose.
 * @param params.companyMetadata - Company metadata.
 * @param params.companyMetadata.text - Company prose text.
 * @param params.platformSeriesMetadata - Platform and series
 * metadata.
 * @param params.platformSeriesMetadata.text - Platform/series
 * prose
 * text.
 * @param params.yearGenreMetadata - Year/genre metadata.
 * @param params.yearGenreMetadata.text - Year/genre prose
 * text.
 * @returns Hanzi-equivalent sinograph count.
 */
export function countGeneratedProseSinographs(params: any): number {
    if (params.prose?.sinographs != null) {
        return params.prose.sinographs;
    }

    return countProseSinographs(buildGeneratedProseText(params));
}

/**
 * Counts prose text in Hanzi-equivalent sinographs.
 *
 * @param text - Prose text.
 * @returns Hanzi-equivalent sinograph count.
 */
export function countProseSinographs(text: string): number {
    const plainText = stripWikitext(text);
    const withoutLatin = plainText.replace(getLatinPhrasePattern(), "");
    const withoutNumbers = withoutLatin.replace(getNumberPattern(), "");

    return (
        countHanCharacters(withoutNumbers) +
        countMatches(plainText, getLatinPhrasePattern()) * 2 +
        countMatches(withoutLatin, getNumberPattern()) * 2
    );
}

/**
 * Builds the generated article prose covered by the count.
 *
 * @param params - Article prose parameters.
 * @returns Generated prose text.
 */
function buildGeneratedProseText(params: any): string {
    const sentence1a = formatText("prose.countedSentence1a", {
        yearGenre: params.yearGenreMetadata.text,
    });
    const sentence1 = buildSentence1Text(
        sentence1a,
        params.companyMetadata.text,
    );
    const text = formatText("prose.text", {
        sentence1,
        sentence2: params.platformSeriesMetadata.text,
        sentence3: params.aggScoresText,
        sentence4: params.additionalProseText || "",
    });

    return text;
}

/**
 * Removes simple wikitext markup while preserving displayed prose.
 *
 * @param text - Wikitext prose.
 * @returns Plain prose.
 */
function stripWikitext(text: string): string {
    return String(text || "")
        .replace(/<ref\b[^>]*\/>/giu, "")
        .replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/giu, "")
        .replace(/\[\[[^\]|]*\|([^\]]+)\]\]/gu, "$1")
        .replace(/\[\[([^\]]+)\]\]/gu, "$1")
        .replace(/\{\{[^{}]*\}\}/gu, "");
}

/**
 * Counts Han script characters.
 *
 * @param text - Text to scan.
 * @returns Han character count.
 */
function countHanCharacters(text: string): number {
    return countMatches(text, /\p{Script=Han}/gu);
}

/**
 * Counts regular expression matches.
 *
 * @param text - Text to scan.
 * @param pattern - Global regular expression.
 * @returns Match count.
 */
function countMatches(text: string, pattern: RegExp): number {
    return Array.from(String(text || "").matchAll(pattern)).length;
}

/**
 * Gets the Latin proper-noun phrase matcher.
 *
 * @returns Latin phrase matcher.
 */
function getLatinPhrasePattern(): RegExp {
    return new RegExp(
        [
            "\\b[A-Za-z][A-Za-z0-9]*",
            "(?:[ \\t./&",
            "'’:-]+[A-Za-z0-9]+)*\\b",
        ].join(""),
        "gu",
    );
}

/**
 * Gets the numeric token matcher.
 *
 * @returns Number matcher.
 */
function getNumberPattern(): RegExp {
    return /\b\d+(?:[./:-]\d+)*%?\b/gu;
}

/**
 * Composes article prose from independent article-part outputs.
 */

/**
 * Builds every prose fragment that combines independent data records.
 *
 * @param records - Article records keyed by module.
 * @param sourceTags - Source reference tags keyed by field.
 * @returns Composed article prose fragments.
 */
export function buildArticleProse(records: any, sourceTags: any): any {
    const sentence1 = buildOpeningProse(records, sourceTags);
    const sentence2 = buildPlatformsAndSeriesProse(
        records.platform,
        records.series,
        sourceTags,
    );
    const sentence3 = buildScoresProse(records.scores, sourceTags);
    const sentence4 = buildAppendProse(
        records.additionalProse,
        sourceTags.additionalProse,
    );
    const fragments = { sentence1, sentence2, sentence3, sentence4 };
    const proseValues = {
        sentence1: sentence1.text,
        sentence2,
        sentence3,
        sentence4,
    };
    const countedText = buildCountedProseText(sentence1, proseValues);
    const prose = {
        fragments,
        sinographs: countProseSinographs(countedText),
        text: formatText("prose.text", proseValues),
    };

    return prose;
}

/** Builds the opening title, year, genre, and company sentence. */
function buildOpeningProse(records, sourceTags): any {
    const names = records.names.metadata;
    const leadValues = buildLeadValues(names, sourceTags);
    const titles = buildLeadNameText(leadValues);
    const yearGenre = buildYearGenreProse(
        records.year,
        records.genre,
        joinSourceTags(sourceTags, ["year", "genres"]),
    );
    const sentence1aText = formatText("prose.sentence1a", {
        titles,
        yearGenre,
    });
    const sentence1b = buildCompanyProse(records.companies, {
        sourceTag: joinSourceTags(sourceTags, ["developers", "publishers"]),
    });
    const sentence1a = {
        text: sentence1aText,
        titles,
        yearGenre,
    };
    const sentence = {
        s1a: sentence1a,
        s1b: sentence1b,
        text: buildSentence1Text(sentence1a.text, sentence1b),
    };

    return sentence;
}

/** Builds lead-name input values from normalized name metadata. */
function buildLeadValues(names, sourceTags): any {
    return {
        englishName: names.englishName,
        name: names.name,
        originalLanguage: names.original.language,
        originalName: names.original.name,
        sourceTags,
    };
}

/** Builds prose text with titles excluded from the length count. */
function buildCountedProseText(sentence1, proseValues): string {
    const countedSentence1a = formatText("prose.countedSentence1a", {
        yearGenre: sentence1.s1a.yearGenre,
    });
    const countedSentence1 = buildSentence1Text(
        countedSentence1a,
        sentence1.s1b,
    );
    const countedText = formatText("prose.text", {
        ...proseValues,
        sentence1: countedSentence1,
    });

    return countedText;
}

/**
 * Builds the year, genre, and video-game noun phrase.
 *
 * @param year - Release-year field output.
 * @param genre - Genre field output.
 * @param sourceTag - Combined year and genre source tags.
 * @returns Video-game noun phrase.
 */
export function buildYearGenreProse(
    year: any,
    genre: any,
    sourceTag: string = "",
): string {
    const yearText = year.metadata.phrase || "";
    const genreText = selectProseValue(
        genre.wikitext.list === "",
        function trueBranch() {
            return "";
        },
        function falseBranch() {
            return formatText("prose.genreClass", {
                genreText: genre.wikitext.list,
            });
        },
    );
    const prefix =
        `${yearText}${genreText}` ||
        getTextTemplate("prose.fallbackYearGenrePrefix");
    const values = {
        prefix,
        sourceTag,
    };
    const prose = formatText("prose.yearGenre", values);

    return prose;
}

/**
 * Builds developer and publisher attribution prose.
 *
 * @param companies - Company article data.
 * @param options - Attribution options.
 * @param options.sourceTag - Combined company source tags.
 * @returns Company attribution clause.
 */
export function buildCompanyProse(companies, options: any = {}): string {
    const developerText = companies.wikitext.developers || "";
    const publisherText = companies.wikitext.publishers || "";
    const roleText = buildCompanyRoleText(
        developerText,
        publisherText,
        companies.metadata.sameCompanies,
    );

    if (roleText === "") {
        return "";
    }

    const values = {
        roleText,
        sourceTag: options.sourceTag || "",
    };
    const prose = formatText("prose.sentence1b", values);

    return prose;
}

/**
 * Builds the platform and series sentence.
 *
 * @param platforms - Platform field output.
 * @param series - Series field output.
 * @param sourceTags - Source tags keyed by field.
 * @returns Platform/series sentence.
 */
export function buildPlatformsAndSeriesProse(
    platforms: any,
    series: any,
    sourceTags: any = {},
): string {
    const platformText = platforms.wikitext.list;
    const seriesText = buildSeriesListText(series.values);

    if (platformText === "" && seriesText === "") {
        return "";
    }

    if (platformText === "") {
        const values = {
            seriesSourceTag: sourceTags.series || "",
            seriesText,
        };
        const prose = formatText("prose.seriesOnly", values);

        return prose;
    }

    const seriesClause = buildSeriesClause(seriesText, sourceTags);
    const values = {
        platformSourceTag: sourceTags.platforms || "",
        platformText,
        seriesClause,
    };
    const prose = formatText("prose.sentence2", values);

    return prose;
}

/** Builds the optional series clause following platform prose. */
function buildSeriesClause(seriesText: string, sourceTags: any): string {
    if (seriesText === "") {
        return "";
    }

    const clause = formatText("prose.seriesClause", {
        seriesSourceTag: sourceTags.series || "",
        seriesText,
    });

    return clause;
}

/**
 * Builds aggregate review score prose from score metadata.
 *
 * @param scores - Review-score part output.
 * @param sourceTags - Source tags keyed by field.
 * @returns Aggregate score sentence.
 */
export function buildScoresProse(
    scores: AggregateScoreRecord,
    sourceTags: SourceTags = {},
): string {
    const values = {
        metacriticPlatform: scores.metadata.metacritic.platform,
        metacriticScore: scores.metadata.metacritic.score,
        metacriticSourceTag: sourceTags.metacriticScore,
        openCriticRecommend: scores.metadata.openCritic.recommend,
        openCriticSourceTag: sourceTags.openCriticRecommend,
    };
    const prose = buildAggScoresText(values);

    return prose;
}

/**
 * Adds a source tag to user-entered additional prose.
 *
 * @param additionalProse - Additional-prose part output.
 * @param sourceTag - Additional-prose source tag.
 * @returns Sourced prose text.
 */
export function buildAppendProse(
    additionalProse: any,
    sourceTag: string = "",
): string {
    const text = additionalProse.wikitext.text || "";

    if (text === "") {
        return "";
    }

    const hasPeriod = text.endsWith("。");
    const templateKey = selectProseValue(
        hasPeriod,
        function trueBranch() {
            return "prose.sentence4WithPeriod";
        },
        function falseBranch() {
            return "prose.sentence4";
        },
    );
    const prose = formatText(templateKey, {
        sourceTag,
        text: hasPeriod ? text.slice(0, -1) : text,
    });

    return prose;
}

/**
 * Defines the module-level build company role text.
 */
function buildCompanyRoleText(developers, publishers, sameCompanies) {
    if (developers === "" && publishers === "") {
        return "";
    }

    if (developers !== "" && sameCompanies) {
        return formatText("prose.developedAndPublished", {
            developers,
        });
    }

    if (developers === "") {
        return formatText("prose.published", {
            publishers,
        });
    }

    if (publishers === "") {
        return formatText("prose.developed", {
            developers,
        });
    }

    return formatText("prose.developedThenPublished", {
        developers,
        publishers,
    });
}

/**
 * Defines the module-level build series list text.
 */
function buildSeriesListText(values) {
    const names = values.map(function callback(value) {
        return formatText("prose.seriesTitle", {
            value: value.wikitext,
        });
    });

    if (names.length === 2) {
        return names.join(getTextTemplate("shared.conjunction"));
    }

    return names.join(getTextTemplate("shared.enumerationSeparator"));
}

/**
 * Defines the module-level join source tags.
 */
function joinSourceTags(sourceTags, keys) {
    const tags = keys.map((key) => sourceTags[key] || "").join("");

    return tags;
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
function selectProseValue(
    condition: unknown,
    trueBranch: (...args: any[]) => any,
    falseBranch: (...args: any[]) => any,
): any {
    if (condition) {
        return trueBranch();
    }

    return falseBranch();
}

/**
 * Builds non-prose article outputs from normalized article-part data.
 */

/**
 * Builds infobox, conversion, sorting, and reviewed navbox outputs.
 *
 * @param records - Article records keyed by module.
 * @param sourceTags - Source reference tags keyed by field.
 * @returns Rendered article outputs.
 */
export function buildArticleRenderers(records: any, sourceTags: any): any {
    const names = records.names.metadata;
    const commonNames = addNameReferenceTags(
        names.commonNames,
        sourceTags,
        "commonNames",
    );
    const officialNames = addNameReferenceTags(
        names.officialNames,
        sourceTags,
        "officialNames",
    );
    const defaultSort = buildNameDefaultSort(names);
    const infobox = buildNameInfobox(names, commonNames, officialNames);
    const noteTa = buildNoteTaText({
        entries: records.noteTa.metadata.rows,
        namesRemoved: records.noteTa.metadata.namesRemoved,
        officialNames: names.officialNames,
    });

    return {
        defaultSort,
        infobox,
        navboxes: records.review.wikitext.navbox,
        noteTa,
    };
}

/** Builds default-sort text from normalized names. */
function buildNameDefaultSort(names: any): string {
    return buildDefaultSortText({
        english: names.englishName,
        original: names.original.name,
        sortKey: names.sortKey,
        title: names.name,
    });
}

/** Builds infobox text from normalized names. */
function buildNameInfobox(
    names: any,
    commonNames: any,
    officialNames: any,
): string {
    return buildInfoboxText({
        commonNames,
        englishName: names.englishName,
        name: names.name,
        officialNames,
        originalLanguage: names.original.language,
        originalName: names.original.name,
    });
}

/**
 * Defines the module-level add name reference tags.
 */
function addNameReferenceTags(rows, sourceTags, key) {
    const values = (rows || []).map(function callback(row, index) {
        const sourceKey =
            row.sourceKey || buildNameSourceReferenceKey(key, index);
        const value = {
            ...row,
            ref: sourceTags[sourceKey] || "",
        };

        return value;
    });

    return values;
}

/**
 * Assembles generated article wikitext from prepared article metadata.
 */

/**
 * Builds the Chinese Wikipedia video game stub article text.
 *
 * @param params - Normalized article parameters.
 * @param params.aggScoresText - Aggregate review score
 * sentence.
 * @param params.additionalProseText - User-entered appended
 * prose.
 * @param params.companyMetadata - Company text and metadata.
 * @param params.infoboxText - Infobox wikitext.
 * @param params.leadNameText - Lead article name text.
 * @param params.navboxText - Series navbox wikitext.
 * @param params.noteTaText - NoteTA-lite wikitext.
 * @param params.platformSeriesMetadata - Platform and series
 * text and
 * metadata.
 * @param params.sourceReferences - Named source
 * references.
 * @param params.yearGenreMetadata - Year/genre text and
 * metadata.
 * @returns Generated Chinese wikitext.
 */
export function buildArticleWikitext(params: any): string {
    const review = params.records?.review?.wikitext || {};
    const intro = params.prose?.text || buildLegacyProse(params);

    return [
        params.renderers?.noteTa || params.noteTaText,
        params.renderers?.infobox || params.infoboxText,
        intro,
        buildReferencesText(params.sourceReferences),
        params.renderers?.navboxes || review.navbox || params.navboxText,
        buildFooterTemplateText(),
        buildCategoryText(params),
        buildStubTagText(params),
    ]
        .filter(Boolean)
        .join("\n\n");
}

/**
 * Defines the module-level build legacy prose.
 */
function buildLegacyProse(params) {
    const sentence1a = formatText("prose.sentence1a", {
        titles: params.leadNameText,
        yearGenre: params.yearGenreMetadata.text,
    });
    const sentence1 = buildSentence1Text(
        sentence1a,
        params.companyMetadata.text,
    );
    const text = formatText("prose.text", {
        sentence1,
        sentence2: params.platformSeriesMetadata.text,
        sentence3: params.aggScoresText,
        sentence4: params.additionalProseText,
    });

    return text;
}
