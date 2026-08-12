/** Creates and cleans temporary project-level test repositories. */

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TestContext } from "node:test";

/** Creates one temporary workspace and registers recursive cleanup. */
export async function createTemporaryWorkspace(
    context: TestContext,
    prefix: string,
): Promise<string> {
    const workspaceRoot = await mkdtemp(join(tmpdir(), prefix));
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    return workspaceRoot;
}
