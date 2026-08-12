/** Builds minimal gadget fixtures for repository contract tests. */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

interface LicenseScopeEntry {
    displayName: string;
    notices: Array<"root" | "shared">;
    packageName: string;
    version: string;
}

/** Writes the smallest complete future gadget package contract. */
export async function writeFutureGadget(
    workspaceRoot: string,
    packageName: string = "future-gadget",
    outputName: string = "future_gadget",
    usesShared: boolean = false,
): Promise<void> {
    const packageRoot = join(workspaceRoot, "src", packageName);
    await mkdir(packageRoot, { recursive: true });
    const files = {
        "AGENTS.md": "# Fixture rules\n",
        "CHANGELOG.md": createFutureChangelog(),
        LICENSE: createFutureLicense(packageName, "1.3.0-dev.1", "CC0-1.0"),
        "README.md": createFutureReadme(packageName, outputName),
        "browser.ts": 'import { start } from "#gadget/main.ts";\nstart();\n',
        "index.ts": "export {};\n",
        "main.ts": "export function start(): void {}\n",
        "package.json": JSON.stringify(
            createFutureMetadata(packageName, outputName, usesShared),
        ),
    };
    await Promise.all(
        Object.entries(files).map(([path, content]) =>
            writeFile(join(packageRoot, path), content),
        ),
    );
}

/** Creates a version- and license-specific package notice fixture. */
export function createFutureLicense(
    packageName: string,
    version: string,
    license: string,
): string {
    return [
        `Future Gadget ${version} Licensing Notice`,
        "",
        `Release-Scope: ${packageName}@${version}`,
        `SPDX-License-Identifier: ${license}`,
        "",
    ].join("\n");
}

/** Writes workspace maps and their canonical release-scope ledger. */
export async function writeWorkspaceLicenseMaps(
    workspaceRoot: string,
    rootScopes: string[],
    sharedScopes: string[] = [],
): Promise<void> {
    const sharedRoot = join(workspaceRoot, "src", "shared");
    const licensingRoot = join(workspaceRoot, "config", "licensing");
    await Promise.all([
        mkdir(sharedRoot, { recursive: true }),
        mkdir(licensingRoot, { recursive: true }),
    ]);
    const entries = createLicenseScopeEntries(rootScopes, sharedScopes);
    await Promise.all([
        writeFile(
            join(workspaceRoot, "LICENSE"),
            formatLicenseScopes(rootScopes, "CC-BY-SA-4.0"),
        ),
        writeFile(
            join(sharedRoot, "LICENSE"),
            formatLicenseScopes(sharedScopes, "CC0-1.0"),
        ),
        writeFile(
            join(licensingRoot, "cc0-release-scopes.json"),
            JSON.stringify(entries),
        ),
    ]);
}

/** Creates canonical ledger records for the fixture notices. */
function createLicenseScopeEntries(
    rootScopes: string[],
    sharedScopes: string[],
): LicenseScopeEntry[] {
    const scopes = new Set([...rootScopes, ...sharedScopes]);
    return [...scopes].toSorted().map(function createEntry(scope) {
        const separator = scope.lastIndexOf("@");
        const packageName = scope.slice(0, separator);
        const version = scope.slice(separator + 1);
        const notices: Array<"root" | "shared"> = [];
        if (rootScopes.includes(scope)) {
            notices.push("root");
        }
        if (sharedScopes.includes(scope)) {
            notices.push("shared");
        }
        return {
            displayName: "Future Gadget",
            notices,
            packageName,
            version,
        };
    });
}

/** Creates the future gadget's package metadata. */
function createFutureMetadata(
    packageName: string,
    outputName: string,
    usesShared: boolean,
): Record<string, unknown> {
    return {
        author: "Test",
        browser: "./browser.ts",
        dependencies: createFutureDependencies(usesShared),
        description: "Future package fixture.",
        engines: { node: ">=24.14.1" },
        gadgetBuild: createFutureBuildMetadata(outputName),
        imports: createFutureImports(usesShared),
        license: "CC0-1.0",
        main: "./index.ts",
        name: packageName,
        private: true,
        scripts: {
            build: "node ../../scripts/gadget-build/cli.ts",
            check: "tsc --noEmit",
            test: "node --test",
        },
        type: "module",
        version: "1.3.0-dev.1",
        vue: createFutureVueMetadata(),
    };
}

/** Creates the fixture's optional shared workspace dependency. */
function createFutureDependencies(
    usesShared: boolean,
): Record<string, string> | undefined {
    return usesShared ? { "@mediawiki-gadgets/shared": "*" } : undefined;
}

