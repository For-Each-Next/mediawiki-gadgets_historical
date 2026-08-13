/** Production VG Page Assessor dialog stories. */

import projectConfig from "vg-page-assessor/config/project-config.ts";
// eslint-disable-next-line max-len
import { createDefaultAssessment } from "vg-page-assessor/domain/assessment.ts";
// eslint-disable-next-line max-len
import { WIKITEXT_COMPARISON_STYLES } from "vg-page-assessor/ui/components/wikitext-comparison.ts";
import { registerPageAssessorComponents } from "vg-page-assessor/ui/codex.ts";
import {
    ASSESSMENT_DIALOG_STYLES,
    createAssessmentDialogComponent,
} from "vg-page-assessor/ui/dialogs/assessment-dialog.ts";
import {
    LOADING_DIALOG_STYLES,
    createLoadingDialogComponent,
} from "vg-page-assessor/ui/dialogs/loading-dialog.ts";
import {
    addFixtureStyles,
    getCodex,
    getVue,
    installStoryHost,
    mountComponent,
} from "./host.ts";
import { UI_STORIES, type UiStory } from "./registry.ts";

const stories = UI_STORIES.filter(
    (story) => story.gadget === "vg-page-assessor",
);
addFixtureStyles(
    "ui-assessor-styles",
    [
        ASSESSMENT_DIALOG_STYLES,
        LOADING_DIALOG_STYLES,
        WIKITEXT_COMPARISON_STYLES,
    ].join("\n"),
);
installStoryHost("vg-page-assessor", stories, renderStory);

function renderStory(story: UiStory) {
    const Vue = getVue();
    const component =
        story.dialog === "loading"
            ? createLoadingDialogComponent(Vue, function close() {})
            : createAssessmentDialogComponent(Vue, {
                  currentNamespace: 0,
                  onClose() {},
                  runtime: createRuntime(),
                  state: createState(),
              });
    return mountComponent(component, function register(app) {
        registerPageAssessorComponents(app, getCodex());
    });
}

function createState(): any {
    const assessment = createDefaultAssessment(projectConfig);
    assessment.className = "Start";
    assessment.importance = "High";
    assessment.taskForces.nintendo = true;
    return createStateValue(assessment);
}

function createStateValue(assessment: any): any {
    const subjectInfo = createSubjectInfo();
    return {
        api: {},
        assessment,
        creationTimes: new Map(),
        newPageList: {
            basetimestamp: "2026-08-01T00:00:00Z",
            starttimestamp: "2026-08-01T00:00:01Z",
            text: "Before list entry",
        },
        page: {
            exists: true,
            starttimestamp: "2026-08-01T00:00:00Z",
            text: [
                "{{Old project banner|class=Stub}}",
                "{{Very long adjacent project banner name|importance=Low}}",
                "",
                "== Discussion ==",
                "A deterministic discussion body.",
            ].join("\n"),
        },
        previewDirty: false,
        registration: {
            alreadyRegistered: false,
            changed: true,
            earliestDate: null,
            eligible: true,
            existing: null,
            proposedText: "After list entry for a long example game title",
        },
        subjectInfo,
        subjectTitle: "Example game with a long title",
        summaryDirty: false,
        talkTitle: "Talk:Example game with a long title",
    };
}

function createSubjectInfo(): any {
    return {
        creationDate: new Date("2026-07-29T00:00:00Z"),
        isRedirect: false,
        listedTitle: "Example game with a long title",
        namespaceNumber: 0,
        targetTitle: "Example game with a long title",
    };
}

function createRuntime(): any {
    const logger = createLogger();
    return {
        createDialogPageContext() {
            return { api: {}, pageName: "Example game", title: {} };
        },
        async loadDialogState() {
            return createState();
        },
        logger,
        notify() {},
        async saveReviewedDialog() {
            return "saved";
        },
    };
}

function createLogger(): any {
    const logger: any = {
        child: () => logger,
        debug() {},
        error() {},
        info() {},
        isEnabled: () => false,
        startTimer: () => function stop() {},
        warn() {},
    };
    return logger;
}
