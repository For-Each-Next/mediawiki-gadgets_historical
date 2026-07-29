/**
 * Localizes the configured assessment options for presentation.
 */

import projectConfig from "#gadget/config/project-config.ts";
import { msg, type MessageId } from "#gadget/i18n/index.ts";

export interface LabelledAssessmentOption {
    readonly id: string;
    readonly label: string;
}

type OtherProjectId = (typeof projectConfig.otherProjects)[number]["id"];
type TaskForceId = (typeof projectConfig.videoGames.taskForces)[number]["id"];

const OTHER_PROJECT_MESSAGE_IDS = {
    fictionalCharacters: "project.fictionalCharacters",
    acg: "project.acg",
    biography: "project.biography",
    company: "project.company",
    films: "project.films",
    music: "project.music",
} as const satisfies Record<OtherProjectId, MessageId>;

const TASK_FORCE_MESSAGE_IDS = {
    pokemon: "taskForce.pokemon",
    minecraft: "taskForce.minecraft",
    se: "taskForce.se",
    sega: "taskForce.sega",
    nintendo: "taskForce.nintendo",
    mihoyo: "taskForce.mihoyo",
} as const satisfies Record<TaskForceId, MessageId>;

export const OTHER_PROJECT_OPTIONS = localizeOptions(
    projectConfig.otherProjects,
    OTHER_PROJECT_MESSAGE_IDS,
);

export const TASK_FORCE_OPTIONS = localizeOptions(
    projectConfig.videoGames.taskForces,
    TASK_FORCE_MESSAGE_IDS,
);

export const MAINTENANCE_OPTIONS = [
    { id: "reassess", label: msg("maintenance.reassess") },
    { id: "needsInfobox", label: msg("maintenance.needsInfobox") },
    { id: "cover", label: msg("maintenance.needsImage") },
    { id: "screenshot", label: msg("maintenance.needsScreenshot") },
] as const;

function localizeOptions<Id extends string>(
    items: ReadonlyArray<{ readonly id: Id }>,
    messageIds: Readonly<Record<Id, MessageId>>,
): Array<LabelledAssessmentOption> {
    return items.map(function localizeOption(item) {
        return {
            id: item.id,
            label: msg(messageIds[item.id]),
        };
    });
}