/** Creates the build metadata used by the future gadget fixture. */
function createFutureBuildMetadata(
    outputName: string,
): Record<string, unknown> {
    return {
        globalName: "futureGadget",
        headerDescription: [
            "Exercises discovery through the shared package contract.",
        ],
        noticeFiles: ["LICENSE"],
        outputName,
    };
}

/** Creates local and optional shared package import aliases. */
function createFutureImports(usesShared: boolean): Record<string, string> {
    return {
        "#gadget": "./index.ts",
        "#gadget/*": "./*",
        ...(usesShared ? { "#shared/*": "@mediawiki-gadgets/shared/*" } : {}),
    };
}

/** Creates the package's flat Vue output contract. */
function createFutureVueMetadata(): Record<string, unknown> {
    return {
        assetsDir: "",
        css: { extract: false },
        filenameHashing: false,
        outputDir: "../../dist",
    };
}

/** Formats exact release-scope tokens for a fixture licensing map. */
function formatLicenseScopes(scopes: string[], license: string): string {
    const rows = scopes.map((scope) => {
        const version = scope.slice(scope.lastIndexOf("@") + 1);
        return `- Future Gadget ${version} (\`${scope}\`)`;
    });
    return [...rows, "", `SPDX-License-Identifier: ${license}`, ""].join("\n");
}

/** Creates the future gadget's README contract. */
function createFutureReadme(packageName: string, outputName: string): string {
    return [
        "# Future Gadget",
        "",
        "Future Gadget exercises the deployable package contract.",
        "",
        ...createFutureRunSection(packageName, outputName),
        ...createFutureFeaturesSection(),
        ...createFutureDevelopmentSection(packageName),
        ...createFutureArchitectureSection(),
        ...createFutureLicenseSection(),
    ].join("\n");
}

/** Creates fixture installation and launch documentation. */
function createFutureRunSection(
    packageName: string,
    outputName: string,
): string[] {
    return [
        "## Run",
        "",
        "Build the package from the repository root:",
        "",
        "```shell",
        `npm run build -w ${packageName}`,
        "```",
        "",
        `The package build writes \`dist/${outputName}.min.js\`. A complete`,
        "workspace build also writes",
        "`dist/00-mediawiki-gadgets.user.js`.",
        "",
        "### MediaWiki user page",
        "",
        "Paste the individual artifact into `Special:MyPage/common.js`.",
        "",
        "### Userscript manager",
        "",
        "Install the aggregate artifact with a userscript manager.",
        "",
        "After either installation, open a supported MediaWiki page. Review",
        "all proposed changes before saving.",
        "",
    ];
}

/** Creates the fixture's interface-language statement. */
function createFutureFeaturesSection(): string[] {
    return ["## Features", "", "The interface supports English.", ""];
}

/** Creates reproducible fixture-development instructions. */
function createFutureDevelopmentSection(packageName: string): string[] {
    return [
        "## Development",
        "",
        "Future Gadget requires Node.js 24.14.1 or newer. Run:",
        "",
        "```shell",
        "npm ci",
        `npm run check -w ${packageName}`,
        `npm test -w ${packageName}`,
        `npm run build -w ${packageName}`,
        "```",
        "",
        "Tests use local fixtures and do not require live services. See the",
        "repository [development workflow]" +
            "(../../docs/development-workflow.md).",
        "",
    ];
}

/** Creates the fixture dependency tree and contributor links. */
function createFutureArchitectureSection(): string[] {
    return [
        "## Architecture",
        "",
        "```text",
        "browser.ts",
        "└── main.ts",
        "```",
        "",
        "See [changelog](CHANGELOG.md), [rules](AGENTS.md),",
        "[repository rules](../../AGENTS.md), and the",
        "[license](../../LICENSE).",
        "",
    ];
}

/** Creates fixture licensing links. */
function createFutureLicenseSection(): string[] {
    return [
        "## License",
        "",
        "See the [package license](LICENSE) and",
        "[repository license](../../LICENSE).",
        "",
    ];
}

/** Creates the future gadget's active changelog entry. */
function createFutureChangelog(): string {
    return [
        "# Changelog",
        "",
        "## Until 1.4",
        "",
        "### 1.3.0-dev.1 (2026-07-29 00:00 UTC)",
        "",
        "Overview: Added the future gadget fixture.",
        "",
        "- Added the fixture.",
        "",
    ].join("\n");
}
