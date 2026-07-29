/** Authored Citation Formatter dialog assets for Node-side tests. */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { extractVueTemplate } from "../../scripts/minify-html-templates.ts";

export const DIALOG_NAMES = [
    "main",
    "draft",
    "parameter-alias",
    "tool",
    "close-confirmation",
] as const;

const packageRoot = fileURLToPath(
    new URL("../../src/citation-formatter/", import.meta.url),
);
const dialogDirectory = join(packageRoot, "ui/dialogs");

export const SOURCE_MANAGER_TEMPLATE_FIXTURE =
    DIALOG_NAMES.map(readDialogTemplate).join("");

export const SOURCE_MANAGER_STYLES_FIXTURE = [
    readFileSync(join(packageRoot, "ui/styles.css"), "utf8"),
    ...DIALOG_NAMES.map(readDialogStyles),
].join("\n");

function readDialogTemplate(name: (typeof DIALOG_NAMES)[number]): string {
    const filename = join(dialogDirectory, `${name}-dialog.vue`);
    return extractVueTemplate(readFileSync(filename, "utf8"), filename);
}

function readDialogStyles(name: (typeof DIALOG_NAMES)[number]): string {
    return readFileSync(join(dialogDirectory, `${name}-dialog.css`), "utf8");
}
