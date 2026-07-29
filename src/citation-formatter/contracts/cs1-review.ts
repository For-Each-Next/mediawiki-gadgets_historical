/**
 * Defines the UI-facing contract for live CS1 review workflows.
 */

import type { Cs1ValidationResult } from "#gadget/domain/cs1-validation.ts";
import type {
    ExistingSource,
    SourceDraft,
} from "#gadget/domain/source-manager.ts";

export interface Cs1ReviewContext {
    pageTitle: string;
}

export interface Cs1CheckedSource {
    html: string;
    messages: string[];
    source: ExistingSource;
}

export interface Cs1ArticleReview {
    messages: string[];
    sources: Cs1CheckedSource[];
}

export interface Cs1ExistingSourceReview {
    checkedSource: Cs1CheckedSource | undefined;
    validation: Cs1ValidationResult;
}

export interface Cs1ReviewWorkflow {
    checkArticleSources: (
        sources: ExistingSource[],
        context: Cs1ReviewContext,
    ) => Promise<Cs1ArticleReview>;
    checkExistingSourceDraft: (
        draft: SourceDraft,
        source: ExistingSource,
        context: Cs1ReviewContext,
    ) => Promise<Cs1ExistingSourceReview>;
    checkNewSourceDraft: (
        draft: SourceDraft,
        context: Cs1ReviewContext,
    ) => Promise<Cs1ValidationResult>;
    restoreCheckedSource: (
        source: ExistingSource,
        html: string,
    ) => Cs1CheckedSource | null;
}
