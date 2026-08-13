/** Builds browser stories through the production gadget bundler. */

import { resolve } from "node:path";

// eslint-disable-next-line max-len
import { loadGadgetBuildPlan } from "../../../scripts/gadget-build/build-plan.ts";
import { bundleSource } from "../../../scripts/gadget-build/bundle.ts";
import type { UiGadget } from "../browser/registry.ts";

const cache = new Map<string, Promise<string>>();

export function buildStoryBundle(
    workspaceRoot: string,
    gadget: UiGadget,
): Promise<string> {
    const key = `${workspaceRoot}:${gadget}`;
    let pending = cache.get(key);
    if (pending == null) {
        pending = createStoryBundle(workspaceRoot, gadget);
        cache.set(key, pending);
    }
    return pending;
}

async function createStoryBundle(
    workspaceRoot: string,
    gadget: UiGadget,
): Promise<string> {
    const packageRoot = resolve(workspaceRoot, "src", gadget);
    const plan = await loadGadgetBuildPlan(
        packageRoot,
        new Date("2026-08-13T00:00:00.000Z"),
    );
    const entryPoint = resolve(
        workspaceRoot,
        "tests/ui/browser",
        `${gadget}.ts`,
    );
    return bundleSource(
        {
            ...plan,
            config: { ...plan.config, entryPoint },
        },
        { minifyText: true },
    );
}
