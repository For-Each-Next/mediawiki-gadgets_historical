/**
 * Orchestrates live CS1 checks for source-review workflows.
 */

import {
    extractCs1FragmentIssues,
    extractCs1IssueMessages,
    orderCs1ItemsBySeverity,
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
    const checkedSources = mapCs1CheckedSources(
        dependencies,
        response.html,
        response.categories,
        sources,
    );
    const sourceMessages = new Set(
        checkedSources.flatMap((checked) => checked.messages),
    );
    return {
        messages: extractCs1IssueMessages("", response.categories).filter(
            (message) => !sourceMessages.has(message),
        ),
        sources: checkedSources,
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
    const [checkedSource] = mapCs1CheckedSources(
        dependencies,
        response.html,
        response.categories,
        [source],
    );
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
    categories: readonly string[] = [],
): Cs1CheckedSource | null {
    const issues = extractCs1FragmentIssues(html, categories);
    if (issues.length === 0) {
        return null;
    }
    return {
        html,
        messages: issues.map((issue) => issue.message),
        severity: issues.some((issue) => issue.severity === "error")
            ? "error"
            : "maintenance",
        source,
    };
}

/** Maps isolated batch fragments back to their source records. */
function mapCs1CheckedSources(
    dependencies: Cs1ReviewDependencies,
    html: string,
    categories: readonly string[],
    sources: ExistingSource[],
): Cs1CheckedSource[] {
    const fragments = dependencies.splitCheckHtml(html, sources.length);
    const checked = sources.flatMap(function getCheckedSource(source, index) {
        const checked = restoreCheckedSource(
            source,
            fragments[index] ?? "",
            categories,
        );
        return checked == null ? [] : [checked];
    });
    return orderCs1ItemsBySeverity(checked);
}
