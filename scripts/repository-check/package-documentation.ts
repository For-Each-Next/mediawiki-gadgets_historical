/** Validates package README and changelog contracts. */

import { readFile, readdir } from "node:fs/promises";
import { basename, join } from "node:path";
import {
    hasErrorCode,
    hasText,
    type GadgetPackage,
} from "../workspace/index.ts";
import {
    AGGREGATE_OUTPUT_FILENAME,
    createGadgetArtifactFilenames,
} from "../gadget-build/index.ts";
import { matchesPackageVersion } from "./package-metadata.ts";
import { checkPackageCondition as check } from "./problem.ts";

const REQUIRED_README_SECTIONS = [
    "Run",
    "Features",
    "Development",
    "Architecture",
    "License",
];
const CHANGELOG_HEADING_PATTERN =
    /^### (\S+) \(\d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC\)$/mu;
const SHELL_BLOCK_PATTERN = /```(?:sh|shell)\n([\s\S]*?)\n```/gu;
const LAUNCH_GUIDANCE_PATTERN = new RegExp(
    "\\bafter (?:either )?installation\\b[\\s\\S]{0,360}" +
        "\\b(?:hard-refresh|open|use|choose|visit)\\b",
    "iu",
);
const REVIEW_GUIDANCE_PATTERN = new RegExp(
    "\\b(?:inspect|review)\\b[\\s\\S]{0,240}" +
        "\\b(?:before|only after)\\b[\\s\\S]{0,120}" +
        "\\b(?:confirm\\w*|sav\\w*)\\b",
    "iu",
);
const USERSCRIPT_SURFACE_PATTERN = new RegExp(
    "(?:\\b(?:install|create|replace)\\w*\\b[\\s\\S]{0,160}" +
        "\\b(?:userscript manager|Tampermonkey)\\b|" +
        "\\b(?:userscript manager|Tampermonkey)\\b[\\s\\S]{0,160}" +
        "\\b(?:install|create|replace|save)\\w*\\b)",
    "iu",
);
const SERVICE_CONSTRAINT_PATTERN = new RegExp(
    "\\b(?:fixtures?|mocked|live[- ]service|" +
        "live (?:API|MediaWiki|wiki)|network)\\b",
    "iu",
);

/** Checks package-facing README and changelog content. */
export async function checkPackageDocumentation(
    gadget: GadgetPackage,
): Promise<string[]> {
    const [readme, changelog, interfaceLanguages] = await Promise.all([
        readOptionalFile(join(gadget.directory, "README.md")),
        readOptionalFile(join(gadget.directory, "CHANGELOG.md")),
        discoverInterfaceLanguages(gadget),
    ]);
    return [
        ...(readme == null
            ? []
            : checkReadme(gadget, readme, interfaceLanguages)),
        ...(changelog == null ? [] : checkChangelog(gadget, changelog)),
    ];
}

/** Checks the README structure, commands, and cross-links. */
function checkReadme(
    gadget: GadgetPackage,
    readme: string,
    interfaceLanguages: string[],
): string[] {
    const problems: string[] = [];
    const name = gadget.directoryName;
    check(
        /^# [^\n]+\n/u.test(readme),
        problems,
        name,
        "README.md must begin with one package title.",
    );
    for (const section of REQUIRED_README_SECTIONS) {
        check(
            readme.includes(`\n## ${section}\n`),
            problems,
            name,
            `README.md must contain "## ${section}".`,
        );
    }
    checkReadmeLinks(readme, name, problems);
    checkReadmeSections(gadget, readme, interfaceLanguages, problems);
    check(
        readme.includes("```text"),
        problems,
        name,
        "README.md architecture must include a text dependency tree.",
    );
    check(
        readme.includes("main.ts"),
        problems,
        name,
        "README.md architecture must identify the composition root.",
    );
    return problems;
}

/** Checks section-specific package documentation contracts. */
function checkReadmeSections(
    gadget: GadgetPackage,
    readme: string,
    interfaceLanguages: string[],
    problems: string[],
): void {
    const run = getReadmeSection(readme, "Run");
    const features = getReadmeSection(readme, "Features");
    const development = getReadmeSection(readme, "Development");
    if (run != null) {
        checkRunSection(gadget, run, problems);
    }
    if (features != null) {
        checkFeaturesSection(gadget, features, interfaceLanguages, problems);
    }
    if (development != null) {
        checkDevelopmentSection(gadget, development, readme, problems);
    }
}

