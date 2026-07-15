/** Validates locale keys and placeholders against English catalogs. */

import { readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const SOURCE_ROOT = resolve("src");
const englishCatalogs = await findEnglishCatalogs(SOURCE_ROOT);
const errors = (
    await Promise.all(englishCatalogs.map(checkLocaleDirectory))
).flat();

if (errors.length > 0) {
    throw new Error(`Localization errors:\n${errors.join("\n")}`);
}

/** Finds English source catalogs below one directory. */
async function findEnglishCatalogs(directory: string): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const groups = await Promise.all(
        entries.map(async (entry) => {
            const path = resolve(directory, entry.name);
            if (entry.isDirectory()) {
                return findEnglishCatalogs(path);
            }
            return entry.name === "en.ts" && directory.endsWith("locales")
                ? [path]
                : [];
        }),
    );
    return groups.flat();
}

/** Checks every translated catalog beside one English catalog. */
async function checkLocaleDirectory(englishPath: string): Promise<string[]> {
    const directory = dirname(englishPath);
    const english = await importCatalog(englishPath);
    const entries = await readdir(directory, { withFileTypes: true });
    const localePaths = entries
        .filter(isTranslatedCatalog)
        .map((entry) => resolve(directory, entry.name));
    const errors = await Promise.all(
        localePaths.map((path) => compareCatalogs(english, path)),
    );
    return errors.flat();
}

/** Checks whether an entry is a translated locale catalog. */
function isTranslatedCatalog(entry): boolean {
    return (
        entry.isFile() &&
        entry.name.endsWith(".ts") &&
        !["en.ts", "index.ts"].includes(entry.name)
    );
}

/** Compares one translated catalog to its English source. */
async function compareCatalogs(english, localePath): Promise<string[]> {
    const locale = await importCatalog(localePath);
    const localeName = localePath.split("/").at(-1);
    const errors = compareKeys(english, locale, localeName);
    for (const id of Object.keys(english)) {
        if (locale[id] == null) {
            continue;
        }
        const expected = readPlaceholders(english[id]);
        const actual = readPlaceholders(locale[id]);
        if (expected.join() !== actual.join()) {
            errors.push(`${localeName}: ${id} placeholders differ`);
        }
    }
    return errors;
}

/** Compares message IDs between source and translated catalogs. */
function compareKeys(english, locale, localeName): string[] {
    const expected = Object.keys(english);
    const actual = new Set(Object.keys(locale));
    const missing = expected.filter((id) => !actual.has(id));
    const extra = [...actual].filter((id) => !Object.hasOwn(english, id));
    return [
        ...missing.map((id) => `${localeName}: missing ${id}`),
        ...extra.map((id) => `${localeName}: unknown ${id}`),
    ];
}

/** Imports a TypeScript locale module's default catalog. */
async function importCatalog(path: string): Promise<Record<string, string>> {
    return (await import(pathToFileURL(path).href)).default;
}

/** Reads unique named placeholders in deterministic order. */
function readPlaceholders(message: string): string[] {
    const matches = message.matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/gu);
    return [...new Set(Array.from(matches, (match) => match[1]))].sort();
}
