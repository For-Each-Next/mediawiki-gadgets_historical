/**
 * Generates the shared English language-name to ISO code table.
 *
 * With no arguments, it downloads SIL's current code set.
 * For an audited local snapshot, run:
 *
 * npm run update:language-codes -w @mediawiki-gadgets/shared --
 * <iso-639-3.tab> "<snapshot provenance>"
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CODE_SET_URL =
    "https://iso639-3.sil.org/sites/iso639-3/files/downloads/" +
    "iso-639-3.tab";
const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(
    SCRIPT_DIRECTORY,
    "../src/shared/language-code-data.ts",
);

interface LanguageRecord {
    code: string;
    name: string;
}

/**
 * Reads local snapshots when supplied or downloads the official tables.
 */
async function readSource(
    enteredPath: string | undefined,
    url: string,
): Promise<string> {
    if (enteredPath != null) {
        return readFile(resolve(enteredPath), "utf8");
    }
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Unable to download ${url}: ${response.status}.`);
    }
    return response.text();
}

/**
 * Extracts English reference names and preferred codes.
 */
function parseLanguageNames(source: string): LanguageRecord[] {
    const records = new Map<string, LanguageRecord>();
    for (const line of source.trim().split("\n").slice(1)) {
        const fields = line.replace(/\r$/u, "").split("\t");
        const id = fields[0];
        const part1 = fields[3];
        const referenceName = fields[6];
        if (id === "" || referenceName === "") {
            continue;
        }
        const code = part1 || id;
        const name = referenceName.toLocaleLowerCase("en-US");
        const current = records.get(name);
        if (current != null && current.code !== code) {
            throw new Error(`Ambiguous ISO 639 name: ${referenceName}.`);
        }
        records.set(name, { code, name });
    }
    return [...records.values()].sort(compareLanguageRecords);
}

/** Sorts generated rows by normalized English name. */
function compareLanguageRecords(
    left: LanguageRecord,
    right: LanguageRecord,
): number {
    if (left.name < right.name) {
        return -1;
    }
    return left.name > right.name ? 1 : 0;
}

/** Serializes the transformed lookup with source attribution. */
function serializeLanguageNames(
    records: LanguageRecord[],
    snapshot: string,
): string {
    const rows = records.map((record) => `${record.code}\t${record.name}`);
    return [
        "/**",
        " * Generated English ISO 639 reference-name lookup.",
        " *",
        " * SIL International is the source of these identifiers and names.",
        " * Registry and code-table terms:",
        " * https://iso639-3.sil.org/code_tables/download_tables",
        ` * Snapshot: ${snapshot}.`,
        " *",
        " * This is a transformed runtime lookup, not a downloadable copy of",
        " * the registry table. Do not edit it manually.",
        " */",
        "",
        "export const ISO_639_LANGUAGE_NAME_ROWS = `",
        ...rows,
        "`;",
        "",
    ].join("\n");
}

/** Resolves an explicit local or dated official snapshot label. */
function getSnapshotLabel(enteredPath: string | undefined): string {
    const enteredLabel = process.argv[3]?.trim();
    if (enteredLabel != null && enteredLabel !== "") {
        return enteredLabel;
    }
    if (enteredPath != null) {
        throw new Error(
            "A snapshot label is required after a local table path.",
        );
    }
    return `official table retrieved ${new Date().toISOString().slice(0, 10)}`;
}

/** Generates the checked-in shared lookup table. */
async function main(): Promise<void> {
    const enteredPath = process.argv[2];
    const codeSet = await readSource(enteredPath, CODE_SET_URL);
    const snapshot = getSnapshotLabel(enteredPath);
    const records = parseLanguageNames(codeSet);
    await writeFile(
        OUTPUT_PATH,
        serializeLanguageNames(records, snapshot),
        "utf8",
    );
    console.log(`Wrote ${records.length} language names to ${OUTPUT_PATH}.`);
}

await main();
