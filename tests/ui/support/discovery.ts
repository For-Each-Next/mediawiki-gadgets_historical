/** Workspace-driven dialog test discovery. */

import { readdir } from "node:fs/promises";
import { join } from "node:path";

// noinspection ES6PreferShortImport -- Node ESM requires index.ts.
import type { GadgetPackage } from "../../../scripts/workspace/index.ts";

export async function collectDialogFiles(
    gadgets: GadgetPackage[],
): Promise<string[]> {
    const groups = await Promise.all(gadgets.map(collectPackageDialogFiles));
    return groups.flat();
}

async function collectPackageDialogFiles(
    gadget: GadgetPackage,
): Promise<string[]> {
    const directory = join(gadget.directory, "ui/dialogs");
    const entries = await readdir(directory, { withFileTypes: true });
    return entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".vue"))
        .map((entry) => join(directory, entry.name));
}
