/**
 * Loads the talk assessment and WikiProject log in one API query.
 */

import type {
    AssessmentPageSnapshots,
    NewPageListSnapshot,
    PageSnapshot,
} from "#gadget/domain/types.ts";
import {
    asRecord,
    getFirstRevision,
    getQueryPages,
    getRequiredString,
    getRevisionContent,
    type UnknownRecord,
} from "#gadget/infra/mediawiki-response.ts";
import { NEW_PAGE_LIST_TITLE } from "#gadget/infra/new-page-list-api.ts";
import { loggedApiGet, logStep } from "#gadget/infra/logger.ts";

/**
 * Fetches the talk page and new-page assessment log together.
 *
 * @param api - MediaWiki API client.
 * @param talkTitle - Talk-page title.
 * @returns Both page snapshots from one query timestamp.
 */
export async function fetchAssessmentPages(
    api: mw.Api,
    talkTitle: string,
): Promise<AssessmentPageSnapshots> {
    const titles = [talkTitle, NEW_PAGE_LIST_TITLE];

    logStep("fetchAssessmentPages start", { titles });
    const response = await loggedApiGet(api, "fetchAssessmentPages", {
        action: "query",
        curtimestamp: true,
        formatversion: "2",
        prop: "revisions",
        rvprop: "content|timestamp",
        rvslots: "main",
        titles: titles.join("|"),
    });
    const result = decodeAssessmentPagesResponse(response, talkTitle);

    logStep("fetchAssessmentPages done", {
        logTextLength: result.newPageList.text.length,
        talkExists: result.talkPage.exists,
        talkTextLength: result.talkPage.text.length,
        titles,
    });
    return result;
}

/**
 * Decodes the two requested pages without relying on response order.
 *
 * @param response - Batched MediaWiki response.
 * @param talkTitle - Requested talk-page title.
 * @returns Talk-page and assessment-log snapshots.
 */
export function decodeAssessmentPagesResponse(
    response: unknown,
    talkTitle: string,
): AssessmentPageSnapshots {
    const pages = getQueryPages(response);
    const logPage = findPageByTitle(pages, NEW_PAGE_LIST_TITLE);
    const talkPage = findRequestedTalkPage(pages, logPage, talkTitle);
    const starttimestamp = getRequiredString(
        asRecord(response),
        "curtimestamp",
        "the query timestamp",
    );

    return {
        newPageList: decodeNewPageList(logPage, starttimestamp),
        talkPage: decodeTalkPage(talkPage, starttimestamp),
    };
}

/**
 * Finds a returned page by its normalized title.
 *
 * @param pages - Returned query pages.
 * @param title - Expected normalized title.
 * @returns Matching page, when present.
 */
function findPageByTitle(
    pages: Array<UnknownRecord>,
    title: string,
): UnknownRecord | null {
    return (
        pages.find(function hasTitle(page) {
            return page.title === title;
        }) ?? null
    );
}

/**
 * Finds the talk page while tolerating API title normalization.
 *
 * @param pages - Returned query pages.
 * @param logPage - Identified assessment-log page.
 * @param talkTitle - Requested talk-page title.
 * @returns Returned talk page, when present.
 */
function findRequestedTalkPage(
    pages: Array<UnknownRecord>,
    logPage: UnknownRecord | null,
    talkTitle: string,
): UnknownRecord | null {
    const exact = findPageByTitle(pages, talkTitle);

    return exact ?? pages.find((page) => page !== logPage) ?? null;
}

/**
 * Decodes a possibly missing talk-page snapshot.
 *
 * @param page - Returned talk page.
 * @param starttimestamp - Shared query timestamp.
 * @returns Talk-page content and edit timestamps.
 */
function decodeTalkPage(
    page: UnknownRecord | null,
    starttimestamp: string,
): PageSnapshot {
    if (page == null) {
        throw new Error("MediaWiki response omitted the requested talk page.");
    }

    const revision = getFirstRevision(page);
    const basetimestamp = revision?.timestamp;

    return {
        ...(typeof basetimestamp === "string" ? { basetimestamp } : {}),
        exists: page.missing == null,
        starttimestamp,
        text: getRevisionContent(revision),
    };
}

/**
 * Decodes the required assessment-log page snapshot.
 *
 * @param page - Returned assessment-log page.
 * @param starttimestamp - Shared query timestamp.
 * @returns Log-page content and edit timestamps.
 */
function decodeNewPageList(
    page: UnknownRecord | null,
    starttimestamp: string,
): NewPageListSnapshot {
    const revision = getFirstRevision(page);

    if (page == null || page.missing != null || revision == null) {
        throw new Error(`Unable to read ${NEW_PAGE_LIST_TITLE}.`);
    }

    return {
        basetimestamp: getRequiredString(
            revision,
            "timestamp",
            "the base timestamp",
        ),
        starttimestamp,
        text: getRevisionContent(revision),
    };
}
