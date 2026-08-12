/** Adds consistently scoped validation diagnostics. */

/** Adds a package-scoped problem when a condition is false. */
export function checkPackageCondition(
    condition: boolean,
    problems: string[],
    packageName: string,
    message: string,
): void {
    if (!condition) {
        problems.push(`${packageName}: ${message}`);
    }
}
