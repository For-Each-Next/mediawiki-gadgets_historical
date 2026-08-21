/** Writes the files consumed by a GitHub Actions release workflow. */

import { appendFile, writeFile } from "node:fs/promises";
import type { GitHubReleasePlan } from "./release-plan.ts";

/** Writes release notes and appends safe scalar step outputs. */
export async function writeGitHubReleasePayload(
    plan: GitHubReleasePlan,
    releaseNotesPath: string,
    githubOutputPath: string,
): Promise<void> {
    const output = [
        formatGitHubOutput("package-name", plan.packageName),
        formatGitHubOutput("artifact-filename", plan.artifactFilename),
        formatGitHubOutput("artifact-path", plan.artifactPath),
    ].join("");
    await writeFile(releaseNotesPath, `${plan.releaseNotes}\n`, "utf8");
    await appendFile(githubOutputPath, output, "utf8");
}

/** Formats one generated single-line value for GITHUB_OUTPUT. */
function formatGitHubOutput(name: string, value: string): string {
    if (/[\r\n]/u.test(value)) {
        throw new Error(`GitHub output ${name} must fit on one line.`);
    }
    return `${name}=${value}\n`;
}
