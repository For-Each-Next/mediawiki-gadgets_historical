/**
 * Runtime terminology catalog entry.
 */
export type TerminologyAlias = string | RegExp;

export interface TerminologyDefinition {
    aliases: [TerminologyAlias, ...Array<TerminologyAlias>];
    label: string;
    page?: string;
    navboxes?: Array<string>;
    categories?: Array<string>;
    stubTags?: Array<string>;
}
