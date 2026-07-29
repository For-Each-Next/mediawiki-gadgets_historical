/**
 * Defines prefix.
 *
 * Console logging helpers for diagnosing gadget workflow and API
 * failures.
 */

import { asRecord } from "#gadget/infra/mediawiki-response.ts";

const PREFIX = "[vg page assessor]";

export type ApiParameterValue =
    | string
    | number
    | boolean
    | File
    | Array<string>
    | Array<number>
    | undefined;

export type ApiParameters = Record<string, ApiParameterValue>;

/**
 * Logs one workflow step.
 *
 * @param step - Step name.
 * @param details - Optional details.
 * @returns Result when the function
 *   logs one workflow step.
 */
export function logStep(step: string, details?: unknown): void {
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
    api: mw.Api,
    label: string,
    params: ApiParameters,
): Promise<unknown> {
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
    api: mw.Api,
    label: string,
    token: string,
    params: ApiParameters,
): Promise<unknown> {
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
function cloneForLog(value: unknown): unknown {
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
function summarizeResponse(response: unknown): Record<string, unknown> {
    const responseRecord = asRecord(response);
    const query = asRecord(responseRecord?.query);
    const pages = query?.pages;
    const pageRecord = asRecord(pages);
    const pageList = Array.isArray(pages)
        ? pages
        : Object.values(pageRecord ?? {});

    const result = {
        curtimestamp: responseRecord?.curtimestamp,
        pageCount: pageList.length,
        pages: pageList.map(function callback(pageValue) {
            const page = asRecord(pageValue);
            const revisions = page?.revisions;
            const result = {
                missing: page?.missing != null,
                ns: page?.ns,
                revisionCount: Array.isArray(revisions) ? revisions.length : 0,
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
function summarizeEditParams(params: ApiParameters): Record<string, unknown> {
    let text: unknown = params.text;

    if (typeof params.text === "string") {
        text = {
            length: params.text.length,
            preview: params.text.slice(0, 500),
        };
    }

    const clonedParams = asRecord(cloneForLog(params)) ?? {};
    const result = {
        ...clonedParams,
        text,
    };
    return result;
}
