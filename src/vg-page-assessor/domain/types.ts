/**
 * Domain and workflow contracts for VG Page Assessor.
 */

export const CLASS_VALUES = [
    "Unassessed",
    "Stub",
    "Start",
    "C",
    "B",
    "SL",
    "List",
    "CL",
    "BL",
] as const;

export const IMPORTANCE_VALUES = ["", "Low", "Mid", "High", "Top"] as const;

export type AssessmentClass = (typeof CLASS_VALUES)[number];
export type AssessmentImportance = (typeof IMPORTANCE_VALUES)[number];
export type SelectionMap = Record<string, boolean>;

export interface AssessmentMaintenance {
    cover: boolean;
    needsInfobox: boolean;
    reassess: boolean;
    screenshot: boolean;
}

export interface Assessment {
    className: AssessmentClass;
    importance: AssessmentImportance;
    maintenance: AssessmentMaintenance;
    otherProjects: SelectionMap;
    taskForces: SelectionMap;
}

export interface ProjectBannerConfig {
    readonly aliases: readonly string[];
    readonly id: string;
    readonly label: string;
    readonly template: string;
}

export interface TaskForceConfig {
    readonly id: string;
    readonly label: string;
    readonly parameter: string;
}

export interface VideoGamesProjectConfig {
    readonly aliases: readonly string[];
    readonly classParameter: string;
    readonly importanceParameter: string;
    readonly taskForces: readonly TaskForceConfig[];
    readonly template: string;
}

export interface ProjectConfig {
    readonly otherProjects: readonly ProjectBannerConfig[];
    readonly videoGames: VideoGamesProjectConfig;
}

export interface PageSnapshot {
    basetimestamp?: string;
    exists: boolean;
    starttimestamp: string;
    text: string;
}

export interface NewPageListSnapshot {
    basetimestamp: string;
    starttimestamp: string;
    text: string;
}

export interface SubjectPageInfo {
    creationDate: Date;
    isRedirect: boolean;
    listedTitle: string;
    namespaceNumber: number;
    targetTitle: string;
}

export interface ExistingRegistration {
    date: Date;
    listedTitle: string;
}

export interface RegistrationResult {
    alreadyRegistered: boolean;
    changed: boolean;
    earliestDate: Date | null;
    eligible: boolean;
    existing: ExistingRegistration | null;
    proposedText: string;
}

export interface PreparedTalkEdit {
    summary: string;
    title: string;
    topSection: string;
}
