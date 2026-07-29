/**
 * Orchestrates dialog loading and new-page-list preparation.
 */

import type {
    DialogState,
    DialogWorkflow,
    RegistrationSave,
} from "#gadget/contracts/dialog.ts";
import { createDefaultAssessment } from "#gadget/domain/assessment.ts";
import {
    getTitlesForDate,
    prepareNewPageListRegistration,
} from "#gadget/domain/new-page-list.ts";
import type {
    NewPageListSnapshot,
    PageSnapshot,
    ProjectConfig,
    SubjectPageInfo,
} from "#gadget/domain/types.ts";

export interface DialogWorkflowAdapters {
    fetchNewPageList(api: mw.Api): Promise<NewPageListSnapshot>;
    fetchPageCreationTimes(
        api: mw.Api,
        titles: Array<string>,
    ): Promise<Map<string, Date>>;
    fetchPageText(api: mw.Api, title: string): Promise<PageSnapshot>;
    fetchSubjectPageInfo(api: mw.Api, title: string): Promise<SubjectPageInfo>;
    getSubjectPageTitle(title: mw.Title): string;
    getTalkPageTitle(title: mw.Title): string;
    savePreparedNewPageList(
        api: mw.Api,
        page: NewPageListSnapshot,
        proposedText: string,
        summary: string,
    ): Promise<void>;
}

/**
 * Binds the dialog workflow to project configuration and adapters.
 *
 * @param adapters - MediaWiki boundary operations.
 * @param projectConfig - Project banner configuration.
 * @returns Dialog workflow used by the UI.
 */
export function createDialogWorkflow(
    adapters: DialogWorkflowAdapters,
    projectConfig: ProjectConfig,
): DialogWorkflow {
    return {
        getRegistrationSave,
        loadDialogState: loadDialogState.bind(null, adapters, projectConfig),
        loadRegistrationState: loadRegistrationState.bind(null, adapters),
        saveRegistration: saveRegistration.bind(null, adapters),
    };
}

async function loadDialogState(
    adapters: DialogWorkflowAdapters,
    projectConfig: ProjectConfig,
    api: mw.Api,
    currentTitle: mw.Title,
): Promise<DialogState> {
    const talkTitle = adapters.getTalkPageTitle(currentTitle);
    const subjectTitle = adapters.getSubjectPageTitle(currentTitle);
    const [page, subjectInfo] = await Promise.all([
        adapters.fetchPageText(api, talkTitle),
        adapters.fetchSubjectPageInfo(api, subjectTitle),
    ]);

    return {
        api,
        assessment: createDefaultAssessment(projectConfig),
        creationTimes: new Map(),
        newPageList: null,
        page,
        previewDirty: false,
        registration: null,
        registrationLoading: true,
        subjectInfo,
        subjectTitle,
        summaryDirty: false,
        talkTitle,
    };
}

async function loadRegistrationState(
    adapters: DialogWorkflowAdapters,
    state: DialogState,
    currentNamespace: number,
): Promise<void> {
    const newPageList = await adapters.fetchNewPageList(state.api);
    const title = state.subjectInfo.listedTitle || state.subjectTitle;
    const titles = [
        ...getTitlesForDate(newPageList.text, state.subjectInfo.creationDate),
        title,
    ];
    const creationTimes = await adapters.fetchPageCreationTimes(
        state.api,
        titles,
    );

    creationTimes.set(title, state.subjectInfo.creationDate);
    const namespaceNumber =
        currentNamespace % 2 === 0
            ? currentNamespace
            : state.subjectInfo.namespaceNumber;

    state.creationTimes = creationTimes;
    state.newPageList = newPageList;
    state.registration = prepareNewPageListRegistration({
        creationDate: state.subjectInfo.creationDate,
        creationTimes,
        namespaceNumber,
        text: newPageList.text,
        title,
    });
    state.registrationLoading = false;
}

function getRegistrationSave(state: DialogState): RegistrationSave | null {
    if (
        state.newPageList == null ||
        state.registration == null ||
        !state.registration.changed
    ) {
        return null;
    }

    return {
        proposedText: state.registration.proposedText,
        snapshot: state.newPageList,
    };
}

async function saveRegistration(
    adapters: DialogWorkflowAdapters,
    api: mw.Api,
    registration: RegistrationSave,
    summary: string,
): Promise<void> {
    await adapters.savePreparedNewPageList(
        api,
        registration.snapshot,
        registration.proposedText,
        summary,
    );
}
