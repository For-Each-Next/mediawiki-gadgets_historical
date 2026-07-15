/** Article metadata builders. */

import { get as getTerminology } from "#stub/terms";
import { formatText, getTextTemplate } from "#stub/wiki";
import { wikitext } from "#shared";

const {
    buildLinkText,
    getReferenceValues,
    getWikilinkParts,
    getWikilinkValue,
    isWikilinkValue,
    splitFieldValues,
    splitLookupFieldValues,
    trimValue,
    uniqueValues,
} = wikitext;

/**
 * Defines the module-level build year metadata.
 */
export function buildYearMetadata(value) {
    const normalized = normalizeYearFieldValue(value);
    const reference = getYearReference(normalized);
    const metadata = {
        categories: reference.categories,
        phrase: reference.phrase,
        value: normalized,
    };

    return metadata;
}

/**
 * Defines the module-level normalize year field value.
 */
export function normalizeYearFieldValue(value) {
    const entered = value == null ? "" : String(value).trim();
    const planned = entered.startsWith("~");
    const rawYear = planned ? entered.slice(1).trim() : entered;
    const yearMatch = rawYear.match(/\b\d{4}\b/u);
    const candidate = yearMatch?.[0] || rawYear;
    const normalized = getTerminology("year", candidate, "name") || candidate;

    if (planned) {
        return normalized === "" ? "~" : `~${normalized}`;
    }

    return normalized;
}

/**
 * Defines the module-level get year reference.
 */
function getYearReference(value) {
    const year = trimValue(value);
    const definition = getTerminology("year", year);

    if (year === "") {
        return {
            categories: [],
            phrase: "",
        };
    }

    if (year === "~") {
        return {
            categories: [getTextTemplate("patterns.yearFuture")],
            phrase: getTextTemplate("patterns.yearUnreleased"),
        };
    }

    if (year.startsWith("~")) {
        return getPlannedYearReference(year.slice(1));
    }

    const reference = {
        categories: definition?.categories || [],
        phrase: formatText("patterns.yearReleased", {
            year: definition?.name || year,
        }),
    };

    return reference;
}

/**
 * Defines the module-level get planned year reference.
 */
function getPlannedYearReference(value) {
    const year = trimValue(value);
    const definition = getTerminology("year", year);
    const reference = {
        categories: uniqueValues([
            getTextTemplate("patterns.yearFuture"),
            ...(definition?.categories || []),
        ]),
        phrase: formatText("patterns.yearPlanned", {
            year: definition?.name || year,
        }),
    };

    return reference;
}

/**
 * Defines the module-level build genre metadata.
 */
export function buildGenreMetadata(value) {
    const genres = splitFieldValues(value);
    const items = genres.map(buildGenreItem);
    const references = getGenreReferences(value);
    const links = items
        .filter((item) => item.linkTarget != null)
        .map(function callback(item) {
            return {
                displayText: item.displayText,
                target: item.linkTarget,
                wikitext: item.wikitext,
            };
        });
    const metadata = {
        categories: uniqueValues(getReferenceValues(references, "categories")),
        items,
        links,
        stubTags: uniqueValues(getReferenceValues(references, "stubTags")),
        text: items.map((item) => item.wikitext).join("、"),
        values: genres,
    };

    return metadata;
}

/**
 * Defines the module-level build genre item.
 */
function buildGenreItem(value): ArticleDataValue {
    if (isWikilinkValue(value)) {
        return buildLinkedGenreItem(value);
    }

    const reference = getTerminology("genre", value);

    if (reference == null) {
        return {
            displayText: value,
            normalizedText: value,
            wikitext: value,
        };
    }

    const item: ArticleDataValue = {
        displayText: getTerminology("genre", value, "short name"),
        normalizedText: value,
        wikitext: getTerminology("genre", value, "link"),
    };
    const page = getTerminology("genre", value, "page");

    if (page != null) {
        item.linkTarget = page;
    }

    return item;
}

/** Builds a genre item from an explicit wikilink. */
function buildLinkedGenreItem(value: string): ArticleDataValue {
    const parts = getWikilinkParts(value);

    return {
        displayText: parts.label || parts.target,
        linkTarget: parts.target,
        normalizedText: value,
        wikitext: value,
    };
}

