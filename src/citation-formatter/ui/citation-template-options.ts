/**
 * Orders citation-template selector options by importance and
 * specificity.
 */

import { SUPPORTED_CITATION_TEMPLATES } from "#gadget/domain/templates.ts";
import {
    cdxIconArticle,
    cdxIconBook,
    cdxIconBrowser,
    cdxIconDie,
    cdxIconMessage,
    cdxIconMusicalScore,
    cdxIconNewspaper,
    cdxIconNotice,
    cdxIconUserTalk,
    type Icon,
} from "@wikimedia/codex-icons";

export const CITATION_TEMPLATE_TIERS = {
    importantSpecial: [
        "Cite news",
        "Cite interview",
        "Cite video game",
        "Cite press release",
    ],
    importantGeneral: [
        "Cite web",
        "Cite magazine",
        "Cite book",
        "Cite tweet",
        "Cite AV media",
        "Cite AV media notes",
    ],
    normalSpecial: [
        "Cite arXiv",
        "Cite bioRxiv",
        "Cite CiteSeerX",
        "Cite conference",
        "Cite episode",
        "Cite mailing list",
        "Cite map",
        "Cite medRxiv",
        "Cite newsgroup",
        "Cite podcast",
        "Cite sign",
        "Cite speech",
        "Cite SSRN",
        "Cite tech report",
        "Cite thesis",
    ],
    normalGeneral: [
        "Citation",
        "Cite document",
        "Cite encyclopedia",
        "Cite journal",
        "Cite report",
        "Cite serial",
    ],
} as const;

const IMPORTANT_TEMPLATE_ICONS = new Map<string, Icon>([
    ["Cite news", cdxIconNewspaper],
    ["Cite interview", cdxIconUserTalk],
    ["Cite tweet", cdxIconMessage],
    ["Cite video game", cdxIconDie],
    ["Cite press release", cdxIconNotice],
    ["Cite AV media", cdxIconMusicalScore],
    ["Cite AV media notes", cdxIconArticle],
    ["Cite web", cdxIconBrowser],
    ["Cite magazine", cdxIconNewspaper],
    ["Cite book", cdxIconBook],
]);

const orderedTemplateNames = [
    ...CITATION_TEMPLATE_TIERS.importantSpecial,
    ...CITATION_TEMPLATE_TIERS.importantGeneral,
    ...CITATION_TEMPLATE_TIERS.normalSpecial,
    ...CITATION_TEMPLATE_TIERS.normalGeneral,
];

validateTemplateTiers(orderedTemplateNames);

export const CITATION_TEMPLATE_OPTIONS = orderedTemplateNames.map(
    function toTemplateOption(name) {
        return {
            icon: IMPORTANT_TEMPLATE_ICONS.get(name),
            label: name,
            value: name.toLocaleLowerCase("en-US"),
        };
    },
);

/**
 * Guards the selector classification when the supported set changes.
 */
function validateTemplateTiers(names: readonly string[]): void {
    const uniqueNames = new Set(names);
    const supportedNames = new Set<string>(SUPPORTED_CITATION_TEMPLATES);
    const hasEverySupportedName = SUPPORTED_CITATION_TEMPLATES.every((name) =>
        uniqueNames.has(name),
    );
    if (
        uniqueNames.size !== names.length ||
        uniqueNames.size !== supportedNames.size ||
        !hasEverySupportedName
    ) {
        throw new Error(
            "Citation template tiers must classify every supported template.",
        );
    }
}
