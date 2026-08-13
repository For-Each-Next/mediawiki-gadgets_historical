/** Captures review-only screenshots without committed goldens. */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
    cp,
    mkdir,
    mkdtemp,
    readdir,
    readFile,
    rm,
    symlink,
    writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { chromium } from "@playwright/test";

import { UI_LOCALES, UI_STORIES, UI_VIEWPORTS } from "./browser/registry.ts";
import { loadStoryPage, mountStory, WORKSPACE_ROOT } from "./support/page.ts";

const phase = process.argv[2];
if (phase !== "before" && phase !== "after" && phase !== "report") {
    throw new Error("Usage: npm run ui:capture -- before|after|report");
}

async function capturePhase(value: "after" | "before"): Promise<void> {
    const sourceRoot =
        value === "before" ? await prepareBaseline() : WORKSPACE_ROOT;
    const output = resolve(WORKSPACE_ROOT, ".cache/ui-visual", value);
    await rm(output, { force: true, recursive: true });
    await mkdir(output, { recursive: true });
    const browser = await chromium.launch();
    try {
        for (const locale of UI_LOCALES) {
            for (const [name, viewport] of Object.entries(UI_VIEWPORTS)) {
                for (const story of UI_STORIES) {
                    const page = await browser.newPage({ viewport });
                    await loadStoryPage(
                        page,
                        story.gadget,
                        locale,
                        sourceRoot,
                    );
                    await mountStory(page, story.id);
                    const filename = `${locale}--${name}--${story.id}.png`;
                    await page.screenshot({ path: join(output, filename) });
                    await page.close();
                }
            }
        }
    } finally {
        await browser.close();
        if (sourceRoot !== WORKSPACE_ROOT) {
            await rm(sourceRoot, { force: true, recursive: true });
        }
    }
}

async function prepareBaseline(): Promise<string> {
    const directory = await mkdtemp(join(tmpdir(), "gadget-ui-before-"));
    const archive = execFileSync("git", ["archive", "HEAD"], {
        cwd: WORKSPACE_ROOT,
        maxBuffer: 128 * 1024 * 1024,
    });
    execFileSync("tar", ["-x", "-C", directory], { input: archive });
    await cp(
        resolve(WORKSPACE_ROOT, "tests/ui"),
        resolve(directory, "tests/ui"),
        { recursive: true },
    );
    await symlink(
        resolve(WORKSPACE_ROOT, "node_modules"),
        resolve(directory, "node_modules"),
    );
    await patchBaselineCitation(directory);
    await cp(
        resolve(WORKSPACE_ROOT, "src/vg-stub-creator/ui/codex.ts"),
        resolve(directory, "src/vg-stub-creator/ui/codex.ts"),
    );
    return directory;
}

async function patchBaselineCitation(root: string): Promise<void> {
    const path = resolve(root, "src/citation-formatter/ui/source-manager.ts");
    const source = await readFile(path, "utf8");
    const patched = source.replace(
        "function createSourceManagerComponent(",
        "export function createSourceManagerComponent(",
    );
    await writeFile(path, patched);
}

async function writeReport(): Promise<void> {
    const root = resolve(WORKSPACE_ROOT, ".cache/ui-visual");
    const report = resolve(root, "report");
    await mkdir(report, { recursive: true });
    const before = await listPngs(resolve(root, "before"));
    const after = await listPngs(resolve(root, "after"));
    const missingBefore = after.filter((file) => !before.includes(file));
    const missingAfter = before.filter((file) => !after.includes(file));
    const matches = before.filter((file) => after.includes(file));
    const pairs = await Promise.all(
        matches.map(createComparison.bind(null, root)),
    );
    const changed = pairs.filter((pair) => pair.changed).length;
    const summary = [
        "# Gadget dialog visual review",
        "",
        `Before captures: ${before.length}`,
        `After captures: ${after.length}`,
        `Missing before: ${missingBefore.length}`,
        `Missing after: ${missingAfter.length}`,
        `Changed: ${changed}`,
        `Identical: ${pairs.length - changed}`,
        "",
        "Open `index.html` for side-by-side and adjustable overlay review.",
        "The committed Playwright gate checks geometry and semantics; these",
        "images are local review artifacts and are intentionally ignored.",
        "",
    ].join("\n");
    await Promise.all([
        writeFile(resolve(report, "README.md"), summary),
        writeFile(resolve(report, "index.html"), createReportHtml(pairs)),
    ]);
}

