/** Prepares a tag-driven GitHub release for the workflow runner. */

import { writeGitHubReleasePayload } from "./output.ts";
import { createGitHubReleasePlan } from "./release-plan.ts";

const releaseTag = requireEnvironment("RELEASE_TAG");
const releaseNotesPath = requireEnvironment("RELEASE_NOTES_PATH");
const githubOutputPath = requireEnvironment("GITHUB_OUTPUT");
const plan = await createGitHubReleasePlan(process.cwd(), releaseTag);

await writeGitHubReleasePayload(plan, releaseNotesPath, githubOutputPath);
console.log(`Prepared GitHub release ${plan.releaseTag}.`);

/** Requires one nonempty workflow-provided environment value. */
function requireEnvironment(name: string): string {
    const value = process.env[name];
    if (value == null || value === "") {
        throw new Error(`${name} must be defined.`);
    }
    return value;
}
