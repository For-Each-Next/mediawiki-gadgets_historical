/**
 * Refreshes every supported citation template from English Wikipedia's
 * TemplateData API.
 */

import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { format } from "prettier";

import {
    normalizeTemplateName,
    SUPPORTED_CITATION_TEMPLATES,
} from "../src/citation-formatter/domain/templates.ts";
import type {
    CitationTemplateData,
    CitationTemplateDataMap,
} from "../src/citation-formatter/config/citation-template-data/types.ts";
import { formatNamespaceTitle } from "../src/shared/wiki-titles/index.ts";

const API_ENDPOINT = "https://en.wikipedia.org/w/api.php";
const BATCH_SIZE = 20;
const OUTPUT_DIRECTORY = fileURLToPath(
    new URL(
        "../src/citation-formatter/config/" +
            "citation-template-data/generated/",
        import.meta.url,
    ),
);
const OUTPUT_INDEX = resolve(OUTPUT_DIRECTORY, "index.ts");
const execFileAsync = promisify(execFile);

interface ApiPage {
    missing?: boolean;
    paramOrder?: string[];
    params?: Record<string, { aliases?: string[]; type?: string }>;
    title?: string;
}

const templateData = await fetchAllTemplateData();
await writeTemplateDataModules(templateData);

/**
 * Downloads all supported templates in bounded batches.
 *
 * @returns Operation result.
 */
async function fetchAllTemplateData(): Promise<CitationTemplateDataMap> {
    const result: CitationTemplateDataMap = {};
    for (
        let index = 0;
        index < SUPPORTED_CITATION_TEMPLATES.length;
        index += BATCH_SIZE
    ) {
        const names = SUPPORTED_CITATION_TEMPLATES.slice(
            index,
            index + BATCH_SIZE,
        );
        Object.assign(result, await fetchTemplateDataBatch([...names]));
    }
    const missing = SUPPORTED_CITATION_TEMPLATES.filter(
        function isMissing(name) {
            return result[normalizeTemplateName(name)] == null;
        },
    );
    if (missing.length > 0) {
        throw new Error(`TemplateData missing for: ${missing.join(", ")}`);
    }
    return result;
}

/**
 * Downloads one TemplateData API batch over HTTPS.
 *
 * @param names - Names to process.
 * @returns Operation result.
 */
async function fetchTemplateDataBatch(
    names: string[],
): Promise<CitationTemplateDataMap> {
    const json = await downloadTemplateData(buildTemplateDataUrl(names));
    const data = JSON.parse(json) as {
        pages?: ApiPage[] | Record<string, ApiPage>;
    };
    const pages = getApiPages(data.pages);
    const invalid = pages.filter(function isInvalid(page) {
        return (
            page.missing === true || page.params == null || page.title == null
        );
    });
    if (invalid.length > 0) {
        const titles = invalid.map((page) => page.title || "(untitled)");
        throw new Error(`Incomplete TemplateData for: ${titles.join(", ")}`);
    }
    return Object.fromEntries(
        pages.map(function normalizePage(page) {
            const name = normalizeTemplateName(page.title || "");
            return [name, normalizeApiPage(page)];
        }),
    );
}

/**
 * Downloads one HTTPS API response with optional proxy support.
 *
 * @param url - Url value.
 * @returns Operation result.
 */
async function downloadTemplateData(url: string): Promise<string> {
    const args = [
        "--fail",
        "--location",
        "--connect-timeout",
        "15",
        "--max-time",
        "60",
        "--silent",
        "--show-error",
        "--user-agent",
        "CitationFormatterTemplateDataUpdater/1.0",
    ];
    const proxy = process.env.CITATION_TEMPLATE_PROXY;
    if (proxy != null && proxy !== "") {
        args.push("--proxy", proxy);
    }
    args.push(url);
    const result = await execFileAsync("curl", args, {
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
    });
    return result.stdout;
}

/**
 * Builds an English Wikipedia TemplateData API URL.
 *
 * @param names - Names to process.
 * @returns Built English Wikipedia TemplateData API URL.
 */
function buildTemplateDataUrl(names: string[]): string {
    const params = new URLSearchParams({
        action: "templatedata",
        format: "json",
        formatversion: "2",
        includeMissingTitles: "1",
        origin: "*",
        redirects: "1",
        titles: names
            .map((name) => formatNamespaceTitle(name, "enwiki", 10))
            .join("|"),
    });
    return `${API_ENDPOINT}?${params}`;
}

