/* eslint-disable */

/**
 * Adds gadget triggers to MediaWiki page actions.
 */

/**
 * Adds a gadget trigger beside the missing-page edit tab.
 *
 * @param {Document} documentRef - Current document.
 * @param {Function} handler - Gadget open handler.
 * @returns {boolean} Whether the edit tab was updated.
 */
export function addMissingPageEditTrigger(documentRef, handler) {
    const editItem = documentRef.querySelector("#ca-edit");

    if (editItem == null || editItem.parentNode == null) {
        return false;
    }

    const item = documentRef.createElement("li");
    const link = documentRef.createElement("a");

    item.id = "ca-create-vg-stub";
    link.href = "#";
    link.textContent = "Create video game stub";
    link.addEventListener("click", handler);
    item.append(link);
    editItem.parentNode.insertBefore(item, editItem.nextSibling);

    return true;
}
