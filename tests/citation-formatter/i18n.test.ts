/** Tests Citation Formatter locale routing and catalog integrity. */
/* eslint-disable max-len, max-lines-per-function */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import english from "citation-formatter/i18n/en.ts";
import {
    createCitationFormatterI18n,
    createSourceAnalysisMessages,
    createSourceValidationMessages,
} from "citation-formatter/i18n/index.ts";
import simplifiedChinese from "citation-formatter/i18n/zh-Hans.ts";
import traditionalChinese from "citation-formatter/i18n/zh-Hant.ts";
import { SOURCE_MANAGER_TEMPLATE } from "citation-formatter/ui/source-manager-template.ts";

const catalogs = [simplifiedChinese, traditionalChinese];
const sourceManagerStyles = readFileSync(
    new URL("../../src/citation-formatter/ui/styles.css", import.meta.url),
    "utf8",
);
const parameterTableCardPattern = new RegExp(
    "<template #header>[\\s\\S]*reference-name-preview[\\s\\S]*" +
        "</template>[\\s\\S]*</cdx-table>\\s*<cdx-card[\\s\\S]*" +
        "source-preview-card",
    "u",
);

function listPlaceholders(message: string): string[] {
    return [...message.matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/gu)]
        .map((match) => match[1])
        .toSorted();
}

test("keeps translated catalogs aligned with English", () => {
    const messageIds = (
        Object.keys(english) as Array<keyof typeof english>
    ).toSorted();
    for (const catalog of catalogs) {
        assert.deepEqual(Object.keys(catalog).toSorted(), messageIds);
        for (const messageId of messageIds) {
            assert.deepEqual(
                listPlaceholders(catalog[messageId]),
                listPlaceholders(english[messageId]),
                messageId,
            );
        }
    }
});

test("uses localized reference-name and parameter-alias terminology", () => {
    const visibleEnglish = Object.values(english)
        .map((message) => message.replace(/\{[^}]+\}/gu, ""))
        .join("\n");
    assert.doesNotMatch(visibleEnglish, /\balias\b/iu);
    assert.equal(
        simplifiedChinese["draft.parameterAliases"],
        "可用别名：{aliases}。",
    );
    assert.equal(
        traditionalChinese["draft.parameterAliases"],
        "可用別名：{aliases}。",
    );
});

test("resolves MediaWiki Chinese variants and English fallback", () => {
    for (const locale of ["zh", "zh-CN", "zh-Hans", "zh-SG"]) {
        assert.equal(
            createCitationFormatterI18n(locale).interfaceLocale,
            "zh-Hans",
        );
    }
    for (const locale of ["zh-HK", "zh-Hant", "zh-MO", "zh-TW"]) {
        assert.equal(
            createCitationFormatterI18n(locale).interfaceLocale,
            "zh-Hant",
        );
    }
    assert.equal(createCitationFormatterI18n("fr").interfaceLocale, "en");
});

test("interpolates UI and domain messages in the selected locale", () => {
    const translator = createCitationFormatterI18n("zh-TW");
    const validation = createSourceValidationMessages(translator);
    const analysis = createSourceAnalysisMessages(translator);

    assert.equal(
        translator.msg("tabs.viewSources", { count: 3 }),
        "檢視來源（3）",
    );
    assert.equal(
        validation.unsupportedParameter("example"),
        "CS1 不支援 example 參數。",
    );
    assert.equal(analysis.untitledSource(), "無標題來源");
});

