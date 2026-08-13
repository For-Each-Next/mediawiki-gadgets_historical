/** Rejects compiler output beside authored Node TypeScript. */

import { extname, resolve } from "node:path";
import { inspectAuthoredTree } from "#workspace/files";
import { formatWorkspacePath } from "#workspace/paths";

const TOOLING_ROOTS = ["config", "scripts", "tests"];

/** Finds emitted JavaScript in authored tooling trees. */
export async function checkToolingOutputs(
    workspaceRoot: string,
): Promise<string[]> {
    const results = await Promise.all(
        TOOLING_ROOTS.map(async (directory) => {
            const root = resolve(workspaceRoot, directory);
            const tree = await inspectAuthoredTree(root, {
                extensions: new Set([".js", ".map"]),
            });
            return tree.files.filter(isEmittedJavaScript);
        }),
    );
    return results.flat().map((path) => {
        const localPath = formatWorkspacePath(workspaceRoot, path);
        return (
            `${localPath}: remove emitted JavaScript from the ` +
            "authored TypeScript tree."
        );
    });
}

/** Checks one emitted JavaScript or JavaScript source-map path. */
function isEmittedJavaScript(path: string): boolean {
    return extname(path) === ".js" || path.endsWith(".js.map");
}
