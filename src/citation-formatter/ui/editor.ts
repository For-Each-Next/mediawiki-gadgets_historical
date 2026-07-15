/**
 * Source-editor command for the citation formatter.
 */

import { formatCitations } from "#me/app/format.ts";
import { editBox } from "#shared";

const LINK_ID = "ca-citation-formatter";

/**
 * Adds a citation-format command on MediaWiki edit pages.
 */
export function mountCitationFormatter(): void {
    if (typeof mw === "undefined") {
        return;
    }
    const editor = editBox.getEditBox();
    if (editor == null || document.getElementById(LINK_ID) != null) {
        return;
    }
    const link = addFormatterLink("p-cactions") || addFormatterLink("p-tb");
    link?.addEventListener("click", function formatOnClick(event) {
        event.preventDefault();
        void runFormatter(editor, link);
    });
}

/**
 * Adds the command to one MediaWiki portlet.
 *
 * @param portlet - Portlet identifier.
 * @returns Added command link.
 */
function addFormatterLink(portlet: string): HTMLElement | null {
    const result = mw.util.addPortletLink(
        portlet,
        "#",
        "Format citations",
        LINK_ID,
        "Format citations and create list-defined references",
    );
    return result;
}

/**
 * Formats the current source editor value.
 *
 * @param editor - Active MediaWiki source editor.
 * @param link - Command link.
 */
async function runFormatter(
    editor: editBox.EditBox,
    link: HTMLElement,
): Promise<void> {
    if (link.getAttribute("aria-disabled") === "true") {
        return;
    }
    link.setAttribute("aria-disabled", "true");
    try {
        const result = await formatCitations(editor.read());
        editor.write(result.text);
        const citations = result.citationsFormatted;
        const references = result.referencesMoved;
        const message =
            `Formatted ${citations} citation(s); ` +
            `moved ${references} reference(s).`;
        mw.notify(message, { type: "success" });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        mw.notify(`Citation formatting failed: ${message}`, { type: "error" });
    } finally {
        link.removeAttribute("aria-disabled");
    }
}