/**
 * Defines the module-level get genre references.
 */
function getGenreReferences(value) {
    const references = splitFieldValues(value)
        .map((genre) => getTerminology("genre", genre))
        .filter(Boolean);

    return references;
}

/**
 * Handles build company data.
 *
 * Builds company values and category assumptions without composing
 * prose.
 *
 * @param companies - Company-related parameters.
 * @param companies.developers - Developer names.
 * @param companies.publishers - Publisher names.
 * @returns Company role values and category metadata.
 *
 */
export function buildCompanyData(companies: any): any {
    const references = getCompanyReferences(companies);
    const developerItems = buildCompanyItems(
        companies.developers,
        references.developers,
    );
    const publisherValue = getPublisherValue(companies);
    const publisherItems = buildCompanyItems(
        publisherValue,
        references.publishers,
    );
    const data = {
        categoryItems: buildCompanyCategoryItems(companies),
        categories: uniqueValues(
            getReferenceValues(references.all, "categories"),
        ),
        developers: buildCompanyRoleData(developerItems, companies.developers),
        publishers: buildCompanyRoleData(publisherItems, publisherValue),
        references,
        sameCompanies: companies.publishers === "=",
        stubTags: uniqueValues(getReferenceValues(references.all, "stubTags")),
    };

    return data;
}

/** Builds normalized data for one company role. */
function buildCompanyRoleData(items, value): any {
    const data = {
        items,
        text: joinCompanyTextList(items.map((item) => item.wikitext)),
        values: splitFieldValues(value),
    };

    return data;
}

/**
 * Joins company names for attribution prose.
 *
 * @param values - Company name wikitext values.
 * @returns Joined company names.
 */
function joinCompanyTextList(values: Array<string>): string {
    if (values.length === 2) {
        return values.join(getTextTemplate("shared.conjunction"));
    }

    return values.join(getTextTemplate("shared.enumerationSeparator"));
}

/**
 * Builds structured display values for one company field.
 *
 * @param value - User-entered company values.
 * @param references - Matched company metadata.
 * @returns Company display values.
 */
function buildCompanyItems(value: string, references: Array<any>): Array<any> {
    const items = splitFieldValues(value).map(function callback(item) {
        return buildCompanyItem(references, item);
    });

    return items;
}

/**
 * Builds one structured company value.
 *
 * @param references - Matched company metadata.
 * @param value - User-entered company value.
 * @returns Company display value.
 */
function buildCompanyItem(references: Array<any>, value: string): any {
    if (isWikilinkValue(value)) {
        const item = buildLinkedCompanyItem(value);

        return item;
    }

    const reference = references.find((item) => item.source === value);

    if (reference == null) {
        const item: ArticleDataValue = {
            displayText: value,
            normalizedText: value,
            wikitext: value,
        };

        return item;
    }

    const item: ArticleDataValue = {
        displayText: getTerminology("company", value, "name"),
        normalizedText: value,
        wikitext: getTerminology("company", value, "link"),
    };
    const page = getTerminology("company", value, "page");

    if (page != null) {
        item.linkTarget = page;
    }

    return item;
}

/** Builds a company item from an explicit wikilink. */
function buildLinkedCompanyItem(value: string): ArticleDataValue {
    const parts = getWikilinkParts(value);
    const item = {
        displayText: parts.label || parts.target,
        linkTarget: parts.target,
        normalizedText: value,
        wikitext: value,
    };

    return item;
}

/**
 * Gets the publisher value, expanding the equality marker.
 *
 * @param companies - Company-related parameters.
 * @returns Publisher values.
 */
function getPublisherValue(companies: any): string {
    if (companies.publishers === "=") {
        return companies.developers;
    }

    return companies.publishers;
}

/**
 * Builds category rows and lookup plans for company values.
 *
 * @param companies - Company-related parameters.
 * @returns Company category items.
 */
function buildCompanyCategoryItems(companies: any): Array<any> {
    const developers = buildCompanyLookupValues(companies.developers || "");
    const publishers = buildCompanyLookupValues(
        getPublisherValue(companies) || "",
    );
    const sharedCompanies = getSharedValues(developers, publishers);
    const values = uniqueCompanyLookupValues([...developers, ...publishers]);

    return values.flatMap(function callback(company) {
        return buildCompanyCategoryItemsForValue(company.lookup, {
            company: company.title,
            stubTagEnabled: sharedCompanies.includes(
                normalizeValueKey(company.lookup),
            ),
        });
    });
}

