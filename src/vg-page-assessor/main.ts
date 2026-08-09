/**
 * Composes the page-assessor UI, workflows, and MediaWiki adapters.
 */

import projectConfig from "#gadget/config/project-config.ts";
import { fetchAssessmentPages } from "#gadget/infra/assessment-page-api.ts";
import {
    fetchPageCreationTimes,
    fetchPageText,
    fetchSubjectPageInfo,
} from "#gadget/infra/mediawiki-api.ts";
import {
    getSubjectPageTitle,
    getTalkPageTitle,
} from "#gadget/infra/mediawiki-title.ts";
import { savePreparedNewPageList } from "#gadget/infra/new-page-list-api.ts";
import { logStep } from "#gadget/infra/logger.ts";
import { postTalkPageEdit } from "#gadget/infra/talk-page-api.ts";
import { startPageAssessor } from "#gadget/ui/app.ts";
import { createDialogWorkflow } from "#gadget/workflows/dialog-state.ts";
import * as dialogSave from "#gadget/workflows/save-dialog.ts";
import * as talk from "#gadget/workflows/save-talk-assessment.ts";

/**
 * Starts the composed browser gadget.
 */
export function start(): void {
    const dialogWorkflow = createDialogWorkflow(
        {
            fetchAssessmentPages,
            fetchPageCreationTimes,
            fetchSubjectPageInfo,
            getSubjectPageTitle,
            getTalkPageTitle,
            savePreparedNewPageList,
        },
        projectConfig,
    );
    const saveTalkAssessment = talk.createTalkSaveWorkflow({
        fetchPageText,
        logStep,
        postTalkPageEdit,
    });
    const saveReviewedDialog = dialogSave.createReviewedDialogSaveWorkflow({
        getRegistrationSave: dialogWorkflow.getRegistrationSave,
        logStep,
        saveRegistration: dialogWorkflow.saveRegistration,
        saveTalkAssessment,
    });

    startPageAssessor({
        loadDialogState: dialogWorkflow.loadDialogState,
        logStep,
        saveReviewedDialog,
    });
}
