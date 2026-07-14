/**
 * Creates missing navbox templates.
 */

import { addEditSummarySuffix } from "../editing/summary.ts";


/**
 * Creates a navbox template page.
 *
 * @param template - Template title without namespace.
 * @param text - Template page wikitext.
 * @param api - MediaWiki API client.
 * @returns Resolves after the template is saved.
 */
export async function saveNavboxTemplate(
    template: string,
    text: string,
    api: any = new mw.Api(),
): Promise<void> {
    const title = `Template:${template}`;
    const params = {
        action: "edit",
        createonly: true,
        summary: addEditSummarySuffix(`create '${title}'`),
        text,
        title,
    };

    await api.postWithToken("csrf", params);
}
