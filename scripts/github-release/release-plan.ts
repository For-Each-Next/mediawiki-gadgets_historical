/** Creates one validated plan for a tag-driven GitHub release. */

import { readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { createGadgetArtifactFilenames } from "#gadget-build/artifact-names";
import { resolveBuildConfig } from "#gadget-build/build-config";
import { validatePackageMetadata } from "#gadget-build/package-metadata";
import { hasErrorCode } from "#workspace/metadata";
import { discoverGadgetPackages } from "#workspace/packages";
import { toPosixPath } from "#workspace/paths";
import type { GadgetPackage } from "#workspace/types";

const PACKAGE_NAME_SOURCE = "[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?";
const VERSION_NUMBER_SOURCE = "(?:0|[1-9]\\d*)";
const FORMAL_RELEASE_TAG_PATTERN = new RegExp(
    `^(${PACKAGE_NAME_SOURCE})@` +
        `(${VERSION_NUMBER_SOURCE}\\.${VERSION_NUMBER_SOURCE}\\.` +
        `${VERSION_NUMBER_SOURCE})$`,
    "u",
);
const CHANGELOG_HEADING_PATTERN =
    /^### (\S+) \(\d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC\)$/u;

export interface GitHubReleasePlan {
    artifactFilename: string;
    artifactPath: string;
    packageName: string;
    releaseNotes: string;
    releaseTag: string;
    version: string;
}

interface ParsedReleaseTag {
    packageName: string;
    version: string;
}

interface ReleaseArtifact {
    filename: string;
    path: string;
}

/** Resolves a formal tag to its artifact and changelog notes. */
export async function createGitHubReleasePlan(
    workspaceRoot: string,
    releaseTag: string,
): Promise<GitHubReleasePlan> {
    const root = resolve(workspaceRoot);
    const parsedTag = parseReleaseTag(releaseTag);
    const gadgets = await discoverGadgetPackages(root);
    const gadget = requireTaggedGadget(gadgets, parsedTag.packageName);
    const metadata = validatePackageMetadata(
        gadget.directory,
        gadget.metadata,
    );
    requireMatchingVersion(metadata.version, parsedTag);
    const config = resolveBuildConfig(metadata);
    const artifact = resolveReleaseArtifact(root, gadget, config);
    const changelog = await readChangelog(gadget);
    return {
        artifactFilename: artifact.filename,
        artifactPath: artifact.path,
        packageName: parsedTag.packageName,
        releaseNotes: extractActiveReleaseNotes(changelog, parsedTag.version),
        releaseTag,
        version: parsedTag.version,
    };
}

/** Accepts an unscoped package name and a formal semantic version. */
export function parseReleaseTag(releaseTag: string): ParsedReleaseTag {
    const match = FORMAL_RELEASE_TAG_PATTERN.exec(releaseTag);
    if (match == null) {
        throw new Error(
            "Release tag must use <package>@<major>.<minor>.<patch>.",
        );
    }
    return { packageName: match[1], version: match[2] };
}

/** Returns the active entry body without its version heading. */
export function extractActiveReleaseNotes(
    changelog: string,
    expectedVersion: string,
): string {
    const normalized = changelog.replaceAll("\r\n", "\n");
    const heading = /^### .+$/mu.exec(normalized);
    if (heading == null) {
        throw new Error("CHANGELOG.md must contain an active release entry.");
    }
    const parsedHeading = CHANGELOG_HEADING_PATTERN.exec(heading[0]);
    if (parsedHeading == null) {
        throw new Error("CHANGELOG.md active release heading is malformed.");
    }
    if (parsedHeading[1] !== expectedVersion) {
        throw new Error(
            "CHANGELOG.md active release version must match the release tag.",
        );
    }
    const afterHeading = normalized
        .slice(heading.index + heading[0].length)
        .replace(/^\n+/u, "");
    const boundary = /^#{2,3} /mu.exec(afterHeading);
    const notes = afterHeading.slice(0, boundary?.index).trim();
    if (notes === "") {
        throw new Error(
            "CHANGELOG.md active release entry must not be empty.",
        );
    }
    return notes;
}

/** Locates the tagged package without a maintained gadget allowlist. */
function requireTaggedGadget(
    gadgets: GadgetPackage[],
    packageName: string,
): GadgetPackage {
    const gadget = gadgets.find(
        (candidate) =>
            candidate.directoryName === packageName ||
            candidate.metadata.name === packageName,
    );
    if (gadget == null) {
        throw new Error(
            `Release package "${packageName}" is not a discovered ` +
                "gadgetBuild package.",
        );
    }
    return gadget;
}

/** Requires the tag and package manifest to identify one release. */
function requireMatchingVersion(
    manifestVersion: string,
    parsedTag: ParsedReleaseTag,
): void {
    if (manifestVersion === parsedTag.version) {
        return;
    }
    throw new Error(
        `Release tag version ${parsedTag.version} must match ` +
            `${parsedTag.packageName} package.json version ` +
            `${manifestVersion}.`,
    );
}

/** Resolves the minified artifact under the shared output root. */
function resolveReleaseArtifact(
    workspaceRoot: string,
    gadget: GadgetPackage,
    config: ReturnType<typeof resolveBuildConfig>,
): ReleaseArtifact {
    const outputRoot = resolve(gadget.directory, config.outputDirectory);
    const expectedRoot = resolve(workspaceRoot, "dist");
    if (outputRoot !== expectedRoot) {
        throw new Error(
            `${gadget.directoryName} must publish from the shared dist ` +
                "directory.",
        );
    }
    const filename = createGadgetArtifactFilenames(config.outputName).minified;
    return {
        filename,
        path: toPosixPath(relative(workspaceRoot, join(outputRoot, filename))),
    };
}

/** Reads the tagged package's durable release record. */
async function readChangelog(gadget: GadgetPackage): Promise<string> {
    try {
        return await readFile(join(gadget.directory, "CHANGELOG.md"), "utf8");
    } catch (error) {
        if (hasErrorCode(error, "ENOENT")) {
            throw new Error(
                `${gadget.directoryName} must contain CHANGELOG.md.`,
            );
        }
        throw error;
    }
}
