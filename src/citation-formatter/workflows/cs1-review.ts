/**
 * Orchestrates live CS1 checks for source-review workflows.
 */

import {
    extractCs1IssueMessages,
    parseCs1ValidationResult,
    type Cs1ValidationResult,
} from "#gadget/domain/cs1-validation.ts";
import {
    serializeSourceDraft,
    type ExistingSource,
    type SourceDraft,
} from "#gadget/domain/source-manager.ts";
import type {
    Cs1ArticleReview,
    Cs1CheckedSource,
    Cs1ExistingSourceReview,
    Cs1ReviewContext,
    Cs1ReviewWorkflow,
} from "#gadget/contracts/cs1-review.ts";

interface Cs1CheckResult {
    categories: string[];
    html: string;
}

export interface Cs1ReviewDependencies {
    buildCheckWikitext: (
        sources: readonly { rawTemplate: string }[],
    ) => string;
    requestCheck: (
        text: string,
        context: Cs1ReviewContext,
    ) => Promise<Cs1CheckResult>;
    splitCheckHtml: (html: string, sourceCount: number) => string[];
}

export type {
    Cs1ArticleReview,
    Cs1CheckedSource,
    Cs1ExistingSourceReview,
    Cs1ReviewContext,
    Cs1ReviewWorkflow,
} from "#gadget/contracts/cs1-review.ts";

/** Creates a CS1 review workflow from browser adapter contracts. */
export function createCs1ReviewWorkflow(
    dependencies: Cs1ReviewDependencies,
): Cs1ReviewWorkflow {
    return {
        checkArticleSources(sources, context) {
            return checkArticleSources(dependencies, sources, context);
        },
        checkExistingSourceDraft(draft, source, context) {
            return checkExistingSourceDraft(
                dependencies,
                draft,
                source,
                context,
            );
        },
        checkNewSourceDraft(draft, context) {
            return checkNewSourceDraft(dependencies, draft, context);
        },
        restoreCheckedSource,
    };
}

/** Checks all supported article sources in one parse request. */
async function checkArticleSources(
    dependencies: Cs1ReviewDependencies,
    sources: ExistingSource[],
    context: Cs1ReviewContext,
): Promise<Cs1ArticleReview> {
    const text = dependencies.buildCheckWikitext(sources);
    const response = await dependencies.requestCheck(text, context);
    return {
        messages: extractCs1IssueMessages("", response.categories),
        sources: mapCs1CheckedSources(dependencies, response.html, sources),
    };
}

/** Checks one unsaved draft without wrapping it in an article batch. */
async function checkNewSourceDraft(
    dependencies: Cs1ReviewDependencies,
    draft: SourceDraft,
    context: Cs1ReviewContext,
): Promise<Cs1ValidationResult> {
    const text = serializeSourceDraft(draft, "inline");
    const response = await dependencies.requestCheck(text, context);
    return parseCs1ValidationResult(draft, response.html, response.categories);
}

/** Rechecks an applied source and retains its batch fragment. */
async function checkExistingSourceDraft(
    dependencies: Cs1ReviewDependencies,
    draft: SourceDraft,
    source: ExistingSource,
    context: Cs1ReviewContext,
): Promise<Cs1ExistingSourceReview> {
    const response = await dependencies.requestCheck(
        dependencies.buildCheckWikitext([source]),
        context,
    );
    const [checkedSource] = mapCs1CheckedSources(dependencies, response.html, [
        source,
    ]);
    return {
        checkedSource,
        validation: parseCs1ValidationResult(
            draft,
            checkedSource?.html ?? "",
            response.categories,
        ),
    };
}

/** Restores a checked source from isolated HTML. */
function restoreCheckedSource(
    source: ExistingSource,
    html: string,
): Cs1CheckedSource | null {
    const messages = extractCs1IssueMessages(html);
    return messages.length === 0 ? null : { html, messages, source };
}

/** Maps isolated batch fragments back to their source records. */
function mapCs1CheckedSources(
    dependencies: Cs1ReviewDependencies,
    html: string,
    sources: ExistingSource[],
): Cs1CheckedSource[] {
    const fragments = dependencies.splitCheckHtml(html, sources.length);
    return sources.flatMap(function getCheckedSource(source, index) {
        const checked = restoreCheckedSource(source, fragments[index] ?? "");
        return checked == null ? [] : [checked];
    });
}
