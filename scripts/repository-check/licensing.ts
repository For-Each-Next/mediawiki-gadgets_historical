/** Validates the append-only CC0 release-scope ledger and notices. */

import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import {
    hasErrorCode,
    hasText,
    isRecord,
    type GadgetPackage,
} from "../workspace/index.ts";
import {
    matchesPackageVersion,
    usesSharedRuntime,
} from "./package-metadata.ts";

type NoticeName = "root" | "shared";

interface LicenseScope {
    displayName: string;
    notices: NoticeName[];
    packageName: string;
    version: string;
}

interface LedgerResult {
    problems: string[];
    scopes: LicenseScope[];
}

const NOTICE_PATHS: Record<NoticeName, string> = {
    root: "LICENSE",
    shared: "src/shared/LICENSE",
};
const NOTICE_SPDX_MARKERS: Record<NoticeName, string> = {
    root: "SPDX-License-Identifier: CC-BY-SA-4.0",
    shared: "SPDX-License-Identifier: CC0-1.0",
};
const execFileAsync = promisify(execFile);
const HISTORY_SCOPE_PATTERN =
    /\(`([^`]+@\d+\.\d+\.\d+(?:-(?:dev|post)\.\d+)?)`\)/gu;

/** Checks ledger syntax, notice sets, and current package coverage. */
export async function checkLicensing(
    workspaceRoot: string,
    gadgets: GadgetPackage[],
): Promise<string[]> {
    const ledger = await readLedger(workspaceRoot);
    const [noticeProblems, historyProblems] = await Promise.all([
        checkNoticeScopeSets(workspaceRoot, ledger.scopes),
        checkHistoricalScopeRetention(workspaceRoot, ledger.scopes),
    ]);
    return [
        ...ledger.problems,
        ...noticeProblems,
        ...historyProblems,
        ...checkCurrentScopes(gadgets, ledger.scopes),
    ];
}

/** Requires every historical Git scope to remain mapped. */
async function checkHistoricalScopeRetention(
    workspaceRoot: string,
    scopes: LicenseScope[],
): Promise<string[]> {
    if (!(await isGitWorkspace(workspaceRoot))) {
        return [];
    }
    const historical = await readHistoricalNoticeScopes(workspaceRoot);
    const current = new Map(
        scopes.map((scope) => [formatScope(scope), new Set(scope.notices)]),
    );
    return [...historical.entries()].flatMap(([token, notices]) =>
        [...notices]
            .filter((notice) => !current.get(token)?.has(notice))
            .map(
                (notice) =>
                    `licensing ledger: historical scope ${token} must ` +
                    `retain ${notice}.`,
            ),
    );
}

/** Checks whether history-backed validation is available. */
async function isGitWorkspace(workspaceRoot: string): Promise<boolean> {
    try {
        const { stdout } = await execFileAsync(
            "git",
            ["rev-parse", "--is-inside-work-tree"],
            { cwd: workspaceRoot },
        );
        return stdout.trim() === "true";
    } catch {
        return false;
    }
}

/** Reads root and shared scope memberships from Git history. */
async function readHistoricalNoticeScopes(
    workspaceRoot: string,
): Promise<Map<string, Set<NoticeName>>> {
    const entries = await Promise.all(
        Object.entries(NOTICE_PATHS).map(async ([notice, path]) => ({
            notice: notice as NoticeName,
            scopes: await readHistoricalNotice(workspaceRoot, path),
        })),
    );
    const noticesByScope = new Map<string, Set<NoticeName>>();
    for (const entry of entries) {
        for (const scope of entry.scopes) {
            const notices = noticesByScope.get(scope) ?? new Set<NoticeName>();
            notices.add(entry.notice);
            noticesByScope.set(scope, notices);
        }
    }
    return noticesByScope;
}

/** Extracts every scope ever rendered in one notice file. */
async function readHistoricalNotice(
    workspaceRoot: string,
    path: string,
): Promise<Set<string>> {
    const { stdout } = await execFileAsync(
        "git",
        ["log", "--format=", "--all", "-p", "--", path],
        { cwd: workspaceRoot, maxBuffer: 4 * 1024 * 1024 },
    );
    return new Set(
        [...stdout.matchAll(HISTORY_SCOPE_PATTERN)].map((match) => match[1]!),
    );
}

/** Reads and validates the JSON release-scope ledger. */
async function readLedger(workspaceRoot: string): Promise<LedgerResult> {
    const path = join(
        workspaceRoot,
        "config",
        "licensing",
        "cc0-release-scopes.json",
    );
    try {
        const value: unknown = JSON.parse(await readFile(path, "utf8"));
        if (!Array.isArray(value)) {
            return invalidLedger("must contain a JSON array");
        }
        return validateLedgerEntries(value);
    } catch (error) {
        if (hasErrorCode(error, "ENOENT")) {
            return invalidLedger("is missing");
        }
        if (error instanceof SyntaxError) {
            return invalidLedger("is not valid JSON");
        }
        throw error;
    }
}

/** Creates one ledger-wide validation failure. */
function invalidLedger(message: string): LedgerResult {
    return {
        problems: [
            `workspace: config/licensing/cc0-release-scopes.json ${message}.`,
        ],
        scopes: [],
    };
}

/** Validates and narrows all ledger entries. */
function validateLedgerEntries(values: unknown[]): LedgerResult {
    const scopes: LicenseScope[] = [];
    const problems: string[] = [];
    for (const [index, value] of values.entries()) {
        const result = validateLedgerEntry(value, index);
        problems.push(...result.problems);
        if (result.scope != null) {
            scopes.push(result.scope);
        }
    }
    problems.push(...checkLedgerDuplicates(scopes));
    problems.push(...checkDisplayNames(scopes));
    return { problems, scopes };
}

/** Validates one ledger object. */
function validateLedgerEntry(
    value: unknown,
    index: number,
): { problems: string[]; scope: LicenseScope | null } {
    const prefix = `licensing ledger entry ${index + 1}`;
    if (!isRecord(value)) {
        return { problems: [`${prefix}: must be an object.`], scope: null };
    }
    const problems = checkLedgerEntryFields(value, prefix);
    if (problems.length > 0 || !isLicenseScope(value)) {
        return { problems, scope: null };
    }
    return { problems, scope: value };
}

/** Checks the fields and exact shape of one ledger entry. */
function checkLedgerEntryFields(
    value: Record<string, unknown>,
    prefix: string,
): string[] {
    const allowed = new Set([
        "displayName",
        "notices",
        "packageName",
        "version",
    ]);
    const problems: string[] = [];
    if (!hasText(value.packageName)) {
        problems.push(`${prefix}: packageName must be nonempty text.`);
    }
    if (!hasText(value.displayName)) {
        problems.push(`${prefix}: displayName must be nonempty text.`);
    }
    if (!matchesPackageVersion(value.version)) {
        problems.push(`${prefix}: version must use the package SemVer form.`);
    }
    problems.push(...checkNoticeNames(value.notices, prefix));
    if (Object.keys(value).some((key) => !allowed.has(key))) {
        problems.push(`${prefix}: contains an unsupported field.`);
    }
    return problems;
}

/** Checks a ledger notice list for values and duplicates. */
function checkNoticeNames(value: unknown, prefix: string): string[] {
    if (!Array.isArray(value) || value.length === 0) {
        return [`${prefix}: notices must be a nonempty array.`];
    }
    const invalid = value.some(
        (notice) => notice !== "root" && notice !== "shared",
    );
    const duplicate = new Set(value).size !== value.length;
    return [
        ...(invalid ? [`${prefix}: contains an unknown notice name.`] : []),
        ...(duplicate ? [`${prefix}: contains duplicate notice names.`] : []),
    ];
}

/** Narrows a fully validated ledger object. */
function isLicenseScope(
    value: Record<string, unknown>,
): value is Record<string, unknown> & LicenseScope {
    return (
        hasText(value.packageName) &&
        hasText(value.displayName) &&
        matchesPackageVersion(value.version) &&
        Array.isArray(value.notices) &&
        value.notices.length > 0 &&
        value.notices.every(
            (notice) => notice === "root" || notice === "shared",
        ) &&
        new Set(value.notices).size === value.notices.length
    );
}

/** Rejects duplicate package-version scopes. */
function checkLedgerDuplicates(scopes: LicenseScope[]): string[] {
    const seen = new Set<string>();
    const problems: string[] = [];
    for (const scope of scopes) {
        const token = formatScope(scope);
        if (seen.has(token)) {
            problems.push(`licensing ledger: duplicate scope ${token}.`);
        }
        seen.add(token);
    }
    return problems;
}

/** Requires one stable display name for each package lineage. */
function checkDisplayNames(scopes: LicenseScope[]): string[] {
    const names = new Map<string, string>();
    const problems: string[] = [];
    for (const scope of scopes) {
        const prior = names.get(scope.packageName);
        if (prior != null && prior !== scope.displayName) {
            problems.push(
                `licensing ledger: ${scope.packageName} must use one ` +
                    "display name.",
            );
        }
        names.set(scope.packageName, scope.displayName);
    }
    return problems;
}

/** Requires each notice's backticked scope set to equal the ledger. */
async function checkNoticeScopeSets(
    workspaceRoot: string,
    scopes: LicenseScope[],
): Promise<string[]> {
    const results = await Promise.all(
        Object.entries(NOTICE_PATHS).map(([notice, path]) =>
            checkNoticeScopeSet(
                workspaceRoot,
                notice as NoticeName,
                path,
                scopes,
            ),
        ),
    );
    return results.flat();
}

/** Compares one license notice with its expected ledger subset. */
async function checkNoticeScopeSet(
    workspaceRoot: string,
    notice: NoticeName,
    path: string,
    scopes: LicenseScope[],
): Promise<string[]> {
    const content = await readNotice(workspaceRoot, path);
    if (content == null) {
        return [`workspace: missing licensing map ${path}.`];
    }
    const expected = new Set(
        scopes
            .filter((scope) => scope.notices.includes(notice))
            .map(formatScope),
    );
    const actual = extractNoticeScopes(content);
    return [
        ...checkNoticeLicenseIdentity(path, content, notice),
        ...compareScopeSets(path, expected, actual),
        ...checkNoticeDisplayNames(path, content, scopes, notice),
    ];
}

/** Requires the SPDX identity owned by each cumulative notice. */
function checkNoticeLicenseIdentity(
    path: string,
    content: string,
    notice: NoticeName,
): string[] {
    const marker = NOTICE_SPDX_MARKERS[notice];
    return content.includes(marker)
        ? []
        : [`${path}: missing required ${marker}.`];
}

/** Requires rendered rows to retain ledger display names. */
function checkNoticeDisplayNames(
    path: string,
    content: string,
    scopes: LicenseScope[],
    notice: NoticeName,
): string[] {
    return scopes
        .filter((scope) => scope.notices.includes(notice))
        .flatMap((scope) => {
            const token = formatScope(scope);
            const row =
                `- ${scope.displayName} ${scope.version} ` + `(\`${token}\`)`;
            return content.includes(row)
                ? []
                : [`${path}: incorrect display row for ${token}.`];
        });
}

