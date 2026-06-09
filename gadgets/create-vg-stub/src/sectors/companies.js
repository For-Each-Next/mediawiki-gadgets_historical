/* eslint-disable */

/**
 * Builds company attribution text and metadata for video game stubs.
 */

import {
  FIELD_REFERENCE_DATA,
  buildPageText,
  getWikilinkParts,
  getWikilinkValue,
  getReferenceValues,
  getSourceReference,
  isWikilinkValue,
  splitFieldValues,
  uniqueValues,
} from "../utils.js";

/**
 * Builds display and metadata for company values.
 *
 * @param {object} companies - Company-related parameters.
 * @param {string} companies.developers - Developer names.
 * @param {string} companies.publishers - Publisher names.
 * @param {object} [options] - Company formatting options.
 * @param {string} [options.sourceTag] - Source reference tag.
 * @returns {object} Text, categories, and stub tags.
 */
export function buildCompanyMetadata(companies, options = {}) {
  const references = getCompanyReferences(companies);
  const text = buildAttributionText(
    buildAttributionRoleText(companies, references),
    options.sourceTag || "",
  );

  return {
    categoryItems: buildCompanyCategoryItems(companies),
    categories: uniqueValues(getReferenceValues(references.all, "categories")),
    stubTags: uniqueValues(getReferenceValues(references.all, "stubTags")),
    text,
  };
}

/**
 * Builds attribution text after the video game noun.
 *
 * @param {string} text - Company role text.
 * @param {string} sourceTag - Source reference tag.
 * @returns {string} Attribution text.
 */
function buildAttributionText(text, sourceTag) {
  if (text === "") {
    return "";
  }

  return `，${text}${sourceTag}`;
}

/**
 * Builds developer and publisher role text.
 *
 * @param {object} companies - Company-related parameters.
 * @param {object} references - Matched company metadata.
 * @returns {string} Attribution role phrase.
 */
function buildAttributionRoleText(companies, references) {
  const developers = buildCompanyListText(
    companies.developers,
    references.developers,
  );
  const publishers = buildCompanyListText(
    getPublisherValue(companies),
    references.publishers,
  );

  if (developers === "" && publishers === "") {
    return "";
  }

  if (developers !== "" && companies.publishers === "=") {
    return `由${developers}开发及发行`;
  }

  return `由${buildCompanyRoleText(developers, publishers)}`;
}

/**
 * Builds company role text from developer and publisher text.
 *
 * @param {string} developers - Developer wikitext.
 * @param {string} publishers - Publisher wikitext.
 * @returns {string} Company role text.
 */
function buildCompanyRoleText(developers, publishers) {
  if (developers === "") {
    return `${publishers}发行`;
  }

  if (publishers === "") {
    return `${developers}开发`;
  }

  return `${developers}开发、${publishers}发行`;
}

/**
 * Builds linked company text from raw values and matched metadata.
 *
 * @param {string} value - User-entered company values.
 * @param {Array<object>} references - Matched company metadata.
 * @returns {string} Company list wikitext.
 */
function buildCompanyListText(value, references) {
  return joinCompanyTextList(
    splitFieldValues(value).map(buildCompanyText.bind(null, references)),
  );
}

/**
 * Joins company names for attribution prose.
 *
 * @param {Array<string>} values - Company name wikitext values.
 * @returns {string} Joined company names.
 */
function joinCompanyTextList(values) {
  if (values.length === 2) {
    return values.join("和");
  }

  return values.join("、");
}

/**
 * Builds display text for one company value.
 *
 * @param {Array<object>} references - Matched company metadata.
 * @param {string} value - User-entered company value.
 * @returns {string} Company wikitext.
 */
function buildCompanyText(references, value) {
  if (isWikilinkValue(value)) {
    return value;
  }

  const reference = references.find((item) => item.source === value);

  if (reference == null || reference.page == null) {
    return value;
  }

  return buildPageText(reference.page);
}

/**
 * Gets the publisher value, expanding the equality marker.
 *
 * @param {object} companies - Company-related parameters.
 * @returns {string} Publisher values.
 */
function getPublisherValue(companies) {
  if (companies.publishers === "=") {
    return companies.developers;
  }

  return companies.publishers;
}

/**
 * Builds category rows and lookup plans for company values.
 *
 * @param {object} companies - Company-related parameters.
 * @returns {Array<object>} Company category items.
 */
