/** Validates each package-local release notice. */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
    hasErrorCode,
    hasText,
    type GadgetPackage,
} from "../workspace/index.ts";
import { checkPackageCondition as check } from "./problem.ts";

/** Checks a package notice against its manifest identity. */
export async function checkPackageLicense(
    gadget: GadgetPackage,
): Promise<string[]> {
    const license = await readOptionalLicense(gadget.directory);
    if (license == null) {
        return [];
    }
    const { directoryName: name, metadata } = gadget;
    const lines = new Set(license.split(/\r?\n/u));
    const problems: string[] = [];
    check(
        !hasText(metadata.name) ||
            !hasText(metadata.version) ||
            lines.has(`Release-Scope: ${metadata.name}@${metadata.version}`),
        problems,
        name,
        "LICENSE must identify the current release scope.",
    );
    check(
        !hasText(metadata.license) ||
            lines.has(`SPDX-License-Identifier: ${metadata.license}`),
        problems,
        name,
        "LICENSE must identify the package.json license.",
    );
    return problems;
}

/** Reads a notice when the structure check found one. */
async function readOptionalLicense(directory: string): Promise<string | null> {
    try {
        return await readFile(join(directory, "LICENSE"), "utf8");
    } catch (error) {
        if (hasErrorCode(error, "ENOENT")) {
            return null;
        }
        throw error;
    }
}
