/** Cross-module contracts for normalized article records. */

export interface AggregateScoreMetadata {
    metacritic: {
        platform: string;
        score: string;
    };
    openCritic: {
        recommend: string;
    };
}

export interface AggregateScoreRecord {
    metadata: AggregateScoreMetadata;
}

export type SourceTags = Record<string, string | undefined>;
