/** Validates each package-local release notice. */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { hasErrorCode, hasText } from "#workspace/metadata";
import type { GadgetPackage } from "#workspace/types";
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
    const sourceLines = license.split(/\r?\n/u);
    const lines = new Set(sourceLines);
    const releaseScopes = sourceLines.filter((line) =>
        /^\s*Release-Scope:/u.test(line),
    );
    const problems: string[] = [];
    check(
        !hasText(metadata.name) ||
            !hasText(metadata.version) ||
            (releaseScopes.length === 1 &&
                releaseScopes[0] ===
                    `Release-Scope: ${metadata.name}@${metadata.version}`),
        problems,
        name,
        "LICENSE must identify exactly one current release scope.",
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
