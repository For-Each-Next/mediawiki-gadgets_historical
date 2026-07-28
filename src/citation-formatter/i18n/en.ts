/**
 * English source catalog for Citation Formatter.
 */

import { i18n } from "#shared";

export default i18n.defineMessages({
    "tool": {
        "name": "Citation formatter",
        "description": "Format citations and add or edit citation sources",
        "editorUnavailable": "No editable source text is available.",
        "formatCitations": "Format citations",
        "open": "Open Citation formatter",
        "quickLaunch": "Cite",
        "startupError": "Citation formatter could not open: {error}",
        "validationTitle": "Citation formatter issues",
        "buildLabel": "Version {version} · Built {buildTime}",
    },
    "common": {
        "clear": "Clear",
        "close": "Close",
        "cancel": "Cancel",
        "cancelChanges": "Cancel changes",
        "apply": "Apply",
        "dismiss": "Dismiss",
        "noResults": "No results.",
        "unnamed": "unnamed",
        "unnamedReference": "Unnamed reference",
        "untitledSource": "Untitled source",
        "use": "Use",
        "save": "Save",
    },
    "tabs": {
        "addSource": "Add source",
        "tools": "Tools",
        "viewSources": "View sources ({count})",
    },
    "lookup": {
        "source": "Source",
        "sourceDescription":
            "Enter a URL, archive link, identifier (DOI, ISBN, ISSN, PMID, " +
            "PMCID, or QID), or citation text. Citations with the same URL " +
            "are reused.",
        "sourcePlaceholder": "URL, identifier, or citation",
        "findSource": "Find source",
        "loading": "Getting source details and archive…",
        "citationType": "Citation type",
        "manualDescription":
            "Create a blank source or use an existing citation " +
            "as a starting point.",
        "basedOn": "Starting source",
        "basedOnExisting": "Existing source",
        "chooseCitationType": "Choose a citation type.",
        "chooseExisting": "Choose an existing source",
        "noExisting": "No existing sources found.",
        "createSource": "Create source",
        "filterKeyword": "Filter by keyword",
        "filterKeywordPlaceholder": "Search authors, websites, or keywords",
        "filterSection": "Filter by section",
        "appliedFilterLabel": "{label} ({count})",
        "noDefinitions": "No citation sources found.",
        "noMatches": "No sources match these keywords.",
        "tableCaption": "Existing citation sources",
        "reference": "Reference",
        "sourceColumn": "Source",
        "actions": "Actions",
        "group": "Group {group}",
        "useSource": "Use source",
        "editSource": "Edit source",
        "nonStandard": "Not a citation template",
        "chooseBasedOn":
            "Choose an existing citation to use as the starting point.",
        "sourceUnavailable": "The selected citation is unavailable.",
        "sourceRequired": "Enter a source URL, identifier, or citation.",
        "ambiguousSource":
            "This URL is cited in more than one reference group. " +
            "Choose the citation to reuse from the source list.",
        "existingInserted": "Existing reference inserted.",
        "duplicateWarning":
            "Saving creates a new source. " +
            "The original source will not change.",
        "replaceWarning":
            "Saving replaces the original reference with this citation " +
            "template.",
        "metadataUnavailable": "Source details could not be loaded: {error}",
        "archiveUnavailable": "Archive search failed: {error}",
        "manualFallback": "Enter the source details manually.",
    },
    "tools": {
        "advanced": "Formatting options",
        "advancedDescription":
            "Choose changes to apply to all citations in the article.",
        "compactReferences": "Use {{r}} instead of <ref> when possible",
        "blockCitations":
            "Place citation templates on separate lines with a two-space " +
            "indent",
        "scriptTitle":
            "Move a foreign-language title to script-title when its " +
            "language code is available",
        "applyFormatting": "Apply formatting",
        "checks": "Citation checks",
        "checksDescription":
            "Each check opens its results in a separate dialog.",
        "analyze": "Check name consistency",
        "checkCs1": "Check CS1 issues",
        "checkNonCs1": "Check non-CS1 sources",
        "development": "development",
        "unknownBuildTime": "unknown build time",
    },
    "draft": {
        "createSourceTitle": "Create citation source",
        "editSourceTitle": "Edit citation source",
        "originalSource": "Original reference wikitext",
        "originalDescription":
            "This wikitext is shown for comparison. Saving replaces it with " +
            "the citation template.",
        "citationTemplate": "Citation template",
        "fieldContext": "{label}: {message}",
        "parametersCaption": "Citation template parameters",
        "parameter": "Parameter",
        "value": "Content",
        "alias": "Reference name settings",
        "parameterName": "Parameter name",
        "parameterPlaceholder": "parameter",
        "customParameter": "Custom parameter",
        "valueLabel": "{parameter} content",
        "originalValueLabel": "Original {parameter} text",
        "originalValueDescription":
            "Correct the original citation text if needed.",
        "referenceName": "Reference name",
        "referenceAuthor": "Author component",
        "referenceYear": "Year component",
        "referencePart": "Part locator",
        "nameValueHelp": "This text is used in the generated reference name.",
        "nameAliasHelp": "This text is used in the generated reference name.",
        "sourceKeyLabel": "Shared URL source key",
        "aliasLabel": "Reference-name text",
        "editAliasLabel": "Edit {label}",
        "editAliasExcludedLabel":
            "Edit {label}; active exclusions: {directives}",
        "aliasDialogDescription":
            "Enter the text to use in the generated reference name. For a " +
            "URL, you can enter a shared source key. " +
            "Leave blank to keep the original text.",
        "directives": "Reference-name exclusions",
        "directivesDescription":
            "Exclude this field from selected generated reference-name " +
            "components.",
        "noDateDirective": "Do not use this field for the year",
        "noAuthorDirective": "Do not use this field for the author",
        "noPartDirective": "Do not use this field for the part locator",
        "parameterAliasOf":
            "{parameter} is another name for {canonical}. Other accepted " +
            "names: {aliases}.",
        "parameterAliases": "Other accepted names: {aliases}.",
        "aliasSuggestion": "Suggested reference-name text: {alias}",
        "switchStatus": "Change status: live, dead, or unfit",
        "switchStatusLabel": "Change URL status: live, dead, or unfit",
        "openUrl": "Open URL in a new tab",
        "openUrlLabel": "Open {parameter} in a new tab",
        "fillToday": "Use today's date",
        "fillArchiveDate": "Use date from archive URL",
        "checkLink": "Check and update article link",
        "checkLinkLabel": "Check and update the {parameter} article link",
        "splitAuthor": "Use separate first and last name fields",
        "splitAuthorLabel":
            "Use separate first and last fields for {parameter}",
        "joinAuthor": "Return to one full-name field",
        "joinAuthorLabel": "Use one full-name field for {parameter}",
        "addParameter": "Add parameter",
        "sortParameters": "Sort parameters",
        "duplicate": "Duplicate source",
        "sourceCode": "Citation wikitext",
        "invalidSummary": "Correct the highlighted fields before saving.",
        "emptyCitation": "Enter at least one citation field.",
        "missingParameterName": "Enter a name for each populated parameter.",
        "aliasNeedsValue":
            "Enter the original {parameter} text before setting its " +
            "reference name.",
        "previewUnavailable": "Citation preview could not be loaded: {error}",
        "noArchiveSnapshot": "No archive snapshot was found.",
    },
    "feedback": {
        "formatComplete": "Citations formatted.",
        "formatIncompleteOne":
            "Citations formatted. 1 reference could not be formatted.",
        "formatIncompleteMany":
            "Citations formatted. {count} references could not be formatted.",
        "parametersSorted": "Citation parameters sorted.",
        "accessDateFilled": "Access date filled.",
        "archiveDateFilled": "Archive date filled.",
        "archiveFieldsFilled": "Archive fields filled.",
        "archiveCheckFailed":
            "The archive date could not be checked. Check it manually.",
        "articleLinkChecked": "Article link checked.",
        "linkCheckFailed":
            "The article link could not be checked. Check it manually.",
        "cancelUnavailable":
            "Changes made by Citation formatter cannot be canceled because " +
            "the article changed elsewhere.",
        "sourceApplied": "Citation changes applied: {changes}.",
        "sourceAppliedCreated": "New citation source applied.",
        "sourceAppliedNoChanges":
            "Citation source applied; no article text changed.",
        "sourceAppliedReordered":
            "Citation source applied; parameters were reordered.",
        "sourceTemplateChanged": "changed type from {before} to {after}",
        "sourceParametersAdded": "added {parameters}",
        "sourceParametersUpdated": "updated {parameters}",
        "sourceParametersRemoved": "removed {parameters}",
        "newSourceCs1IssueOne": "CS1 found 1 issue. Correct it before saving.",
        "newSourceCs1IssueMany":
            "CS1 found {count} issues. Correct them before saving.",
        "sourceDuplicated": "Citation source duplicated.",
        "sourceSaved": "Citation source saved.",
    },
    "analysis": {
        "title": "Citation name consistency",
        "intro":
            "Review possible differences in website, publisher, author, " +
            "reference-name, and source-key text. Choose the text to keep " +
            "and the citations to update. Parameter names will not change.",
        "none": "No likely name-format differences found.",
        "parameterValuesTab": "Parameter values",
        "referenceNamesTab": "Reference names and source keys",
        "aliasField": "Reference name or source key",
        "valueField": "Text to use",
        "applyCase": "Apply change",
        "applySelected": "Apply selected changes",
        "selectAll": "Select all",
        "customValue": "Custom text",
        "emptyValue": "(none)",
        "changed": "Changed to",
        "revert": "Revert",
        "revertComplete": "The consistency change was reverted.",
        "revertUnavailable":
            "This change cannot be reverted because its source changed.",
        "undoComplete": "Citation consistency changes were undone.",
        "undoUnavailable":
            "These changes can no longer be undone because the article " +
            "changed afterward.",
        "closeConfirmationTitle": "Close Citation formatter?",
        "closeConfirmationBody":
            "This session includes applied citation consistency changes. " +
            "Choose whether to undo or keep them, or continue editing.",
        "undoAndClose": "Undo changes and close",
        "keepAndClose": "Keep changes and close",
        "noHashAlias": "(no reference-name text)",
        "selectOne": "Select at least one citation to change.",
        "replacedOne": "1 citation field updated.",
        "replacedMany": "{count} citation fields updated.",
        "publicationLabel": "{domain} · Website or work",
        "publicationDescription": "Website or work",
        "publisherLabel": "{domain} · Publisher",
        "publisherDescription": "Publisher",
        "sameDisplayStyle":
            "Only link, case, spacing, or wikitext style differs.",
        "sameHostValue": "Citations for the same website use different names.",
        "authorLabel": "Author formatting · {author}",
        "authorDescription": "Author formatting",
        "authorReason":
            "The same author name uses different wikitext, link, case, or " +
            "spacing style.",
        "sourceKeyLabel": "Source key · {value}",
        "sourceKeyDescription": "Source key",
        "hashAliasLabel": "Reference-name text · {value}",
        "hashAliasDescription": "Reference-name text",
        "someMissingSourceKey":
            "Some repeated uses have a source key and others do not.",
        "differentSourceKey":
            "Repeated uses have different source-key comments.",
        "someMissingAlias":
            "Some repeated uses have reference-name text and others do not.",
        "differentAlias": "Repeated uses have different reference-name text.",
        "sourceMissing":
            "A selected citation source is no longer present. Run the check " +
            "again.",
        "replacementConflict":
            "One citation field has more than one replacement. Review the " +
            "selections and apply them again.",
        "sourceChanged":
            "A citation source changed after the check opened. " +
            "Run the check again.",
        "fieldChanged":
            "A selected citation field changed after the check opened. Run " +
            "the check again.",
    },
    "checker": {
        "cs1Title": "CS1 issue check",
        "nonCs1Title": "Non-CS1 source check",
        "cs1Description":
            "Checks citations against the CS1 rules currently used on " +
            "{wiki} Wikipedia.",
        "english": "English",
        "chinese": "Chinese",
        "checking": "Checking CS1 issues",
        "unavailable":
            "The CS1 check is temporarily unavailable. Run it again later.",
        "noIssues": "No CS1 issues found.",
        "recheckArticle": "Recheck article",
        "nonCs1Description":
            "Finds references that do not use a supported CS1 citation " +
            "template.",
        "noNonCs1": "No non-CS1 sources found.",
        "nonCs1Source": "Non-CS1 source",
        "convertSource": "Convert source",
    },
    "sections": {
        "lead": "Lead",
        "sectionLead": "Section lead",
        "subsectionLead": "Subsection lead",
        "allSections": "All sections",
        "allSubsections": "All subsections",
        "section": "Section",
        "subsection": "Subsection",
        "unusedReferences": "Unused references",
    },
    "validation": {
        "parameterRequired": "Enter a parameter name.",
        "unsupportedParameter":
            "CS1 does not support the {parameter} parameter.",
        "aliasRequiresValue":
            "Enter the original text before setting reference-name text.",
        "invalidDate": "Enter a correct date for {parameter}.",
        "archiveUrlRequiresDate": "Add a date for the archive URL.",
        "archiveDateRequiresUrl": "Add an archive URL for the archive date.",
        "addParameter": "{message} Add the {parameter} parameter.",
        "dependency": "{source} requires {targets}.",
        "dependencyWithParameter":
            "{source} requires {targets}. Add the {parameter} parameter.",
        "or": " or ",
    },
    "errors": {
        "sourceChanged":
            "The source changed after it was opened. Open it again to " +
            "continue.",
        "parameterCollision":
            "{first} and {second} both map to {parameter}. " +
            "Remove or rename one parameter.",
    },
});