/**
 * Normalizes either API pages response shape to an array.
 *
 * @param pages - Pages value.
 * @returns Normalized either API pages response shape to an array.
 */
function getApiPages(
    pages: ApiPage[] | Record<string, ApiPage> | undefined,
): ApiPage[] {
    return Array.isArray(pages) ? pages : Object.values(pages || {});
}

/**
 * Keeps only TemplateData fields required by the gadget.
 *
 * @param page - Page value.
 * @returns Operation result.
 */
function normalizeApiPage(page: ApiPage): CitationTemplateData {
    const params = page.params || {};
    const aliases = Object.fromEntries(
        Object.entries(params).map(function mapAliases([name, data]) {
            return [name, data.aliases || []];
        }),
    );
    return {
        aliases,
        dateParams: Object.entries(params)
            .filter(function isDateParam([_name, data]) {
                return data.type === "date";
            })
            .map(function getParamName([name]) {
                return name;
            }),
        paramOrder: page.paramOrder || Object.keys(params),
    };
}

/**
 * Writes one generated module per citation template and an index.
 *
 * @param data - Data value.
 */
async function writeTemplateDataModules(
    data: CitationTemplateDataMap,
): Promise<void> {
    await mkdir(OUTPUT_DIRECTORY, { recursive: true });
    const entries = Object.entries(data).sort(
        function sortTemplates(left, right) {
            return left[0].localeCompare(right[0]);
        },
    );
    const writes = entries.map(async function writeTemplate([name, value]) {
        const path = resolve(OUTPUT_DIRECTORY, `${templateFileStem(name)}.ts`);
        const source = await formatTemplateModule(name, value);
        await writeFile(path, source);
    });
    const index = await formatTemplateDataIndex(entries);
    await Promise.all([...writes, writeFile(OUTPUT_INDEX, index)]);
}

/**
 * Formats one template's generated data module.
 *
 * @param name - Name to process.
 * @param data - Data value.
 * @returns Formatted template's generated data module.
 */
async function formatTemplateModule(
    name: string,
    data: CitationTemplateData,
): Promise<string> {
    const json = JSON.stringify(data, null, 4);
    const source = [
        "/**",
        ` * Generated English Wikipedia TemplateData for ${name}.`,
        " *",
        " * Run the workspace update:template-data script to refresh it.",
        " */",
        "",
        'import type { CitationTemplateData } from "../types.ts";',
        "",
        `const templateData: CitationTemplateData = ${json};`,
        "",
        "export default templateData;",
        "",
    ].join("\n");
    return format(source, { parser: "typescript", tabWidth: 4 });
}

/**
 * Formats the generated TemplateData index module.
 *
 * @param entries - Entries value.
 * @returns Formatted the generated TemplateData index module.
 */
async function formatTemplateDataIndex(
    entries: Array<[string, CitationTemplateData]>,
): Promise<string> {
    const imports = entries.map(function buildImport([name]) {
        const identifier = templateIdentifier(name);
        const path = `./${templateFileStem(name)}.ts`;
        return `import ${identifier} from "${path}";`;
    });
    const properties = entries.map(function buildProperty([name]) {
        return `${JSON.stringify(name)}: ${templateIdentifier(name)},`;
    });
    const source = [
        "/**",
        " * Generated citation TemplateData index.",
        " */",
        "",
        'import type { CitationTemplateDataMap } from "../types.ts";',
        ...imports,
        "",
        "const templateData: CitationTemplateDataMap = {",
        ...properties,
        "};",
        "",
        "export default templateData;",
        "",
    ].join("\n");
    return format(source, { parser: "typescript", tabWidth: 4 });
}

/**
 * Converts a template name to its generated filename stem.
 *
 * @param name - Name to process.
 * @returns Converted template name to its generated filename stem.
 */
function templateFileStem(name: string): string {
    return name.replace(/\s+/gu, "-");
}

/**
 * Converts a template name to its generated import identifier.
 *
 * @param name - Name to process.
 * @returns Converted template name to its generated import identifier.
 */
function templateIdentifier(name: string): string {
    return name.replace(/\s+(.)/gu, function uppercaseWord(_match, letter) {
        return letter.toLocaleUpperCase("en-US");
    });
}
