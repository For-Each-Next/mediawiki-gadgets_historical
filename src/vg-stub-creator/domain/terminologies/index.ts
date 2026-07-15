/**
 * Resolves canonical terminology metadata and display values.
 */

import { buildLinkText, getReferenceDefinition } from "../../../shared";
import companies from "./companies.ts";
import genres from "./genres.ts";
import platforms from "./platforms.ts";
import years from "./years.ts";

const TERMINOLOGY_DEFINITIONS = { companies, genres, platforms, years };

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
 * @param type - Terminology type, such as company or platform.
 * @param value - Term or alias to resolve.
 * @param projection - Metadata property or derived value.
 * @returns Resolved metadata or projected value.
 */
export function get(type: string, value: string, projection?: string): any {
    return getFrom(TERMINOLOGY_DEFINITIONS, type, value, projection);
}

/** Gets every bundled terminology definition collection. */
export function getDefinitionCollections(): Array<Array<any>> {
    return Object.values(TERMINOLOGY_DEFINITIONS);
}

/**
 * Gets terminology data from an explicit definition collection.
 *
 * @param definitions - Terminology definitions by type.
 * @param type - Terminology type.
 * @param value - Term or alias to resolve.
 * @param projection - Metadata property or derived value.
 * @returns Resolved metadata or projected value.
 */
function getFrom(
    definitions: any,
    type: string,
    value: string,
    projection?: string,
): any {
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
 * @param metadata - Terminology metadata.
 * @returns Canonical display text.
 */
function getLink(metadata: any): string | undefined {
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
 * @param name - Canonical name.
 * @returns Short canonical name.
 */
function getShortName(name: string): string | undefined {
    return name?.replace(/(?:[电電]子)?[游遊][戏戲]$/u, "");
}
