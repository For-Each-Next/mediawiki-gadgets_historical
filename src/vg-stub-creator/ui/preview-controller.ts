/**
 * Coordinates MediaWiki parsing for dialog and inline previews.
 */

import type { ArticleForm } from "#gadget/domain/models.ts";
import { msg } from "#gadget/i18n/index.ts";
import * as html from "#shared/html";
import { wikitext } from "#shared/citation";

const { serializeElementContent } = html;
const { trimValue } = wikitext;

export interface PreviewController {
    fetchPageText(title: string): Promise<string>;
    parseArticlePreviewText(text: string, form: ArticleForm): Promise<string>;
    parsePreviewText(text: string, title?: string): Promise<string>;
}

/**
 * Creates preview operations bound to the current page-title provider.
 *
 * @param getPageName - Gets the current full page title.
 * @returns Bound preview operations.
 */
export function createPreviewController(
    getPageName: () => string,
): PreviewController {
    const parseArticle = function parseArticle(
        text: string,
        form: ArticleForm,
    ): Promise<string> {
        return parseArticlePreviewText(text, form, getPageName());
    };
    const parseWikitext = function parseWikitext(
        text: string,
        title: string = getPageName(),
    ): Promise<string> {
        return parsePreviewText(text, title);
    };

    return {
        fetchPageText,
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
    text: string,
    form: ArticleForm,
    fallbackTitle: string,
): Promise<string> {
    const nativeText = buildNativePreviewText(text, form, fallbackTitle);
    return parseNativePreviewText(nativeText, fallbackTitle);
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
        const message = msg("errors.previewHttp", { status: response.status });
        throw new Error(message);
    }

    return extractNativePreviewHtml(await response.text());
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
function extractNativePreviewHtml(responseHtml: string): string {
    const doc = new DOMParser().parseFromString(responseHtml, "text/html");
    const preview = doc.querySelector("#wikiPreview");

    if (preview == null) {
        throw new Error(msg("errors.previewMissing"));
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
async function parsePreviewText(text: string, title: string): Promise<string> {
    const response = await new mw.Api().post({
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
async function fetchPageText(title: string): Promise<string> {
    const response = await new mw.Api().get({
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
        throw new Error(msg("errors.unableRead", { title }));
    }

    const mainSlot = revision.slots?.main;
    return mainSlot?.content ?? mainSlot?.["*"] ?? revision["*"] ?? "";
}
