/**
 * Composes the page-assessor UI, workflows, and MediaWiki adapters.
 */

// eslint-disable-next-line max-len
import { createAssessmentPageApi } from "#gadget/adapters/mediawiki/assessment-page-api.ts";
// eslint-disable-next-line max-len
import { createNewPageListApi } from "#gadget/adapters/mediawiki/new-page-list-api.ts";
import { createPageApi } from "#gadget/adapters/mediawiki/page-api.ts";
// eslint-disable-next-line max-len
import { createTalkPageApi } from "#gadget/adapters/mediawiki/talk-page-api.ts";
import {
    getSubjectPageTitle,
    getTalkPageTitle,
} from "#gadget/adapters/mediawiki/title.ts";
// eslint-disable-next-line max-len
import { createCreationTimeCacheStore } from "#gadget/adapters/storage/creation-time-cache.ts";
import projectConfig from "#gadget/config/project-config.ts";
import type { DialogPageContext } from "#gadget/contracts/dialog.ts";
import { buildNewPageListSummary } from "#gadget/i18n/index.ts";
import { startPageAssessor } from "#gadget/ui/app.ts";
import { createDialogWorkflow } from "#gadget/workflows/dialog-state.ts";
// eslint-disable-next-line max-len
import { createReviewedDialogSaveWorkflow } from "#gadget/workflows/save-dialog.ts";
// eslint-disable-next-line max-len
import { createTalkSaveWorkflow } from "#gadget/workflows/save-talk-assessment.ts";
import { createLogger, type Logger } from "#shared/logging";
import { createActionNotifier } from "#shared/mediawiki/notifications";

/** Starts the composed browser gadget. */
export function start(): void {
    const logger = createLogger("vg-page-assessor");
    const adapters = createMediaWikiAdapters(logger);
    const dialogWorkflow = createDialogWorkflow(
        {
            fetchAssessmentPages:
                adapters.assessmentPages.fetchAssessmentPages,
            fetchPageCreationTimes: adapters.pages.fetchPageCreationTimes,
            fetchSubjectPageInfo: adapters.pages.fetchSubjectPageInfo,
            getSubjectPageTitle,
            getTalkPageTitle,
            savePreparedNewPageList:
                adapters.newPageList.savePreparedNewPageList,
        },
        projectConfig,
    );
    const saveTalkAssessment = createTalkSaveWorkflow({
        fetchPageText: adapters.pages.fetchPageText,
        logger: logger.child("workflow.talk-save"),
        postTalkPageEdit: adapters.talkPage.postTalkPageEdit,
    });
    const saveReviewedDialog = createReviewedDialogSaveWorkflow({
        buildRegistrationSummary: buildNewPageListSummary,
        getRegistrationSave: dialogWorkflow.getRegistrationSave,
        logger: logger.child("workflow.dialog-save"),
        saveRegistration: dialogWorkflow.saveRegistration,
        saveTalkAssessment,
    });

    startPageAssessor({
        createDialogPageContext,
        loadDialogState: dialogWorkflow.loadDialogState,
        logger: logger.child("ui"),
        notify: createActionNotifier("vg-page-assessor"),
        saveReviewedDialog,
    });
}

/** Creates external MediaWiki values for one dialog-opening attempt. */
function createDialogPageContext(): DialogPageContext {
    const pageName = mw.config.get("wgPageName");

    return {
        api: new mw.Api(),
        pageName,
        title: mw.Title.newFromText(pageName),
    };
}

function createMediaWikiAdapters(logger: Logger) {
    const mediaWikiLogger = logger.child("mediawiki");
    const cache = createCreationTimeCacheStore(logger.child("storage"));
    return Object.freeze({
        assessmentPages: createAssessmentPageApi(
            mediaWikiLogger.child("assessment-page"),
        ),
        newPageList: createNewPageListApi(
            mediaWikiLogger.child("new-page-list"),
        ),
        pages: createPageApi(mediaWikiLogger.child("page"), cache),
        talkPage: createTalkPageApi(mediaWikiLogger.child("talk-page")),
    });
}