/**
 * Builds company lookup and link-target values from one form field.
 *
 * @param value - Company field value.
 * @returns Company lookup values.
 */
function buildCompanyLookupValues(value: string): Array<any> {
    return splitFieldValues(value).map(function callback(company) {
        const parts = getWikilinkParts(company);

        return {
            lookup: getWikilinkValue(company),
            title: parts?.target || getWikilinkValue(company),
        };
    });
}

/**
 * Deduplicates company values by lookup title.
 *
 * @param values - Company lookup values.
 * @returns Unique company lookup values.
 */
function uniqueCompanyLookupValues(values: Array<any>): Array<any> {
    const seen = new Set();

    return values.filter(function callback(value) {
        const key = normalizeValueKey(value.lookup);

        if (seen.has(key)) {
            return false;
        }

        seen.add(key);
        return true;
    });
}

/**
 * Builds category items for one company value.
 *
 * @param company - Company value.
 * @param options - Category item options.
 * @param options.company - Company page title.
 * @param options.stubTagEnabled - Whether stub tags default
 * on.
 * @returns Company category items.
 */
function buildCompanyCategoryItemsForValue(
    company: string,
    options: any = {},
): Array<any> {
    const reference = getTerminology("company", company);
    const companyTitle = getCompanyTitle(company, options.company);

    if (reference != null && (reference.categories || []).length > 0) {
        return reference.categories.map(function callback(category, index) {
            const stubTag = reference.stubTags?.[index] || "";

            return {
                category,
                company: companyTitle,
                stubTag,
                stubTagEnabled: Boolean(options.stubTagEnabled && stubTag),
            };
        });
    }

    return [
        {
            candidates: buildCompanyCategoryCandidates(company),
            company: companyTitle,
            fallback: formatText("patterns.titleGame", {
                title: getDisambiguationBaseTitle(company),
            }),
        },
    ];
}

/** Gets the preferred article title for a company. */
function getCompanyTitle(company: string, fallback: string): string {
    const title =
        getTerminology("company", company, "page") ||
        getTerminology("company", company, "name") ||
        fallback ||
        company;

    return title;
}

/**
 * Gets normalized values present in both input lists.
 *
 * @param values - Primary values.
 * @param candidates - Candidate values.
 * @returns Shared normalized values.
 */
function getSharedValues(
    values: Array<{ lookup: string }>,
    candidates: Array<{ lookup: string }>,
): Array<string> {
    const candidateKeys = candidates.map(function callback(value) {
        return normalizeValueKey(value.lookup);
    });

    return values
        .map((value) => normalizeValueKey(value.lookup))
        .filter((value) => candidateKeys.includes(value));
}

/**
 * Normalizes a user field value for comparison.
 *
 * @param value - Field value.
 * @returns Normalized comparison key.
 */
function normalizeValueKey(value: string): string {
    return getWikilinkValue(value).toLocaleLowerCase();
}

/**
 * Builds company category candidates.
 *
 * @param company - Company value.
 * @returns Candidate category titles.
 */
function buildCompanyCategoryCandidates(company: string): Array<string> {
    return uniqueValues(
        [company, getDisambiguationBaseTitle(company)].flatMap(
            buildCompanyTitleCategoryCandidates,
        ),
    );
}

/**
 * Builds company category candidates for one title variant.
 *
 * @param title - Company title.
 * @returns Candidate category titles.
 */
function buildCompanyTitleCategoryCandidates(title: string): Array<string> {
    return [
        formatText("patterns.titleVideoGames", { title }),
        formatText("patterns.titleGame", { title }),
        title,
    ];
}

/**
 * Removes a trailing disambiguation bracket from a title.
 *
 * @param title - Title.
 * @returns Base title.
 */
function getDisambiguationBaseTitle(title: string): string {
    return title.replace(/\s*\([^()]+\)\s*$/u, "");
}

/**
 * Gets reference metadata for company parameters.
 *
 * @param companies - Company-related parameters.
 * @param companies.developers - Developer names.
 * @param companies.publishers - Publisher names.
 * @returns Matched company metadata by role.
 */
