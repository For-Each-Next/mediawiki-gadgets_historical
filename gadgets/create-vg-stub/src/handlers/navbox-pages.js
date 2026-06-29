/* eslint-disable */

/**
 * Creates missing navbox templates.
 */

import { addEditSummarySuffix } from "../editing/summary.js";

/**
 * Creates a navbox template page.
 *
 * @param {string} template - Template title without namespace.
 * @param {string} text - Template page wikitext.
 * @param {object} [api] - MediaWiki API client.
 * @returns {Promise<void>} Resolves after the template is saved.
 */
export async function saveNavboxTemplate(template, text, api = new mw.Api()) {
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
