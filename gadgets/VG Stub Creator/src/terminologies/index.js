/* eslint-disable */

/**
 * Resolves canonical terminology metadata and display values.
 */

import {
    FIELD_REFERENCE_DATA,
    buildLinkText,
    getReferenceDefinition,
} from "../shared/utils.js";

const TYPE_KEYS = {
    companies: "companies",
    company: "companies",
    genre: "genres",
    genres: "genres",
    platform: "platforms",
    platforms: "platforms",
    year: "years",
    years: "years",
};

/**
 * Gets terminology metadata or one projected value.
 *
 * @param {string} type - Terminology type, such as company or platform.
 * @param {string} value - Term or alias to resolve.
 * @param {string} [projection] - Metadata property or derived value.
 * @returns {*} Resolved metadata or projected value.
 */
export function get(type, value, projection) {
    return getFrom(FIELD_REFERENCE_DATA, type, value, projection);
}

/**
 * Creates a terminology getter backed by the provided definitions.
 *
 * @param {object} definitions - Terminology definitions by type.
 * @returns {Function} Terminology getter.
 */
export function createGetter(definitions) {
    return getFrom.bind(null, definitions);
}

/**
 * Gets terminology data from an explicit definition collection.
 *
 * @param {object} definitions - Terminology definitions by type.
 * @param {string} type - Terminology type.
 * @param {string} value - Term or alias to resolve.
 * @param {string} [projection] - Metadata property or derived value.
 * @returns {*} Resolved metadata or projected value.
 */
function getFrom(definitions, type, value, projection) {
    const key = TYPE_KEYS[type?.toLocaleLowerCase()];

    if (key == null) {
        return undefined;
    }

    const metadata = getReferenceDefinition(definitions[key], value);

    if (metadata == null || projection == null || projection === "") {
        return metadata;
    }

    const normalizedProjection = projection
        .toLocaleLowerCase()
        .replace(/[\s_-]+/gu, "");

    if (normalizedProjection === "link") {
        return getLink(metadata);
    }

    if (normalizedProjection === "shortname") {
        return getShortName(metadata.name);
    }

    return metadata[projection] ?? metadata[normalizedProjection];
}

/**
 * Builds linked or plain canonical terminology text.
 *
 * @param {object} metadata - Terminology metadata.
 * @returns {string|undefined} Canonical display text.
 */
function getLink(metadata) {
    if (metadata.name == null) {
        return undefined;
    }

    if (metadata.page == null) {
        return metadata.name;
    }

    return buildLinkText(metadata.page, metadata.name);
}

/**
 * Removes a trailing game suffix from a canonical name.
 *
 * @param {string} name - Canonical name.
 * @returns {string|undefined} Short canonical name.
 */
function getShortName(name) {
    return name?.replace(/(?:[电電]子)?[游遊][戏戲]$/u, "");
}
