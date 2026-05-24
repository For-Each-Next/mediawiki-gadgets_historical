/* eslint-disable */

/**
 * Provides shared formatting and reference lookup helpers for the gadget.
 */

export const FIELD_REFERENCE_DATA =
  typeof __CREATE_VG_STUB_FIELD_DATA__ === "undefined"
    ? {}
    : __CREATE_VG_STUB_FIELD_DATA__;

/**
 * Template parameter key/value tuple.
 *
 * @typedef {[string|number, *]} TemplateParam
 */

/**
 * Builds a category link.
 *
 * @param {string} category - Category title without namespace.
 * @returns {string} Category wikitext.
 */
export function buildCategoryLink(category) {
  return `[[Category:${category}]]`;
}

/**
 * Builds a template call.
 *
 * @param {string} template - Template title without braces.
 * @returns {string} Template wikitext.
 */
export function buildTemplateCall(template) {
  return `{{${template}}}`;
}

/**
 * Builds template wikitext from parameter entries.
 *
 * @param {string} name - Template name.
 * @param {Array<TemplateParam>} params - Template parameter entries.
 * @param {string} [style] - Template layout style.
 * @returns {string} Template wikitext.
 */
export function buildTemplateText(name, params, style = "inline") {
  const entries = params.filter(hasTemplateParamValue);

  if (style === "block") {
    return buildBlockTemplateText(name, entries);
  }

  return buildInlineTemplateText(name, entries);
}

/**
 * Builds inline template wikitext.
 *
 * @param {string} name - Template name.
 * @param {Array<TemplateParam>} entries - Template parameter entries.
 * @returns {string} Inline template wikitext.
 */
function buildInlineTemplateText(name, entries) {
  return `{{${name}${entries.map(buildInlineTemplateParam).join("")}}}`;
}

/**
 * Builds block template wikitext.
 *
 * @param {string} name - Template name.
 * @param {Array<TemplateParam>} entries - Template parameter entries.
 * @returns {string} Block template wikitext.
 */
function buildBlockTemplateText(name, entries) {
  return `{{${name}\n${entries.map(buildBlockTemplateParam).join("\n")}\n}}`;
}

/**
 * Builds one inline template parameter.
 *
 * @param {TemplateParam} entry - Template parameter entry.
 * @returns {string} Inline template parameter.
 */
function buildInlineTemplateParam(entry) {
  const [key, value] = entry;

  if (typeof key === "number") {
    return `|${value}`;
  }

  return `|${key}=${value}`;
}

/**
 * Builds one block template parameter.
 *
 * @param {TemplateParam} entry - Template parameter entry.
 * @returns {string} Block template parameter.
 */
function buildBlockTemplateParam(entry) {
  const [key, value] = entry;

  return `| ${key} = ${value}`;
}

/**
 * Checks whether a template parameter should be emitted.
 *
 * @param {TemplateParam} entry - Template parameter entry.
 * @returns {boolean} Whether the value should be emitted.
 */
function hasTemplateParamValue(entry) {
  const [_key, value] = entry;

  return value != null;
}

/**
 * Builds wiki link text.
 *
 * @param {string} title - Link target.
 * @param {string} label - Link label.
 * @returns {string} Link wikitext.
 */
export function buildLinkText(title, label) {
  return `[[${title}|${label}]]`;
}

/**
 * Builds page link text from page metadata.
 *
 * @param {object} page - Page metadata.
 * @param {string} page.title - Page title.
 * @param {string} [page.label] - Optional display label.
 * @returns {string} Page link wikitext.
 */
export function buildPageText(page) {
  if (page.label == null) {
    return `[[${page.title}]]`;
  }

  return buildLinkText(page.title, page.label);
}

/**
 * Gets an array property from matched reference definitions.
 *
 * @param {Array<object>} references - Matched reference definitions.
 * @param {string} key - Reference array key.
 * @returns {Array<string>} Flattened reference values.
 */
export function getReferenceValues(references, key) {
  return references.flatMap((reference) => reference[key] || []);
}

/**
 * Removes duplicate values while preserving order.
 *
 * @param {Array<string>} values - Values to deduplicate.
 * @returns {Array<string>} Unique values.
 */
export function uniqueValues(values) {
  return Array.from(new Set(values));
}

/**
 * Joins one user-entered field for display in prose.
 *
 * @param {string} value - User-entered field value.
 * @returns {string} Joined display text.
 */
export function joinFieldValues(value) {
  return splitFieldValues(value).join("、");
}

/**
 * Splits one user-entered field into reusable lookup values.
 *
 * @param {string} value - User-entered field value.
 * @returns {Array<string>} Individual lookup values.
 */
export function splitFieldValues(value) {
  return value
    .split(/[、,，;；/\r\n]+/u)
    .map(trimValue)
    .filter(Boolean);
}

/**
 * Trims a lookup value.
 *
 * @param {string} value - Raw lookup value.
 * @returns {string} Trimmed lookup value.
 */
export function trimValue(value) {
  return value.trim();
}

/**
 * Gets one reference definition by canonical key or alias.
 *
 * @param {object} definitions - Reference definitions for a lookup field.
 * @param {string} value - User-entered field item.
 * @returns {object|undefined} Matched reference definition.
 */
export function getReferenceDefinition(definitions, value) {
  return getReferenceEntry(definitions, value).reference;
}

/**
 * Gets one reference definition with its source value.
 *
 * @param {object} definitions - Reference definitions for a lookup field.
 * @param {string} value - User-entered field item.
 * @returns {object|undefined} Matched reference definition.
 */
export function getSourceReference(definitions, value) {
  const reference = getReferenceDefinition(definitions, value);

  if (reference == null) {
    return undefined;
  }

  return {
    ...reference,
    source: value,
  };
}

/**
 * Gets one reference entry by canonical key or alias.
 *
 * @param {object} definitions - Reference definitions for a lookup field.
 * @param {string} value - User-entered field item.
 * @returns {object} Matched reference key and definition.
 */
export function getReferenceEntry(definitions, value) {
  if (definitions[value] != null) {
    return {
      key: value,
      reference: definitions[value],
    };
  }

  return getReferenceEntryByAlias(definitions, value);
}

/**
 * Gets one reference entry by alias.
 *
 * @param {object} definitions - Reference definitions for a lookup field.
 * @param {string} alias - User-entered alias.
 * @returns {object} Matched reference key and definition.
 */
function getReferenceEntryByAlias(definitions, alias) {
  const normalizedAlias = normalizeAlias(alias);
  const entry = Object.entries(definitions).find(([_key, definition]) =>
    (definition.aliases || []).map(normalizeAlias).includes(normalizedAlias),
  );

  if (entry == null) {
    return {};
  }

  const [key, reference] = entry;

  return { key, reference };
}

/**
 * Normalizes an alias for case-insensitive matching.
 *
 * @param {string} alias - Alias text.
 * @returns {string} Normalized alias.
 */
function normalizeAlias(alias) {
  return alias.toLocaleLowerCase();
}
