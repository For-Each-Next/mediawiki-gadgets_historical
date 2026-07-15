/**
 * Normalizes legacy parameter names and values before canonicalization.
 */

import type { CitationParam } from "./types.ts";

type PreFormatHandler = (param: CitationParam) => CitationParam;

const PRE_FORMAT_HANDLERS: PreFormatHandler[] = [migrateDeadUrlParameter];

/**
 * Applies all pre-format parameter migrations in declaration order.
 *
 * @param params - Parsed citation parameters.
 * @returns Migrated citation parameters.
 */
export function applyPreFormatHandlers(
    params: CitationParam[],
): CitationParam[] {
    const result = params.map(function applyHandlers(param) {
        const migrated = PRE_FORMAT_HANDLERS.reduce(
            (current, handler) => handler(current),
            param,
        );
        return migrated;
    });
    return result;
}

/**
 * Migrates removed dead-url spellings and their boolean values.
 *
 * @param param - Parsed citation parameter.
 * @returns Migrated or unchanged parameter.
 */
function migrateDeadUrlParameter(param: CitationParam): CitationParam {
    const name = param.name.trim().toLocaleLowerCase("en-US");
    if (!["dead-url", "deadlink", "deadurl"].includes(name)) {
        return param;
    }
    const result = {
        name: "url-status",
        value: normalizeDeadUrlStatus(param.value),
    };
    return result;
}

/**
 * Converts the old dead-url boolean to a url-status value.
 *
 * @param value - Removed dead-url parameter value.
 * @returns Equivalent url-status value when recognized.
 */
function normalizeDeadUrlStatus(value: string): string {
    const trimmed = value.trim();
    const normalized = trimmed.toLocaleLowerCase("en-US");
    if (["no", "false", "0"].includes(normalized)) {
        return "live";
    }
    if (["yes", "true", "1"].includes(normalized)) {
        return "dead";
    }
    return trimmed;
}
