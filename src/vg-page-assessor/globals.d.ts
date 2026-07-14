/** A configurable task force shown by the assessor. */
interface AssessorTaskForce {
    id: string;
    label: string;
    parameter: string;
}

/** A WikiProject banner configuration. */
interface AssessorProject {
    aliases: string[];
    classParameter?: string;
    id?: string;
    importanceParameter?: string;
    label?: string;
    taskForces?: AssessorTaskForce[];
    template: string;
}

/** The build-time configuration injected into the assessor. */
interface AssessorProjectConfig {
    otherProjects: AssessorProject[];
    videoGames: AssessorProject & {
        taskForces: AssessorTaskForce[];
    };
}

declare const __ASSESS_VG_PAGE_DIALOG_CSS__: string;

interface HTMLDialogElement {
    avgpState: object;
}
