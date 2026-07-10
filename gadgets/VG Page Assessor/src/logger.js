/* eslint-disable */

/**
 * Console logging helpers for diagnosing gadget workflow and API failures.
 */

const PREFIX = "[vg page assessor]";

/**
 * Logs one workflow step.
 *
 * @param {string} step - Step name.
 * @param {*} [details] - Optional details.
 * @returns {void}
 */
export function logStep(step, details) {
    if (details === undefined) {
        console.log(PREFIX, step);
        return;
    }

    console.log(PREFIX, step, details);
}

/**
 * Logs an API GET request and its response or error.
 *
 * @param {object} api - MediaWiki API client.
 * @param {string} label - Request label.
 * @param {object} params - API params.
 * @returns {Promise<object>} API response.
 */
export async function loggedApiGet(api, label, params) {
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
 * @param {object} api - MediaWiki API client.
 * @param {string} label - Request label.
 * @param {string} token - Token type.
 * @param {object} params - API params.
 * @returns {Promise<object>} API response.
 */
export async function loggedPostWithToken(api, label, token, params) {
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
 * @param {*} value - Value to clone.
 * @returns {*} Cloned value.
 */
function cloneForLog(value) {
    try {
        return JSON.parse(JSON.stringify(value));
    } catch {
        return value;
    }
}

/**
 * Summarizes API responses without dumping full page text.
 *
 * @param {object} response - API response.
 * @returns {object} Response summary.
 */
function summarizeResponse(response) {
    const pages = response?.query?.pages || [];
    const pageList = Array.isArray(pages) ? pages : Object.values(pages);

    return {
        curtimestamp: response?.curtimestamp,
        pageCount: pageList.length,
        pages: pageList.map((page) => ({
            missing: page?.missing != null,
            ns: page?.ns,
            revisionCount: page?.revisions?.length || 0,
            title: page?.title,
        })),
    };
}

/**
 * Summarizes edit params while keeping enough data for debugging.
 *
 * @param {object} params - Edit params.
 * @returns {object} Summarized params.
 */
function summarizeEditParams(params) {
    return {
        ...cloneForLog(params),
        text:
            typeof params?.text === "string"
                ? {
                      length: params.text.length,
                      preview: params.text.slice(0, 500),
                  }
                : params?.text,
    };
}
