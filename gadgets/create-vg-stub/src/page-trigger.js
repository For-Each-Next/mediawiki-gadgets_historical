/* eslint-disable */

/**
 * Adds gadget triggers to MediaWiki page actions.
 */

/**
 * Adds a gadget trigger beside the missing-page edit tab.
 *
 * @param {Document} documentRef - Current document.
 * @param {object} mediaWikiUtil - MediaWiki utility functions.
 * @param {Function} handler - Gadget open handler.
 * @returns {boolean} Whether the edit tab was updated.
 */
export function addMissingPageEditTrigger(
    documentRef,
    mediaWikiUtil,
    handler,
) {
    const editItem = documentRef.querySelector("#ca-edit");

    if (editItem == null || editItem.parentNode == null) {
        return false;
    }

    const link = mediaWikiUtil.addPortletLink(
        "p-cactions",
        "#",
        "Create VG stub",
        "ca-create-vg-stub",
        undefined,
        undefined,
        editItem.nextSibling,
    );

    if (link == null) {
        return false;
    }

    link.addEventListener("click", handler);

    return true;
}