test("renders safe new-tab links for openable URL fields", () => {
    assert.match(
        SOURCE_MANAGER_TEMPLATE,
        /isUrlDraftParameter\(\s*row\.name\s*\)/u,
    );
    assert.match(
        SOURCE_MANAGER_TEMPLATE,
        /getOpenableDraftUrl\(\s*row\.value\s*\)/u,
    );
    const openUrlLink = SOURCE_MANAGER_TEMPLATE.match(
        /<a\b[^>]*>[\s\S]*?<cdx-icon\b[^>]*:icon="openUrlIcon"[^>]*\/>[\s\S]*?<\/a>/u,
    )?.[0];
    assert.ok(openUrlLink);
    const openingTag = openUrlLink.match(/^<a\b[^>]*>/u)?.[0];
    assert.ok(openingTag);
    assert.match(
        openingTag,
        /:href="\s*getOpenableDraftUrl\(\s*row\.value\s*\)\s*"/u,
    );
    assert.match(openingTag, /\btarget="_blank"/u);
    assert.match(openingTag, /\brel="noopener noreferrer"/u);
    assert.match(openingTag, /v-tooltip="msg\( 'draft\.openUrl' \)"/u);
    assert.match(openingTag, /draft\.openUrlLabel/u);
    for (const className of [
        "cdx-button--fake-button",
        "cdx-button--fake-button--enabled",
        "cdx-button--weight-quiet",
        "cdx-button--icon-only",
    ]) {
        assert.match(openingTag, new RegExp(`\\b${className}\\b`, "u"));
    }
});

test("renders consistency values and aliases as computed tabs", () => {
    assert.equal(
        [
            ...SOURCE_MANAGER_TEMPLATE.matchAll(
                /v-model:active="activeAnalysisTab"/gu,
            ),
        ].length,
        1,
    );
    assert.match(
        SOURCE_MANAGER_TEMPLATE,
        /v-for="\s*[A-Za-z_$][\w$]*\s+in\s+analysisTabs\s*"/u,
    );
    assert.match(
        SOURCE_MANAGER_TEMPLATE,
        /:name="\s*[A-Za-z_$][\w$]*\.name\s*"/u,
    );
    assert.match(
        SOURCE_MANAGER_TEMPLATE,
        /:label="\s*[A-Za-z_$][\w$]*\.label\s*"/u,
    );
    assert.match(
        SOURCE_MANAGER_TEMPLATE,
        /v-for="\s*finding\s+in\s+[A-Za-z_$][\w$]*\.findings\s*"/u,
    );
    assert.match(
        SOURCE_MANAGER_TEMPLATE,
        /v-for="\s*applied\s+in\s+[A-Za-z_$][\w$]*\.appliedFindings\s*"/u,
    );
});

test("renders progress and a whole-article CS1 recheck action", () => {
    assert.match(
        SOURCE_MANAGER_TEMPLATE,
        /<cdx-progress-bar\s+v-if="cs1ToolStatus === 'checking'"/u,
    );
    assert.match(
        SOURCE_MANAGER_TEMPLATE,
        /v-if="toolPopup === 'cs1'"[\s\S]*?:disabled="cs1ToolStatus === 'checking'"[\s\S]*?@click="recheckCs1Tool"[\s\S]*?checker\.recheckArticle/u,
    );
});

