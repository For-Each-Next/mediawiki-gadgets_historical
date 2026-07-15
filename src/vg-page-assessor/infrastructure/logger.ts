/**
 * Defines prefix.
 *
 * Console logging helpers for diagnosing gadget workflow and API
 * failures.
 */

const PREFIX = "[vg page assessor]";

/**
 * Logs one workflow step.
 *
 * @param step - Step name.
 * @param details - Optional details.
 * @returns */
export function logStep(step: string, details?: any): void {
    if (details === undefined) {
        console.log(PREFIX, step);
        return;
    }

    console.log(PREFIX, step, details);
}

/**
 * Logs an API GET request and its response or error.
 *
 * @param api - MediaWiki API client.
 * @param label - Request label.
 * @param params - API params.
 * @returns API response.
 */
export async function loggedApiGet(
    api: any,
    label: string,
    params: any,
): Promise<any> {
    logStep(`API GET start: ${label}`, cloneForLog(params));

    try {
        const response = await api.get(params);

        logStep(`API GET done: ${label}`, summarizeResponse(response));
        return response;
    } catch (error) {
        logStep(`API GET failed: ${label}`, {
            error,
            params: cloneForLog(params),
        });
        throw error;
    }
}

/**
 * Logs an API POST-with-token request and its response or error.
 *
 * @param api - MediaWiki API client.
 * @param label - Request label.
 * @param token - Token type.
 * @param params - API params.
 * @returns API response.
 */
export async function loggedPostWithToken(
    api: any,
    label: string,
    token: string,
    params: any,
): Promise<any> {
    logStep(`API POST start: ${label}`, {
        params: summarizeEditParams(params),
        token,
    });

    try {
        const response = await api.postWithToken(token, params);

        logStep(`API POST done: ${label}`, response);
        return response;
    } catch (error) {
        logStep(`API POST failed: ${label}`, {
            error,
            params: summarizeEditParams(params),
            token,
        });
        throw error;
    }
}

/**
 * Clones values into console-friendly plain data.
 *
 * @param value - Value to clone.
 * @returns Cloned value.
 */
function cloneForLog(value: any): any {
    try {
        return JSON.parse(JSON.stringify(value));
    } catch {
        return value;
    }
}

/**
 * Summarizes API responses without dumping full page text.
 *
 * @param response - API response.
 * @returns Response summary.
 */
function summarizeResponse(response: any): any {
    const pages = response?.query?.pages || [];
    const pageList = Array.isArray(pages) ? pages : Object.values(pages);

    return {
        curtimestamp: response?.curtimestamp,
        pageCount: pageList.length,
        pages: pageList.map(function callback(page) {
            return {
                missing: page?.missing != null,
                ns: page?.ns,
                revisionCount: page?.revisions?.length || 0,
                title: page?.title,
            };
        }),
    };
}

/**
 * Summarizes edit params while keeping enough data for debugging.
 *
 * @param params - Edit params.
 * @returns Summarized params.
 */
function summarizeEditParams(params: any): any {
    return {
        ...cloneForLog(params),
        text: selectValue(
            typeof params?.text === "string",
            function trueBranch() {
                return {
                    length: params.text.length,
                    preview: params.text.slice(0, 500),
                };
            },
            function falseBranch() {
                return params?.text;
            },
        ),
    };
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
