/**
 * Formats installable userscript metadata and bootstrap source.
 */

import { formatMetadata } from "./metadata.ts";
import {
    formatReadableJavaScript,
    stripJavaScriptComments,
} from "./readable-javascript.ts";
import type {
    UserscriptConfig,
    UserscriptMetadata,
    UserscriptProgram,
} from "./types.ts";

const ALL_USERSCRIPT_RUNTIME = `  function matchesUrl(url, patterns) {
    const path = \`\${url.pathname}\${url.search}\`;
    return patterns.some(([protocol, hostname, pathname]) =>
      protocol.test(url.protocol) &&
      hostname.test(url.hostname) &&
      pathname.test(path)
    );
  }

  function startProgram(program, mw) {
    try {
      const startGadget = program.start;
      startGadget(mw);
    } catch (error) {
      window.console?.error(
        "Failed to start " + program.name + ".",
        error
      );
    }
  }

  function start() {
    if (
      window.mw?.config == null ||
      typeof window.mw?.loader?.using !== "function"
    ) {
      window.setTimeout(start, 50);
      return;
    }

    const mw = window.mw;
    const url = new window.URL(window.location.href);

    for (const program of allGadgetPrograms) {
      if (matchesUrl(url, program.matches)) {
        startProgram(program, mw);
      }
    }
  }
`;

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
    metadata: UserscriptMetadata,
    config: UserscriptConfig = {},
): Promise<string> {
    const header = buildUserscriptHeader(metadata, config);
    const bootstrap = formatUserscriptBootstrap(
        stripJavaScriptComments(source),
    );
    return formatReadableJavaScript(`${header}\n\n${bootstrap}`);
}

/**
 * Adds one userscript header and scoped startup for several gadgets.
 *
 * @param programs - Independently bundled gadget programs.
 * @param metadata - Combined userscript metadata.
 * @param config - Shared userscript configuration.
 * @returns Installable combined userscript source.
 */
export async function formatAllUserscript(
    programs: UserscriptProgram[],
    metadata: UserscriptMetadata,
    config: UserscriptConfig,
): Promise<string> {
    const header = buildUserscriptHeader(metadata, config);
    const bootstrap = formatAllUserscriptBootstrap(programs);
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
    metadata: UserscriptMetadata,
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
    metadata: UserscriptMetadata,
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

/**
 * Starts each URL-matched gadget after MediaWiki is ready.
 *
 * @param programs - Gadget programs to scope and start.
 * @returns Combined bootstrap source.
 */
function formatAllUserscriptBootstrap(programs: UserscriptProgram[]): string {
    const starters = programs.map(formatProgramStarter).join("\n\n");
    const entries = programs.map(formatProgramEntry).join(",\n");
    return `(() => {
${starters}

  const allGadgetPrograms = [
${entries}
  ];

${ALL_USERSCRIPT_RUNTIME}
  start();
})();
`;
}

/**
 * Formats one package-scoped gadget startup function.
 *
 * @param program - Gadget program value.
 * @param index - Stable gadget position.
 * @returns Startup function source.
 */
function formatProgramStarter(
    program: UserscriptProgram,
    index: number,
): string {
    const source = stripJavaScriptComments(program.source).trimEnd();
    return `  function startGadget${index}(mw) {
${source}
  }`;
}

/**
 * Formats one gadget's runtime startup descriptor.
 *
 * @param program - Gadget program value.
 * @param index - Stable gadget position.
 * @returns Runtime descriptor source.
 */
function formatProgramEntry(
    program: UserscriptProgram,
    index: number,
): string {
    const patterns = formatMatchPatterns(program.matches, program.name);
    return `    {
      matches: ${patterns},
      name: ${JSON.stringify(program.name)},
      start: startGadget${index}
    }`;
}

/**
 * Formats userscript match patterns as runtime regular expressions.
 *
 * @param matches - Declared userscript matches.
 * @param packageName - Owning gadget package name.
 * @returns JavaScript array source.
 */
function formatMatchPatterns(matches: string[], packageName: string): string {
    const effectiveMatches = matches.length === 0 ? ["*://*/*"] : matches;
    const patterns = effectiveMatches.map((pattern) =>
        formatMatchPattern(pattern, packageName),
    );
    return `[${patterns.join(", ")}]`;
}

interface ParsedMatchPattern {
    host: string;
    path: string;
    scheme: string;
}

/**
 * Compiles one userscript match pattern to three regular expressions.
 *
 * @param pattern - Userscript match pattern.
 * @param packageName - Owning gadget package name.
 * @returns JavaScript tuple source.
 */
function formatMatchPattern(pattern: string, packageName: string): string {
    const parsed = parseMatchPattern(pattern, packageName);
    return [
        "[",
        formatSchemePattern(parsed.scheme),
        ", ",
        formatHostPattern(parsed.host),
        ", ",
        formatPathPattern(parsed.path),
        "]",
    ].join("");
}

/**
 * Parses the HTTP match-pattern subset used by MediaWiki gadgets.
 *
 * @param pattern - Userscript match pattern.
 * @param packageName - Owning gadget package name.
 * @returns Parsed pattern parts.
 */
function parseMatchPattern(
    pattern: string,
    packageName: string,
): ParsedMatchPattern {
    const separator = pattern.indexOf("://");
    const pathStart = pattern.indexOf("/", separator + 3);
    const scheme = pattern.slice(0, separator);
    const host = pattern.slice(separator + 3, pathStart).toLowerCase();
    const path = pattern.slice(pathStart);
    if (!isValidMatchPattern(pattern, scheme, host, path, separator)) {
        throw new Error(
            `${packageName} has an unsupported userscript match: ${pattern}`,
        );
    }
    return { host, path, scheme };
}

/** Checks the supported userscript HTTP match-pattern grammar. */
function isValidMatchPattern(
    pattern: string,
    scheme: string,
    host: string,
    path: string,
    separator: number,
): boolean {
    const schemeIsValid = /^(?:\*|https?)$/u.test(scheme);
    const wildcardIsValid =
        !host.includes("*") ||
        host === "*" ||
        (host.startsWith("*.") && !host.slice(2).includes("*"));
    return (
        separator > 0 &&
        schemeIsValid &&
        host !== "" &&
        host !== "*." &&
        wildcardIsValid &&
        path.startsWith("/") &&
        !/\s/u.test(pattern)
    );
}

/** Formats the protocol part of one userscript match. */
function formatSchemePattern(scheme: string): string {
    return scheme === "*" ? "/^https?:$/u" : `/^${scheme}:$/u`;
}

/** Formats the hostname part of one userscript match. */
function formatHostPattern(host: string): string {
    if (host === "*") {
        return "/^.*$/u";
    }
    const value = host.startsWith("*.") ? host.slice(2) : host;
    const escaped = escapeRegexLiteral(value);
    return host.startsWith("*.")
        ? `/^(?:[^.]+\\.)*${escaped}$/iu`
        : `/^${escaped}$/iu`;
}

/** Formats the path part of one userscript match. */
function formatPathPattern(path: string): string {
    const escaped = escapeRegexLiteral(path).replaceAll("\\*", ".*");
    return `/^${escaped}$/u`;
}

/** Escapes text for a JavaScript regular-expression literal. */
function escapeRegexLiteral(value: string): string {
    const specialCharacters = "\\^$.*+?()[]{}|/";
    return [...value]
        .map((character) =>
            specialCharacters.includes(character)
                ? `\\${character}`
                : character,
        )
        .join("");
}