function buildCompanyCategoryItems(companies) {
  const developers = buildCompanyLookupValues(companies.developers || "");
  const publishers = buildCompanyLookupValues(getPublisherValue(companies) || "");
  const sharedCompanies = getSharedValues(developers, publishers);
  const values = uniqueCompanyLookupValues([...developers, ...publishers]);

  return values.flatMap((company) =>
    buildCompanyCategoryItemsForValue(company.lookup, {
      company: company.title,
      stubTagEnabled: sharedCompanies.includes(normalizeValueKey(company.lookup)),
    }),
  );
}

/**
 * Builds company lookup and link-target values from one form field.
 *
 * @param {string} value - Company field value.
 * @returns {Array<object>} Company lookup values.
 */
function buildCompanyLookupValues(value) {
  return splitFieldValues(value).map((company) => {
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
 * @param {Array<object>} values - Company lookup values.
 * @returns {Array<object>} Unique company lookup values.
 */
function uniqueCompanyLookupValues(values) {
  const seen = new Set();

  return values.filter((value) => {
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
 * @param {string} company - Company value.
 * @param {object} [options] - Category item options.
 * @param {string} [options.company] - Company page title.
 * @param {boolean} [options.stubTagEnabled] - Whether stub tags default on.
 * @returns {Array<object>} Company category items.
 */
function buildCompanyCategoryItemsForValue(company, options = {}) {
  const reference = getSourceReference(
    FIELD_REFERENCE_DATA.companies,
    company,
  );

  if (reference != null && (reference.categories || []).length > 0) {
    return reference.categories.map((category, index) => {
      const stubTag = reference.stubTags?.[index] || "";

      return {
        category,
        company: reference.page?.title || options.company || company,
        stubTag,
        stubTagEnabled: Boolean(options.stubTagEnabled && stubTag),
      };
    });
  }

  return [
    {
      candidates: buildCompanyCategoryCandidates(company),
      company: reference?.page?.title || options.company || company,
      fallback: `${getDisambiguationBaseTitle(company)}游戏`,
    },
  ];
}

/**
 * Gets normalized values present in both input lists.
 *
 * @param {Array<string>} values - Primary values.
 * @param {Array<string>} candidates - Candidate values.
 * @returns {Array<string>} Shared normalized values.
 */
function getSharedValues(values, candidates) {
  const candidateKeys = candidates.map((value) =>
    normalizeValueKey(value.lookup),
  );

  return values
    .map((value) => normalizeValueKey(value.lookup))
    .filter((value) => candidateKeys.includes(value));
}

/**
 * Normalizes a user field value for comparison.
 *
 * @param {string} value - Field value.
 * @returns {string} Normalized comparison key.
 */
function normalizeValueKey(value) {
  return getWikilinkValue(value).toLocaleLowerCase();
}

/**
 * Builds company category candidates.
 *
 * @param {string} company - Company value.
 * @returns {Array<string>} Candidate category titles.
 */
function buildCompanyCategoryCandidates(company) {
  return uniqueValues(
    [company, getDisambiguationBaseTitle(company)].flatMap(
      buildCompanyTitleCategoryCandidates,
    ),
  );
}

/**
 * Builds company category candidates for one title variant.
 *
 * @param {string} title - Company title.
 * @returns {Array<string>} Candidate category titles.
 */
function buildCompanyTitleCategoryCandidates(title) {
  return [`${title}电子游戏`, `${title}游戏`, title];
}

/**
 * Removes a trailing disambiguation bracket from a title.
 *
 * @param {string} title - Title.
 * @returns {string} Base title.
 */
function getDisambiguationBaseTitle(title) {
  return title.replace(/\s*\([^()]+\)\s*$/u, "");
}

/**
 * Gets reference metadata for company parameters.
 *
 * @param {object} companies - Company-related parameters.
 * @param {string} companies.developers - Developer names.
 * @param {string} companies.publishers - Publisher names.
 * @returns {object} Matched company metadata by role.
 */
function getCompanyReferences(companies) {
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
 * @param {string} value - User-entered company values.
 * @returns {Array<object>} Matched company metadata.
 */
function getCompanyRoleReferences(value) {
  return splitFieldValues(value)
    .map(getSourceReference.bind(null, FIELD_REFERENCE_DATA.companies))
    .filter(Boolean);
}