function getCompanyReferences(companies: any): any {
    const developers = getCompanyRoleReferences(companies.developers);
    const publishers = getCompanyRoleReferences(getPublisherValue(companies));

    return {
        all: [...developers, ...publishers],
        developers,
        publishers,
    };
}

/**
 * Gets reference metadata for one company role.
 *
 * @param value - User-entered company values.
 * @returns Matched company metadata.
 */
function getCompanyRoleReferences(value: string): Array<any> {
    return splitFieldValues(value)
        .map(function callback(source) {
            const reference = getTerminology("company", source);

            return reference == null ? undefined : { ...reference, source };
        })
        .filter(Boolean);
}

/**
 * Builds normalized display, link, and category metadata for platforms.
 *
 * @param value - Raw platform field value.
 * @returns Platform values and metadata.
 */
export function buildPlatformMetadata(value: any): any {
    const references = getPlatformReferences(value);
    const platformValues = splitFieldValues(value);
    const items = platformValues.map(function callback(item) {
        return buildPlatformItem(references, item);
    });
    const links = items
        .filter((item) => item.linkTarget != null)
        .map(function callback(item) {
            return {
                displayText: item.displayText,
                target: item.linkTarget,
                wikitext: item.wikitext,
            };
        });
    const metadata = {
        categories: uniqueValues(getReferenceValues(references, "categories")),
        count: splitLookupFieldValues(value || "").length,
        items,
        links,
        stubTags: uniqueValues(getReferenceValues(references, "stubTags")),
        text: items.map((item) => item.wikitext).join("、"),
        values: platformValues,
    };

    return metadata;
}

/**
 * Defines the module-level build platform item.
 */
function buildPlatformItem(references: any[], value): ArticleDataValue {
    if (isWikilinkValue(value)) {
        return buildLinkedPlatformItem(value);
    }

    const reference = references.find((item) => item.source === value);

    if (reference == null) {
        return {
            displayText: value,
            normalizedText: value,
            wikitext: value,
        };
    }

    const item: ArticleDataValue = {
        displayText: getTerminology("platform", value, "name"),
        normalizedText: value,
        wikitext: getTerminology("platform", value, "link"),
    };
    const page = getTerminology("platform", value, "page");

    if (page != null) {
        item.linkTarget = page;
    }

    return item;
}

/** Builds a platform item from an explicit wikilink. */
function buildLinkedPlatformItem(value: string): ArticleDataValue {
    const parts = getWikilinkParts(value);

    return {
        displayText: parts.label || parts.target,
        linkTarget: parts.target,
        normalizedText: value,
        wikitext: value,
    };
}

/**
 * Defines the module-level get platform references.
 */
function getPlatformReferences(value): any[] {
    const references = splitFieldValues(value)
        .map(function callback(source) {
            const reference = getTerminology("platform", source);

            return reference == null ? undefined : { ...reference, source };
        })
        .filter(Boolean);

    return references;
}

/**
 * Builds normalized display, link, and category metadata for series.
 *
 * @param value - Raw series field value.
 * @returns Series values and metadata.
 */
export function buildSeriesMetadata(value: any): any {
    const values = normalizeSeriesValues(value || "");
    const items = values.map(buildSeriesItem);
    const links = items
        .filter((item) => item.linkTarget != null)
        .map(function callback(item) {
            return {
                displayText: item.displayText,
                target: item.linkTarget,
                wikitext: item.wikitext,
            };
        });
    const metadata = {
        categoryPlans: buildSeriesCategoryPlans(values),
        items,
        links,
        text: items
            .map((item) => item.wikitext)
            .join(getTextTemplate("shared.enumerationSeparator")),
        values,
    };

    return metadata;
}

/**
 * Defines the module-level build series item.
 */
function buildSeriesItem(series): ArticleDataValue {
    const marker = getSeriesMarker(series);
    const value = marker.value;

    if (marker.derivativeWork) {
        return buildDerivativeWorkItem(value);
    }

    return buildSeriesTitleItem(value);
}

/**
 * Defines the module-level build series title item.
 */