/** Checks artifacts, installation surfaces, and safe launch steps. */
function checkRunSection(
    gadget: GadgetPackage,
    run: string,
    problems: string[],
): void {
    const name = gadget.directoryName;
    const buildCommand = `npm run build -w ${name}`;
    check(
        extractShellCommands(run).has(buildCommand),
        problems,
        name,
        `README.md Run must show "${buildCommand}" exactly.`,
    );
    checkArtifactDocumentation(gadget, run, problems);
    checkInstallationDocumentation(gadget, run, problems);
    check(
        LAUNCH_GUIDANCE_PATTERN.test(run),
        problems,
        name,
        "README.md Run must explain how to launch the installed gadget.",
    );
    check(
        REVIEW_GUIDANCE_PATTERN.test(run),
        problems,
        name,
        "README.md Run must require review before save confirmation.",
    );
}

/** Checks exact individual and aggregate artifact names. */
function checkArtifactDocumentation(
    gadget: GadgetPackage,
    run: string,
    problems: string[],
): void {
    const { directoryName: name } = gadget;
    const outputName = gadget.metadata.gadgetBuild.outputName;
    const individual = hasText(outputName)
        ? `dist/${createGadgetArtifactFilenames(outputName).minified}`
        : null;
    check(
        individual != null && hasInlineCode(run, individual),
        problems,
        name,
        "README.md Run must name the exact individual artifact.",
    );
    check(
        hasInlineCode(run, `dist/${AGGREGATE_OUTPUT_FILENAME}`),
        problems,
        name,
        "README.md Run must name the exact aggregate artifact.",
    );
}

/** Checks both supported installation surfaces. */
function checkInstallationDocumentation(
    gadget: GadgetPackage,
    run: string,
    problems: string[],
): void {
    const name = gadget.directoryName;
    check(
        /Special:MyPage\/(?:common|global)\.js/u.test(run),
        problems,
        name,
        "README.md Run must document MediaWiki personal JavaScript.",
    );
    check(
        USERSCRIPT_SURFACE_PATTERN.test(run),
        problems,
        name,
        "README.md Run must document a userscript-manager installation.",
    );
}

/** Checks the supported interface-language statement. */
function checkFeaturesSection(
    gadget: GadgetPackage,
    features: string,
    interfaceLanguages: string[],
    problems: string[],
): void {
    check(
        /\binterfaces?\b/iu.test(features) &&
            interfaceLanguages.every((language) =>
                features.includes(language),
            ),
        problems,
        gadget.directoryName,
        "README.md Features must state supported interface languages: " +
            `${interfaceLanguages.join(", ")}.`,
    );
}

/** Derives interface languages from authored locale catalogs. */
async function discoverInterfaceLanguages(
    gadget: GadgetPackage,
): Promise<string[]> {
    try {
        const entries = await readdir(join(gadget.directory, "i18n"), {
            withFileTypes: true,
        });
        const languages = entries
            .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
            .map((entry) => formatInterfaceLanguage(entry.name))
            .toSorted();
        return languages.length === 0 ? ["English"] : languages;
    } catch (error) {
        if (hasErrorCode(error, "ENOENT")) {
            return ["English"];
        }
        throw error;
    }
}

/** Formats a catalog locale as its README-facing language name. */
function formatInterfaceLanguage(filename: string): string {
    const locale = basename(filename, ".json");
    const names: Record<string, string> = {
        en: "English",
        "zh-Hans": "Simplified Chinese",
        "zh-Hant": "Traditional Chinese",
    };
    return names[locale] ?? locale;
}

/** Checks the reproducible package development workflow. */
function checkDevelopmentSection(
    gadget: GadgetPackage,
    development: string,
    readme: string,
    problems: string[],
): void {
    const name = gadget.directoryName;
    const baseline = getNodeBaseline(gadget);
    check(
        baseline != null &&
            /\bNode\.js\b/u.test(development) &&
            development.includes(baseline),
        problems,
        name,
        "README.md Development must state the engines.node baseline.",
    );
    checkDevelopmentCommands(gadget, development, problems);
    check(
        sectionLinksTo(
            development,
            readme,
            "../../docs/development-workflow.md",
        ),
        problems,
        name,
        "README.md Development must link to the development workflow.",
    );
    check(
        SERVICE_CONSTRAINT_PATTERN.test(development),
        problems,
        name,
        "README.md Development must state fixture or live-service limits.",
    );
}