test("keeps CS1 messages outside the dialog child margin reset", () => {
    const messageFrames = [
        ...SOURCE_MANAGER_TEMPLATE.matchAll(
            /class="cf-source-manager__cs1-message-frame"/gu,
        ),
    ];

    assert.equal(messageFrames.length, 3);
    assert.doesNotMatch(
        SOURCE_MANAGER_TEMPLATE,
        /<cdx-message[^>]*cf-source-manager__cs1-message-frame/gu,
    );
    assert.match(
        sourceManagerStyles,
        /\.cf-source-manager__cs1-message-frame\s*\{\s*display:\s*flow-root;/u,
    );
});

test("renders the split author glyph in the reverse merge direction", () => {
    assert.match(
        SOURCE_MANAGER_TEMPLATE,
        /class="\s*cf-source-manager__split-author-icon\s*"[\s\S]*?:icon="splitAuthorIcon"/u,
    );
    assert.match(SOURCE_MANAGER_TEMPLATE, /:icon="joinAuthorIcon"/u);
});

test("references only defined messages from the Vue template", () => {
    const referencedIds = [
        ...SOURCE_MANAGER_TEMPLATE.matchAll(/msg\(\s*'([^']+)'/gu),
    ].map((match) => match[1]);

    assert.ok(referencedIds.length > 0);
    for (const messageId of referencedIds) {
        assert.ok(messageId in english, messageId);
    }
    assert.doesNotMatch(SOURCE_MANAGER_TEMPLATE, /v-tooltip="'/u);
    assert.doesNotMatch(
        SOURCE_MANAGER_TEMPLATE,
        /(?<!:)aria-label="[A-Za-z]/u,
    );
    assert.doesNotMatch(SOURCE_MANAGER_TEMPLATE, /#validation-message/u);
    assert.match(
        SOURCE_MANAGER_TEMPLATE,
        /<cdx-table\s+class="cf-source-manager__parameter-table"/u,
    );
    assert.match(
        SOURCE_MANAGER_TEMPLATE,
        /:caption="msg\( 'draft\.parametersCaption' \)"/u,
    );
    assert.match(SOURCE_MANAGER_TEMPLATE, /<template #header>/u);
    assert.match(SOURCE_MANAGER_TEMPLATE, parameterTableCardPattern);
    assert.match(SOURCE_MANAGER_TEMPLATE, /:use-row-headers="true"/u);
    assert.match(SOURCE_MANAGER_TEMPLATE, /:show-vertical-borders="false"/u);
    assert.match(SOURCE_MANAGER_TEMPLATE, /<tbody>/u);
    assert.match(SOURCE_MANAGER_TEMPLATE, /<tr\s+v-for=/u);
    assert.match(SOURCE_MANAGER_TEMPLATE, /<th\s+scope="row"/u);
    assert.match(SOURCE_MANAGER_TEMPLATE, /<td\s+class=/u);
    assert.match(
        SOURCE_MANAGER_TEMPLATE,
        /<cdx-text-area[\s\S]*:autosize="true"[\s\S]*rows="1"/u,
    );
    assert.match(
        SOURCE_MANAGER_TEMPLATE,
        /cf-source-manager__parameter-row--reference-name/u,
    );
    assert.doesNotMatch(
        SOURCE_MANAGER_TEMPLATE,
        /cf-source-manager__reference-name-field/u,
    );
    assert.doesNotMatch(
        SOURCE_MANAGER_TEMPLATE,
        /cf-source-manager__parameter-cell--alias/u,
    );
    assert.match(
        SOURCE_MANAGER_TEMPLATE,
        /cf-source-manager__parameter-alias-caption/u,
    );
    assert.match(
        SOURCE_MANAGER_TEMPLATE,
        /v-model:open="parameterAliasDialogOpen"/u,
    );
    assert.match(
        SOURCE_MANAGER_TEMPLATE,
        /v-model="\s*parameterAliasDialogOriginalValue\s*"/u,
    );
    assert.match(
        SOURCE_MANAGER_TEMPLATE,
        /<cdx-text-area\s+v-model="parameterAliasDialogValue"[\s\S]*?:autosize="true"/u,
    );
    for (const directive of ["!no-date", "!no-author", "!no-part"]) {
        assert.match(
            SOURCE_MANAGER_TEMPLATE,
            new RegExp(`input-value="${directive}"`, "u"),
        );
    }
    assert.ok(
        SOURCE_MANAGER_TEMPLATE.indexOf('input-value="!no-author"') <
            SOURCE_MANAGER_TEMPLATE.indexOf('input-value="!no-date"'),
    );
    assert.ok(
        SOURCE_MANAGER_TEMPLATE.indexOf('input-value="!no-date"') <
            SOURCE_MANAGER_TEMPLATE.indexOf('input-value="!no-part"'),
    );
    assert.match(
        SOURCE_MANAGER_TEMPLATE,
        /v-if="draftCs1Checking"[\s\S]*?<cdx-progress-bar[\s\S]*?checker\.checking/u,
    );
    assert.match(
        SOURCE_MANAGER_TEMPLATE,
        /parameter-alias-action--excluded[\s\S]*?hasReferenceNameExclusion/u,
    );
    assert.match(
        SOURCE_MANAGER_TEMPLATE,
        /v-tooltip="getParameterNameTooltip\( row\.name \)"/u,
    );
    assert.match(SOURCE_MANAGER_TEMPLATE, /:icon="parameterAliasIcon"/u);
    assert.doesNotMatch(
        SOURCE_MANAGER_TEMPLATE,
        /cf-source-manager__parameter-grid/u,
    );
    assert.match(SOURCE_MANAGER_TEMPLATE, /cf-source-manager__field-error/u);
    assert.match(
        SOURCE_MANAGER_TEMPLATE,
        /class="cf-source-analysis__intro" tabindex="0"/u,
    );
    assert.doesNotMatch(
        SOURCE_MANAGER_TEMPLATE,
        /draft\.sourceKeyPlaceholder/u,
    );
    assert.match(
        SOURCE_MANAGER_TEMPLATE,
        /<cdx-select\s+v-model:selected="basedOnSourceId"/u,
    );
    assert.match(
        SOURCE_MANAGER_TEMPLATE,
        /class="cf-source-manager__filter-field"\s+role="group"/u,
    );
    assert.doesNotMatch(
        SOURCE_MANAGER_TEMPLATE,
        /class="cf-source-manager__filter-field"\s+:is-fieldset/u,
    );
    assert.match(SOURCE_MANAGER_TEMPLATE, /:subtitle="toolBuildLabel"/u);
    assert.doesNotMatch(
        SOURCE_MANAGER_TEMPLATE,
        /cf-source-manager__gadget-info/u,
    );
    assert.match(SOURCE_MANAGER_TEMPLATE, /v-model:open="draftPopupOpen"/u);
    assert.match(
        SOURCE_MANAGER_TEMPLATE,
        /v-model:open="draftPopupOpen"[\s\S]*?<template #footer>[\s\S]*?cf-source-manager__draft-actions[\s\S]*?saveDraft/u,
    );
    assert.doesNotMatch(SOURCE_MANAGER_TEMPLATE, /mode === 'draft'/u);
    assert.match(
        SOURCE_MANAGER_TEMPLATE,
        /action="destructive"\s+weight="quiet"[\s\S]*common\.cancel/u,
    );
    assert.match(SOURCE_MANAGER_TEMPLATE, /analysis\.applyCase/u);
    assert.match(SOURCE_MANAGER_TEMPLATE, /<cdx-radio/u);
    assert.equal(
        [
            ...SOURCE_MANAGER_TEMPLATE.matchAll(
                /@update:model-value="\s*selectAllAnalysisOccurrences\(/gu,
            ),
        ].length,
        2,
    );
    assert.doesNotMatch(SOURCE_MANAGER_TEMPLATE, /<cdx-chip-input/u);
    assert.doesNotMatch(SOURCE_MANAGER_TEMPLATE, /selectAllAndApply/u);
    assert.doesNotMatch(SOURCE_MANAGER_TEMPLATE, /occurrenceCount/u);
    assert.match(SOURCE_MANAGER_TEMPLATE, /analysis\.changed/u);
    assert.match(SOURCE_MANAGER_TEMPLATE, /analysis\.revert/u);
    assert.match(
        SOURCE_MANAGER_TEMPLATE,
        /v-model:open="closeConfirmationOpen"/u,
    );
    assert.match(SOURCE_MANAGER_TEMPLATE, /keywordFilterLabel/u);
    assert.match(SOURCE_MANAGER_TEMPLATE, /sectionFilterLabel/u);
    assert.match(
        SOURCE_MANAGER_TEMPLATE,
        /@click="cancelAllChanges"[\s\S]*?common\.cancelChanges/u,
    );
});
