/** Loads and validates metadata used by the gadget builder. */

import { basename, resolve } from "node:path";
import { hasText, isRecord, readPackageMetadata } from "../workspace/index.ts";
import { isSupportedPackageLicense } from "./metadata-validation.ts";
import type { PackageMetadata } from "./types.ts";

/** Loads one package manifest as validated gadget metadata. */
export async function loadPackageMetadata(
    packageRoot: string,
): Promise<PackageMetadata> {
    const metadata = await readPackageMetadata(
        resolve(packageRoot, "package.json"),
    );
    return validatePackageMetadata(packageRoot, metadata);
}

/** Validates metadata already read by workspace discovery. */
export function validatePackageMetadata(
    packageRoot: string,
    value: unknown,
): PackageMetadata {
    const metadata = parsePackageMetadata(value);
    if (metadata.name !== basename(resolve(packageRoot))) {
        throw new Error(
            "package.json name must match its package directory before build.",
        );
    }
    return metadata;
}

/** Narrows the package fields incorporated into generated artifacts. */
function parsePackageMetadata(value: unknown): PackageMetadata {
    if (!isRecord(value)) {
        throw new TypeError("package.json must contain an object.");
    }
    for (const field of requiredTextFields) {
        validateTextField(value, field);
    }
    if (!isSupportedPackageLicense(value.license)) {
        throw new TypeError(
            "package.json license must use a supported SPDX identifier.",
        );
    }
    if (!isRecord(value.gadgetBuild)) {
        throw new TypeError(
            "package.json must define gadgetBuild configuration.",
        );
    }
    return value as unknown as PackageMetadata;
}

const requiredTextFields = [
    "author",
    "description",
    "license",
    "name",
    "version",
] as const;

/** Validates one artifact-facing package text field. */
function validateTextField(
    metadata: Record<string, unknown>,
    field: (typeof requiredTextFields)[number],
): void {
    const value = metadata[field];
    if (!hasText(value)) {
        throw new TypeError(`package.json ${field} must be a string.`);
    }
    if (/[\r\n\u2028\u2029]/u.test(value)) {
        throw new TypeError(`package.json ${field} must fit on one line.`);
    }
    if (value.includes("*/")) {
        throw new TypeError(
            `package.json ${field} must be JavaScript-comment-safe.`,
        );
    }
}