/** Reads one required licensing map. */
async function readNotice(
    workspaceRoot: string,
    path: string,
): Promise<string | null> {
    try {
        return await readFile(join(workspaceRoot, path), "utf8");
    } catch (error) {
        if (hasErrorCode(error, "ENOENT")) {
            return null;
        }
        throw error;
    }
}

/** Extracts exact release scopes from parenthesized backtick tokens. */
function extractNoticeScopes(content: string): string[] {
    return [...content.matchAll(/\(`([^`]+@[^`]+)`\)/gu)].map(
        (match) => match[1]!,
    );
}

/** Reports missing and unregistered values between two scope sets. */
function compareScopeSets(
    path: string,
    expected: Set<string>,
    actualScopes: string[],
): string[] {
    const actual = new Set(actualScopes);
    const duplicateScopes = actualScopes.filter(
        (scope, index) => actualScopes.indexOf(scope) !== index,
    );
    return [
        ...[...expected]
            .filter((scope) => !actual.has(scope))
            .map((scope) => `${path}: missing ledger scope ${scope}.`),
        ...[...actual]
            .filter((scope) => !expected.has(scope))
            .map((scope) => `${path}: unregistered scope ${scope}.`),
        ...[...new Set(duplicateScopes)].map(
            (scope) => `${path}: duplicate scope ${scope}.`,
        ),
    ];
}

