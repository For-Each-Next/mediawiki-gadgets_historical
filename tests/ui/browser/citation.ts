/** Production Citation Formatter dialog stories. */

// eslint-disable-next-line max-len
import { createManualSourceDraft } from "citation-formatter/domain/source-manager.ts";
// eslint-disable-next-line max-len
import { DEFAULT_TEMPLATE_NAME_CONTEXT } from "citation-formatter/domain/templates.ts";
// eslint-disable-next-line max-len
import { registerCitationFormatterComponents } from "citation-formatter/ui/codex.ts";
// eslint-disable-next-line max-len
import { createSourceManagerComponent } from "citation-formatter/ui/source-manager.ts";
// eslint-disable-next-line max-len
import { installCitationFormatterStyles } from "citation-formatter/ui/styles.ts";
import { getCodex, getVue, installStoryHost, mountComponent } from "./host.ts";
import { UI_STORIES, type UiStory } from "./registry.ts";

const stories = UI_STORIES.filter(
    (story) => story.gadget === "citation-formatter",
);
installCitationFormatterStyles();
installStoryHost("citation-formatter", stories, renderStory);

function renderStory(story: UiStory) {
    const Vue = getVue();
    const editor = createEditor();
    const component = (createSourceManagerComponent as any)(
        Vue,
        editor,
        function cleanup() {},
        createConfiguration(Vue),
    );
    const mounted = mountComponent(component, function register(app) {
        registerCitationFormatterComponents(app, getCodex());
    });
    prepareStory(mounted.proxy, story);
    return mounted;
}

function createEditor() {
    const element = document.createElement("textarea");
    let value = [
        "== Sources ==",
        '<ref name="nguyen-2024-review">{{Cite web',
        "|url=https://example.test/very/long/source/path?from=visual-test",
        "|title=An intentionally long source title for overflow review",
        "|last=Nguyen|first=Alex|date=2024-05-20}}</ref>",
        '<ref name="book">{{Cite book|title=Sample|year=2020}}</ref>',
    ].join("\n");
    return {
        element,
        focus() {},
        read: () => value,
        replaceSelection(text: string) {
            value += text;
        },
        write(text: string) {
            value = text;
        },
    };
}

function createConfiguration(Vue: any) {
    return {
        cs1Review: createCs1Review(),
        async fetchAvailableArchive() {
            return null;
        },
        isActive: () => true,
        async loadCitationTemplateData() {
            return {};
        },
        async loadTemplateNameContext() {
            return DEFAULT_TEMPLATE_NAME_CONTEXT;
        },
        logger: createLogger(),
        notifyAction() {},
        options: {},
        async resolveSourceMetadata(sourceInput: string) {
            return {
                archiveDate: "",
                archiveError: "",
                archiveUrl: "",
                citeTemplate: "cite web",
                metadataError: "",
                originalUrl: sourceInput,
            };
        },
        async resolveWikiLink(value: string) {
            return value;
        },
        sourceRevision: Vue.ref(0),
        templateNameContext: DEFAULT_TEMPLATE_NAME_CONTEXT,
    };
}

function createCs1Review() {
    return {
        async checkArticleSources() {
            return { messages: [], sources: [] };
        },
        async checkExistingSourceDraft() {
            return { checkedSource: undefined, validation: { issues: [] } };
        },
        async checkNewSourceDraft() {
            return { issues: [] };
        },
        restoreCheckedSource() {
            return null;
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

function prepareStory(proxy: Record<string, any>, story: UiStory): void {
    proxy.open = story.dialog === "main";
    if (story.dialog === "main") {
        proxy.activeLookupTab = story.variant;
        return;
    }
    if (story.dialog === "draft" || story.dialog === "parameter-alias") {
        prepareDraft(proxy, story.dialog === "parameter-alias");
        return;
    }
    if (story.dialog === "tool") {
        proxy.toolPopup = story.variant;
        proxy.toolPopupOpen = true;
        return;
    }
    proxy.closeConfirmationOpen = true;
}

function prepareDraft(proxy: Record<string, any>, showAlias: boolean): void {
    const draft = createManualSourceDraft("cite web");
    const values: Record<string, string> = {
        date: "2024-05-20",
        first: "Alexandra",
        last: "Nguyen",
        title: "A long article title that exercises dialog wrapping",
        url: "https://example.test/articles/long-visual-fixture",
    };
    for (const row of draft.rows) {
        row.value = values[row.name] ?? row.value;
    }
    proxy.draft = draft;
    proxy.draftPopupOpen = !showAlias;
    if (showAlias) {
        const index = draft.rows.findIndex((row) => row.name === "title");
        proxy.openParameterAliasDialog(index);
    }
}
