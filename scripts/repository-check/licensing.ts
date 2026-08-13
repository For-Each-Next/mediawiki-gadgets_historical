/** Validates current CC0 release scopes in workspace notices. */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { hasErrorCode, hasText } from "#workspace/metadata";
import type { GadgetPackage, PackageMetadata } from "#workspace/types";
import { usesSharedRuntime } from "./package-metadata.ts";

type NoticeName = "root" | "shared";

interface CurrentScope {
    token: string;
    version: string;
}

interface CurrentScopeMetadata extends PackageMetadata {
    name: string;
    version: string;
}

const NOTICE_PATHS: Record<NoticeName, string> = {
    root: "LICENSE",
    shared: "src/shared/LICENSE",
};
const NOTICE_SPDX_MARKERS: Record<NoticeName, string> = {
    root: "SPDX-License-Identifier: CC-BY-SA-4.0",
    shared: "SPDX-License-Identifier: CC0-1.0",
};

/** Checks current package coverage and exact notice scope sets. */
export async function checkLicensing(
    workspaceRoot: string,
    gadgets: GadgetPackage[],
): Promise<string[]> {
    const results = await Promise.all(
        Object.entries(NOTICE_PATHS).map(([notice, path]) =>
            checkNotice(
                workspaceRoot,
                notice as NoticeName,
                path,
                createExpectedScopes(gadgets, notice as NoticeName),
            ),
        ),
    );
    return results.flat();
}

/** Derives one notice's current CC0 scopes from package metadata. */
function createExpectedScopes(
    gadgets: GadgetPackage[],
    notice: NoticeName,
): Map<string, CurrentScope> {
    const scopes = new Map<string, CurrentScope>();
    for (const gadget of gadgets) {
        const { metadata } = gadget;
        if (!hasCurrentScopeMetadata(metadata)) {
            continue;
        }
        if (notice === "shared" && !usesSharedRuntime(gadget)) {
            continue;
        }
        const token = `${metadata.name}@${metadata.version}`;
        scopes.set(token, { token, version: metadata.version });
    }
    return scopes;
}

/** Checks whether metadata defines a current CC0 release scope. */
function hasCurrentScopeMetadata(
    metadata: PackageMetadata,
): metadata is CurrentScopeMetadata {
    return (
        metadata.license === "CC0-1.0" &&
        hasText(metadata.name) &&
        hasText(metadata.version)
    );
}

/** Checks one notice against its manifest-derived scope set. */
async function checkNotice(
    workspaceRoot: string,
    notice: NoticeName,
    path: string,
    expected: Map<string, CurrentScope>,
): Promise<string[]> {
    const content = await readNotice(workspaceRoot, path);
    if (content == null) {
        return [`workspace: missing licensing map ${path}.`];
    }
    const actual = extractNoticeScopes(content);
    return [
        ...checkNoticeLicenseIdentity(path, content, notice),
        ...compareScopeSets(path, expected, actual),
        ...checkDisplayedVersions(path, content, expected),
    ];
}

/** Requires the SPDX identity owned by each workspace notice. */
function checkNoticeLicenseIdentity(
    path: string,
    content: string,
    notice: NoticeName,
): string[] {
    const marker = NOTICE_SPDX_MARKERS[notice];
    return content.includes(marker)
        ? []
        : [`${path}: missing required ${marker}.`];
}

/** Extracts exact package-version tokens from canonical notice rows. */
function extractNoticeScopes(content: string): string[] {
    return [...content.matchAll(/\(`([^`]+@[^`]+)`\)/gu)].map(
        (match) => match[1]!,
    );
}

/** Reports missing, stale, and duplicate current-scope values. */
function compareScopeSets(
    path: string,
    expected: Map<string, CurrentScope>,
    actualScopes: string[],
): string[] {
    const actual = new Set(actualScopes);
    const duplicateScopes = actualScopes.filter(
        (scope, index) => actualScopes.indexOf(scope) !== index,
    );
    return [
        ...[...expected.keys()]
            .filter((scope) => !actual.has(scope))
            .map((scope) => `${path}: missing current CC0 scope ${scope}.`),
        ...[...actual]
            .filter((scope) => !expected.has(scope))
            .map(
                (scope) => `${path}: stale or non-current CC0 scope ${scope}.`,
            ),
        ...[...new Set(duplicateScopes)].map(
            (scope) => `${path}: duplicate scope ${scope}.`,
        ),
    ];
}

/** Requires each displayed version to match its manifest. */
function checkDisplayedVersions(
    path: string,
    content: string,
    expected: Map<string, CurrentScope>,
): string[] {
    return [...expected.values()].flatMap(({ token, version }) => {
        if (!content.includes(`(\`${token}\`)`)) {
            return [];
        }
        return content.includes(` ${version} (\`${token}\`)`)
            ? []
            : [`${path}: scope ${token} must display version ${version}.`];
    });
}

/** Reads one required workspace licensing notice. */
async function readNotice(
    workspaceRoot: string,
    path: string,
): Promise<string | null> {
    try {
        return await readFile(join(workspaceRoot, path), "utf8");
    } catch (error) {
        if (hasErrorCode(error, "ENOENT")) {
            return null;
        }
        throw error;
    }
}

/** Preserves the compatibility name for the licensing check. */
export async function checkCurrentLicenseMaps(
    workspaceRoot: string,
    gadgets: GadgetPackage[],
): Promise<string[]> {
    return checkLicensing(workspaceRoot, gadgets);
}
