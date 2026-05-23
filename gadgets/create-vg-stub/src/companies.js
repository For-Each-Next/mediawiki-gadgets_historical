/* eslint-disable */

/**
 * Builds company attribution text and metadata for video game stubs.
 */

import {
  FIELD_REFERENCE_DATA,
  buildPageText,
  getReferenceValues,
  getSourceReference,
  splitFieldValues,
  uniqueValues,
} from "./utils.js";

/**
 * Builds display and metadata for company values.
 *
 * @param {object} companies - Company-related parameters.
 * @param {string} companies.developers - Developer names.
 * @param {string} companies.publishers - Publisher names.
 * @returns {object} Text, categories, and stub tags.
 */
export function buildCompanyMetadata(companies) {
  const references = getCompanyReferences(companies);
  const roleText = buildAttributionRoleText(companies, references);

  return {
    categories: uniqueValues(getReferenceValues(references.all, "categories")),
    stubTags: uniqueValues(getReferenceValues(references.all, "stubTags")),
    text: roleText,
  };
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
  return splitFieldValues(value)
    .map(buildCompanyText.bind(null, references))
    .join("、");
}

/**
 * Builds display text for one company value.
 *
 * @param {Array<object>} references - Matched company metadata.
 * @param {string} value - User-entered company value.
 * @returns {string} Company wikitext.
 */
function buildCompanyText(references, value) {
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
