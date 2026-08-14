/** Production wikEd Lite formatter dialog story. */

import {
    createDefaultFormatterSettings,
    withEditorFeatureSettings,
} from "wiked-lite/domain/formatter-settings.ts";
import { registerFormatterComponents } from "wiked-lite/ui/codex.ts";
import {
    FORMATTER_DIALOG_STYLES,
    createFormatterDialogComponent,
} from "wiked-lite/ui/dialogs/formatter-dialog.ts";
import {
    addFixtureStyles,
    getCodex,
    getVue,
    installStoryHost,
    mountComponent,
} from "./host.ts";
import { UI_STORIES } from "./registry.ts";

const stories = UI_STORIES.filter((story) => story.gadget === "wiked-lite");
let formatterSettings = createDefaultFormatterSettings();
addFixtureStyles("ui-wiked-dialog-styles", FORMATTER_DIALOG_STYLES);
installStoryHost("wiked-lite", stories, function renderStory() {
    const component = createFormatterDialogComponent(getVue(), {
        initialSelection: formatterSettings,
        notBrokenUrl: "/wiki/WP:NOTBROKEN",
        onClose(features) {
            formatterSettings = withEditorFeatureSettings(
                formatterSettings,
                features,
            );
        },
        onError() {},
        onSave(selection) {
            formatterSettings = selection;
        },
        async onSubmit() {},
    });
    return mountComponent(component, function register(app) {
        registerFormatterComponents(app, getCodex());
    });
});
