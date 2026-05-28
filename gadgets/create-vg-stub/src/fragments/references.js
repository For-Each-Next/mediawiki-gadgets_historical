/* eslint-disable */

/**
 * Builds references-section wikitext for video game stubs.
 */

/**
 * Builds the references section for generated citations.
 *
 * @param {Array<object>} references - Named source references.
 * @returns {string} References section, or an empty string.
 */
export function buildReferencesText(references) {
  if (references.length === 0) {
    return "";
  }

  return `== 参考文献 ==\n\n<references responsive>\n${references
    .map(buildFullReferenceText)
    .join("\n")}\n</references>`;
}

/**
 * Builds one full named reference.
 *
 * @param {object} reference - Named source reference.
 * @param {string} reference.citation - Citation template wikitext.
 * @param {string} reference.name - Reference name.
 * @returns {string} Full named reference wikitext.
 */
function buildFullReferenceText(reference) {
  return `<ref name="${reference.name}">${reference.citation}</ref>`;
}
