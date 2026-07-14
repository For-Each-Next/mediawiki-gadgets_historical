/**
 * Builds company attribution text and metadata for video game stubs.
 */

import {
    getWikilinkParts,
    getWikilinkValue,
    getReferenceValues,
    isWikilinkValue,
    splitFieldValues,
    uniqueValues,
} from "../../shared/utils.ts";
import { formatText, getTextTemplate } from "../../shared/text-templates.ts";
import { get as getTerminology } from "../../terminologies/index.ts";


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
        developers: {
            items: developerItems,
            text: joinCompanyTextList(
                developerItems.map((item) => item.wikitext),
            ),
            values: splitFieldValues(companies.developers),
        },
        publishers: {
            items: publisherItems,
            text: joinCompanyTextList(
                publisherItems.map((item) => item.wikitext),
            ),
            values: splitFieldValues(publisherValue),
        },
        references,
        sameCompanies: companies.publishers === "=",
        stubTags: uniqueValues(getReferenceValues(references.all, "stubTags")),
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
        const parts = getWikilinkParts(value);
        const item: ArticleDataValue = {
            displayText: parts.label || parts.target,
            linkTarget: parts.target,
            normalizedText: value,
            wikitext: value,
        };

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

    if (reference != null && (reference.categories || []).length > 0) {
        return reference.categories.map(function callback(category, index) {
            const stubTag = reference.stubTags?.[index] || "";

            return {
                category,
                company:
                    getTerminology("company", company, "page") ||
                    getTerminology("company", company, "name") ||
                    options.company ||
                    company,
                stubTag,
                stubTagEnabled: Boolean(options.stubTagEnabled && stubTag),
            };
        });
    }

    return [
        {
            candidates: buildCompanyCategoryCandidates(company),
            company:
                getTerminology("company", company, "page") ||
                getTerminology("company", company, "name") ||
                options.company ||
                company,
            fallback: formatText("patterns.titleGame", {
                title: getDisambiguationBaseTitle(company),
            }),
        },
    ];
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