/** Requires current CC0 gadget scopes in applicable ledger notices. */
function checkCurrentScopes(
    gadgets: GadgetPackage[],
    scopes: LicenseScope[],
): string[] {
    const byToken = new Map(
        scopes.map((scope) => [formatScope(scope), scope]),
    );
    return gadgets.flatMap((gadget) => {
        const { metadata } = gadget;
        if (
            metadata.license !== "CC0-1.0" ||
            !hasText(metadata.name) ||
            !hasText(metadata.version)
        ) {
            return [];
        }
        const token = `${metadata.name}@${metadata.version}`;
        const notices: NoticeName[] = usesSharedRuntime(gadget)
            ? ["root", "shared"]
            : ["root"];
        return checkCurrentScope(token, notices, byToken.get(token));
    });
}

/** Checks one current scope's required notice memberships. */
function checkCurrentScope(
    token: string,
    notices: NoticeName[],
    scope: LicenseScope | undefined,
): string[] {
    if (scope == null) {
        return [`licensing ledger: missing current CC0 scope ${token}.`];
    }
    return notices
        .filter((notice) => !scope.notices.includes(notice))
        .map(
            (notice) =>
                `licensing ledger: current scope ${token} must include ` +
                `${notice}.`,
        );
}

/** Formats a ledger entry's unique package-version token. */
function formatScope(scope: LicenseScope): string {
    return `${scope.packageName}@${scope.version}`;
}

/** Preserves the compatibility name for the canonical ledger check. */
export async function checkCurrentLicenseMaps(
    workspaceRoot: string,
    gadgets: GadgetPackage[],
): Promise<string[]> {
    return checkLicensing(workspaceRoot, gadgets);
}