async function listPngs(directory: string): Promise<string[]> {
    try {
        const entries = await readdir(directory);
        return entries.filter((entry) => entry.endsWith(".png")).sort();
    } catch {
        return [];
    }
}

interface ImageComparison {
    changed: boolean;
    file: string;
}

async function createComparison(
    root: string,
    file: string,
): Promise<ImageComparison> {
    const [before, after] = await Promise.all([
        hashFile(resolve(root, "before", file)),
        hashFile(resolve(root, "after", file)),
    ]);
    return { changed: before !== after, file };
}

async function hashFile(path: string): Promise<string> {
    const content = await readFile(path);
    return createHash("sha256").update(content).digest("hex");
}

function createReportHtml(pairs: ImageComparison[]): string {
    const changed = pairs.filter((pair) => pair.changed).length;
    return [
        "<!doctype html>",
        '<html lang="en"><head><meta charset="utf-8">',
        "<title>Gadget dialog visual review</title>",
        `<style>${REPORT_STYLES}</style></head><body>`,
        "<header><h1>Gadget dialog visual review</h1>",
        `<p>${changed} changed; ${pairs.length - changed} identical.</p>`,
        '<label>Overlay opacity <input id="opacity" type="range" ',
        'min="0" max="1" step="0.05" value="0.5"></label></header>',
        `<main>${pairs.map(createComparisonCard).join("\n")}</main>`,
        `<script>${REPORT_SCRIPT}</script></body></html>`,
    ].join("");
}

function createComparisonCard(pair: ImageComparison): string {
    const file = encodeURIComponent(pair.file);
    const state = pair.changed ? "changed" : "identical";
    return [
        `<article class="${state}"><h2>${escapeHtml(pair.file)}</h2>`,
        `<span class="badge">${state}</span><div class="pair">`,
        `<figure><figcaption>Before</figcaption>`,
        `<img alt="Before capture of ${escapeHtml(pair.file)}" ` +
            `loading="lazy" src="../before/${file}"></figure>`,
        `<figure><figcaption>After</figcaption>`,
        `<img alt="After capture of ${escapeHtml(pair.file)}" ` +
            `loading="lazy" src="../after/${file}"></figure></div>`,
        '<details><summary>Overlay</summary><div class="overlay">',
        `<img alt="" loading="lazy" src="../before/${file}">`,
        `<img alt="" class="after" loading="lazy" ` +
            `src="../after/${file}">`,
        "</div></details></article>",
    ].join("");
}

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/gu, function replace(character) {
        const entities: Record<string, string> = {
            '"': "&quot;",
            "&": "&amp;",
            "'": "&#39;",
            "<": "&lt;",
            ">": "&gt;",
        };
        return entities[character] ?? character;
    });
}

const REPORT_STYLES = `
:root { color-scheme: light; font-family: sans-serif; --opacity: .5; }
body { margin: 0; background: #f8f9fa; color: #202122; }
header { position: sticky; top: 0; z-index: 2; padding: 1rem 2rem;
    background: #fff; border-bottom: 1px solid #a2a9b1; }
header h1, header p { display: inline-block; margin: 0 1rem 0 0; }
main { display: grid; gap: 1rem; padding: 1rem; }
article { position: relative; padding: 1rem; background: #fff;
    border: 1px solid #a2a9b1; border-radius: 2px; }
article h2 { margin: 0 7rem 1rem 0; font-size: 1rem; overflow-wrap: anywhere; }
.badge { position: absolute; top: 1rem; right: 1rem; padding: .2rem .5rem;
    border-radius: 1rem; background: #eaecf0; }
.changed .badge { background: #fef6e7; color: #6d4b00; }
.pair { display: grid; gap: 1rem;
    grid-template-columns: repeat(2, minmax(0, 1fr)); }
figure { margin: 0; min-width: 0; } figcaption { font-weight: 700; }
img { display: block; max-width: 100%; border: 1px solid #c8ccd1; }
details { margin-top: 1rem; } summary { cursor: pointer; font-weight: 700; }
.overlay { display: grid; margin-top: .5rem; }
.overlay img { grid-area: 1 / 1; }
.overlay .after { opacity: var(--opacity); }
@media (max-width: 700px) { .pair { grid-template-columns: 1fr; } }
`;

const REPORT_SCRIPT = `
const control = document.querySelector('#opacity');
control.addEventListener('input', () => {
    document.documentElement.style.setProperty('--opacity', control.value);
});
`;

if (phase === "report") {
    await writeReport();
} else {
    await capturePhase(phase);
}
