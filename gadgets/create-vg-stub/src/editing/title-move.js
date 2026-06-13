/* eslint-disable */

/**
 * Updates title-dependent generated fragments without rebuilding manual text.
 */

const INFOBOX_START = "{{Infobox VG\n";
const INFOBOX_END = "\n}}";

/**
 * Updates generated title fragments for a moved article.
 *
 * @param {string} text - Current manually editable wikitext.
 * @param {object} current - Article data for the current title.
 * @param {object} target - Article data for the target title.
 * @returns {string} Wikitext with only generated title fragments updated.
 */
export function updateMovedTitleText(text, current, target) {
    let updated = updateInfoboxTitleLines(text, current, target);

    updated = replaceOnce(updated, current.leadNameText, target.leadNameText);
    updated = replaceOnce(
        updated,
        current.defaultSortText,
        target.defaultSortText,
    );

    return updated;
}

/**
 * Updates only changed generated lines inside the Infobox VG template.
 *
 * @param {string} text - Current wikitext.
 * @param {object} current - Current-title article data.
 * @param {object} target - Target-title article data.
 * @returns {string} Updated wikitext.
 */
function updateInfoboxTitleLines(text, current, target) {
    const start = text.indexOf(INFOBOX_START);

    if (start < 0) {
        return text;
    }

    const end = text.indexOf(INFOBOX_END, start);

    if (end < 0) {
        return text;
    }

    const currentLines = parseTemplateParameterLines(current.infoboxText);
    const targetLines = parseTemplateParameterLines(target.infoboxText);
    const changedKeys = new Set([
        ...currentLines.keys(),
        ...targetLines.keys(),
    ]);
    const blockEnd = end + INFOBOX_END.length;
    let infobox = text.slice(start, blockEnd);

    changedKeys.forEach((key) => {
        const currentLine = currentLines.get(key);
        const targetLine = targetLines.get(key);

        if (currentLine === targetLine) {
            return;
        }

        if (currentLine != null && infobox.includes(currentLine)) {
            infobox =
                targetLine == null
                    ? infobox.replace(`\n${currentLine}`, "")
                    : infobox.replace(currentLine, targetLine);
            return;
        }

        if (currentLine == null && targetLine != null) {
            infobox = infobox.replace(
                INFOBOX_END,
                `\n${targetLine}${INFOBOX_END}`,
            );
        }
    });

    return `${text.slice(0, start)}${infobox}${text.slice(blockEnd)}`;
}

/**
 * Parses block-template parameter lines by parameter name.
 *
 * @param {string} template - Generated template wikitext.
 * @returns {Map<string, string>} Parameter lines keyed by name.
 */
function parseTemplateParameterLines(template) {
    return new Map(
        String(template || "")
            .split("\n")
            .map((line) => {
                const match = line.match(/^\|\s*([^=]+?)\s*=/u);

                return match == null ? null : [match[1].trim(), line];
            })
            .filter(Boolean),
    );
}

/**
 * Replaces one exact generated fragment when it remains present.
 *
 * @param {string} text - Current wikitext.
 * @param {string} current - Current generated fragment.
 * @param {string} target - Target generated fragment.
 * @returns {string} Updated wikitext.
 */
function replaceOnce(text, current, target) {
    if (current === target || current == null || current === "") {
        return text;
    }

    const index = text.indexOf(current);

    if (index < 0) {
        return text;
    }

    return `${text.slice(0, index)}${target || ""}${text.slice(
        index + current.length,
    )}`;
}
