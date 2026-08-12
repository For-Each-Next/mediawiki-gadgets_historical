/**
 * Reads JSON package metadata for repository tools.
 */

import { readFile } from "node:fs/promises";
import type { PackageMetadata } from "./types.ts";

/** Reads and parses one package manifest. */
export async function readPackageMetadata(
    manifestPath: string,
): Promise<PackageMetadata> {
    const source = await readFile(manifestPath, "utf8");
    const value: unknown = JSON.parse(source);
    if (!isRecord(value)) {
        throw new TypeError("package.json must contain an object.");
    }
    return value as PackageMetadata;
}

/** Checks whether an unknown value is a non-array object. */
export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value != null && !Array.isArray(value);
}

/** Checks whether a value contains non-whitespace text. */
export function hasText(value: unknown): value is string {
    return typeof value === "string" && value.trim() !== "";
}

/** Checks an unknown exception for a Node error code. */
export function hasErrorCode(error: unknown, code: string): boolean {
    return (
        typeof error === "object" &&
        error != null &&
        "code" in error &&
        error.code === code
    );
}
