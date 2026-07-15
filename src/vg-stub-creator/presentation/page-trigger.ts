/**
 * Adds gadget triggers to MediaWiki page actions.
 */

/**
 * Adds a gadget trigger to the page views portlet on missing pages.
 *
 * @param mediaWikiUtil - MediaWiki utility functions.
 * @param handler - Gadget open handler.
 * @returns Whether a trigger was added.
 */
export function addMissingPageEditTrigger(
    mediaWikiUtil: any,
    handler: (...args: any[]) => any,
): boolean {
    const link = mediaWikiUtil.addPortletLink(
        "p-views",
        "#",
        "Create VG stub",
        "ca-vg-stub-creator",
    );

    if (link == null) {
        return false;
    }

    link.addEventListener("click", handler);

    return true;
}

/**
 * Handles add view page trigger.
 *
 * Adds the gadget to the visible page-action area with a toolbox
 * fallback.
 *
 * @param mediaWikiUtil - MediaWiki utility functions.
 * @param handler - Gadget open handler.
 * @returns Whether a trigger was added.
 *
 */
export function addViewPageTrigger(
    mediaWikiUtil: any,
    handler: (...args: any[]) => any,
): boolean {
    const link =
        mediaWikiUtil.addPortletLink(
            "p-views",
            "#",
            "Create VG stub",
            "ca-vg-stub-creator",
        ) ||
        mediaWikiUtil.addPortletLink(
            "p-tb",
            "#",
            "Create VG stub",
            "t-vg-stub-creator",
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
 * Handles add enwiki create trigger.
 *
 * Adds an English Wikipedia page action that starts zhwiki stub
 * creation.
 *
 * @param mediaWikiUtil - MediaWiki utility functions.
 * @param handler - Gadget launch handler.
 * @param href - Fallback zhwiki creation URL.
 * @returns Whether a trigger was added.
 *
 */
export function addEnwikiCreateTrigger(
    mediaWikiUtil: any,
    handler: (...args: any[]) => any,
    href: string,
): boolean {
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
