import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { OnLoadResult, Plugin } from "esbuild";
import { minify } from "html-minifier-terser";

const HTML_LITERAL_PATTERN =
    /[`'"]\s*(?:<!doctype\s|<!--|<\/?[a-z][\w-]*[\s>])/iu;
const HTML_VALUE_PATTERN = /^\s*(?:<!doctype\s|<!--|<\/?[a-z][\w-]*[\s>])/iu;
const VALUE_EXPORT_PATTERN = /\bexport\s+(?:const|default)\b/u;

/**
 * Creates an esbuild plugin that minifies HTML-only modules.
 *
 * @returns HTML template minifier plugin.
 */
export function createHtmlTemplateMinifier(): Plugin {
    return {
        name: "minify-html-template-modules",
        setup(build) {
            build.onLoad({ filter: /\.ts$/ }, async (args) =>
                buildMinifiedTemplateModule(args.path),
            );
        },
    };
}

/**
 * Minifies a Vue-compatible HTML template.
 *
 * @param template - Authored HTML template.
 * @returns Minified HTML template.
 */
export async function minifyHtmlTemplate(template: string): Promise<string> {
    return minify(template, {
        caseSensitive: true,
        collapseInlineTagWhitespace: true,
        collapseWhitespace: true,
        customAttrCollapse: /.*/u,
        keepClosingSlash: true,
    });
}

/**
 * Builds a virtual module when a source module only exports strings and
 * at least one exported value contains HTML.
 *
 * @param modulePath - Absolute TypeScript module path.
 * @returns Replacement module, or undefined for ordinary source.
 */
async function buildMinifiedTemplateModule(
    modulePath: string,
): Promise<OnLoadResult | undefined> {
    const source = await readFile(modulePath, "utf8");

    if (
        !HTML_LITERAL_PATTERN.test(source) ||
        !VALUE_EXPORT_PATTERN.test(source)
    ) {
        return undefined;
    }

    const absolutePath = resolve(modulePath);
    const moduleUrl = pathToFileURL(absolutePath).href;
    const moduleExports = (await import(moduleUrl)) as Record<string, unknown>;
    const exportEntries = Object.entries(moduleExports);

    if (
        exportEntries.length === 0 ||
        exportEntries.some(([, value]) => typeof value !== "string") ||
        !exportEntries.some(([, value]) => isHtmlValue(value))
    ) {
        return undefined;
    }

    const declarations = await Promise.all(
        exportEntries.map(serializeTemplateExport),
    );

    return {
        contents: declarations.join("\n"),
        loader: "ts",
    };
}

/**
 * Serializes one minified template export.
 *
 * @param entry - Module export name and value.
 * @returns Virtual module declaration.
 */
async function serializeTemplateExport(
    entry: [string, unknown],
): Promise<string> {
    const [name, value] = entry;

    if (typeof value !== "string") {
        throw new TypeError(`Template export ${name} must be a string.`);
    }

    const template = isHtmlValue(value)
        ? await minifyHtmlTemplate(value)
        : value;
    const serializedTemplate = JSON.stringify(template);

    if (name === "default") {
        return `export default ${serializedTemplate};`;
    }

    return `export const ${name} = ${serializedTemplate};`;
}

/**
 * Checks whether an exported string starts with an HTML tag.
 *
 * @param value - Possible module export.
 * @returns Whether the value is an HTML template.
 */
function isHtmlValue(value: unknown): value is string {
    return typeof value === "string" && HTML_VALUE_PATTERN.test(value);
}
