/**
 * Coordinates MediaWiki parsing for dialog and inline previews.
 */

import type { ArticleForm } from "#gadget/domain/models.ts";
import { trimValue } from "#gadget/domain/wikitext/index.ts";
import type {
    MediaWikiApiPort,
    PreviewAdapterPorts,
} from "#gadget/contracts/application.ts";
// eslint-disable-next-line max-len
import { serializeElementContent } from "#gadget/adapters/browser/preview-markup.ts";

export interface PreviewMessages {
    previewHttp(status: number): string;
    previewMissing: string;
    unableRead(title: string): string;
}

export interface PreviewDependencies {
    createApi: () => MediaWikiApiPort;
    getPageName: () => string;
    messages: PreviewMessages;
}

/**
 * Creates preview operations bound to the current page-title provider.
 *
 * @param dependencies - API, page, and user-message dependencies.
 * @returns Bound preview operations.
 */
export function createPreviewController(
    dependencies: PreviewDependencies,
): PreviewAdapterPorts {
    const parseArticle = function parseArticle(
        text: string,
        form: ArticleForm,
    ): Promise<string> {
        return parseArticlePreviewText(
            dependencies,
            text,
            form,
            dependencies.getPageName(),
        );
    };
    const parseWikitext = function parseWikitext(
        text: string,
        title: string = dependencies.getPageName(),
    ): Promise<string> {
        return parsePreviewText(dependencies, text, title);
    };

    return {
        fetchPageText: fetchPageText.bind(null, dependencies),
        parseArticlePreviewText: parseArticle,
        parsePreviewText: parseWikitext,
    };
}

/**
 * Parses article wikitext through MediaWiki's native edit preview.
 *
 * @param text - Text to process.
 * @param form - Form value.
 * @param fallbackTitle - Fallback title value.
 * @returns Article wikitext parsed by MediaWiki's edit preview.
 */
async function parseArticlePreviewText(
    dependencies: PreviewDependencies,
    text: string,
    form: ArticleForm,
    fallbackTitle: string,
): Promise<string> {
    const nativeText = buildNativePreviewText(text, form, fallbackTitle);
    return parseNativePreviewText(dependencies, nativeText, fallbackTitle);
}

/**
 * Adds the heading expected by source-reading modules during preview.
 *
 * @param text - Text to process.
 * @param form - Form value.
 * @param fallbackTitle - Fallback title value.
 * @returns Resulting text.
 */
function buildNativePreviewText(
    text: string,
    form: ArticleForm,
    fallbackTitle: string,
): string {
    const title = trimValue(form.pageName) || fallbackTitle;
    return `= ${title} =\n${text}`;
}

/**
 * Requests MediaWiki's native edit preview without navigating away.
 *
 * @param text - Text to process.
 * @param title - Wiki title.
 * @returns Operation result.
 */
async function parseNativePreviewText(
    dependencies: PreviewDependencies,
    text: string,
    title: string,
): Promise<string> {
    const url = mw.util.getUrl(title, { action: "submit" });
    const response = await fetch(url, {
        body: buildNativePreviewFormData(text),
        credentials: "same-origin",
        method: "POST",
    });

    if (!response.ok) {
        const message = dependencies.messages.previewHttp(response.status);
        throw new Error(message);
    }

    return extractNativePreviewHtml(dependencies, await response.text());
}

/**
 * Builds a form payload compatible with MediaWiki's edit preview.
 *
 * @param text - Text to process.
 * @returns Built form payload compatible with MediaWiki's edit preview.
 */
function buildNativePreviewFormData(text: string): FormData {
    const editForm = document.getElementById(
        "editform",
    ) as HTMLFormElement | null;
    const formData =
        editForm == null ? new FormData() : new FormData(editForm);
    const previewButton = document.getElementById(
        "wpPreview",
    ) as HTMLInputElement | null;

    formData.set("wpTextbox1", text);
    formData.set("wpPreview", previewButton?.value || "Show preview");
    formData.delete("wpSave");
    formData.delete("wpDiff");
    return formData;
}

/**
 * Extracts rendered preview content from a MediaWiki response document.
 *
 * @param responseHtml - Response html value.
 * @returns Value.
 */
function extractNativePreviewHtml(
    dependencies: PreviewDependencies,
    responseHtml: string,
): string {
    const doc = new DOMParser().parseFromString(responseHtml, "text/html");
    const preview = doc.querySelector("#wikiPreview");

    if (preview == null) {
        throw new Error(dependencies.messages.previewMissing);
    }

    const parserOutput = preview.matches(".mw-parser-output")
        ? preview
        : preview.querySelector(".mw-parser-output");
    return serializeElementContent(parserOutput || preview);
}

/**
 * Parses generated wikitext through MediaWiki's API.
 *
 * @param text - Text to process.
 * @param title - Wiki title.
 * @returns Parsed generated wikitext through MediaWiki's API.
 */
async function parsePreviewText(
    dependencies: PreviewDependencies,
    text: string,
    title: string,
): Promise<string> {
    const response = await dependencies.createApi().post({
        action: "parse",
        contentmodel: "wikitext",
        disableeditsection: true,
        formatversion: 2,
        prop: "text",
        text,
        title,
    });

    return response?.parse?.text || "";
}

/**
 * Fetches the current source for one wiki page.
 *
 * @param title - Wiki title.
 * @returns Operation result.
 */
async function fetchPageText(
    dependencies: PreviewDependencies,
    title: string,
): Promise<string> {
    const response = await dependencies.createApi().get({
        action: "query",
        formatversion: "2",
        prop: "revisions",
        rvprop: "content",
        rvslots: "main",
        titles: title,
    });
    const pages = response?.query?.pages || [];
    const page = Array.isArray(pages) ? pages[0] : Object.values(pages)[0];
    const revision = page?.revisions?.[0];

    if (page == null || page.missing != null || revision == null) {
        throw new Error(dependencies.messages.unableRead(title));
    }

    const mainSlot = revision.slots?.main;
    return mainSlot?.content ?? mainSlot?.["*"] ?? revision["*"] ?? "";
}
