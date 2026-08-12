/** Extracts and minifies injected Vue templates. */

import { minify } from "html-minifier-terser";
import { parse } from "@vue/compiler-sfc";

/**
 * Extracts the HTML from a template-only Vue single-file component.
 *
 * @param source - Authored Vue single-file component source.
 * @param filename - Source filename used in parser diagnostics.
 * @returns Inner template HTML.
 */
export function extractVueTemplate(
    source: string,
    filename: string = "template.vue",
): string {
    const result = parse(source, { filename });
    const { descriptor } = result;
    const template = descriptor.template;
    const hasOnlyTemplate =
        result.errors.length === 0 &&
        template != null &&
        descriptor.script == null &&
        descriptor.scriptSetup == null &&
        descriptor.styles.length === 0 &&
        descriptor.customBlocks.length === 0;
    if (!hasOnlyTemplate || template == null) {
        throw new Error(
            `${filename} must contain one template and no other SFC blocks.`,
        );
    }
    return template.content.trim();
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
