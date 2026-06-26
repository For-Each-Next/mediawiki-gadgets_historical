/* eslint-disable */

/**
 * Adds gadget triggers to MediaWiki page actions.
 */

/**
 * Adds a gadget trigger to the page views portlet on missing pages.
 *
 * @param {object} mediaWikiUtil - MediaWiki utility functions.
 * @param {Function} handler - Gadget open handler.
 * @returns {boolean} Whether a trigger was added.
 */
export function addMissingPageEditTrigger(mediaWikiUtil, handler) {
    const link = mediaWikiUtil.addPortletLink(
        "p-views",
        "#",
        "Create VG stub",
        "ca-create-vg-stub",
    );

    if (link == null) {
        return false;
    }

    link.addEventListener("click", handler);

    return true;
}

/**
 * Adds the gadget to the visible page-action area with a toolbox fallback.
 *
 * @param {object} mediaWikiUtil - MediaWiki utility functions.
 * @param {Function} handler - Gadget open handler.
 * @returns {boolean} Whether a trigger was added.
 */
export function addViewPageTrigger(mediaWikiUtil, handler) {
    const link =
        mediaWikiUtil.addPortletLink(
            "p-views",
            "#",
            "Create VG stub",
            "ca-create-vg-stub",
        ) ||
        mediaWikiUtil.addPortletLink(
            "p-tb",
            "#",
            "Create VG stub",
            "t-create-vg-stub",
        );

    if (link == null) {
        return false;
    }

    link.addEventListener("click", handler);

    return true;
}