function buildSeriesTitleItem(series): ArticleDataValue {
    if (!isWikilinkValue(series)) {
        const displayText = formatText("patterns.seriesDisplayTitle", {
            title: series,
        });
        const item = {
            displayText,
            normalizedText: series,
            wikitext: displayText,
        };

        return item;
    }

    return buildLinkedSeriesTitleItem(series);
}

/** Builds a series-title item from an explicit wikilink. */
function buildLinkedSeriesTitleItem(series: string): ArticleDataValue {
    const parts = getWikilinkParts(series);
    const label = parts.label || parts.target;
    const linkTarget = selectValue(
        parts.label === "",
        function trueBranch() {
            return formatText("patterns.titleSeries", { title: parts.target });
        },
        function falseBranch() {
            return parts.target;
        },
    );
    const displayText = formatText("patterns.seriesDisplayTitle", {
        title: label,
    });
    return {
        displayText,
        linkTarget,
        normalizedText: series,
        wikitext: buildLinkText(linkTarget, displayText),
    };
}

/**
 * Defines the module-level build derivative work item.
 */
function buildDerivativeWorkItem(series): ArticleDataValue {
    if (!isWikilinkValue(series)) {
        const displayText = formatText("patterns.derivativeWorkDisplayTitle", {
            title: series,
        });

        return {
            displayText,
            normalizedText: series,
            wikitext: displayText,
        };
    }

    const parts = getWikilinkParts(series);
    const label = parts.label || parts.target;
    const displayLink = buildLinkText(parts.target, label);
    const displayText = formatText("patterns.derivativeWorkDisplayTitle", {
        title: displayLink,
    });

    return {
        displayText,
        linkTarget: parts.target,
        normalizedText: series,
        wikitext: displayText,
    };
}

/**
 * Defines the module-level normalize series values.
 */
function normalizeSeriesValues(series) {
    const values = splitFieldValues(series).map(normalizeSeriesValue);

    return values;
}

/**
 * Defines the module-level normalize series value.
 */
function normalizeSeriesValue(series) {
    const marker = getSeriesMarker(series);
    const value = marker.value;

    if (!isWikilinkValue(value)) {
        return addSeriesMarker(trimSeriesSuffix(value), marker);
    }

    const parts = getWikilinkParts(value);
    const target = trimSeriesSuffix(parts.target);
    const label = trimSeriesSuffix(parts.label);

    if (label === "") {
        return addSeriesMarker(`[[${target}]]`, marker);
    }

    return addSeriesMarker(buildLinkText(target, label), marker);
}

/**
 * Defines the module-level get series marker.
 */
function getSeriesMarker(series) {
    const value = trimValue(series);
    const derivativeWork = value.endsWith("*");

    if (!derivativeWork) {
        return {
            derivativeWork,
            value,
        };
    }

    return {
        derivativeWork,
        value: trimValue(value.slice(0, -1)),
    };
}

/**
 * Defines the module-level add series marker.
 */
function addSeriesMarker(value, marker) {
    if (!marker.derivativeWork) {
        return value;
    }

    return `${value}*`;
}

/**
 * Defines the module-level trim series suffix.
 */
function trimSeriesSuffix(value) {
    return trimValue(value).replace(/系列$/u, "");
}

/**
 * Defines the module-level build series category plans.
 */
function buildSeriesCategoryPlans(series) {
    const plans = series
        .map((value) => getSeriesMarker(value).value)
        .flatMap((value) => splitLookupFieldValues(value))
        .map(buildSeriesCategoryPlan);

    return plans;
}

/**
 * Defines the module-level build series category plan.
 */
function buildSeriesCategoryPlan(series) {
    const plan = {
        candidates: buildSeriesCategoryCandidates(series),
        fallback: formatText("patterns.titleVideoGames", { title: series }),
    };

    return plan;
}

/**
 * Defines the module-level build series category candidates.
 */
function buildSeriesCategoryCandidates(title) {
    const candidates = uniqueValues(
        [formatText("patterns.titleSeries", { title }), title].flatMap(
            buildSeriesTitleCandidates,
        ),
    );

    return candidates;
}

/**
 * Defines the module-level build series title candidates.
 */
function buildSeriesTitleCandidates(title) {
    return [
        formatText("patterns.titleVideoGames", { title }),
        formatText("patterns.titleGame", { title }),
        title,
    ];
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
