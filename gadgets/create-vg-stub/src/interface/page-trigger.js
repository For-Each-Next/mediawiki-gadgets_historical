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

    link.target = "_blank";
    link.rel = "noopener";
    link.addEventListener("click", handler);

    return true;
}

/**
 * Adds an English Wikipedia page action that starts zhwiki stub creation.
 *
 * @param {object} mediaWikiUtil - MediaWiki utility functions.
 * @param {Function} handler - Gadget launch handler.
 * @param {string} href - Fallback zhwiki creation URL.
 * @returns {boolean} Whether a trigger was added.
 */
export function addEnwikiCreateTrigger(mediaWikiUtil, handler, href) {
    const link =
        mediaWikiUtil.addPortletLink(
            "p-cactions",
            href,
            "Create zhwiki VG stub",
            "ca-create-zhwiki-vg-stub",
        ) ||
        mediaWikiUtil.addPortletLink(
            "p-tb",
            href,
            "Create zhwiki VG stub",
            "t-create-zhwiki-vg-stub",
        );

    if (link == null) {
        return false;
    }

    link.target = "_blank";
    link.rel = "noopener";
    link.addEventListener("click", handler);

    return true;
}
