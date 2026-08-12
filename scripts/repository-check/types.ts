/** Defines results shared by repository checks. */

export interface CheckResult {
    checkedCount: number;
    problems: string[];
}

export interface PackageContractResult {
    gadgetCount: number;
    problems: string[];
}
