/**
 * Performs one timestamp-protected talk-page edit.
 */

import type { PageSnapshot, PreparedTalkEdit } from "#gadget/domain/types.ts";
import {
    type ApiParameters,
    loggedPostWithToken,
    logStep,
} from "#gadget/infra/logger.ts";

export async function postTalkPageEdit(
    api: mw.Api,
    page: PageSnapshot,
    edit: PreparedTalkEdit,
    text: string,
    attempt: number,
): Promise<void> {
    const params: ApiParameters = {
        action: "edit",
        starttimestamp: page.starttimestamp,
        summary: edit.summary,
        text,
        title: edit.title,
    };

    if (page.basetimestamp != null) {
        params.basetimestamp = page.basetimestamp;
    }
    if (!page.exists) {
        params.createonly = true;
    }

    await loggedPostWithToken(api, "saveTalkAssessment", "csrf", params);
    logStep("saveTalkAssessment saved", {
        attempt,
        title: edit.title,
    });
}
