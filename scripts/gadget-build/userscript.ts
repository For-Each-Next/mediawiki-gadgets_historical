/**
 * Formats installable userscript metadata and bootstrap source.
 */

import { formatMetadata } from "./metadata.ts";
import {
    formatReadableJavaScript,
    stripJavaScriptComments,
} from "./readable-javascript.ts";
import type { PackageMetadata, UserscriptConfig } from "./types.ts";

/**
 * Adds userscript metadata and a MediaWiki-ready bootstrap.
 *
 * @param source - Bundled gadget source.
 * @param metadata - Package metadata.
 * @param config - Userscript configuration.
 * @returns Installable userscript source.
 */
export async function formatUserscript(
    source: string,
    metadata: PackageMetadata,
    config: UserscriptConfig = {},
): Promise<string> {
    const header = buildUserscriptHeader(metadata, config);
    const bootstrap = formatUserscriptBootstrap(
        stripJavaScriptComments(source),
    );
    return formatReadableJavaScript(`${header}\n\n${bootstrap}`);
}

/**
 * Builds a userscript metadata header.
 *
 * @param metadata - Package metadata.
 * @param config - Userscript configuration.
 * @returns Userscript metadata header.
 */
function buildUserscriptHeader(
    metadata: PackageMetadata,
    config: UserscriptConfig,
): string {
    const matches = buildMetadataList("match", config.match ?? []);
    const grants = buildMetadataList("grant", config.grant ?? ["none"]);
    return [
        "// ==UserScript==",
        ...buildCoreMetadata(metadata, config),
        ...matches,
        ...grants,
        "// ==/UserScript==",
    ].join("\n");
}

/**
 * Builds single-value userscript metadata.
 *
 * @param metadata - Package metadata.
 * @param config - Userscript configuration.
 * @returns Core metadata lines.
 */
function buildCoreMetadata(
    metadata: PackageMetadata,
    config: UserscriptConfig,
): string[] {
    return [
        formatMetadata("name", config.name ?? metadata.name),
        formatMetadata(
            "namespace",
            config.namespace ??
                "https://github.com/For-Each-Next/mediawiki-gadgets",
        ),
        formatMetadata("version", metadata.version),
        formatMetadata("description", metadata.description),
        formatMetadata("author", metadata.author),
        formatMetadata("run-at", config.runAt ?? "document-idle"),
        formatMetadata("sandbox", config.sandbox ?? "raw"),
    ];
}

/**
 * Builds repeated userscript metadata lines.
 *
 * @param key - Metadata key.
 * @param values - Metadata values.
 * @returns Repeated metadata lines.
 */
function buildMetadataList(key: string, values: string[]): string[] {
    return values.map((value) => formatMetadata(key, value));
}

/**
 * Waits for MediaWiki before running the bundled gadget.
 *
 * @param source - Bundled gadget source.
 * @returns Userscript bootstrap source.
 */
function formatUserscriptBootstrap(source: string): string {
    return `(() => {
  function start() {
    if (
      window.mw?.config == null ||
      typeof window.mw?.loader?.using !== "function"
    ) {
      window.setTimeout(start, 50);
      return;
    }

    const mw = window.mw;

${source.trimEnd()}
  }

  start();
})();
`;
}
