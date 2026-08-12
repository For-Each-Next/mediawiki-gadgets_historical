/** Loads, validates, and formats package-owned legal notices. */

import { lstat, readFile, realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { hasText, requireContainedPath } from "../workspace/index.ts";
import type { PackageMetadata, ResolvedGadgetBuildConfig } from "./types.ts";

/** Loads the validated notices declared by one gadget package. */
export async function loadPackageNotices(
    packageRoot: string,
    metadata: PackageMetadata,
    config: ResolvedGadgetBuildConfig,
): Promise<string[]> {
    const paths = requireNoticeFilePaths(config.noticeFiles);
    const root = resolve(packageRoot);
    const realRoot = await realpath(root);
    const notices = await Promise.all(
        paths.map((path) => loadNoticeFile(root, realRoot, path)),
    );
    validateLicenseNotice(metadata, paths, notices);
    return notices;
}

/** Validates and narrows the configured notice-file list. */
function requireNoticeFilePaths(paths: unknown): string[] {
    if (!Array.isArray(paths)) {
        throw new TypeError("gadgetBuild.noticeFiles must be an array.");
    }
    if (!paths.every(hasText)) {
        throw new TypeError(
            "gadgetBuild.noticeFiles entries must be strings.",
        );
    }
    return paths;
}

/** Loads one package-owned, JavaScript-safe notice. */
async function loadNoticeFile(
    root: string,
    realRoot: string,
    path: string,
): Promise<string> {
    const noticePath = requireNoticePath(root, resolve(root, path));
    const entry = await lstat(noticePath);
    if (!entry.isFile() || entry.isSymbolicLink()) {
        throw new Error("gadgetBuild.noticeFiles must be real files.");
    }
    requireNoticePath(realRoot, await realpath(noticePath));
    const notice = (await readFile(noticePath, "utf8")).trim();
    if (notice === "" || notice.includes("*/")) {
        throw new Error(
            `${path} must contain a nonempty JavaScript-safe notice.`,
        );
    }
    return notice;
}

/** Requires a notice path to remain inside its package. */
function requireNoticePath(root: string, path: string): string {
    try {
        return requireContainedPath(root, path);
    } catch {
        throw new Error(
            "gadgetBuild.noticeFiles must remain inside the package.",
        );
    }
}

/** Requires LICENSE to match package release metadata. */
function validateLicenseNotice(
    metadata: PackageMetadata,
    paths: string[],
    notices: string[],
): void {
    const licenseIndex = paths.indexOf("LICENSE");
    if (licenseIndex < 0) {
        throw new Error("gadgetBuild.noticeFiles must include LICENSE.");
    }
    const license = notices[licenseIndex]!;
    const scope = `Release-Scope: ${metadata.name}@${metadata.version}`;
    const identifier = `SPDX-License-Identifier: ${metadata.license}`;
    const lines = new Set(license.split(/\r?\n/u));
    if (!lines.has(scope) || !lines.has(identifier)) {
        throw new Error(
            "Package LICENSE must match its release scope and license.",
        );
    }
}

/**
 * Wraps package legal notices in ordinary JavaScript comments.
 *
 * @param notices - Complete notice texts.
 * @returns JavaScript comment blocks in declared order.
 */
export function formatLegalNotices(notices: readonly string[]): string {
    return notices.map((notice) => `/*\n${notice.trim()}\n*/`).join("\n\n");
}
