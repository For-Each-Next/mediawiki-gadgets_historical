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
 * @returns Result when the function
 *   logs one workflow step.
 */
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
    const loggedParams = cloneForLog(params);
    logStep(`API GET start: ${label}`, loggedParams);

    try {
        const response = await api.get(params);

        const responseSummary = summarizeResponse(response);
        logStep(`API GET done: ${label}`, responseSummary);
        return response;
    } catch (error) {
        const failedParams = cloneForLog(params);
        logStep(`API GET failed: ${label}`, {
            error,
            params: failedParams,
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
    const loggedParams = summarizeEditParams(params);
    logStep(`API POST start: ${label}`, {
        params: loggedParams,
        token,
    });

    try {
        const response = await api.postWithToken(token, params);

        logStep(`API POST done: ${label}`, response);
        return response;
    } catch (error) {
        const failedParams = summarizeEditParams(params);
        logStep(`API POST failed: ${label}`, {
            error,
            params: failedParams,
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
        const serialized = JSON.stringify(value);
        return JSON.parse(serialized);
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

    const result = {
        curtimestamp: response?.curtimestamp,
        pageCount: pageList.length,
        pages: pageList.map(function callback(page) {
            const result = {
                missing: page?.missing != null,
                ns: page?.ns,
                revisionCount: page?.revisions?.length || 0,
                title: page?.title,
            };
            return result;
        }),
    };
    return result;
}

/**
 * Summarizes edit params while keeping enough data for debugging.
 *
 * @param params - Edit params.
 * @returns Summarized params.
 */
function summarizeEditParams(params: any): any {
    let text = params?.text;

    if (typeof params?.text === "string") {
        text = {
            length: params.text.length,
            preview: params.text.slice(0, 500),
        };
    }

    const result = {
        ...cloneForLog(params),
        text,
    };
    return result;
}
