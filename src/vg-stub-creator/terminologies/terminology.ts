/**
 * Defines the shared terminology data model.
 */

/** Input accepted when defining one terminology. */
export interface TerminologyOptions {
    aliases: Array<string>;
    categories?: Array<string> | null;
    name: string;
    page?: string | null;
    stubTags?: Array<string> | null;
}


/** Defines canonical metadata shared by terminology collections. */
export class Terminology {
    aliases: Array<string>;
    categories: Array<string> | null;
    name: string;
    page: string | null;
    stubTags: Array<string> | null;

    constructor(options: TerminologyOptions) {
        this.aliases = options.aliases;
        this.categories = options.categories ?? null;
        this.name = options.name;
        this.page = options.page ?? null;
        this.stubTags = options.stubTags ?? null;
    }
}


/** Creates a normalized terminology collection. */
export function defineTerminologies(
    options: Array<TerminologyOptions>,
): Array<Terminology> {
    return options.map(createTerminology);
}


/** Creates one normalized terminology. */
function createTerminology(options: TerminologyOptions): Terminology {
    return new Terminology(options);
}