/** Checks inline and numbered-reference links from one section. */
function sectionLinksTo(
    section: string,
    readme: string,
    target: string,
): boolean {
    if (section.includes(`](${target})`)) {
        return true;
    }
    const references = [...section.matchAll(/\[[^\]]+\]\[([^\]]+)\]/gu)];
    return references.some(function resolvesReference(match) {
        return readme.includes(`\n[${match[1]}]: ${target}\n`);
    });
}

/** Checks exact install, check, test, and build commands. */
function checkDevelopmentCommands(
    gadget: GadgetPackage,
    development: string,
    problems: string[],
): void {
    const name = gadget.directoryName;
    const commands = extractShellCommands(development);
    for (const command of [
        "npm ci",
        `npm run check -w ${name}`,
        `npm test -w ${name}`,
        `npm run build -w ${name}`,
    ]) {
        check(
            commands.has(command),
            problems,
            name,
            `README.md Development must show "${command}" exactly.`,
        );
    }
}

/** Reads the minimum Node version from package engine metadata. */
function getNodeBaseline(gadget: GadgetPackage): string | null {
    const requirement = gadget.metadata.engines?.node;
    if (!hasText(requirement)) {
        return null;
    }
    return /^>=(\d+(?:\.\d+){1,2})$/u.exec(requirement.trim())?.[1] ?? null;
}

/** Returns commands written as exact lines in shell code blocks. */
function extractShellCommands(section: string): Set<string> {
    const commands = [...section.matchAll(SHELL_BLOCK_PATTERN)].flatMap(
        function readBlock(match) {
            return match[1]!
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line !== "");
        },
    );
    return new Set(commands);
}

/** Checks for one exact Markdown inline-code value. */
function hasInlineCode(source: string, value: string): boolean {
    return source.includes(`\`${value}\``);
}

/** Reads one exact second-level README section. */
function getReadmeSection(readme: string, section: string): string | null {
    const heading = `\n## ${section}\n`;
    const headingIndex = readme.indexOf(heading);
    if (headingIndex < 0) {
        return null;
    }
    const start = headingIndex + heading.length;
    const end = readme.indexOf("\n## ", start);
    return readme.slice(start, end < 0 ? undefined : end);
}

/** Checks required package-document links. */
function checkReadmeLinks(
    readme: string,
    name: string,
    problems: string[],
): void {
    check(
        /\]\(LICENSE\)|^\[[^\]]+\]: LICENSE$/mu.test(readme),
        problems,
        name,
        "README.md must link to the package LICENSE.",
    );
    for (const link of [
        "CHANGELOG.md",
        "AGENTS.md",
        "../../AGENTS.md",
        "../../LICENSE",
    ]) {
        check(
            readme.includes(link),
            problems,
            name,
            `README.md must link to ${link}.`,
        );
    }
}

/** Checks the active changelog group and release version. */
function checkChangelog(gadget: GadgetPackage, changelog: string): string[] {
    const problems: string[] = [];
    const { directoryName: name, metadata } = gadget;
    const heading = CHANGELOG_HEADING_PATTERN.exec(changelog);
    const nextMinor = getNextMinor(metadata.version);
    check(
        changelog.startsWith("# Changelog\n"),
        problems,
        name,
        'CHANGELOG.md must begin with "# Changelog".',
    );
    check(
        heading?.[1] === metadata.version,
        problems,
        name,
        "active CHANGELOG.md version must match package.json.",
    );
    if (heading != null) {
        const start = heading.index + heading[0].length;
        check(
            changelog.slice(start).startsWith("\n\nOverview: "),
            problems,
            name,
            "active changelog entry must begin with an Overview paragraph.",
        );
    }
    check(
        nextMinor != null && changelog.includes(`\n## Until ${nextMinor}\n`),
        problems,
        name,
        "active changelog group must use the next minor-version boundary.",
    );
    return problems;
}

/** Calculates the active changelog's next minor boundary. */
function getNextMinor(version: unknown): string | null {
    if (!matchesPackageVersion(version)) {
        return null;
    }
    const [major, minor] = version.split(".");
    return `${major}.${Number(minor) + 1}`;
}

/** Reads a required file when it exists. */
async function readOptionalFile(path: string): Promise<string | null> {
    try {
        return await readFile(path, "utf8");
    } catch (error) {
        if (hasErrorCode(error, "ENOENT")) {
            return null;
        }
        throw error;
    }
}
