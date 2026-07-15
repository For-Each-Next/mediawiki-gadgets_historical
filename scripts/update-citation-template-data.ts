/**
 * Updates local English Wikipedia citation TemplateData.
 */

import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { format } from "prettier";

import {
    normalizeTemplateName,
    SUPPORTED_CITATION_TEMPLATES,
} from "../src/citation-formatter/domain/templates.ts";
import type {
    CitationTemplateData,
    CitationTemplateDataMap,
} from "../src/citation-formatter/domain/types.ts";

const API_ENDPOINT = "https://en.wikipedia.org/w/api.php";
const BATCH_SIZE = 20;
const OUTPUT_DIRECTORY = resolve("domain/data");
const OUTPUT_INDEX = resolve(OUTPUT_DIRECTORY, "index.ts");
const execFileAsync = promisify(execFile);

interface ApiPage {
    paramOrder?: string[];
    params?: Record<string, { aliases?: string[]; type?: string }>;
    title?: string;
}

const templateData = await fetchAllTemplateData();
await writeTemplateDataModules(templateData);

/**
 * Downloads all supported templates in bounded batches.
 *
 * @returns Downloaded TemplateData map.
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
            return result[name] == null;
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
 * @param names - Normalized template names.
 * @returns Downloaded metadata map.
 */
async function fetchTemplateDataBatch(
    names: string[],
): Promise<CitationTemplateDataMap> {
    const json = await downloadTemplateData(buildTemplateDataUrl(names));
    const data = JSON.parse(json) as {
        pages?: ApiPage[] | Record<string, ApiPage>;
    };
    const pages = getApiPages(data.pages);
    const result = Object.fromEntries(
        pages
            .filter(function hasTitle(page) {
                return page.title != null;
            })
            .map(function normalizePage(page) {
                const name = normalizeTemplateName(page.title || "");
                return [name, normalizeApiPage(page)];
            }),
    );
    return result;
}

/**
 * Downloads one HTTPS API response with optional proxy support.
 *
 * @param url - English Wikipedia API URL.
 * @returns JSON response text.
 */
async function downloadTemplateData(url: string): Promise<string> {
    const args = ["--fail", "--location", "--silent", "--show-error"];
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
 * @param names - Normalized template names.
 * @returns HTTPS API URL.
 */
function buildTemplateDataUrl(names: string[]): string {
    const params = new URLSearchParams({
        action: "templatedata",
        format: "json",
        formatversion: "2",
        origin: "*",
        redirects: "1",
        titles: names
            .map(function addNamespace(name) {
                return `Template:${name}`;
            })
            .join("|"),
    });
    return `${API_ENDPOINT}?${params}`;
}

/**
 * Normalizes either API pages response shape to an array.
 *
 * @param pages - API pages response.
 * @returns API pages array.
 */
function getApiPages(
    pages: ApiPage[] | Record<string, ApiPage> | undefined,
): ApiPage[] {
    if (Array.isArray(pages)) {
        return pages;
    }
    return Object.values(pages || {});
}

/**
 * Keeps only TemplateData fields required by the gadget.
 *
 * @param page - TemplateData API page.
 * @returns Compact template metadata.
 */
function normalizeApiPage(page: ApiPage): CitationTemplateData {
    const params = page.params || {};
    const aliases = Object.fromEntries(
        Object.entries(params).map(function mapAliases([name, data]) {
            return [name, data.aliases || []];
        }),
    );
    const result = {
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
    return result;
}

/**
 * Writes one generated module per citation template and an index.
 *
 * @param data - Downloaded TemplateData.
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
 * @param name - Normalized template name.
 * @param data - Compact TemplateData.
 * @returns Formatted TypeScript source.
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
    return format(source, { parser: "typescript" });
}

/**
 * Formats the generated template-data index module.
 *
 * @param entries - Template names and metadata.
 * @returns Formatted TypeScript source.
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
    return format(source, { parser: "typescript" });
}

/**
 * Converts a template name to its generated filename stem.
 *
 * @param name - Normalized template name.
 * @returns Hyphenated filename stem.
 */
function templateFileStem(name: string): string {
    return name.replace(/\s+/gu, "-");
}

/**
 * Converts a template name to its generated import identifier.
 *
 * @param name - Normalized template name.
 * @returns JavaScript identifier.
 */
function templateIdentifier(name: string): string {
    const result = name.replace(
        /\s+(.)/gu,
        function uppercaseWord(_match, letter) {
            return letter.toLocaleUpperCase("en-US");
        },
    );
    return result;
}
