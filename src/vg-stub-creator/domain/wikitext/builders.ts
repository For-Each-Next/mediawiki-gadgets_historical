/** Builds the small wikitext structures used by article renderers. */

/** A value accepted by a MediaWiki template parameter. */
export type TemplateParamValue = string | number | boolean | null | undefined;

/** A MediaWiki template parameter key and value. */
export type TemplateParam = [string | number | null, TemplateParamValue];

/** Builds a template call without parameters. */
export function buildTemplateCall(template: string): string {
    return `{{${template}}}`;
}

/** Builds inline or block template wikitext from parameter entries. */
export function buildTemplateText(
    name: string,
    params: Array<TemplateParam>,
    style: string = "inline",
): string {
    const entries = params.filter(hasTemplateParamValue);

    if (style === "block") {
        return buildBlockTemplateText(name, entries);
    }

    return buildInlineTemplateText(name, entries);
}

function buildInlineTemplateText(
    name: string,
    entries: Array<TemplateParam>,
): string {
    return [
        "{{",
        name,
        "",
        entries.map(buildInlineTemplateParam).join(""),
        "}}",
    ].join("");
}

function buildBlockTemplateText(
    name: string,
    entries: Array<TemplateParam>,
): string {
    return [
        "{{",
        name,
        "\n",
        entries.map(buildBlockTemplateParam).join("\n"),
        "\n}}",
    ].join("");
}

function buildInlineTemplateParam(entry: TemplateParam): string {
    const [key, value] = entry;

    if (typeof key === "number") {
        return `|${value}`;
    }

    return `|${key}=${value}`;
}

function buildBlockTemplateParam(entry: TemplateParam): string {
    const [key, value] = entry;

    if (key == null) {
        return `| ${value}`;
    }

    return `| ${key} = ${value}`;
}

function hasTemplateParamValue(entry: TemplateParam): boolean {
    const [_key, value] = entry;
    return value != null;
}

/** Builds the shortest safe wikilink for a target and display label. */
export function buildLinkText(title: string, label: string): string {
    if (hasSameFirstLetterCaseInsensitiveText(title, label)) {
        return `[[${label}]]`;
    }

    return `[[${title}|${label}]]`;
}

function hasSameFirstLetterCaseInsensitiveText(
    title: string,
    label: string,
): boolean {
    const [titleFirst = "", ...titleRest] = [...title.replace(/_/gu, " ")];
    const [labelFirst = "", ...labelRest] = [...label.replace(/_/gu, " ")];

    return (
        titleFirst.toLocaleLowerCase() === labelFirst.toLocaleLowerCase() &&
        titleRest.join("") === labelRest.join("")
    );
}
