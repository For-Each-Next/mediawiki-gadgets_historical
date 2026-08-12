/** Saves reviewed text against fresh MediaWiki preconditions. */

import type { ReviewedArticleSave } from "#gadget/contracts/application.ts";

interface ArticleWriteApi {
    get(params: Record<string, unknown>): PromiseLike<unknown>;
    postWithToken(
        token: string,
        params: Record<string, unknown>,
    ): PromiseLike<unknown>;
}

interface ArticleEditPreconditions {
    basetimestamp?: string;
    starttimestamp: string;
}

/** Performs one guarded article edit without automatic retries. */
export async function saveReviewedArticle(
    api: ArticleWriteApi,
    save: ReviewedArticleSave,
): Promise<void> {
    const preconditions = await readArticleEditPreconditions(
        api,
        save.title,
        save.exists,
    );
    const params: Record<string, unknown> = {
        action: "edit",
        starttimestamp: preconditions.starttimestamp,
        summary: save.summary,
        text: save.text,
        title: save.title,
    };
    if (save.exists) {
        params.basetimestamp = preconditions.basetimestamp;
        params.nocreate = true;
    } else {
        params.createonly = true;
    }
    await api.postWithToken("csrf", params);
}

async function readArticleEditPreconditions(
    api: ArticleWriteApi,
    title: string,
    expectedExists: boolean,
): Promise<ArticleEditPreconditions> {
    const response = await api.get({
        action: "query",
        curtimestamp: true,
        formatversion: "2",
        prop: "revisions",
        rvlimit: 1,
        rvprop: "timestamp",
        titles: title,
    });
    const record = asRecord(response);
    const query = asRecord(record?.query);
    const page = getFirstPage(query?.pages);
    const exists = page != null && page.missing == null;
    if (exists !== expectedExists) {
        const state = exists ? "already exists" : "no longer exists";
        throw new Error(`The reviewed page ${title} ${state}.`);
    }
    const starttimestamp = record?.curtimestamp;
    if (typeof starttimestamp !== "string") {
        throw new Error("MediaWiki omitted the edit start timestamp.");
    }
    if (!expectedExists) {
        return { starttimestamp };
    }
    const revisions = page?.revisions;
    const revision = Array.isArray(revisions)
        ? asRecord(revisions[0])
        : undefined;
    if (typeof revision?.timestamp !== "string") {
        throw new Error("MediaWiki omitted the reviewed base timestamp.");
    }
    return { basetimestamp: revision.timestamp, starttimestamp };
}

function getFirstPage(value: unknown): Record<string, unknown> | undefined {
    if (Array.isArray(value)) {
        return asRecord(value[0]);
    }
    const pages = asRecord(value);
    return pages == null ? undefined : asRecord(Object.values(pages)[0]);
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
    return value != null && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : undefined;
}
