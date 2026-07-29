/**
 * Reads and writes the WikiProject Video games new-page list.
 */

import type { NewPageListSnapshot } from "#gadget/domain/types.ts";
import {
    asRecord,
    getFirstQueryPage,
    getFirstRevision,
    getRequiredString,
    getRevisionContent,
} from "#gadget/infra/mediawiki-response.ts";
import {
    loggedApiGet,
    loggedPostWithToken,
    logStep,
} from "#gadget/infra/logger.ts";

export const NEW_PAGE_LIST_TITLE = "WikiProject:电子游戏/新进条目";

export async function fetchNewPageList(
    api: mw.Api,
): Promise<NewPageListSnapshot> {
    logStep("fetchNewPageList start", { title: NEW_PAGE_LIST_TITLE });
    const response = await loggedApiGet(api, "fetchNewPageList", {
        action: "query",
        curtimestamp: true,
        formatversion: "2",
        prop: "revisions",
        rvprop: "content|timestamp",
        rvslots: "main",
        titles: NEW_PAGE_LIST_TITLE,
    });
    const result = decodeNewPageListResponse(response);

    logStep("fetchNewPageList done", {
        textLength: result.text.length,
        title: NEW_PAGE_LIST_TITLE,
    });
    return result;
}

export function decodeNewPageListResponse(
    response: unknown,
): NewPageListSnapshot {
    const responseRecord = asRecord(response);
    const page = getFirstQueryPage(response);
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
        starttimestamp: getRequiredString(
            responseRecord,
            "curtimestamp",
            "the query timestamp",
        ),
        text: getRevisionContent(revision),
    };
}

export async function savePreparedNewPageList(
    api: mw.Api,
    page: NewPageListSnapshot,
    proposedText: string,
    summary: string,
): Promise<void> {
    logStep("savePreparedNewPageList start", {
        summary,
        title: NEW_PAGE_LIST_TITLE,
    });
    await loggedPostWithToken(api, "savePreparedNewPageList", "csrf", {
        action: "edit",
        basetimestamp: page.basetimestamp,
        nocreate: true,
        starttimestamp: page.starttimestamp,
        summary,
        text: proposedText,
        title: NEW_PAGE_LIST_TITLE,
    });
    logStep("savePreparedNewPageList done", {
        title: NEW_PAGE_LIST_TITLE,
    });
}
