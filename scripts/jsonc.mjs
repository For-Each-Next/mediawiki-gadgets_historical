/* eslint-disable */

import { getStaticJSONValue, parseJSON } from "jsonc-eslint-parser";

/**
 * Parses JSON with comments and trailing commas.
 *
 * @param {string} source - JSONC source text.
 * @returns {*} Parsed value.
 */
export function parseJsonc(source) {
    return getStaticJSONValue(parseJSON(source));
}
